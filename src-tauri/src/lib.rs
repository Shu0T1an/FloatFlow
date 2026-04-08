use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size, State,
    WebviewUrl, WebviewWindowBuilder,
};

#[cfg(desktop)]
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const APP_STATE_FILE: &str = "state.json";
const SHORTCUT_EVENT_NAME: &str = "floatflow://shortcut";
const APP_STATE_UPDATED_EVENT_NAME: &str = "floatflow://app-state-updated";
const SETTINGS_WINDOW_LABEL: &str = "settings";
const SETTINGS_WINDOW_PATH: &str = "index.html";
const SETTINGS_WINDOW_INIT_SCRIPT: &str =
    "window.__FLOATFLOW_WINDOW_KIND__ = 'settings';";
const WINDOW_MARGIN: i32 = 24;
const WINDOW_WIDTH: u32 = 420;
const WINDOW_HEIGHT: u32 = 680;
const SETTINGS_WINDOW_WIDTH: f64 = 960.0;
const SETTINGS_WINDOW_HEIGHT: f64 = 720.0;
const SETTINGS_WINDOW_MIN_WIDTH: f64 = 880.0;
const SETTINGS_WINDOW_MIN_HEIGHT: f64 = 640.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Hotkeys {
    toggle_main_window: String,
    quick_capture: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TodoItem {
    id: String,
    title: String,
    completed: bool,
    priority: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MemoNote {
    id: String,
    title: String,
    content: String,
    tags: Vec<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyMemoEntry {
    id: String,
    content: String,
    #[serde(default)]
    tags: Vec<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppPreferences {
    theme: String,
    window_opacity: f64,
    always_on_top: bool,
    default_mode: String,
    hotkeys: Hotkeys,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppStatePayload {
    schema_version: u8,
    #[serde(default)]
    todos: Vec<TodoItem>,
    #[serde(default)]
    memos: Vec<MemoNote>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    memo: Option<LegacyMemoEntry>,
    preferences: AppPreferences,
}

#[derive(Debug, Clone, Serialize)]
struct ShortcutEventPayload {
    kind: &'static str,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInfoPayload {
    version: String,
    data_dir: String,
}

struct ShortcutConfigState(Mutex<Hotkeys>);
struct PinState(Mutex<bool>);
struct TemporaryRevealState(Mutex<bool>);
struct WindowMetricsState(Mutex<Option<WindowMetrics>>);

#[derive(Debug, Clone, Copy)]
struct WindowMetrics {
    outer_size: PhysicalSize<u32>,
    scale_factor: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct WindowLayerState {
    always_on_top: bool,
    always_on_bottom: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct ShortcutActivationPlan {
    should_unminimize: bool,
    should_focus: bool,
    should_raise_temporarily: bool,
    should_temporarily_unpin: bool,
    should_redock_after_reveal: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct WindowSizeResolution {
    size: PhysicalSize<u32>,
    should_restore_native_size: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ToggleShortcutAction {
    Show,
    Hide,
    RecallPinnedToFront,
}

impl Default for ShortcutConfigState {
    fn default() -> Self {
        Self(Mutex::new(default_hotkeys()))
    }
}

impl Default for PinState {
    fn default() -> Self {
        Self(Mutex::new(default_app_state().preferences.always_on_top))
    }
}

impl Default for TemporaryRevealState {
    fn default() -> Self {
        Self(Mutex::new(false))
    }
}

impl Default for WindowMetricsState {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

#[tauri::command]
fn load_app_state(app: AppHandle) -> Result<AppStatePayload, String> {
    let path = app_state_path(&app)?;

    if !path.exists() {
        let default_state = default_app_state();
        write_state_file(&path, &default_state)?;
        return Ok(default_state);
    }

    let contents = fs::read_to_string(&path).map_err(to_error)?;
    match serde_json::from_str::<AppStatePayload>(&contents) {
        Ok(state) => Ok(state),
        Err(_) => {
            let fallback = default_app_state();
            write_state_file(&path, &fallback)?;
            Ok(fallback)
        }
    }
}

#[tauri::command]
fn save_app_state(app: AppHandle, state: AppStatePayload) -> Result<(), String> {
    let path = app_state_path(&app)?;
    write_state_file(&path, &state)?;
    broadcast_app_state_updated(&app, &state)
}

#[tauri::command]
fn export_app_state(path: String, state: AppStatePayload) -> Result<(), String> {
    write_state_file(Path::new(&path), &state)
}

#[tauri::command]
fn get_app_info(app: AppHandle) -> Result<AppInfoPayload, String> {
    let data_dir = app.path().app_data_dir().map_err(to_error)?;
    Ok(AppInfoPayload {
        version: app.package_info().version.to_string(),
        data_dir: data_dir.display().to_string(),
    })
}

#[tauri::command]
fn set_always_on_top(app: AppHandle, enabled: bool) -> Result<(), String> {
    let window = main_window(&app)?;
    set_pin_state(&app, enabled)?;
    set_temporary_reveal(&app, false)?;
    sync_window_layer(&window, current_window_layer(&app)?)
}

#[tauri::command]
fn set_window_opacity(app: AppHandle, value: f64) -> Result<(), String> {
    let clamped = value.clamp(0.1, 1.0);
    let window = main_window(&app)?;
    window
        .emit(
            "floatflow://window-opacity",
            serde_json::json!({ "value": clamped }),
        )
        .map_err(to_error)
}

#[tauri::command]
fn toggle_main_window(app: AppHandle) -> Result<(), String> {
    toggle_main_window_inner(&app)
}

// On Windows, runtime-created windows can deadlock if the command stays synchronous.
#[tauri::command]
async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    debug_window_message("open_settings_window:start".to_string());
    let window = ensure_settings_window(&app)?;
    let result = focus_settings_window(&window);
    match &result {
        Ok(()) => debug_window_message("open_settings_window:success".to_string()),
        Err(error) => {
            debug_window_message(format!("open_settings_window:error error={error}"))
        }
    }
    result
}

#[tauri::command]
async fn close_settings_window(app: AppHandle) -> Result<(), String> {
    debug_window_message("close_settings_window:start".to_string());
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
        debug_window_message("close_settings_window:found_window".to_string());
        window.close().map_err(to_error)?;
        debug_window_message("close_settings_window:closed".to_string());
    } else {
        debug_window_message("close_settings_window:no_window".to_string());
    }

    Ok(())
}

#[tauri::command]
fn get_current_window_label(window: tauri::WebviewWindow) -> Result<String, String> {
    let label = window.label().to_string();
    debug_window_message(format!("get_current_window_label:label={label}"));
    Ok(label)
}

#[tauri::command]
fn register_global_shortcuts(
    app: AppHandle,
    shortcut_state: State<ShortcutConfigState>,
    hotkeys: Hotkeys,
) -> Result<(), String> {
    {
        let mut shortcuts = shortcut_state.0.lock().map_err(to_error)?;
        *shortcuts = hotkeys.clone();
    }

    #[cfg(desktop)]
    {
        let shortcut_manager = app.global_shortcut();
        let _ = shortcut_manager.unregister_all();

        let toggle_shortcut: Shortcut = hotkeys.toggle_main_window.parse().map_err(to_error)?;
        let quick_capture_shortcut: Shortcut = hotkeys.quick_capture.parse().map_err(to_error)?;

        shortcut_manager
            .register(toggle_shortcut)
            .map_err(to_error)?;
        shortcut_manager
            .register(quick_capture_shortcut)
            .map_err(to_error)?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if let Ok(window) = main_window(&app.handle()) {
                let _ = dock_main_window(&window);
                let _ = remember_window_metrics(&app.handle(), &window);
            }

            #[cfg(desktop)]
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |app, shortcut, event| {
                        if event.state() != ShortcutState::Pressed {
                            return;
                        }

                        let shortcuts = app.state::<ShortcutConfigState>();
                        let current = shortcuts.0.lock().ok().map(|value| value.clone());
                        let Some(current) = current else {
                            return;
                        };

                        let toggle_shortcut = current.toggle_main_window.parse::<Shortcut>().ok();
                        let quick_capture_shortcut = current.quick_capture.parse::<Shortcut>().ok();

                        if toggle_shortcut.as_ref().is_some_and(|expected| expected == shortcut) {
                            let _ = toggle_shortcut_window_inner(app);
                            return;
                        }

                        if quick_capture_shortcut
                            .as_ref()
                            .is_some_and(|expected| expected == shortcut)
                        {
                            if let Ok(window) = main_window(app) {
                                let _ = show_window_for_shortcut(app, &window);
                            }
                            let _ = app.emit(
                                SHORTCUT_EVENT_NAME,
                                ShortcutEventPayload {
                                    kind: "quick-capture",
                                },
                            );
                        }
                    })
                    .build(),
            )?;
            Ok(())
        })
        .manage(ShortcutConfigState::default())
        .manage(PinState::default())
        .manage(TemporaryRevealState::default())
        .manage(WindowMetricsState::default())
        .invoke_handler(tauri::generate_handler![
            load_app_state,
            save_app_state,
            export_app_state,
            get_app_info,
            set_always_on_top,
            set_window_opacity,
            toggle_main_window,
            open_settings_window,
            close_settings_window,
            get_current_window_label,
            register_global_shortcuts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())
}

fn ensure_settings_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
        debug_window_message("ensure_settings_window:reuse_existing".to_string());
        return Ok(window);
    }

    debug_window_message(format!(
        "ensure_settings_window:create path={SETTINGS_WINDOW_PATH} size={}x{} min_size={}x{} init_script_window_kind=settings",
        SETTINGS_WINDOW_WIDTH,
        SETTINGS_WINDOW_HEIGHT,
        SETTINGS_WINDOW_MIN_WIDTH,
        SETTINGS_WINDOW_MIN_HEIGHT
    ));
    let window = WebviewWindowBuilder::new(
        app,
        SETTINGS_WINDOW_LABEL,
        WebviewUrl::App(SETTINGS_WINDOW_PATH.into()),
    )
        .title("FloatFlow 设置")
        .inner_size(SETTINGS_WINDOW_WIDTH, SETTINGS_WINDOW_HEIGHT)
        .min_inner_size(SETTINGS_WINDOW_MIN_WIDTH, SETTINGS_WINDOW_MIN_HEIGHT)
        .resizable(true)
        .decorations(true)
        .transparent(false)
        .shadow(true)
        .initialization_script(SETTINGS_WINDOW_INIT_SCRIPT)
        .center()
        .build()
        .map_err(to_error)?;
    debug_window_message("ensure_settings_window:created".to_string());
    Ok(window)
}

fn focus_settings_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    debug_window_message("focus_settings_window:start".to_string());
    if window.is_minimized().map_err(to_error)? {
        debug_window_message("focus_settings_window:unminimize".to_string());
        window.unminimize().map_err(to_error)?;
    }

    window.show().map_err(to_error)?;
    debug_window_message("focus_settings_window:show".to_string());
    window.set_focus().map_err(to_error)?;
    debug_window_message("focus_settings_window:focus".to_string());
    Ok(())
}

fn toggle_main_window_inner(app: &AppHandle) -> Result<(), String> {
    let window = main_window(app)?;
    let is_visible = window.is_visible().map_err(to_error)?;
    debug_window_snapshot(app, &window, "toggle_main_window_inner:start");

    if is_visible {
        hide_window(app, &window)?;
    } else {
        show_window_for_shortcut(app, &window)?;
    }

    debug_window_snapshot(app, &window, "toggle_main_window_inner:end");

    Ok(())
}

fn toggle_shortcut_window_inner(app: &AppHandle) -> Result<(), String> {
    let window = main_window(app)?;
    let is_visible = window.is_visible().map_err(to_error)?;
    debug_window_snapshot(app, &window, "toggle_shortcut_window_inner:start");
    let action = toggle_shortcut_action(
        is_visible,
        is_pinned(app)?,
        is_temporarily_revealed(app)?,
    );

    match action {
        ToggleShortcutAction::Show | ToggleShortcutAction::RecallPinnedToFront => {
            show_window_for_shortcut(app, &window)?
        }
        ToggleShortcutAction::Hide => hide_window(app, &window)?,
    }

    debug_window_snapshot(app, &window, "toggle_shortcut_window_inner:end");

    Ok(())
}

fn dock_main_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    let monitor = resolve_window_monitor(window)?;
    dock_window_on_monitor(window, &monitor)
}

fn show_window_for_shortcut(
    app: &AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<(), String> {
    let pinned = is_pinned(app)?;
    debug_window_snapshot(app, window, "show_window_for_shortcut:before-plan");
    let activation_plan = shortcut_activation_plan(pinned);
    set_temporary_reveal(app, activation_plan.should_temporarily_unpin)?;
    let monitor = resolve_shortcut_monitor(app, window)?;
    if let Some(size) = estimated_window_size_for_monitor(app, monitor.scale_factor())? {
        debug_window_message(format!(
            "show_window_for_shortcut:estimated_size width={} height={} monitor_scale={:.3}",
            size.width, size.height, monitor.scale_factor()
        ));
        dock_window_on_monitor_with_size(window, &monitor, size)?;
    }
    debug_window_snapshot(app, window, "show_window_for_shortcut:after-pre-dock");
    window.show().map_err(to_error)?;
    sync_window_layer(window, current_window_layer(app)?)?;
    debug_window_snapshot(app, window, "show_window_for_shortcut:after-show-sync");
    reveal_window_after_shortcut(app, window)?;
    let result = if activation_plan.should_redock_after_reveal {
        dock_window_on_monitor(window, &monitor)
    } else {
        Ok(())
    };
    let _ = remember_window_metrics(app, window);
    debug_window_snapshot(app, window, "show_window_for_shortcut:end");
    result
}

fn reveal_window_after_shortcut(
    app: &AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<(), String> {
    let plan = shortcut_activation_plan(is_pinned(app)?);
    debug_window_snapshot(app, window, "reveal_window_after_shortcut:start");

    if plan.should_unminimize && window.is_minimized().map_err(to_error)? {
        window.unminimize().map_err(to_error)?;
        debug_window_snapshot(app, window, "reveal_window_after_shortcut:after-unminimize");
    }

    if !plan.should_focus {
        return Ok(());
    }

    if plan.should_raise_temporarily {
        window.set_always_on_top(true).map_err(to_error)?;
        let focus_result = window.set_focus().map_err(to_error);
        let restore_result = window.set_always_on_top(false).map_err(to_error);
        focus_result?;
        restore_result?;
        debug_window_snapshot(app, window, "reveal_window_after_shortcut:after-raise-focus");
        return Ok(());
    }

    window.set_focus().map_err(to_error)?;
    debug_window_snapshot(app, window, "reveal_window_after_shortcut:after-focus");

    Ok(())
}

fn resolve_window_monitor(window: &tauri::WebviewWindow) -> Result<tauri::Monitor, String> {
    window
        .current_monitor()
        .map_err(to_error)?
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "monitor not found".to_string())
}

fn resolve_shortcut_monitor(
    app: &AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<tauri::Monitor, String> {
    // Hidden windows often report their previous monitor, so shortcut-triggered docking
    // needs to follow the current cursor monitor first.
    app.cursor_position()
        .ok()
        .and_then(|cursor| app.monitor_from_point(cursor.x, cursor.y).ok().flatten())
        .or_else(|| window.current_monitor().ok().flatten())
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "monitor not found".to_string())
}

fn dock_window_on_monitor(
    window: &tauri::WebviewWindow,
    monitor: &tauri::Monitor,
) -> Result<(), String> {
    let current_size = window.outer_size().map_err(to_error)?;
    let current_scale_factor = window.scale_factor().map_err(to_error)?;
    let resolution =
        resolve_window_size_for_monitor(current_size, current_scale_factor, monitor.scale_factor());
    debug_window_message(format!(
        "dock_window_on_monitor:reported_size={}x{} reported_scale={:.3} applied_size={}x{} should_restore_native_size={} monitor_pos=({}, {}) monitor_size={}x{}",
        current_size.width,
        current_size.height,
        current_scale_factor,
        resolution.size.width,
        resolution.size.height,
        resolution.should_restore_native_size,
        monitor.position().x,
        monitor.position().y,
        monitor.size().width,
        monitor.size().height
    ));
    if resolution.should_restore_native_size {
        restore_window_size(window, resolution.size)?;
    }
    dock_window_on_monitor_with_size(window, monitor, resolution.size)
}

fn dock_window_on_monitor_with_size(
    window: &tauri::WebviewWindow,
    monitor: &tauri::Monitor,
    size: PhysicalSize<u32>,
) -> Result<(), String> {
    let work_area = monitor.work_area();
    let position = dock_position_for_work_area(
        work_area.position.x,
        work_area.position.y,
        work_area.size.width,
        work_area.size.height,
        size.width,
        size.height,
    );
    debug_window_message(format!(
        "dock_window_on_monitor_with_size:work_area_pos=({}, {}) work_area_size={}x{} size={}x{} target_pos=({}, {})",
        work_area.position.x,
        work_area.position.y,
        work_area.size.width,
        work_area.size.height,
        size.width,
        size.height,
        position.x,
        position.y
    ));

    window
        .set_position(Position::Physical(position))
        .map_err(to_error)
}

fn estimated_window_size_for_monitor(
    app: &AppHandle,
    target_scale_factor: f64,
) -> Result<Option<PhysicalSize<u32>>, String> {
    let metrics = app
        .state::<WindowMetricsState>()
        .0
        .lock()
        .map_err(to_error)?
        .as_ref()
        .copied();

    Ok(Some(
        metrics
            .map(|metrics| {
                scale_physical_size(
                    metrics.outer_size,
                    metrics.scale_factor,
                    target_scale_factor,
                )
            })
            .unwrap_or_else(|| default_window_size_for_scale_factor(target_scale_factor)),
    ))
}

fn remember_window_metrics(app: &AppHandle, window: &tauri::WebviewWindow) -> Result<(), String> {
    let scale_factor = window.scale_factor().map_err(to_error)?;
    let Some(outer_size) =
        sanitize_reported_window_size(window.outer_size().map_err(to_error)?, scale_factor)
    else {
        debug_window_message("remember_window_metrics:ignored_transient_size".to_string());
        return Ok(());
    };

    let metrics = WindowMetrics {
        outer_size,
        scale_factor,
    };

    let metrics_state = app.state::<WindowMetricsState>();
    let mut state = metrics_state
        .0
        .lock()
        .map_err(to_error)?;
    *state = Some(metrics);
    debug_window_message(format!(
        "remember_window_metrics:stored_size={}x{} scale={:.3}",
        outer_size.width, outer_size.height, scale_factor
    ));

    Ok(())
}

fn set_pin_state(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let pin_state = app.state::<PinState>();
    let mut state = pin_state.0.lock().map_err(to_error)?;
    *state = enabled;
    Ok(())
}

fn is_pinned(app: &AppHandle) -> Result<bool, String> {
    let pin_state = app.state::<PinState>();
    let state = pin_state.0.lock().map_err(to_error)?;
    Ok(*state)
}

fn set_temporary_reveal(app: &AppHandle, enabled: bool) -> Result<(), String> {
    let temporary_reveal_state = app.state::<TemporaryRevealState>();
    let mut state = temporary_reveal_state.0.lock().map_err(to_error)?;
    *state = enabled;
    Ok(())
}

fn is_temporarily_revealed(app: &AppHandle) -> Result<bool, String> {
    let temporary_reveal_state = app.state::<TemporaryRevealState>();
    let state = temporary_reveal_state.0.lock().map_err(to_error)?;
    Ok(*state)
}

fn current_window_layer(app: &AppHandle) -> Result<WindowLayerState, String> {
    Ok(window_layer_for_pin(
        is_pinned(app)?,
        is_temporarily_revealed(app)?,
    ))
}

fn sync_window_layer(window: &tauri::WebviewWindow, layer: WindowLayerState) -> Result<(), String> {
    window
        .set_always_on_top(layer.always_on_top)
        .map_err(to_error)?;
    window
        .set_always_on_bottom(layer.always_on_bottom)
        .map_err(to_error)
}

fn hide_window(app: &AppHandle, window: &tauri::WebviewWindow) -> Result<(), String> {
    debug_window_snapshot(app, window, "hide_window:before");
    set_temporary_reveal(app, false)?;
    let result = window.hide().map_err(to_error);
    debug_window_snapshot(app, window, "hide_window:after");
    result
}

fn scale_physical_size(
    size: PhysicalSize<u32>,
    from_scale_factor: f64,
    to_scale_factor: f64,
) -> PhysicalSize<u32> {
    if from_scale_factor <= 0.0 || to_scale_factor <= 0.0 {
        return size;
    }

    let width = ((size.width as f64 / from_scale_factor) * to_scale_factor).round() as u32;
    let height = ((size.height as f64 / from_scale_factor) * to_scale_factor).round() as u32;

    PhysicalSize::new(width, height)
}

fn default_window_size_for_scale_factor(scale_factor: f64) -> PhysicalSize<u32> {
    scale_physical_size(
        PhysicalSize::new(WINDOW_WIDTH, WINDOW_HEIGHT),
        1.0,
        scale_factor,
    )
}

fn resolve_window_size_for_monitor(
    reported_size: PhysicalSize<u32>,
    reported_scale_factor: f64,
    target_scale_factor: f64,
) -> WindowSizeResolution {
    if let Some(size) = sanitize_reported_window_size(reported_size, reported_scale_factor) {
        return WindowSizeResolution {
            size,
            should_restore_native_size: false,
        };
    }

    WindowSizeResolution {
        size: default_window_size_for_scale_factor(target_scale_factor),
        should_restore_native_size: true,
    }
}

fn sanitize_reported_window_size(
    size: PhysicalSize<u32>,
    scale_factor: f64,
) -> Option<PhysicalSize<u32>> {
    let minimum_size = default_window_size_for_scale_factor(scale_factor);
    if size.width < minimum_size.width || size.height < minimum_size.height {
        return None;
    }

    Some(size)
}

fn restore_window_size(
    window: &tauri::WebviewWindow,
    size: PhysicalSize<u32>,
) -> Result<(), String> {
    debug_window_message(format!(
        "restore_window_size:applying_size={}x{}",
        size.width, size.height
    ));
    window
        .set_size(Size::Physical(size))
        .map_err(to_error)
}

fn dock_position_for_work_area(
    work_area_x: i32,
    work_area_y: i32,
    work_area_width: u32,
    work_area_height: u32,
    window_width: u32,
    window_height: u32,
) -> PhysicalPosition<i32> {
    let x = work_area_x + work_area_width as i32 - window_width as i32 - WINDOW_MARGIN;
    let y = work_area_y + work_area_height as i32 - window_height as i32 - WINDOW_MARGIN;

    PhysicalPosition::new(x, y)
}

fn shortcut_activation_plan(is_pinned: bool) -> ShortcutActivationPlan {
    ShortcutActivationPlan {
        should_unminimize: true,
        should_focus: should_focus_after_shortcut(is_pinned),
        should_raise_temporarily: should_raise_after_shortcut(is_pinned),
        should_temporarily_unpin: is_pinned,
        should_redock_after_reveal: true,
    }
}

fn window_layer_for_pin(is_pinned: bool, is_temporarily_revealed: bool) -> WindowLayerState {
    if is_pinned && !is_temporarily_revealed {
        WindowLayerState {
            always_on_top: false,
            always_on_bottom: true,
        }
    } else {
        WindowLayerState {
            always_on_top: false,
            always_on_bottom: false,
        }
    }
}

fn should_focus_after_shortcut(_is_pinned: bool) -> bool {
    true
}

fn should_raise_after_shortcut(_is_pinned: bool) -> bool {
    true
}

fn toggle_shortcut_action(
    is_visible: bool,
    is_pinned: bool,
    is_temporarily_revealed: bool,
) -> ToggleShortcutAction {
    if !is_visible {
        return ToggleShortcutAction::Show;
    }

    if is_pinned && !is_temporarily_revealed {
        return ToggleShortcutAction::RecallPinnedToFront;
    }

    ToggleShortcutAction::Hide
}

#[cfg(debug_assertions)]
fn debug_window_snapshot(app: &AppHandle, window: &tauri::WebviewWindow, label: &str) {
    let visible = window.is_visible().ok();
    let minimized = window.is_minimized().ok();
    let outer_size = window.outer_size().ok();
    let scale_factor = window.scale_factor().ok();
    let position = window.outer_position().ok();
    let current_monitor = window.current_monitor().ok().flatten();
    let cursor = app.cursor_position().ok();
    let pinned = is_pinned(app).ok();
    let temporary_reveal = is_temporarily_revealed(app).ok();

    eprintln!(
        "[floatflow-debug] {label} visible={visible:?} minimized={minimized:?} pinned={pinned:?} temporary_reveal={temporary_reveal:?} size={size:?} scale={scale_factor:?} position={position:?} monitor={monitor} cursor={cursor:?}",
        size = outer_size.map(|size| (size.width, size.height)),
        monitor = current_monitor
            .map(|monitor| format!(
                "pos=({}, {}) size={}x{} work=({}, {}) {}x{} scale={:.3}",
                monitor.position().x,
                monitor.position().y,
                monitor.size().width,
                monitor.size().height,
                monitor.work_area().position.x,
                monitor.work_area().position.y,
                monitor.work_area().size.width,
                monitor.work_area().size.height,
                monitor.scale_factor()
            ))
            .unwrap_or_else(|| "None".to_string()),
    );
}

#[cfg(not(debug_assertions))]
fn debug_window_snapshot(_app: &AppHandle, _window: &tauri::WebviewWindow, _label: &str) {}

#[cfg(debug_assertions)]
fn debug_window_message(message: String) {
    eprintln!("[floatflow-debug] {message}");
}

#[cfg(not(debug_assertions))]
fn debug_window_message(_message: String) {}

fn broadcast_app_state_updated(app: &AppHandle, state: &AppStatePayload) -> Result<(), String> {
    app.emit(APP_STATE_UPDATED_EVENT_NAME, state)
        .map_err(to_error)
}

fn app_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(to_error)?;
    fs::create_dir_all(&app_data_dir).map_err(to_error)?;
    Ok(app_data_dir.join(APP_STATE_FILE))
}

fn write_state_file(path: &Path, state: &AppStatePayload) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(to_error)?;
    }

    let serialized = serde_json::to_string_pretty(state).map_err(to_error)?;
    fs::write(path, serialized).map_err(to_error)
}

