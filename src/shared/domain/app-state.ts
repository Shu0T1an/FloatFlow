import { extractTags } from "@/shared/lib/tags";

export const SCHEMA_VERSION = 2;

export type AppMode = "memo" | "todo";
export type Priority = "low" | "medium" | "high";
export type ThemeMode = "light" | "dark";

export interface Hotkeys {
  toggleMainWindow: string;
  quickCapture: string;
}

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface MemoNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppPreferences {
  theme: ThemeMode;
  windowOpacity: number;
  alwaysOnTop: boolean;
  defaultMode: AppMode;
  hotkeys: Hotkeys;
}

export interface AppState {
  schemaVersion: number;
  todos: TodoItem[];
  memos: MemoNote[];
  preferences: AppPreferences;
}

export interface LegacyMemoEntry {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type AppStateInput = Partial<AppState> & {
  schemaVersion?: number;
  memo?: LegacyMemoEntry | null;
};

export const DEFAULT_HOTKEYS: Hotkeys = {
  toggleMainWindow: "Alt+Space",
  quickCapture: "Alt+N",
};

export function createDefaultState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    todos: [],
    memos: [],
    preferences: {
      theme: "light",
      windowOpacity: 0.86,
      alwaysOnTop: true,
      defaultMode: "todo",
      hotkeys: DEFAULT_HOTKEYS,
    },
  };
}

export function createTodoItem(title: string, priority: Priority = inferPriority(title)): TodoItem {
  const timestamp = nowIso();
  return {
    id: crypto.randomUUID(),
    title: stripPriorityTokens(title),
    completed: false,
    priority,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createMemoNote(content = ""): MemoNote {
  const timestamp = nowIso();
  return normalizeMemoNote({
    id: crypto.randomUUID(),
    title: deriveMemoTitle(content),
    content,
    tags: extractTags(content),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function normalizeAppState(input: AppStateInput | null | undefined): AppState {
  const defaults = createDefaultState();
  const legacySchema = typeof input?.schemaVersion === "number" && input.schemaVersion < SCHEMA_VERSION;

  const todos = Array.isArray(input?.todos)
    ? input.todos.map((todo) => ({
        id: todo.id || crypto.randomUUID(),
        title: todo.title?.trim() || "未命名任务",
        completed: Boolean(todo.completed),
        priority: todo.priority ?? "medium",
        createdAt: todo.createdAt ?? nowIso(),
        updatedAt: todo.updatedAt ?? todo.createdAt ?? nowIso(),
      }))
    : [];

  const memos = normalizeMemos(input, legacySchema);

  return {
    schemaVersion: SCHEMA_VERSION,
    todos,
    memos: sortMemosByUpdatedAt(memos),
    preferences: {
      theme: input?.preferences?.theme ?? defaults.preferences.theme,
      windowOpacity: clampOpacity(input?.preferences?.windowOpacity ?? defaults.preferences.windowOpacity),
      alwaysOnTop: input?.preferences?.alwaysOnTop ?? defaults.preferences.alwaysOnTop,
      defaultMode: legacySchema
        ? defaults.preferences.defaultMode
        : input?.preferences?.defaultMode ?? defaults.preferences.defaultMode,
      hotkeys: {
        toggleMainWindow:
          input?.preferences?.hotkeys?.toggleMainWindow ?? DEFAULT_HOTKEYS.toggleMainWindow,
        quickCapture: input?.preferences?.hotkeys?.quickCapture ?? DEFAULT_HOTKEYS.quickCapture,
      },
    },
  };
}

export function snapshotAppState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

export function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0.1, Number.isFinite(value) ? value : 0.86));
}

export function inferPriority(title: string): Priority {
  const bangs = (title.match(/!/g) ?? []).length;
  if (bangs >= 3) return "high";
  if (bangs >= 2) return "medium";
  return "low";
}

export function stripPriorityTokens(title: string): string {
  return title.replace(/!+/g, "").trim() || title.trim();
}

export function deriveMemoTitle(content: string): string {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine || "新便笺";
}

export function deriveMemoPreview(content: string): string {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return lines[0] || "点击编辑内容...";
  }

  return lines.slice(1).join(" ").trim() || "点击编辑内容...";
}

export function sortMemosByUpdatedAt<T extends Pick<MemoNote, "updatedAt">>(memos: T[]): T[] {
  return [...memos].sort(
    (left, right) => timestampValue(right.updatedAt) - timestampValue(left.updatedAt),
  );
}

export function normalizeMemoNote(note: Partial<MemoNote>): MemoNote {
  const createdAt = note.createdAt ?? nowIso();
  const content = note.content ?? "";

  return {
    id: note.id || crypto.randomUUID(),
    title: note.title?.trim() || deriveMemoTitle(content),
    content,
    tags: extractTags(content),
    createdAt,
    updatedAt: note.updatedAt ?? createdAt,
  };
}

function normalizeMemos(input: AppStateInput | null | undefined, legacySchema: boolean): MemoNote[] {
  if (Array.isArray(input?.memos)) {
    return input.memos.map((memo) => normalizeMemoNote(memo));
  }

  if (!legacySchema || !input?.memo) {
    return [];
  }

  const content = input.memo.content?.trim() ?? "";
  if (!content) {
    return [];
  }

  return [
    normalizeMemoNote({
      id: input.memo.id,
      content: input.memo.content,
      createdAt: input.memo.createdAt,
      updatedAt: input.memo.updatedAt,
    }),
  ];
}

function timestampValue(input: string): number {
  const numeric = Number(input);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  const parsed = Date.parse(input);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function nowIso(): string {
  return new Date().toISOString();
}
