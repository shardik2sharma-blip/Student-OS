import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useNotifications } from '@/context/NotificationContext';
import type { NotificationSettings } from '@/context/NotificationContext';

type SettingItem = {
  key: keyof NotificationSettings;
  label: string;
  description: string;
  icon: string;
};

const SETTINGS: SettingItem[] = [
  { key: 'classNotifications', label: 'Class Reminders', description: 'Get notified 30 min, 10 min, and at class start', icon: '🎓' },
  { key: 'assignmentNotifications', label: 'Assignment Alerts', description: 'Reminders 3 days, 1 day, 6 hours, 1 hour before due', icon: '📚' },
  { key: 'attendanceAlerts', label: 'Attendance Warnings', description: 'Alerts when attendance falls near or below limit', icon: '📊' },
  { key: 'habitReminders', label: 'Habit Reminders', description: 'Daily/weekly nudges and streak milestones', icon: '✨' },
  { key: 'skillReminders', label: 'Skill Practice', description: 'Evening reminders to practice your skills', icon: '🛠️' },
  { key: 'todoReminders', label: 'To-Do Reminders', description: 'Alerts 1 hour and 30 minutes before task due', icon: '✅' },
];

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, permissionGranted, updateSetting } = useNotifications();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Platform.OS === 'web' ? 74 : insets.top + 16, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
        <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>Notification Settings</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Manage what reminders you receive from StudentOS.
      </Text>

      {!permissionGranted && (
        <View style={[styles.warningCard, { backgroundColor: colors.critical + '18', borderColor: colors.critical + '44' }]}>
          <Text style={[styles.warningText, { color: colors.critical }]}>
            ⚠️ Notifications are not enabled on this device. Please allow notifications in your system settings.
          </Text>
        </View>
      )}

      <View style={[styles.masterCard, { backgroundColor: colors.card }]}>
        <View style={styles.masterRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.masterLabel, { color: colors.text }]}>All Notifications</Text>
            <Text style={[styles.masterDesc, { color: colors.textMuted }]}>Master toggle for all StudentOS notifications</Text>
          </View>
          <Switch
            value={settings.masterEnabled}
            onValueChange={v => updateSetting('masterEnabled', v)}
            trackColor={{ false: colors.muted, true: colors.primary + '66' }}
            thumbColor={settings.masterEnabled ? colors.primary : colors.textMuted}
          />
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Categories</Text>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {SETTINGS.map((item, index) => (
          <React.Fragment key={item.key}>
            <View style={[styles.row, !settings.masterEnabled && styles.rowDisabled]}>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: settings.masterEnabled ? colors.text : colors.textMuted }]}>
                  {item.label}
                </Text>
                <Text style={[styles.rowDesc, { color: colors.textMuted }]}>{item.description}</Text>
              </View>
              <Switch
                value={settings[item.key] as boolean && settings.masterEnabled}
                onValueChange={v => updateSetting(item.key, v)}
                disabled={!settings.masterEnabled}
                trackColor={{ false: colors.muted, true: colors.primary + '66' }}
                thumbColor={settings[item.key] && settings.masterEnabled ? colors.primary : colors.textMuted}
              />
            </View>
            {index < SETTINGS.length - 1 && (
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>ℹ️ How it works</Text>
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          Notifications are scheduled locally on your device and work even when the app is closed. They automatically reschedule when you update your data.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  title: { fontSize: 26, fontFamily: 'Nunito_700Bold', marginTop: 4 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 4 },
  warningCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  warningText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  masterCard: { borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  masterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 18, gap: 14 },
  masterLabel: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  masterDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  sectionLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', paddingLeft: 4 },
  card: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12 },
  rowDisabled: { opacity: 0.5 },
  rowIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  rowLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  rowDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 18 },
  infoCard: { borderRadius: 20, padding: 18, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  infoTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  infoText: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
});