fn default_hotkeys() -> Hotkeys {
    Hotkeys {
        toggle_main_window: "Alt+Space".to_string(),
        quick_capture: "Alt+N".to_string(),
    }
}

fn default_app_state() -> AppStatePayload {
    AppStatePayload {
        schema_version: 2,
        todos: Vec::new(),
        memos: Vec::new(),
        memo: None,
        preferences: AppPreferences {
            theme: "light".to_string(),
            window_opacity: 0.86,
            always_on_top: true,
            default_mode: "todo".to_string(),
            hotkeys: default_hotkeys(),
        },
    }
}

fn to_error<E: std::fmt::Display>(error: E) -> String {
    error.to_string()
}

#[cfg(test)]
mod tests {
    use super::{
        default_window_size_for_scale_factor, dock_position_for_work_area,
        open_settings_window, close_settings_window, resolve_window_size_for_monitor,
        sanitize_reported_window_size, scale_physical_size, shortcut_activation_plan,
        should_focus_after_shortcut, should_raise_after_shortcut, toggle_shortcut_action,
        window_layer_for_pin, ShortcutActivationPlan, ToggleShortcutAction, WindowLayerState,
        WindowSizeResolution,
    };
    use std::future::Future;
    use tauri::{PhysicalPosition, PhysicalSize};

