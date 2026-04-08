const WINDOW_KIND_QUERY_KEY = "window";

export function debugLog(scope: string, message: string, details?: unknown) {
  if (!shouldDebugLog()) return;

  const prefix = `[floatflow-debug][${resolveWindowKindLabel()}][${scope}] ${message}`;
  if (typeof details === "undefined") {
    console.info(prefix);
    return;
  }

  console.info(prefix, details);
}

export function debugError(scope: string, message: string, error: unknown) {
  if (!shouldDebugLog()) return;

  console.error(`[floatflow-debug][${resolveWindowKindLabel()}][${scope}] ${message}`, error);
}

function shouldDebugLog() {
  return import.meta.env.DEV && !isVitestEnvironment();
}

function resolveWindowKindLabel() {
  if (typeof window === "undefined") {
    return "server";
  }

  const hintedWindowKind = new URLSearchParams(window.location.search).get(WINDOW_KIND_QUERY_KEY);
  if (hintedWindowKind === "main" || hintedWindowKind === "settings") {
    return hintedWindowKind;
  }

  const datasetWindowKind = document.documentElement.dataset.windowKind;
  return datasetWindowKind || "unknown";
}

function isVitestEnvironment() {
  const maybeProcess = (
    globalThis as typeof globalThis & {
      process?: {
        env?: Record<string, string | undefined>;
      };
    }
  ).process;

  return maybeProcess?.env?.VITEST === "true";
}
