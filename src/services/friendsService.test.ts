import { describe, expect, it } from 'vitest';
import { calculateWeeklyStudyStats } from './friendsService';
import type { StudySession } from '../types';

const session = (
  id: string,
  scheduledDate: string,
  durationMinutes: number,
  completed: boolean,
  type: StudySession['type'] = 'study'
): StudySession => ({
  id,
  subjectId: 'subject-1',
  topicId: 'topic-1',
  title: id,
  scheduledDate,
  durationMinutes,
  completed,
  type
});

describe('calculateWeeklyStudyStats', () => {
  it('scores completed planned minutes against the current Monday-to-Sunday plan', () => {
    const stats = calculateWeeklyStudyStats([
      session('done', '2026-10-12', 60, true),
      session('planned', '2026-10-14', 30, false),
      session('sunday', '2026-10-18', 30, true),
      session('previous-week', '2026-10-11', 120, true),
      session('next-week', '2026-10-19', 90, true)
    ], new Date(2026, 9, 14, 12));

    expect(stats.weekStart).toBe('2026-10-12');
    expect(stats.weekEnd).toBe('2026-10-18');
    expect(stats.score).toBe(75);
    expect(stats.completedSessions).toBe(2);
    expect(stats.plannedSessions).toBe(3);
    expect(stats.completedMinutes).toBe(90);
    expect(stats.plannedMinutes).toBe(120);
  });

  it('does not count buffer sessions or divide by zero when no study plan exists', () => {
    const stats = calculateWeeklyStudyStats([
      session('buffer', '2026-10-14', 45, true, 'buffer')
    ], new Date(2026, 9, 14, 12));

    expect(stats.score).toBe(0);
    expect(stats.completedSessions).toBe(0);
    expect(stats.plannedSessions).toBe(0);
    expect(stats.plannedMinutes).toBe(0);
  });
});