    #[test]
    fn calculates_dock_position_from_primary_monitor_work_area() {
        let position = dock_position_for_work_area(0, 0, 1920, 1080, 420, 680);

        assert_eq!(position, PhysicalPosition::new(1476, 376));
    }

    #[test]
    fn keeps_negative_coordinates_for_left_side_secondary_monitor() {
        let position = dock_position_for_work_area(-1280, 0, 1280, 1024, 420, 680);

        assert_eq!(position, PhysicalPosition::new(-444, 320));
    }

    #[test]
    fn scales_cached_window_size_for_target_monitor() {
        let size = scale_physical_size(PhysicalSize::new(420, 680), 1.0, 1.25);

        assert_eq!(size, PhysicalSize::new(525, 850));
    }

    #[test]
    fn pins_window_to_desktop_layer_instead_of_topmost() {
        assert_eq!(
            window_layer_for_pin(true, false),
            WindowLayerState {
                always_on_top: false,
                always_on_bottom: true,
            }
        );
        assert_eq!(
            window_layer_for_pin(true, true),
            WindowLayerState {
                always_on_top: false,
                always_on_bottom: false,
            }
        );
    }

    #[test]
    fn skips_focus_for_shortcut_when_window_is_pinned_to_desktop() {
        assert!(should_focus_after_shortcut(true));
        assert!(should_focus_after_shortcut(false));
    }

