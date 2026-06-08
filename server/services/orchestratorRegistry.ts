export type TaskType = 'image' | 'video';

export interface TaskExecutionContext {
  reqBody: any;
  userId: number;
  route: any;
  quotaCheck: any;
  walletCharged: boolean | { charged: 'points' | 'balance'; amount: number };
  finalPrompt: string;
}

export class OrchestratorRegistry {
  private static loaders = new Map<TaskType, () => Promise<(ctx: TaskExecutionContext) => Promise<any>>>();

  static {
    // Register lazy loaders using dynamic imports.
    // The modules are only requested from disk and compiled in memory
    // during actual runtime usage, which optimizes memory and minimizes bundle overhead.
    this.loaders.set('image', async () => {
      const module = await import('./tasks/imageTask.js');
      return module.executeImageTask;
    });

    this.loaders.set('video', async () => {
      const module = await import('./tasks/videoTask.js');
      return module.executeVideoTask;
    });
  }

  /**
   * Dynamically resolves and lazily fetches the execution logic handler for a specific active AI task.
   * This ensures memory is strictly conserved and startup compilation remains instantaneous.
   */
  public static async getHandler(task: TaskType): Promise<(ctx: TaskExecutionContext) => Promise<any>> {
    const loader = this.loaders.get(task);
    if (!loader) {
      throw new Error(`Orchestrator Registry: Unknown or unregistered task type '${task}'.`);
    }
    return await loader();
  }
}
