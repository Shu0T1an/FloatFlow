import { createStore, type StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import { desktopApi, type DesktopApi, type DesktopAppInfo, type WindowKind } from "@/desktop/api";
import {
  clampOpacity,
  createDefaultState,
  createMemoNote,
  createTodoItem,
  deriveMemoTitle,
  normalizeAppState,
  snapshotAppState,
  sortMemosByUpdatedAt,
  type AppMode,
  type AppState,
  type MemoNote,
} from "@/shared/domain/app-state";
import { debugError, debugLog } from "@/shared/lib/debug-log";
import { extractTags } from "@/shared/lib/tags";

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
type MemoView = "list" | "editor";

interface UiState {
  mode: AppMode;
  windowKind: WindowKind;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  saveStatus: SaveStatus;
  memoView: MemoView;
  activeMemoId: string | null;
  memoFilter: string;
  todoFilter: string;
  isSearchOpen: boolean;
  focusTodoInputNonce: number;
  focusMemoEditorNonce: number;
  appInfo: DesktopAppInfo | null;
}

export interface AppStoreState extends AppState, UiState {
  hydrate: () => Promise<void>;
  setMode: (mode: AppMode) => void;
  openSettingsWindow: () => Promise<void>;
  closeSettingsWindow: () => Promise<void>;
  replacePersistedState: (state: AppState) => void;
  toggleSearch: () => void;
  closeSearch: () => void;
  setTodoFilter: (text: string) => void;
  setMemoFilter: (text: string) => void;
  addTodo: (title: string) => void;
  toggleTodo: (id: string) => void;
  clearCompletedTodos: () => void;
  openMemoList: () => void;
  openMemoEditor: (id: string | "new") => void;
  createMemoDraft: (initialText?: string) => string;
  updateActiveMemoContent: (content: string) => void;
  flushActiveMemoSave: () => Promise<void>;
  toggleAlwaysOnTop: () => Promise<void>;
  setWindowOpacity: (value: number) => Promise<void>;
  toggleTheme: () => void;
  activateQuickCapture: () => void;
  captureInput: (input: string) => Promise<void>;
  exportState: () => Promise<void>;
  toggleMainWindow: () => Promise<void>;
}

const initialUiState: UiState = {
  mode: "todo",
  windowKind: "main",
  isHydrated: false,
  isLoading: true,
  error: null,
  saveStatus: "idle",
  memoView: "list",
  activeMemoId: null,
  memoFilter: "",
  todoFilter: "",
  isSearchOpen: false,
  focusTodoInputNonce: 0,
  focusMemoEditorNonce: 0,
  appInfo: null,
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function createAppStore(api: DesktopApi = desktopApi) {
  let storeRef: StoreApi<AppStoreState>;

  const resolveWindowContext = async () => {
    const [appInfo, windowKind] = await Promise.all([
      api.getAppInfo().catch(() => null),
      api.getCurrentWindowKind().catch(() => "main" as const),
    ]);

    return { appInfo, windowKind };
  };

  const persistNow = async () => {
    const snapshot = selectPersistableState(storeRef.getState());
    storeRef.setState({ saveStatus: "saving" });

    try {
      await api.saveAppState(snapshot);
      storeRef.setState({ saveStatus: "saved", error: null });
    } catch (error) {
      storeRef.setState({
        saveStatus: "error",
        error: toErrorMessage(error),
      });
    }
  };

  const schedulePersist = (delay = 0) => {
    if (saveTimer) clearTimeout(saveTimer);
    storeRef.setState({ saveStatus: delay > 0 ? "pending" : "saving" });
    saveTimer = setTimeout(() => {
      void persistNow();
    }, delay);
  };

  const setActiveMemo = (set: SetState, updater: (memo: MemoNote) => MemoNote) => {
    set((state) => {
      if (!state.activeMemoId) return {};
      const next = state.memos.map((memo) =>
        memo.id === state.activeMemoId ? normalizeMemo(updater(memo)) : memo,
      );
      return { memos: sortMemosByUpdatedAt(next) };
    });
  };

  storeRef = createStore<AppStoreState>((set, get) => ({
    ...createDefaultState(),
    ...initialUiState,
    mode: createDefaultState().preferences.defaultMode,
    async hydrate() {
      debugLog("app-store", "hydrate start");
      set({ isLoading: true, error: null });

      try {
        const loaded = normalizeAppState(await api.loadAppState());
        const { appInfo, windowKind } = await resolveWindowContext();
        debugLog("app-store", "hydrate resolved context", {
          windowKind,
          hasAppInfo: Boolean(appInfo),
          todos: loaded.todos.length,
          memos: loaded.memos.length,
          theme: loaded.preferences.theme,
        });
        set({
          ...loaded,
          ...initialUiState,
          appInfo,
          windowKind,
          mode: loaded.preferences.defaultMode,
          isHydrated: true,
          isLoading: false,
        });
        if (windowKind === "main") {
          debugLog("app-store", "hydrate applying main-window desktop effects", {
            alwaysOnTop: loaded.preferences.alwaysOnTop,
            windowOpacity: loaded.preferences.windowOpacity,
            hotkeys: loaded.preferences.hotkeys,
          });
          await api.setAlwaysOnTop(loaded.preferences.alwaysOnTop);
          await api.setWindowOpacity(loaded.preferences.windowOpacity);
          await api.registerGlobalShortcuts(loaded.preferences.hotkeys);
        }
        debugLog("app-store", "hydrate success", { windowKind });
      } catch (error) {
        debugError("app-store", "hydrate failed", error);
        const fallback = createDefaultState();
        const { appInfo, windowKind } = await resolveWindowContext();
        set({
          ...fallback,
          ...initialUiState,
          appInfo,
          windowKind,
          mode: fallback.preferences.defaultMode,
          isHydrated: true,
          isLoading: false,
          saveStatus: "error",
          error: toErrorMessage(error),
        });
        debugLog("app-store", "hydrate fallback applied", { windowKind });
      }
    },
    setMode(mode) {
      set((state) => ({
        mode,
        isSearchOpen: false,
        preferences: {
          ...state.preferences,
          defaultMode: mode,
        },
      }));
      schedulePersist();
    },
    async openSettingsWindow() {
      debugLog("app-store", "openSettingsWindow action");
      await api.openSettingsWindow();
    },
    async closeSettingsWindow() {
      debugLog("app-store", "closeSettingsWindow action");
      await api.closeSettingsWindow();
    },
    replacePersistedState(nextState) {
      const normalized = normalizeAppState(nextState);
      debugLog("app-store", "replacePersistedState", {
        todos: normalized.todos.length,
        memos: normalized.memos.length,
        theme: normalized.preferences.theme,
      });
      set((state) => ({
        todos: normalized.todos,
        memos: normalized.memos,
        preferences: normalized.preferences,
        error: state.error,
      }));
    },
    toggleSearch() {
      set((state) => ({
        isSearchOpen: !state.isSearchOpen,
        ...(state.isSearchOpen ? { todoFilter: "", memoFilter: "" } : {}),
      }));
    },
    closeSearch() {
      set({ isSearchOpen: false, todoFilter: "", memoFilter: "" });
    },
    setTodoFilter(text) {
      set({ todoFilter: text });
    },
    setMemoFilter(text) {
      set({ memoFilter: text });
    },
    addTodo(title) {
      const trimmed = title.trim();
      if (!trimmed) return;

      set((state) => ({
        todos: [createTodoItem(trimmed), ...state.todos],
      }));
      schedulePersist();
    },
    toggleTodo(id) {
      set((state) => ({
        todos: state.todos.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                completed: !todo.completed,
                updatedAt: new Date().toISOString(),
              }
            : todo,
        ),
      }));
      schedulePersist();
    },
    clearCompletedTodos() {
      set((state) => ({
        todos: state.todos.filter((todo) => !todo.completed),
      }));
      schedulePersist();
    },
    openMemoList() {
      set({
        memoView: "list",
        isSearchOpen: false,
      });
    },
    openMemoEditor(id) {
      if (id === "new") {
        get().createMemoDraft();
        return;
      }

      set({
        activeMemoId: id,
        memoView: "editor",
        focusMemoEditorNonce: get().focusMemoEditorNonce + 1,
      });
    },
    createMemoDraft(initialText = "") {
      const draft = normalizeMemo(createMemoNote(initialText));
      set((state) => ({
        memos: sortMemosByUpdatedAt([draft, ...state.memos]),
        memoView: "editor",
        activeMemoId: draft.id,
        focusMemoEditorNonce: state.focusMemoEditorNonce + 1,
        mode: "memo",
      }));
      if (initialText.trim()) {
        schedulePersist(2000);
      }
      return draft.id;
    },
    updateActiveMemoContent(content) {
      setActiveMemo(set, (memo) => ({
        ...memo,
        title: deriveMemoTitle(content),
        content,
        tags: extractTags(content),
        updatedAt: new Date().toISOString(),
      }));
      schedulePersist(2000);
    },
    async flushActiveMemoSave() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      await persistNow();
      set({ memoView: "list" });
    },
    async toggleAlwaysOnTop() {
      const next = !get().preferences.alwaysOnTop;
      await api.setAlwaysOnTop(next);
      set((state) => ({
        preferences: {
          ...state.preferences,
          alwaysOnTop: next,
        },
      }));
      schedulePersist();
    },
    async setWindowOpacity(value) {
      const next = clampOpacity(value);
      await api.setWindowOpacity(next);
      set((state) => ({
        preferences: {
          ...state.preferences,
          windowOpacity: next,
        },
      }));
      schedulePersist();
    },
    toggleTheme() {
      set((state) => ({
        preferences: {
          ...state.preferences,
          theme: state.preferences.theme === "light" ? "dark" : "light",
        },
      }));
      schedulePersist();
    },
    activateQuickCapture() {
      if (get().mode === "todo") {
        set((state) => ({
          focusTodoInputNonce: state.focusTodoInputNonce + 1,
        }));
        return;
      }

      get().createMemoDraft();
    },
    async captureInput(input) {
      const trimmed = input.trim();
      if (!trimmed) return;

      if (get().mode === "todo") {
        get().addTodo(trimmed);
        return;
      }

      get().createMemoDraft(trimmed);
    },
    async exportState() {
      await api.exportAppState(selectPersistableState(get()));
    },
    async toggleMainWindow() {
      await api.toggleMainWindow();
    },
  }));

  return storeRef;
}

type SetState = StoreApi<AppStoreState>["setState"];

export const appStore = createAppStore();

export function useAppStore<T>(selector: (state: AppStoreState) => T): T {
  return useStore(appStore, selector);
}

export function resetAppStore() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  const defaults = createDefaultState();
  appStore.setState({
    ...defaults,
    ...initialUiState,
    mode: defaults.preferences.defaultMode,
  });
}

function selectPersistableState(state: AppStoreState): AppState {
  return snapshotAppState({
    schemaVersion: state.schemaVersion,
    todos: state.todos,
    memos: state.memos,
    preferences: state.preferences,
  });
}

function normalizeMemo(memo: MemoNote): MemoNote {
  return {
    ...memo,
    title: deriveMemoTitle(memo.content),
    tags: extractTags(memo.content),
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "发生未知错误";
}
