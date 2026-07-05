import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getItem, setItem, generateId } from '@/storage/storage';
import { syncToCloud, restoreFromCloud, type BackupPayload } from '@/utils/cloudSync';

export type Subject = {
  id: string; name: string; code: string; color: string;
  minAttendance: number; totalClasses: number; attendedClasses: number; credits: number;
};
export type AttendanceRecord = {
  id: string; subjectId: string; date: string;
  status: 'present' | 'absent' | 'cancelled'; note: string;
};
export type Assignment = {
  id: string; title: string; subjectId: string; description: string;
  deadline: string; priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'inprogress' | 'submitted' | 'missed' | 'graded';
  marks?: number; totalMarks?: number; createdAt: string;
};
export type TimetableSlot = {
  id: string; subjectId: string; subjectName: string;
  day: string; startTime: string; endTime: string; room: string; teacher: string;
};
export type Habit = {
  id: string; name: string; icon: string;
  category: 'health' | 'study' | 'social' | 'mindfulness' | 'other';
  frequency: 'daily' | 'weekly'; targetDays: string[];
  currentStreak: number; longestStreak: number; createdAt: string;
};
export type HabitLog = {
  id: string; habitId: string; date: string; completed: boolean; note: string;
};
export type Skill = {
  id: string; name: string; icon: string;
  level: number; targetLevel: number; totalTimeSpent: number; createdAt: string;
};
export type TodoRepeatType = 'daily' | 'weekly' | 'one-time';
export type Todo = {
  id: string; title: string; isCompleted: boolean;
  priority: 'high' | 'medium' | 'low'; dueDate?: string;
  subTasks: { id: string; title: string; isDone: boolean }[];
  isRecurring: boolean; createdAt: string;
  /** Controls automatic reset behaviour */
  repeatType: TodoRepeatType;
  /** ISO date string (YYYY-MM-DD) of when this todo was last completed */
  completedAt?: string;
};

type AppContextType = {
  subjects: Subject[]; attendance: AttendanceRecord[]; assignments: Assignment[];
  timetable: TimetableSlot[]; habits: Habit[]; habitLogs: HabitLog[];
  skills: Skill[]; todos: Todo[];
  isDataLoaded: boolean;

  addSubject: (s: Omit<Subject, 'id'>) => void;
  removeSubject: (id: string) => void;
  updateSubject: (id: string, data: Partial<Subject>) => void;

  addAttendance: (a: Omit<AttendanceRecord, 'id'>) => void;

  addAssignment: (a: Omit<Assignment, 'id' | 'createdAt'>) => void;
  updateAssignment: (id: string, data: Partial<Assignment>) => void;
  removeAssignment: (id: string) => void;

  addTimetableSlot: (s: Omit<TimetableSlot, 'id'>) => void;
  removeTimetableSlot: (id: string) => void;

  addHabit: (h: Omit<Habit, 'id' | 'currentStreak' | 'longestStreak' | 'createdAt'>) => void;
  removeHabit: (id: string) => void;
  toggleHabitLog: (habitId: string, date: string) => void;
  isHabitDoneToday: (habitId: string) => boolean;
  getHabitLogs: (habitId: string) => HabitLog[];

  addSkill: (s: Omit<Skill, 'id' | 'createdAt'>) => void;
  updateSkill: (id: string, data: Partial<Skill>) => void;
  removeSkill: (id: string) => void;

  addTodo: (t: Omit<Todo, 'id' | 'createdAt'>) => void;
  toggleTodo: (id: string) => void;
  toggleSubTask: (todoId: string, subTaskId: string) => void;
  removeTodo: (id: string) => void;

  /** Restore all data from a cloud backup payload (called after login). */
  restoreFromBackup: (payload: BackupPayload) => Promise<void>;
  /** Trigger an immediate cloud sync. */
  syncNow: () => Promise<void>;
};

