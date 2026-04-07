import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import { useAppStore } from "@/store/app-store";

const options = [
  { label: "待办", value: "todo" as const },
  { label: "便笺", value: "memo" as const },
];

export function ModeSwitch() {
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);

  return <SegmentedControl options={options} value={mode} onChange={setMode} />;
}
