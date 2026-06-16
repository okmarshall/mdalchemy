export interface WatchRenderTrigger {
  readonly reason: string;
}

export interface WatchScheduler {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface WatchRenderSessionOptions<Result> {
  readonly debounceMs?: number;
  readonly scheduler?: WatchScheduler;
  readonly render: (trigger: WatchRenderTrigger) => Promise<Result> | Result;
  readonly onResult: (result: Result, trigger: WatchRenderTrigger) => Promise<void> | void;
  readonly onError: (error: unknown, trigger: WatchRenderTrigger) => Promise<void> | void;
}

export class WatchRenderSession<Result> {
  private readonly debounceMs: number;
  private readonly scheduler: WatchScheduler;
  private timer: unknown;
  private running = false;
  private rerenderRequested = false;
  private pendingReason = "change";
  private disposed = false;

  constructor(private readonly options: WatchRenderSessionOptions<Result>) {
    this.debounceMs = options.debounceMs ?? 150;
    this.scheduler = options.scheduler ?? defaultWatchScheduler;
  }

  requestRender(reason = "change"): void {
    if (this.disposed) return;
    this.pendingReason = reason;
    this.clearTimer();
    this.timer = this.scheduler.setTimeout(() => {
      this.timer = undefined;
      void this.run(this.pendingReason);
    }, this.debounceMs);
  }

  renderNow(reason = "manual"): void {
    if (this.disposed) return;
    this.pendingReason = reason;
    this.clearTimer();
    void this.run(reason);
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }

  private async run(reason: string): Promise<void> {
    if (this.disposed) return;
    if (this.running) {
      this.rerenderRequested = true;
      this.pendingReason = reason;
      return;
    }

    this.running = true;
    const trigger = { reason };
    try {
      const result = await this.options.render(trigger);
      if (!this.disposed) await this.options.onResult(result, trigger);
    } catch (error) {
      if (!this.disposed) await this.options.onError(error, trigger);
    } finally {
      this.running = false;
    }

    if (this.rerenderRequested && !this.disposed) {
      this.rerenderRequested = false;
      this.requestRender(this.pendingReason);
    }
  }

  private clearTimer(): void {
    if (this.timer === undefined) return;
    this.scheduler.clearTimeout(this.timer);
    this.timer = undefined;
  }
}

const defaultWatchScheduler: WatchScheduler = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
};