const AppContext = createContext<AppContextType | null>(null);

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Apply repeat-type reset rules to todos on app load. */
function applyRepeatReset(todos: Todo[]): { todos: Todo[]; changed: boolean } {
  const today = todayStr();
  let changed = false;
  const result = todos.map(t => {
    // Only reset completed todos that have a repeat type
    if (!t.isCompleted) return t;
    const repeat = t.repeatType ?? 'one-time';
    if (repeat === 'one-time') return t;

    if (repeat === 'daily') {
      // Reset if completed on a previous day
      if (t.completedAt && t.completedAt !== today) {
        changed = true;
        return { ...t, isCompleted: false, completedAt: undefined };
      }
    } else if (repeat === 'weekly') {
      // Reset if completed more than 6 days ago
      if (t.completedAt) {
        const daysDiff = Math.floor(
          (new Date(today).getTime() - new Date(t.completedAt).getTime()) / 86400000
        );
        if (daysDiff >= 7) {
          changed = true;
          return { ...t, isCompleted: false, completedAt: undefined };
        }
      }
    }
    return t;
  });
  return { todos: result, changed };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Refs for debounced cloud sync (avoids stale closures)
  const stateRef = useRef({ subjects, attendance, assignments, timetable, habits, habitLogs, skills, todos });
  stateRef.current = { subjects, attendance, assignments, timetable, habits, habitLogs, skills, todos };
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const [s, a, asgn, tt, h, hl, sk, td] = await Promise.all([
        getItem<Subject[]>('subjects', []),
        getItem<AttendanceRecord[]>('attendance', []),
        getItem<Assignment[]>('assignments', []),
        getItem<TimetableSlot[]>('timetable', []),
        getItem<Habit[]>('habits', []),
        getItem<HabitLog[]>('habitLogs', []),
        getItem<Skill[]>('skills', []),
        getItem<Todo[]>('todos', []),
      ]);

      // Migrate old todos that may lack repeatType
      const migratedTodos = td.map(t => ({
        ...t,
        repeatType: t.repeatType ?? 'one-time' as TodoRepeatType,
      }));

      // Apply daily/weekly reset on load
      const { todos: resetTodos, changed } = applyRepeatReset(migratedTodos);
      if (changed) {
        await setItem('todos', resetTodos);
      }

      setSubjects(s); setAttendance(a); setAssignments(asgn); setTimetable(tt);
      setHabits(h); setHabitLogs(hl); setSkills(sk); setTodos(resetTodos);
      setIsDataLoaded(true);
    })();
  }, []);

  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      syncTimer.current = null;
      const [user, hash] = await Promise.all([
        getItem<{ email: string } | null>('auth_user', null),
        getItem<string>('auth_password_hash', ''),
      ]);
      if (!user?.email || !hash) return;
      const s = stateRef.current;
      await syncToCloud(user.email, hash, {
        subjects: s.subjects, attendance: s.attendance, assignments: s.assignments,
        timetable: s.timetable, habits: s.habits, habitLogs: s.habitLogs,
        skills: s.skills, todos: s.todos,
      });
    }, 4000);
  }, []);

  const syncNow = useCallback(async () => {
    if (syncTimer.current) { clearTimeout(syncTimer.current); syncTimer.current = null; }
    const [user, hash] = await Promise.all([
      getItem<{ email: string } | null>('auth_user', null),
      getItem<string>('auth_password_hash', ''),
    ]);
    if (!user?.email || !hash) return;
    const s = stateRef.current;
    await syncToCloud(user.email, hash, {
      subjects: s.subjects, attendance: s.attendance, assignments: s.assignments,
      timetable: s.timetable, habits: s.habits, habitLogs: s.habitLogs,
      skills: s.skills, todos: s.todos,
    });
  }, []);

  const restoreFromBackup = useCallback(async (payload: BackupPayload) => {
    const s = payload.subjects as Subject[] ?? [];
    const a = payload.attendance as AttendanceRecord[] ?? [];
    const asgn = payload.assignments as Assignment[] ?? [];
    const tt = payload.timetable as TimetableSlot[] ?? [];
    const h = payload.habits as Habit[] ?? [];
    const hl = payload.habitLogs as HabitLog[] ?? [];
    const sk = payload.skills as Skill[] ?? [];
    const td = (payload.todos as Todo[] ?? []).map(t => ({
      ...t,
      repeatType: t.repeatType ?? 'one-time' as TodoRepeatType,
    }));

    await Promise.all([
      setItem('subjects', s), setItem('attendance', a), setItem('assignments', asgn),
      setItem('timetable', tt), setItem('habits', h), setItem('habitLogs', hl),
      setItem('skills', sk), setItem('todos', td),
    ]);
    setSubjects(s); setAttendance(a); setAssignments(asgn); setTimetable(tt);
    setHabits(h); setHabitLogs(hl); setSkills(sk); setTodos(td);
  }, []);

  // ── Subjects ──────────────────────────────────────────────────────────────
  const addSubject = useCallback((s: Omit<Subject, 'id'>) => {
    const newS = { ...s, id: generateId() };
    setSubjects(prev => { const n = [...prev, newS]; setItem('subjects', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  const removeSubject = useCallback((id: string) => {
    setSubjects(prev => { const n = prev.filter(s => s.id !== id); setItem('subjects', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  const updateSubject = useCallback((id: string, data: Partial<Subject>) => {
    setSubjects(prev => { const n = prev.map(s => s.id === id ? { ...s, ...data } : s); setItem('subjects', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  // ── Attendance ────────────────────────────────────────────────────────────
  const addAttendance = useCallback((a: Omit<AttendanceRecord, 'id'>) => {
    const newA = { ...a, id: generateId() };
    setAttendance(prev => { const n = [...prev, newA]; setItem('attendance', n); scheduleSync(); return n; });
    if (a.status !== 'cancelled') {
      setSubjects(prev => {
        const n = prev.map(s => {
          if (s.id !== a.subjectId) return s;
          return { ...s, totalClasses: s.totalClasses + 1, attendedClasses: a.status === 'present' ? s.attendedClasses + 1 : s.attendedClasses };
        });
        setItem('subjects', n);
        return n;
      });
    }
  }, [scheduleSync]);

  // ── Assignments ───────────────────────────────────────────────────────────
  const addAssignment = useCallback((a: Omit<Assignment, 'id' | 'createdAt'>) => {
    const newA = { ...a, id: generateId(), createdAt: new Date().toISOString() };
    setAssignments(prev => { const n = [...prev, newA]; setItem('assignments', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  const updateAssignment = useCallback((id: string, data: Partial<Assignment>) => {
    setAssignments(prev => { const n = prev.map(a => a.id === id ? { ...a, ...data } : a); setItem('assignments', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  const removeAssignment = useCallback((id: string) => {
    setAssignments(prev => { const n = prev.filter(a => a.id !== id); setItem('assignments', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  // ── Timetable ─────────────────────────────────────────────────────────────
  const addTimetableSlot = useCallback((s: Omit<TimetableSlot, 'id'>) => {
    const newS = { ...s, id: generateId() };
    setTimetable(prev => { const n = [...prev, newS]; setItem('timetable', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  const removeTimetableSlot = useCallback((id: string) => {
    setTimetable(prev => { const n = prev.filter(s => s.id !== id); setItem('timetable', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  // ── Habits ────────────────────────────────────────────────────────────────
  const addHabit = useCallback((h: Omit<Habit, 'id' | 'currentStreak' | 'longestStreak' | 'createdAt'>) => {
    const newH: Habit = { ...h, id: generateId(), currentStreak: 0, longestStreak: 0, createdAt: new Date().toISOString() };
    setHabits(prev => { const n = [...prev, newH]; setItem('habits', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  const removeHabit = useCallback((id: string) => {
    setHabits(prev => { const n = prev.filter(h => h.id !== id); setItem('habits', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  const toggleHabitLog = useCallback((habitId: string, date: string) => {
    setHabitLogs(prev => {
      const existing = prev.find(l => l.habitId === habitId && l.date === date);
      const n = existing
        ? prev.map(l => l.id === existing.id ? { ...l, completed: !l.completed } : l)
        : [...prev, { id: generateId(), habitId, date, completed: true, note: '' }];
      setItem('habitLogs', n);
      scheduleSync();
      return n;
    });
  }, [scheduleSync]);

  const isHabitDoneToday = useCallback((habitId: string) => {
    const t = todayStr();
    return habitLogs.some(l => l.habitId === habitId && l.date === t && l.completed);
  }, [habitLogs]);

  const getHabitLogs = useCallback((habitId: string) => habitLogs.filter(l => l.habitId === habitId), [habitLogs]);

  // ── Skills ────────────────────────────────────────────────────────────────
  const addSkill = useCallback((s: Omit<Skill, 'id' | 'createdAt'>) => {
    const newS: Skill = { ...s, id: generateId(), createdAt: new Date().toISOString() };
    setSkills(prev => { const n = [...prev, newS]; setItem('skills', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  const updateSkill = useCallback((id: string, data: Partial<Skill>) => {
    setSkills(prev => { const n = prev.map(s => s.id === id ? { ...s, ...data } : s); setItem('skills', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  const removeSkill = useCallback((id: string) => {
    setSkills(prev => { const n = prev.filter(s => s.id !== id); setItem('skills', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  // ── Todos ─────────────────────────────────────────────────────────────────
  const addTodo = useCallback((t: Omit<Todo, 'id' | 'createdAt'>) => {
    const newT: Todo = {
      ...t,
      id: generateId(),
      createdAt: new Date().toISOString(),
      repeatType: t.repeatType ?? 'one-time',
    };
    setTodos(prev => { const n = [...prev, newT]; setItem('todos', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => {
      const n = prev.map(t => {
        if (t.id !== id) return t;
        const nowCompleted = !t.isCompleted;
        return {
          ...t,
          isCompleted: nowCompleted,
          completedAt: nowCompleted ? todayStr() : undefined,
        };
      });
      setItem('todos', n);
      scheduleSync();
      return n;
    });
  }, [scheduleSync]);

  const toggleSubTask = useCallback((todoId: string, subTaskId: string) => {
    setTodos(prev => {
      const n = prev.map(t => {
        if (t.id !== todoId) return t;
        return { ...t, subTasks: t.subTasks.map(st => st.id === subTaskId ? { ...st, isDone: !st.isDone } : st) };
      });
      setItem('todos', n);
      scheduleSync();
      return n;
    });
  }, [scheduleSync]);

  const removeTodo = useCallback((id: string) => {
    setTodos(prev => { const n = prev.filter(t => t.id !== id); setItem('todos', n); scheduleSync(); return n; });
  }, [scheduleSync]);

  return (
    <AppContext.Provider value={{
      subjects, attendance, assignments, timetable, habits, habitLogs, skills, todos,
      isDataLoaded,
      addSubject, removeSubject, updateSubject,
      addAttendance,
      addAssignment, updateAssignment, removeAssignment,
      addTimetableSlot, removeTimetableSlot,
      addHabit, removeHabit, toggleHabitLog, isHabitDoneToday, getHabitLogs,
      addSkill, updateSkill, removeSkill,
      addTodo, toggleTodo, toggleSubTask, removeTodo,
      restoreFromBackup, syncNow,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
