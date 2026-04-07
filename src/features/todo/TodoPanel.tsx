import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GlassButton } from "@/shared/ui/GlassButton";
import { useAppStore } from "@/store/app-store";
import { TodoItem } from "./TodoItem";

export function TodoPanel() {
  const todos = useAppStore((state) => state.todos);
  const addTodo = useAppStore((state) => state.addTodo);
  const clearCompletedTodos = useAppStore((state) => state.clearCompletedTodos);
  const todoFilter = useAppStore((state) => state.todoFilter);
  const isSearchOpen = useAppStore((state) => state.isSearchOpen);
  const toggleSearch = useAppStore((state) => state.toggleSearch);
  const setTodoFilter = useAppStore((state) => state.setTodoFilter);
  const focusTodoInputNonce = useAppStore((state) => state.focusTodoInputNonce);

  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusTodoInputNonce]);

  const filteredTodos = useMemo(() => {
    const keyword = todoFilter.trim().toLowerCase();
    if (!keyword) return todos;
    return todos.filter((todo) => todo.title.toLowerCase().includes(keyword));
  }, [todoFilter, todos]);

  const activeTodos = filteredTodos.filter((todo) => !todo.completed);
  const completedTodos = filteredTodos.filter((todo) => todo.completed);

  const submit = () => {
    if (!value.trim()) return;
    addTodo(value);
    setValue("");
  };

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] ff-muted">Todo</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--ff-title)]">把当前任务留在手边</h2>
        </div>
        <button
          aria-label="Open todo search"
          className={`ff-icon-button ${isSearchOpen ? "text-[var(--ff-blue-strong)]" : ""}`}
          type="button"
          onClick={toggleSearch}
        >
          <SearchIcon />
        </button>
      </div>

      {isSearchOpen ? (
        <input
          aria-label="Filter todos"
          className="ff-inline-input"
          placeholder="筛选待办..."
          value={todoFilter}
          onChange={(event) => setTodoFilter(event.currentTarget.value)}
        />
      ) : null}

      <div className="ff-inline-input-shell">
        <span className="grid h-8 w-8 place-items-center rounded-[12px] bg-[rgba(90,132,234,0.16)] text-lg text-[var(--ff-blue-strong)]">
          +
        </span>
        <input
          ref={inputRef}
          aria-label="Todo input"
          className="w-full border-none bg-transparent text-[15px] text-[var(--ff-title)] outline-none placeholder:text-[var(--ff-muted)]"
          placeholder="输入任务后按 Enter..."
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
        />
      </div>

      <TodoSection title="进行中" count={activeTodos.length}>
        {activeTodos.length ? (
          activeTodos.map((todo) => <TodoItem key={todo.id} todo={todo} />)
        ) : (
          <EmptyState>还没有进行中的任务，先记下一条最小行动。</EmptyState>
        )}
      </TodoSection>

      <TodoSection title="已完成" count={completedTodos.length}>
        {completedTodos.length ? (
          completedTodos.map((todo) => <TodoItem key={todo.id} todo={todo} />)
        ) : (
          <EmptyState compact>已完成任务会收纳在这里。</EmptyState>
        )}
      </TodoSection>

      <div className="flex justify-end">
        <GlassButton className="rounded-[16px] px-3 py-2 text-xs" onClick={() => clearCompletedTodos()}>
          清理已完成
        </GlassButton>
      </div>
    </section>
  );
}

function TodoSection({
  children,
  count,
  title,
}: {
  children: ReactNode;
  count: number;
  title: string;
}) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.12em] ff-muted">{title}</p>
        <span className="ff-pill-badge rounded-full px-2.5 py-1 text-[11px] ff-muted">{count} 项</span>
      </div>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

function EmptyState({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`ff-dashed-card rounded-[18px] px-4 text-sm ff-muted ${compact ? "py-4" : "py-8"}`}>
      {children}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
