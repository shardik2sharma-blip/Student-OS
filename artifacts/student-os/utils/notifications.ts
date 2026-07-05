import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { TimetableSlot, Assignment, Subject, Habit, Skill, Todo } from '@/context/AppContext';

export const isNotificationsSupported = Platform.OS !== 'web';

export function configureNotifications() {
  if (!isNotificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

type _AnyPermResult = Record<string, unknown>;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationsSupported) return false;
  try {
    const existing = (await Notifications.getPermissionsAsync()) as _AnyPermResult;
    if (existing['granted'] === true || existing['status'] === 'granted') return true;
    const result = (await Notifications.requestPermissionsAsync()) as _AnyPermResult;
    return result['granted'] === true || result['status'] === 'granted';
  } catch {
    return false;
  }
}

async function cancelByPrefix(prefix: string) {
  if (!isNotificationsSupported) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(n => n.identifier.startsWith(prefix))
        .map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {}
}

async function safeSchedule(id: string, content: Notifications.NotificationContentInput, trigger: Notifications.SchedulableNotificationTriggerInput) {
  try {
    await Notifications.scheduleNotificationAsync({ identifier: id, content, trigger });
  } catch {}
}

const DAY_TO_WEEKDAY: Record<string, number> = {
  Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6, Saturday: 7,
};

function parseHM(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function subtractMins(h: number, m: number, mins: number): { h: number; m: number } | null {
  const total = h * 60 + m - mins;
  if (total < 0) return null;
  return { h: Math.floor(total / 60), m: total % 60 };
}

// ── 1. Class Notifications ───────────────────────────────────────────────────

export async function scheduleClassNotifications(slots: TimetableSlot[]) {
  await cancelByPrefix('class_');
  for (const slot of slots) {
    const weekday = DAY_TO_WEEKDAY[slot.day];
    if (!weekday) continue;
    const { h, m } = parseHM(slot.startTime);

    const offsets: Array<{ mins: number; key: string }> = [
      { mins: 30, key: '30' },
      { mins: 10, key: '10' },
      { mins: 0, key: '0' },
    ];

    for (const { mins, key } of offsets) {
      let trigH = h, trigM = m;
      if (mins > 0) {
        const result = subtractMins(h, m, mins);
        if (!result) continue;
        trigH = result.h; trigM = result.m;
      }

      const title = mins === 0 ? '🔔 Class Starting Now!' : `⏰ Class in ${mins} minutes`;
      const body = mins === 0
        ? `${slot.subjectName} · Room ${slot.room}${slot.teacher ? ` · ${slot.teacher}` : ''}`
        : `${slot.subjectName} starts at ${slot.startTime} · Room ${slot.room}`;

      await safeSchedule(
        `class_${slot.id}_${key}`,
        { title, body, data: { type: 'class', slotId: slot.id } },
        {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: trigH,
          minute: trigM,
        }
      );
    }
  }
}

export async function cancelClassNotifications() {
  await cancelByPrefix('class_');
}

// ── 2. Assignment Notifications ──────────────────────────────────────────────

export async function scheduleAssignmentNotifications(assignments: Assignment[]) {
  await cancelByPrefix('assignment_');
  const now = Date.now();

  for (const a of assignments) {
    if (!a.deadline) continue;
    if (a.status === 'submitted' || a.status === 'graded' || a.status === 'missed') continue;

    const deadline = new Date(a.deadline).getTime();
    if (isNaN(deadline)) continue;

    const reminders: Array<{ ms: number; key: string; label: string }> = [
      { ms: 3 * 86400000, key: '3d', label: '3 days' },
      { ms: 86400000, key: '1d', label: 'tomorrow' },
      { ms: 6 * 3600000, key: '6h', label: '6 hours' },
      { ms: 3600000, key: '1h', label: '1 hour' },
    ];

    for (const { ms, key, label } of reminders) {
      const triggerMs = deadline - ms;
      if (triggerMs <= now) continue;
      await safeSchedule(
        `assignment_${a.id}_${key}`,
        {
          title: '📚 Assignment Due Soon',
          body: `"${a.title}" is due in ${label}.`,
          data: { type: 'assignment', id: a.id },
        },
        { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerMs) }
      );
    }

    const sameDay = new Date(deadline).toDateString() === new Date().toDateString();
    if (sameDay) {
      const todayAt8 = new Date(); todayAt8.setHours(8, 0, 0, 0);
      if (todayAt8.getTime() > now) {
        await safeSchedule(
          `assignment_${a.id}_today`,
          {
            title: '⚠️ Assignment Due Today!',
            body: `"${a.title}" deadline is today. Don't forget to submit!`,
            data: { type: 'assignment', id: a.id },
          },
          { type: Notifications.SchedulableTriggerInputTypes.DATE, date: todayAt8 }
        );
      }
    }

    if (deadline < now) {
      const missedAt = deadline + 5 * 60000;
      if (missedAt > now) {
        await safeSchedule(
          `assignment_${a.id}_missed`,
          {
            title: '❌ Assignment Deadline Passed',
            body: `You missed the submission for "${a.title}".`,
            data: { type: 'assignment', id: a.id },
          },
          { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(missedAt) }
        );
      }
    }
  }
}

export async function cancelAssignmentNotifications() {
  await cancelByPrefix('assignment_');
}

