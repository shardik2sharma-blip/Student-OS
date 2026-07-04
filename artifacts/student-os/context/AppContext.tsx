import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getItem, setItem, generateId } from '@/storage/storage';

export type Subject = {
  id: string;
  name: string;
  code: string;
  color: string;
  minAttendance: number;
  totalClasses: number;
  attendedClasses: number;
  credits: number;
};

export type AttendanceRecord = {
  id: string;
  subjectId: string;
  date: string;
  status: 'present' | 'absent' | 'cancelled';
  note: string;
};

export type Assignment = {
  id: string;
  title: string;
  subjectId: string;
  description: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'inprogress' | 'submitted' | 'missed' | 'graded';
  marks?: number;
  totalMarks?: number;
  createdAt: string;
};

export type TimetableSlot = {
  id: string;
  subjectId: string;
  subjectName: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  teacher: string;
};

export type Habit = {
  id: string;
  name: string;
  icon: string;
  category: 'health' | 'study' | 'social' | 'mindfulness' | 'other';
  frequency: 'daily' | 'weekly';
  targetDays: string[];
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
};

export type HabitLog = {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  note: string;
};

export type Skill = {
  id: string;
  name: string;
  icon: string;
  level: number;
  targetLevel: number;
  totalTimeSpent: number;
  createdAt: string;
};

export type Todo = {
  id: string;
  title: string;
  isCompleted: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  subTasks: { id: string; title: string; isDone: boolean }[];
  isRecurring: boolean;
  createdAt: string;
};

type AppContextType = {
  subjects: Subject[];
  attendance: AttendanceRecord[];
  assignments: Assignment[];
  timetable: TimetableSlot[];
  habits: Habit[];
  habitLogs: HabitLog[];
  skills: Skill[];
  todos: Todo[];

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
};

const AppContext = createContext<AppContextType | null>(null);

