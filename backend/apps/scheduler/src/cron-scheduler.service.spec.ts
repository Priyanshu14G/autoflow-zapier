import { CronSchedulerService } from './cron-scheduler.service';

describe('CronSchedulerService', () => {
  describe('matchesCron', () => {
    it('should match wildcard (* * * * *) for any date', () => {
      const now = new Date('2026-05-15T14:30:00Z');
      expect(CronSchedulerService.matchesCron('* * * * *', now)).toBe(true);
    });

    it('should match specific minute and hour correctly', () => {
      // 2026-10-08 02:30:00 (local time)
      const date = new Date(2026, 9, 8, 2, 30, 0); // month is 0-indexed: 9 = October
      expect(CronSchedulerService.matchesCron('30 2 * * *', date)).toBe(true);
      expect(CronSchedulerService.matchesCron('15 2 * * *', date)).toBe(false);
      expect(CronSchedulerService.matchesCron('30 3 * * *', date)).toBe(false);
    });

    it('should match step values (*/15)', () => {
      const date30 = new Date(2026, 9, 8, 10, 30, 0);
      const date35 = new Date(2026, 9, 8, 10, 35, 0);

      expect(CronSchedulerService.matchesCron('*/15 * * * *', date30)).toBe(true);
      expect(CronSchedulerService.matchesCron('*/15 * * * *', date35)).toBe(false);
    });

    it('should match ranges and lists', () => {
      const dateMon = new Date(2026, 9, 5, 12, 0, 0); // Monday: getDay() = 1
      const dateSun = new Date(2026, 9, 4, 12, 0, 0); // Sunday: getDay() = 0

      // Monday to Friday: 1-5
      expect(CronSchedulerService.matchesCron('0 12 * * 1-5', dateMon)).toBe(true);
      expect(CronSchedulerService.matchesCron('0 12 * * 1-5', dateSun)).toBe(false);

      // List: 1,3,5
      expect(CronSchedulerService.matchesCron('0 12 * * 1,3,5', dateMon)).toBe(true);
      expect(CronSchedulerService.matchesCron('0 12 * * 2,4', dateMon)).toBe(false);
    });
  });

  describe('getNextCronDate', () => {
    it('returns the next minute when every-minute cron is passed', () => {
      const baseDate = new Date(2026, 9, 8, 12, 0, 15);
      const nextDate = CronSchedulerService.getNextCronDate('* * * * *', baseDate);

      expect(nextDate).not.toBeNull();
      expect(nextDate?.getMinutes()).toBe(1);
      expect(nextDate?.getSeconds()).toBe(0);
    });

    it('returns null for invalid cron expressions', () => {
      const baseDate = new Date();
      expect(CronSchedulerService.getNextCronDate('invalid cron expression', baseDate)).toBeNull();
    });
  });
});