    #[test]
    fn raises_unpinned_window_when_shortcut_recalls_it() {
        assert!(should_raise_after_shortcut(false));
        assert!(should_raise_after_shortcut(true));
    }

    #[test]
    fn redocks_after_reveal_to_use_the_restored_window_size() {
        assert_eq!(
            shortcut_activation_plan(false),
            ShortcutActivationPlan {
                should_unminimize: true,
                should_focus: true,
                should_raise_temporarily: true,
                should_temporarily_unpin: false,
                should_redock_after_reveal: true,
            }
        );
        assert_eq!(
            shortcut_activation_plan(true),
            ShortcutActivationPlan {
                should_unminimize: true,
                should_focus: true,
                should_raise_temporarily: true,
                should_temporarily_unpin: true,
                should_redock_after_reveal: true,
            }
        );
    }

    #[test]
    fn toggle_shortcut_recalls_pinned_window_before_hiding_it() {
        assert_eq!(
            toggle_shortcut_action(true, true, false),
            ToggleShortcutAction::RecallPinnedToFront
        );
        assert_eq!(
            toggle_shortcut_action(true, true, true),
            ToggleShortcutAction::Hide
        );
        assert_eq!(
            toggle_shortcut_action(false, true, false),
            ToggleShortcutAction::Show
        );
    }

