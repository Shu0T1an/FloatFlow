import type { TodoItem as TodoItemModel } from "@/shared/domain/app-state";
import { PriorityChip } from "@/shared/ui/PriorityChip";
import { useAppStore } from "@/store/app-store";

interface TodoItemProps {
  todo: TodoItemModel;
}

export function TodoItem({ todo }: TodoItemProps) {
  const toggleTodo = useAppStore((state) => state.toggleTodo);

  return (
    <article
      className={`ff-note-card flex items-center gap-3 rounded-[20px] px-3 py-3 transition ${
        todo.completed ? "ff-note-card-dim opacity-75" : ""
      }`}
    >
      <button
        aria-label={`toggle-${todo.title}`}
        className={`grid h-5 w-5 flex-none place-items-center rounded-full border text-[10px] transition ${
          todo.completed
            ? "border-[rgba(110,145,216,0.42)] bg-[rgba(90,132,234,0.14)] text-[var(--ff-blue-strong)]"
            : "border-[rgba(166,188,220,0.56)] bg-transparent text-transparent"
        }`}
        type="button"
        onClick={() => toggleTodo(todo.id)}
      >
        {todo.completed ? <CheckIcon /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-medium text-[var(--ff-title)] ${todo.completed ? "line-through" : ""}`}>
          {todo.title}
        </p>
      </div>

      <PriorityChip priority={todo.priority} />
    </article>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden className="h-3 w-3" fill="none" viewBox="0 0 16 16">
      <path
        d="M3.5 8.2 6.5 11l6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
