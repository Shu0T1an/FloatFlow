import { useEffect, useRef, useState } from "react";
import { GlassButton } from "@/shared/ui/GlassButton";
import { useAppStore } from "@/store/app-store";

interface QuickCaptureBarProps {
  focusToken: number;
}

export function QuickCaptureBar({ focusToken }: QuickCaptureBarProps) {
  const [value, setValue] = useState("");
  const captureInput = useAppStore((state) => state.captureInput);
  const mode = useAppStore((state) => state.mode);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusToken]);

  const submit = async () => {
    if (!value.trim()) return;
    await captureInput(value);
    setValue("");
  };

  return (
    <div className="ff-panel flex items-center gap-3 p-4">
      <div className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-[var(--ff-blue-soft)] text-lg font-bold text-[var(--ff-blue)]">
        +
      </div>
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="quick-capture-input">
          Quick capture
        </label>
        <input
          id="quick-capture-input"
          ref={inputRef}
          className="w-full border-none bg-transparent text-sm font-medium outline-none placeholder:text-[var(--ff-muted)]"
          placeholder={`当前模式：${mode === "todo" ? "待办" : "便笺"}，输入后按 Enter`}
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <p className="mt-1 text-xs ff-muted">Alt + N 会聚焦这里，快速收下当前任务或灵感。</p>
      </div>
      <GlassButton className="px-3" onClick={() => void submit()}>
        记录
      </GlassButton>
    </div>
  );
}