    #[test]
    fn falls_back_to_fixed_window_size_for_target_scale() {
        assert_eq!(
            default_window_size_for_scale_factor(1.25),
            PhysicalSize::new(525, 850)
        );
    }

    #[test]
    fn ignores_transient_window_sizes_that_are_smaller_than_the_fixed_shell() {
        assert_eq!(sanitize_reported_window_size(PhysicalSize::new(160, 93), 1.0), None);
        assert_eq!(
            sanitize_reported_window_size(PhysicalSize::new(420, 680), 1.0),
            Some(PhysicalSize::new(420, 680))
        );
    }

    #[test]
    fn restores_native_window_size_when_reported_size_is_transient() {
        assert_eq!(
            resolve_window_size_for_monitor(PhysicalSize::new(160, 28), 1.0, 1.0),
            WindowSizeResolution {
                size: PhysicalSize::new(420, 680),
                should_restore_native_size: true,
            }
        );
        assert_eq!(
            resolve_window_size_for_monitor(PhysicalSize::new(420, 680), 1.0, 1.0),
            WindowSizeResolution {
                size: PhysicalSize::new(420, 680),
                should_restore_native_size: false,
            }
        );
    }

    #[test]
    fn window_management_commands_stay_async_to_avoid_windows_deadlocks() {
        assert_async_window_command(open_settings_window);
        assert_async_window_command(close_settings_window);
    }

    fn assert_async_window_command<F, Fut>(_command: F)
    where
        F: Fn(tauri::AppHandle) -> Fut,
        Fut: Future<Output = Result<(), String>>,
    {
    }
}
