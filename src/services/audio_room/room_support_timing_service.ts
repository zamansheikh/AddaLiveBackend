import { getCronSchedule } from "../../core/config/cron_schedules";

export class RoomSupportTimingService {
  static readonly SCHEDULE = "0 0 * * *";

  static getCronSchedule(): string {
    return this.SCHEDULE;
  }

  static async getNextCalculationTime(): Promise<Date> {
    const cron = require("node-cron");
    const nextRun = cron.strToDate(this.SCHEDULE);
    return nextRun;
  }
}

export { getCronSchedule };