function today(): string {
  return new Date().toISOString().split('T')[0];
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
      setSubjects(s);
      setAttendance(a);
      setAssignments(asgn);
      setTimetable(tt);
      setHabits(h);
      setHabitLogs(hl);
      setSkills(sk);
      setTodos(td);
    })();
  }, []);

  // --- Subjects ---
  const addSubject = useCallback((s: Omit<Subject, 'id'>) => {
    const newS = { ...s, id: generateId() };
    setSubjects(prev => {
      const next = [...prev, newS];
      setItem('subjects', next);
      return next;
    });
  }, []);

  const removeSubject = useCallback((id: string) => {
    setSubjects(prev => {
      const next = prev.filter(s => s.id !== id);
      setItem('subjects', next);
      return next;
    });
  }, []);

  const updateSubject = useCallback((id: string, data: Partial<Subject>) => {
    setSubjects(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...data } : s);
      setItem('subjects', next);
      return next;
    });
  }, []);

  // --- Attendance ---
  const addAttendance = useCallback((a: Omit<AttendanceRecord, 'id'>) => {
    const newA = { ...a, id: generateId() };
    setAttendance(prev => {
      const next = [...prev, newA];
      setItem('attendance', next);
      return next;
    });
    // Update subject counts
    if (a.status !== 'cancelled') {
      setSubjects(prev => {
        const next = prev.map(s => {
          if (s.id !== a.subjectId) return s;
          return {
            ...s,
            totalClasses: s.totalClasses + 1,
            attendedClasses: a.status === 'present' ? s.attendedClasses + 1 : s.attendedClasses,
          };
        });
        setItem('subjects', next);
        return next;
      });
    }
  }, []);

  // --- Assignments ---
  const addAssignment = useCallback((a: Omit<Assignment, 'id' | 'createdAt'>) => {
    const newA = { ...a, id: generateId(), createdAt: new Date().toISOString() };
    setAssignments(prev => {
      const next = [...prev, newA];
      setItem('assignments', next);
      return next;
    });
  }, []);

  const updateAssignment = useCallback((id: string, data: Partial<Assignment>) => {
    setAssignments(prev => {
      const next = prev.map(a => a.id === id ? { ...a, ...data } : a);
      setItem('assignments', next);
      return next;
    });
  }, []);

  const removeAssignment = useCallback((id: string) => {
    setAssignments(prev => {
      const next = prev.filter(a => a.id !== id);
      setItem('assignments', next);
      return next;
    });
  }, []);

  // --- Timetable ---
  const addTimetableSlot = useCallback((s: Omit<TimetableSlot, 'id'>) => {
    const newS = { ...s, id: generateId() };
    setTimetable(prev => {
      const next = [...prev, newS];
      setItem('timetable', next);
      return next;
    });
  }, []);

  const removeTimetableSlot = useCallback((id: string) => {
    setTimetable(prev => {
      const next = prev.filter(s => s.id !== id);
      setItem('timetable', next);
      return next;
    });
  }, []);

  // --- Habits ---
  const addHabit = useCallback((h: Omit<Habit, 'id' | 'currentStreak' | 'longestStreak' | 'createdAt'>) => {
    const newH: Habit = { ...h, id: generateId(), currentStreak: 0, longestStreak: 0, createdAt: new Date().toISOString() };
    setHabits(prev => {
      const next = [...prev, newH];
      setItem('habits', next);
      return next;
    });
  }, []);

  const removeHabit = useCallback((id: string) => {
    setHabits(prev => {
      const next = prev.filter(h => h.id !== id);
      setItem('habits', next);
      return next;
    });
  }, []);

  const toggleHabitLog = useCallback((habitId: string, date: string) => {
    setHabitLogs(prev => {
      const existing = prev.find(l => l.habitId === habitId && l.date === date);
      let next: HabitLog[];
      if (existing) {
        next = prev.map(l => l.id === existing.id ? { ...l, completed: !l.completed } : l);
      } else {
        next = [...prev, { id: generateId(), habitId, date, completed: true, note: '' }];
      }
      setItem('habitLogs', next);
      return next;
    });
  }, []);

  const isHabitDoneToday = useCallback((habitId: string) => {
    const t = today();
    return habitLogs.some(l => l.habitId === habitId && l.date === t && l.completed);
  }, [habitLogs]);

  const getHabitLogs = useCallback((habitId: string) => {
    return habitLogs.filter(l => l.habitId === habitId);
  }, [habitLogs]);

  // --- Skills ---
  const addSkill = useCallback((s: Omit<Skill, 'id' | 'createdAt'>) => {
    const newS: Skill = { ...s, id: generateId(), createdAt: new Date().toISOString() };
    setSkills(prev => {
      const next = [...prev, newS];
      setItem('skills', next);
      return next;
    });
  }, []);

  const updateSkill = useCallback((id: string, data: Partial<Skill>) => {
    setSkills(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...data } : s);
      setItem('skills', next);
      return next;
    });
  }, []);

  const removeSkill = useCallback((id: string) => {
    setSkills(prev => {
      const next = prev.filter(s => s.id !== id);
      setItem('skills', next);
      return next;
    });
  }, []);

  // --- Todos ---
  const addTodo = useCallback((t: Omit<Todo, 'id' | 'createdAt'>) => {
    const newT: Todo = { ...t, id: generateId(), createdAt: new Date().toISOString() };
    setTodos(prev => {
      const next = [...prev, newT];
      setItem('todos', next);
      return next;
    });
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => {
      const next = prev.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t);
      setItem('todos', next);
      return next;
    });
  }, []);

  const toggleSubTask = useCallback((todoId: string, subTaskId: string) => {
    setTodos(prev => {
      const next = prev.map(t => {
        if (t.id !== todoId) return t;
        return {
          ...t,
          subTasks: t.subTasks.map(st => st.id === subTaskId ? { ...st, isDone: !st.isDone } : st),
        };
      });
      setItem('todos', next);
      return next;
    });
  }, []);

  const removeTodo = useCallback((id: string) => {
    setTodos(prev => {
      const next = prev.filter(t => t.id !== id);
      setItem('todos', next);
      return next;
    });
  }, []);

  return (
    <AppContext.Provider value={{
      subjects, attendance, assignments, timetable, habits, habitLogs, skills, todos,
      addSubject, removeSubject, updateSubject,
      addAttendance,
      addAssignment, updateAssignment, removeAssignment,
      addTimetableSlot, removeTimetableSlot,
      addHabit, removeHabit, toggleHabitLog, isHabitDoneToday, getHabitLogs,
      addSkill, updateSkill, removeSkill,
      addTodo, toggleTodo, toggleSubTask, removeTodo,
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
