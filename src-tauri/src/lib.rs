use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, Position, State};

#[cfg(desktop)]
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const APP_STATE_FILE: &str = "state.json";
const SHORTCUT_EVENT_NAME: &str = "floatflow://shortcut";
const WINDOW_MARGIN: i32 = 24;

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

struct ShortcutConfigState(Mutex<Hotkeys>);

impl Default for ShortcutConfigState {
    fn default() -> Self {
        Self(Mutex::new(default_hotkeys()))
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
    write_state_file(&path, &state)
}

#[tauri::command]
fn export_app_state(path: String, state: AppStatePayload) -> Result<(), String> {
    write_state_file(Path::new(&path), &state)
}

#[tauri::command]
fn set_always_on_top(app: AppHandle, enabled: bool) -> Result<(), String> {
    let window = main_window(&app)?;
    window.set_always_on_top(enabled).map_err(to_error)
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
                            let _ = toggle_main_window_inner(app);
                            return;
                        }

                        if quick_capture_shortcut
                            .as_ref()
                            .is_some_and(|expected| expected == shortcut)
                        {
                            if let Ok(window) = main_window(app) {
                                let _ = dock_main_window(&window);
                                let _ = window.show();
                                let _ = window.set_focus();
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
        .invoke_handler(tauri::generate_handler![
            load_app_state,
            save_app_state,
            export_app_state,
            set_always_on_top,
            set_window_opacity,
            toggle_main_window,
            register_global_shortcuts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())
}

fn toggle_main_window_inner(app: &AppHandle) -> Result<(), String> {
    let window = main_window(app)?;
    let is_visible = window.is_visible().map_err(to_error)?;

    if is_visible {
        window.hide().map_err(to_error)?;
    } else {
        dock_main_window(&window)?;
        window.show().map_err(to_error)?;
        window.set_focus().map_err(to_error)?;
    }

    Ok(())
}

fn dock_main_window(window: &tauri::WebviewWindow) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(to_error)?
        .or_else(|| window.primary_monitor().ok().flatten())
        .ok_or_else(|| "monitor not found".to_string())?;

    let work_area = monitor.work_area();
    let size = window.outer_size().map_err(to_error)?;
    let x = work_area.position.x + work_area.size.width as i32 - size.width as i32 - WINDOW_MARGIN;
    let y = work_area.position.y + work_area.size.height as i32 - size.height as i32 - WINDOW_MARGIN;

    window
        .set_position(Position::Physical(PhysicalPosition::new(x, y)))
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
