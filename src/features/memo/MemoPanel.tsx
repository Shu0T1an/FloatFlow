import { useEffect, useMemo, useRef } from "react";
import { deriveMemoPreview } from "@/shared/domain/app-state";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useAppStore } from "@/store/app-store";

export function MemoPanel() {
  const memos = useAppStore((state) => state.memos);
  const memoView = useAppStore((state) => state.memoView);
  const activeMemoId = useAppStore((state) => state.activeMemoId);
  const memoFilter = useAppStore((state) => state.memoFilter);
  const isSearchOpen = useAppStore((state) => state.isSearchOpen);
  const saveStatus = useAppStore((state) => state.saveStatus);
  const focusMemoEditorNonce = useAppStore((state) => state.focusMemoEditorNonce);
  const toggleSearch = useAppStore((state) => state.toggleSearch);
  const setMemoFilter = useAppStore((state) => state.setMemoFilter);
  const createMemoDraft = useAppStore((state) => state.createMemoDraft);
  const openMemoEditor = useAppStore((state) => state.openMemoEditor);
  const openMemoList = useAppStore((state) => state.openMemoList);
  const updateActiveMemoContent = useAppStore((state) => state.updateActiveMemoContent);
  const flushActiveMemoSave = useAppStore((state) => state.flushActiveMemoSave);

  const activeMemo = useMemo(
    () => memos.find((memo) => memo.id === activeMemoId) ?? null,
    [activeMemoId, memos],
  );

  const filteredMemos = useMemo(() => {
    const keyword = memoFilter.trim().toLowerCase();
    if (!keyword) return memos;

    return memos.filter((memo) => {
      const target = `${memo.title} ${deriveMemoPreview(memo.content)} ${memo.content}`.toLowerCase();
      return target.includes(keyword);
    });
  }, [memoFilter, memos]);

  if (memoView === "editor" && activeMemo) {
    return (
      <MemoEditor
        focusToken={focusMemoEditorNonce}
        memo={activeMemo}
        saveStatus={saveStatus}
        onBack={openMemoList}
        onBlur={() => void flushActiveMemoSave()}
        onChange={updateActiveMemoContent}
      />
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] ff-muted">Memo</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--ff-title)]">记录瞬时灵感</h2>
        </div>
        <button
          aria-label="Open memo search"
          className={`ff-icon-button ${isSearchOpen ? "text-[var(--ff-blue-strong)]" : ""}`}
          type="button"
          onClick={toggleSearch}
        >
          <SearchIcon />
        </button>
      </div>

      {isSearchOpen ? (
        <input
          aria-label="Filter memos"
          className="ff-inline-input"
          placeholder="筛选便笺..."
          value={memoFilter}
          onChange={(event) => setMemoFilter(event.currentTarget.value)}
        />
      ) : null}

      <button
        aria-label="Create memo from inspiration"
        className="ff-dashed-card rounded-[24px] px-5 py-7 text-center transition"
        type="button"
        onClick={() => createMemoDraft()}
      >
        <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(90,132,234,0.14)] text-[var(--ff-blue-strong)]">
          +
        </span>
        <span className="block text-sm font-semibold text-[var(--ff-title)]">记录瞬时灵感</span>
        <span className="mt-2 block text-xs ff-muted">点击创建一张新的便笺卡片</span>
      </button>

      <div className="grid gap-3">
        {filteredMemos.length ? (
          filteredMemos.map((memo) => (
            <button
              key={memo.id}
              aria-label={`Open memo card ${memo.title}`}
              className="ff-note-card rounded-[22px] px-4 py-4 text-left"
              type="button"
              onClick={() => openMemoEditor(memo.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-[var(--ff-title)]">{memo.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 ff-muted">
                    {deriveMemoPreview(memo.content)}
                  </p>
                </div>
                <span className="text-[11px] ff-muted">{formatMemoTime(memo.updatedAt)}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="ff-dashed-card rounded-[18px] px-4 py-8 text-center text-sm ff-muted">
            没有匹配的便笺，试试直接记录一个新想法。
          </div>
        )}
      </div>
    </section>
  );
}

function MemoEditor({
  focusToken,
  memo,
  saveStatus,
  onBack,
  onBlur,
  onChange,
}: {
  focusToken: number;
  memo: { content: string; title: string };
  saveStatus: "idle" | "pending" | "saving" | "saved" | "error";
  onBack: () => void;
  onBlur: () => void;
  onChange: (content: string) => void;
}) {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    editorRef.current?.focus();
    const length = editorRef.current?.value.length ?? 0;
    editorRef.current?.setSelectionRange(length, length);
  }, [focusToken]);

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <button aria-label="Back to memo list" className="ff-chip-button" type="button" onClick={onBack}>
          返回便笺
        </button>
        <StatusBadge
          label={
            saveStatus === "pending"
              ? "2 秒后自动保存"
              : saveStatus === "saving"
                ? "保存中..."
                : saveStatus === "error"
                  ? "保存失败"
                  : "已保存"
          }
          tone={saveStatus === "saved" ? "success" : saveStatus === "error" ? "warning" : "default"}
        />
      </div>

      <div className="ff-surface-card rounded-[24px] px-4 py-4">
        <p className="text-xs font-semibold tracking-[0.16em] ff-muted">当前便笺</p>
        <p className="mt-2 text-base font-semibold text-[var(--ff-title)]">{memo.title}</p>
      </div>

      <textarea
        ref={editorRef}
        aria-label="Memo editor"
        className="ff-surface-card min-h-[320px] rounded-[24px] p-4 text-[15px] leading-7 text-[var(--ff-title)] outline-none placeholder:text-[var(--ff-muted)]"
        placeholder="写下你的灵感、备注或临时信息..."
        value={memo.content}
        onBlur={onBlur}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </section>
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

function formatMemoTime(timestamp: string) {
  const parsed = Number.isNaN(Number(timestamp))
    ? new Date(timestamp)
    : new Date(Number(timestamp) * 1000);

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}
