export const CRON_SCHEDULES = {
  ROOM_XP: "0 0 * * *",
  ROOM_SUPPORT: "0 0 * * *",
  MAGIC_BALL: "0 0 * * *",
  SVIP_MONTHLY: "0 0 1 * *",
} as const;

export type CronScheduleKey = keyof typeof CRON_SCHEDULES;

export const getCronSchedule = (key: CronScheduleKey): string => {
  return CRON_SCHEDULES[key];
};