// ── 3. Attendance Notifications ──────────────────────────────────────────────

export async function scheduleAttendanceNotifications(subjects: Subject[]) {
  await cancelByPrefix('attendance_');
  const now = new Date();
  const next9am = new Date();
  next9am.setHours(9, 0, 0, 0);
  if (next9am.getTime() <= now.getTime()) next9am.setDate(next9am.getDate() + 1);

  for (const s of subjects) {
    if (s.totalClasses === 0) continue;
    const pct = (s.attendedClasses / s.totalClasses) * 100;
    const min = s.minAttendance;

    let title = '';
    let body = '';

    if (pct < min) {
      const needed = Math.ceil(((min / 100) * s.totalClasses - s.attendedClasses) / (1 - min / 100));
      title = '🚨 Attendance Critical!';
      body = `${s.name}: ${pct.toFixed(1)}% (required ${min}%). Attend next ${needed} class${needed !== 1 ? 'es' : ''} to recover.`;
    } else if (pct < min + 5) {
      title = '⚠️ Attendance Warning';
      body = `${s.name}: ${pct.toFixed(1)}% attendance (min ${min}%). Getting risky!`;
    } else {
      continue;
    }

    await safeSchedule(
      `attendance_${s.id}_warn`,
      { title, body, data: { type: 'attendance', subjectId: s.id } },
      { type: Notifications.SchedulableTriggerInputTypes.DATE, date: next9am }
    );
  }
}

export async function cancelAttendanceNotifications() {
  await cancelByPrefix('attendance_');
}

// ── 4. Habit Notifications ───────────────────────────────────────────────────

export async function scheduleHabitNotifications(habits: Habit[]) {
  await cancelByPrefix('habit_');
  for (const habit of habits) {
    if (habit.frequency === 'daily') {
      await safeSchedule(
        `habit_${habit.id}_daily`,
        {
          title: `${habit.icon} Habit Time!`,
          body: `Time for your "${habit.name}" habit. Don't break your streak!`,
          data: { type: 'habit', habitId: habit.id },
        },
        { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 0 }
      );
    } else if (habit.frequency === 'weekly') {
      for (const day of habit.targetDays) {
        const weekday = DAY_TO_WEEKDAY[day];
        if (!weekday) continue;
        await safeSchedule(
          `habit_${habit.id}_weekly_${weekday}`,
          {
            title: `${habit.icon} Habit Day!`,
            body: `Today is your "${habit.name}" day. Keep going!`,
            data: { type: 'habit', habitId: habit.id },
          },
          { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour: 8, minute: 0 }
        );
      }
    }

    const milestones = [3, 7, 30];
    if (milestones.includes(habit.currentStreak)) {
      const fireAt = new Date(Date.now() + 60000);
      await safeSchedule(
        `habit_${habit.id}_streak_${habit.currentStreak}`,
        {
          title: '🔥 Streak Milestone!',
          body: `${habit.currentStreak}-day streak on "${habit.name}"! Keep it up!`,
          data: { type: 'habit_streak', habitId: habit.id },
        },
        { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt }
      );
    }
  }
}

export async function cancelHabitNotifications() {
  await cancelByPrefix('habit_');
}

// ── 5. Skill Notifications ───────────────────────────────────────────────────

export async function scheduleSkillNotifications(skills: Skill[]) {
  await cancelByPrefix('skill_');
  for (const skill of skills) {
    await safeSchedule(
      `skill_${skill.id}_daily`,
      {
        title: `${skill.icon} Skill Practice`,
        body: `Time to work on ${skill.name}. Consistency builds mastery.`,
        data: { type: 'skill', skillId: skill.id },
      },
      { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0 }
    );
  }
}

export async function cancelSkillNotifications() {
  await cancelByPrefix('skill_');
}

// ── 6. Todo Notifications ────────────────────────────────────────────────────

export async function scheduleTodoNotifications(todos: Todo[]) {
  await cancelByPrefix('todo_');
  const now = Date.now();

  for (const todo of todos) {
    if (todo.isCompleted || !todo.dueDate) continue;
    const due = new Date(todo.dueDate).getTime();
    if (isNaN(due)) continue;

    const offsets: Array<{ mins: number; key: string; label: string }> = [
      { mins: 60, key: '1h', label: '1 hour' },
      { mins: 30, key: '30m', label: '30 minutes' },
    ];

    for (const { mins, key, label } of offsets) {
      const triggerMs = due - mins * 60000;
      if (triggerMs <= now) continue;
      await safeSchedule(
        `todo_${todo.id}_${key}`,
        {
          title: '✅ Task Reminder',
          body: `"${todo.title}" is due in ${label}.`,
          data: { type: 'todo', todoId: todo.id },
        },
        { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerMs) }
      );
    }

    const missedAt = due + 5 * 60000;
    if (missedAt > now) {
      await safeSchedule(
        `todo_${todo.id}_missed`,
        {
          title: '❌ Task Overdue',
          body: `You missed your task: "${todo.title}".`,
          data: { type: 'todo', todoId: todo.id },
        },
        { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(missedAt) }
      );
    }
  }
}

export async function cancelTodoNotifications() {
  await cancelByPrefix('todo_');
}

export async function cancelAllNotifications() {
  if (!isNotificationsSupported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
