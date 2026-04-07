export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));

  return (
    <div className="ff-segmented relative inline-grid grid-cols-2 rounded-[18px] p-1">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[14px] bg-[linear-gradient(180deg,#7ea3f2,#5c86e9)] shadow-[0_10px_20px_rgba(104,142,220,0.24)] transition"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`relative z-10 rounded-[14px] px-4 py-2 text-sm font-semibold transition ${
              active ? "text-white" : "text-[var(--ff-muted)]"
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
