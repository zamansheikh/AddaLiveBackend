import cron from "node-cron";

export default class CronManager {
  private static instance: CronManager;

  private constructor() {}

  static getInstance(): CronManager {
    if (!CronManager.instance) {
      CronManager.instance = new CronManager();
    }
    return CronManager.instance;
  }

  start(): void {
    console.log("🕒 Cron jobs started");
  }

  register(
    schedule: string,
    job: () => Promise<void> | void
  ): void {
    cron.schedule(schedule, async () => {
      try {
        await job();
      } catch (error) {
        console.error("Cron job failed:", error);
      }
    });
  }
}
