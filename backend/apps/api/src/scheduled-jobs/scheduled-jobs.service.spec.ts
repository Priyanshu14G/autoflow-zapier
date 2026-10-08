import { ScheduledJobsService } from './scheduled-jobs.service';

/**
 * Tests for the ScheduledJobsService cron matching logic.
 * These test the private methods via a cast to `any` to ensure
 * correctness without needing a database.
 */
describe('ScheduledJobsService - Cron Matching', () => {
  let service: ScheduledJobsService;

  beforeEach(() => {
    // Inject a null prisma; we only test pure calculation methods
    service = new ScheduledJobsService(null as never);
  });

  describe('matchesCron', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = (expr: string, date: Date) => (service as any).matchesCron(expr, date) as boolean;

    it('should match a wildcard expression for any date', () => {
      expect(match('* * * * *', new Date('2025-06-15T14:30:00'))).toBe(true);
    });

    it('should match a specific minute and hour', () => {
      const date = new Date('2025-06-15T09:00:00');
      expect(match('0 9 * * *', date)).toBe(true);
    });

    it('should not match the wrong minute', () => {
      const date = new Date('2025-06-15T09:01:00');
      expect(match('0 9 * * *', date)).toBe(false);
    });

    it('should match a day-of-week range (Mon-Fri)', () => {
      const monday = new Date('2025-06-16T09:00:00'); // Monday
      const saturday = new Date('2025-06-21T09:00:00'); // Saturday
      expect(match('0 9 * * 1-5', monday)).toBe(true);
      expect(match('0 9 * * 1-5', saturday)).toBe(false);
    });

    it('should match a step expression (every 15 minutes)', () => {
      const d0 = new Date('2025-06-15T14:00:00');
      const d15 = new Date('2025-06-15T14:15:00');
      const d30 = new Date('2025-06-15T14:30:00');
      const d07 = new Date('2025-06-15T14:07:00');
      expect(match('*/15 * * * *', d0)).toBe(true);
      expect(match('*/15 * * * *', d15)).toBe(true);
      expect(match('*/15 * * * *', d30)).toBe(true);
      expect(match('*/15 * * * *', d07)).toBe(false);
    });

    it('should match a comma list in minute field', () => {
      const d10 = new Date('2025-06-15T14:10:00');
      const d30 = new Date('2025-06-15T14:30:00');
      const d45 = new Date('2025-06-15T14:45:00');
      const d20 = new Date('2025-06-15T14:20:00');
      expect(match('10,30,45 * * * *', d10)).toBe(true);
      expect(match('10,30,45 * * * *', d30)).toBe(true);
      expect(match('10,30,45 * * * *', d45)).toBe(true);
      expect(match('10,30,45 * * * *', d20)).toBe(false);
    });
  });

  describe('calculateNextRunAt', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calc = (dto: { cronExpression?: string; intervalMs?: number }, from: Date) =>
      (service as any).calculateNextRunAt(dto, from) as Date;

    it('should add intervalMs to the from date', () => {
      const from = new Date('2025-06-15T00:00:00.000Z');
      const result = calc({ intervalMs: 3_600_000 }, from);
      expect(result.getTime()).toBe(from.getTime() + 3_600_000);
    });

    it('should find the next occurrence for a cron expression', () => {
      const from = new Date('2025-06-15T08:59:00'); // just before 9am
      const result = calc({ cronExpression: '0 9 * * *' }, from);
      // Next 9:00 should be 9:00 on the same day
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(0);
    });
  });
});
