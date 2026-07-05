import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getItem, setItem } from '@/storage/storage';
import { useApp } from './AppContext';
import {
  isNotificationsSupported,
  configureNotifications,
  requestNotificationPermission,
  scheduleClassNotifications,
  cancelClassNotifications,
  scheduleAssignmentNotifications,
  cancelAssignmentNotifications,
  scheduleAttendanceNotifications,
  cancelAttendanceNotifications,
  scheduleHabitNotifications,
  cancelHabitNotifications,
  scheduleSkillNotifications,
  cancelSkillNotifications,
  scheduleTodoNotifications,
  cancelTodoNotifications,
  cancelAllNotifications,
} from '@/utils/notifications';

export type NotificationSettings = {
  classNotifications: boolean;
  assignmentNotifications: boolean;
  attendanceAlerts: boolean;
  habitReminders: boolean;
  skillReminders: boolean;
  todoReminders: boolean;
  masterEnabled: boolean;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  masterEnabled: true,
  classNotifications: true,
  assignmentNotifications: true,
  attendanceAlerts: true,
  habitReminders: true,
  skillReminders: true,
  todoReminders: true,
};

const STORAGE_KEY = 'notification_settings';

type NotificationContextType = {
  settings: NotificationSettings;
  permissionGranted: boolean;
  settingsLoaded: boolean;
  updateSetting: (key: keyof NotificationSettings, value: boolean) => Promise<void>;
  rescheduleAll: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const { timetable, assignments, subjects, habits, skills, todos, isDataLoaded } = useApp();

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const permissionRef = useRef(permissionGranted);
  permissionRef.current = permissionGranted;

  useEffect(() => {
    (async () => {
      const stored = await getItem<NotificationSettings>(STORAGE_KEY, DEFAULT_SETTINGS);
      const merged = { ...DEFAULT_SETTINGS, ...stored };
      setSettings(merged);
      setSettingsLoaded(true);

      if (isNotificationsSupported) {
        configureNotifications();
        const granted = await requestNotificationPermission();
        setPermissionGranted(granted);
      }
    })();
  }, []);

  const rescheduleAll = useCallback(async () => {
    const s = settingsRef.current;
    const granted = permissionRef.current;
    if (!isNotificationsSupported || !granted) return;

    if (!s.masterEnabled) {
      await cancelAllNotifications();
      return;
    }

    await Promise.all([
      s.classNotifications
        ? scheduleClassNotifications(timetable)
        : cancelClassNotifications(),
      s.assignmentNotifications
        ? scheduleAssignmentNotifications(assignments)
        : cancelAssignmentNotifications(),
      s.attendanceAlerts
        ? scheduleAttendanceNotifications(subjects)
        : cancelAttendanceNotifications(),
      s.habitReminders
        ? scheduleHabitNotifications(habits)
        : cancelHabitNotifications(),
      s.skillReminders
        ? scheduleSkillNotifications(skills)
        : cancelSkillNotifications(),
      s.todoReminders
        ? scheduleTodoNotifications(todos)
        : cancelTodoNotifications(),
    ]);
  }, [timetable, assignments, subjects, habits, skills, todos]);

  useEffect(() => {
    if (isDataLoaded && settingsLoaded && permissionGranted) {
      rescheduleAll();
    }
  }, [isDataLoaded, settingsLoaded, permissionGranted, rescheduleAll]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && permissionRef.current && isDataLoaded && settingsLoaded) {
        rescheduleAll();
      }
    });
    return () => sub.remove();
  }, [rescheduleAll, isDataLoaded, settingsLoaded]);

  const updateSetting = useCallback(async (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...settingsRef.current, [key]: value };
    setSettings(updated);
    settingsRef.current = updated;
    await setItem(STORAGE_KEY, updated);
    if (permissionRef.current) {
      rescheduleAll();
    }
  }, [rescheduleAll]);

  return (
    <NotificationContext.Provider value={{ settings, permissionGranted, settingsLoaded, updateSetting, rescheduleAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
