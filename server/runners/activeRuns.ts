export interface ActiveRunHandle {
  cancel: () => void;
}

const activeRuns = new Map<string, ActiveRunHandle>();

export function registerActiveRun(runId: string, handle: ActiveRunHandle): void {
  activeRuns.set(runId, handle);
}

export function unregisterActiveRun(runId: string): void {
  activeRuns.delete(runId);
}

export function cancelActiveRun(runId: string): boolean {
  const handle = activeRuns.get(runId);
  if (!handle) return false;
  handle.cancel();
  return true;
}
