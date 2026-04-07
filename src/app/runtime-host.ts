export function applyRuntimeHost(root: HTMLElement, isTauri: boolean) {
  root.dataset.host = isTauri ? "tauri" : "browser";
}
