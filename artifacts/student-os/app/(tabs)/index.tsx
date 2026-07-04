import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useApp, type TimetableSlot, type Assignment, type Subject } from '@/context/AppContext';
import { getDailyQuote } from '@/constants/quotes';
import ProgressRing from '@/components/ProgressRing';
import * as Haptics from 'expo-haptics';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { subjects, assignments, timetable, habits, habitLogs, todos, toggleHabitLog } = useApp();
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const todayDay = DAYS[now.getDay()];
  const todaySlots = timetable.filter(s => s.day === todayDay)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const remainingSlots = todaySlots.filter(s => toMinutes(s.endTime) > nowMin);
  const currentSlot = todaySlots.find(s => toMinutes(s.startTime) <= nowMin && toMinutes(s.endTime) > nowMin);
  const pastSlots = todaySlots.filter(s => toMinutes(s.endTime) <= nowMin);

  const pendingAssignments = assignments
    .filter(a => a.status === 'todo' || a.status === 'inprogress')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4);

  const next7days = Date.now() + 7 * 86400000;
  const upcomingDeadlines = assignments
    .filter(a => {
      const dl = new Date(a.deadline).getTime();
      return dl > Date.now() && dl <= next7days && a.status !== 'submitted' && a.status !== 'graded';
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const todayStr = now.toISOString().split('T')[0];
  const todayHabits = habits.filter(h => {
    if (h.frequency === 'daily') return true;
    const dayShort = todayDay.slice(0, 3);
    return h.targetDays.includes(dayShort);
  });

  const totalTasks = todos.filter(t => !t.isCompleted).length + todayHabits.length;
  const completedTasks = todayHabits.filter(h => habitLogs.some(l => l.habitId === h.id && l.date === todayStr && l.completed)).length;
  const weekProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getGreeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getAttStatus = (s: Subject) => {
    if (s.totalClasses === 0) return 'safe';
    const pct = (s.attendedClasses / s.totalClasses) * 100;
    if (pct >= s.minAttendance + 5) return 'safe';
    if (pct >= s.minAttendance) return 'warning';
    return 'critical';
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setNow(new Date());
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Greeting Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 74 : 16 }]}>
        <View style={[styles.headerBg, { backgroundColor: colors.primaryLight }]} />
        <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()}, ☀️</Text>
        <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'Student'}!</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        <View style={[styles.quoteBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.quoteText, { color: colors.textSecondary }]}>"{getDailyQuote()}"</Text>
        </View>
      </View>

      {/* Today & Remaining Classes */}
      <Section title="Today's Classes" badge={`${remainingSlots.length} remaining`} badgeColor={colors.academic}>
        {todaySlots.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card }]}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No classes today! Enjoy your day.</Text>
          </View>
        ) : (
          <View style={[styles.classCard, { backgroundColor: colors.card }]}>
            {todaySlots.map(slot => {
              const isNow = slot.id === currentSlot?.id;
              const isPast = pastSlots.some(p => p.id === slot.id);
              return (
                <View key={slot.id} style={[styles.classRow, isPast && { opacity: 0.4 }]}>
                  <View style={[styles.classAccent, { backgroundColor: isNow ? colors.academic : isPast ? colors.border : colors.academicLight }]} />
                  <View style={styles.classInfo}>
                    <View style={styles.classTop}>
                      <Text style={[styles.className, { color: colors.text }, isPast && { textDecorationLine: 'line-through' }]}>
                        {slot.subjectName}
                      </Text>
                      {isNow && <View style={[styles.nowBadge, { backgroundColor: colors.academic }]}><Text style={styles.nowText}>NOW</Text></View>}
                      {isPast && <Text style={[styles.doneMark, { color: colors.safe }]}>✓</Text>}
                    </View>
                    <Text style={[styles.classMeta, { color: colors.textMuted }]}>
                      {slot.startTime} – {slot.endTime} {slot.room ? `· ${slot.room}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
            {remainingSlots.length === 0 && todaySlots.length > 0 && (
              <Text style={[styles.allDoneText, { color: colors.safe }]}>✓ All done for today!</Text>
            )}
          </View>
        )}
      </Section>

      {/* Attendance Health */}
      {subjects.length > 0 && (
        <Section title="Attendance Health">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.attRow}>
              {subjects.map(s => {
                const status = getAttStatus(s);
                const pct = s.totalClasses > 0 ? Math.round((s.attendedClasses / s.totalClasses) * 100) : 100;
                const bgMap = { safe: colors.safeLight, warning: colors.warningLight, critical: colors.criticalLight };
                const colorMap = { safe: colors.safe, warning: colors.warning, critical: colors.critical };
                return (
                  <View key={s.id} style={[styles.attChip, { backgroundColor: bgMap[status] }]}>
                    <Text style={[styles.attSubject, { color: colorMap[status] }]}>{s.name}</Text>
                    <Text style={[styles.attPct, { color: colorMap[status] }]}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Section>
      )}

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <Section title="Pending Assignments">
          <View style={styles.list}>
            {pendingAssignments.map(a => {
              const isOverdue = new Date(a.deadline) < now && a.status !== 'submitted';
              const pColor = a.priority === 'high' ? colors.critical : a.priority === 'medium' ? colors.warning : colors.textMuted;
              return (
                <View key={a.id} style={[styles.asgCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.asgAccent, { backgroundColor: isOverdue ? colors.critical : colors.primaryLight }]} />
                  <View style={styles.asgContent}>
                    <Text style={[styles.asgTitle, { color: colors.text }]} numberOfLines={1}>{a.title}</Text>
                    <View style={styles.asgMeta}>
                      <Text style={[styles.asgDate, { color: isOverdue ? colors.critical : colors.textMuted }]}>
                        {isOverdue ? 'Overdue · ' : ''}{formatDate(a.deadline)}
                      </Text>
                      <View style={[styles.priorityDot, { backgroundColor: pColor }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </Section>
      )}

      {/* Habits Due Today */}
      {todayHabits.length > 0 && (
        <Section title="Today's Habits">
          <View style={styles.list}>
            {todayHabits.map(h => {
              const done = habitLogs.some(l => l.habitId === h.id && l.date === todayStr && l.completed);
              const catColors: Record<string, string> = {
                health: colors.health, study: colors.study,
                social: colors.social, mindfulness: colors.mindfulness, other: colors.textMuted,
              };
              const cc = catColors[h.category] || colors.primary;
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[styles.habitRow, { backgroundColor: colors.card }]}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleHabitLog(h.id, todayStr);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.habitCircle, { borderColor: cc, backgroundColor: done ? cc : 'transparent' }]}>
                    {done && <Text style={styles.habitCheck}>✓</Text>}
                  </View>
                  <Text style={[styles.habitName, { color: done ? colors.textMuted : colors.text }, done && { textDecorationLine: 'line-through' }]}>
                    {h.name}
                  </Text>
                  <View style={[styles.catPill, { backgroundColor: cc + '22' }]}>
                    <Text style={[styles.catLabel, { color: cc }]}>{h.category}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>
      )}

      {/* Weekly Progress */}
      <Section title="Weekly Progress">
        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <ProgressRing progress={weekProgress} size={90} color={colors.primary} />
          <View style={styles.progressInfo}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>Tasks Completed</Text>
            <Text style={[styles.progressSub, { color: colors.textSecondary }]}>
              {completedTasks} of {totalTasks} tasks done today
            </Text>
            {weekProgress === 100 && (
              <Text style={[styles.progressCelebrate, { color: colors.safe }]}>Amazing! 🎉</Text>
            )}
          </View>
        </View>
      </Section>

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Section title="Due in 7 Days">
          <View style={styles.list}>
            {upcomingDeadlines.map(a => {
              const diff = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000);
              return (
                <View key={a.id} style={[styles.deadlineRow, { backgroundColor: colors.card }]}>
                  <View style={[styles.daysBadge, { backgroundColor: diff <= 1 ? colors.criticalLight : colors.warningLight }]}>
                    <Text style={[styles.daysNum, { color: diff <= 1 ? colors.critical : colors.warning }]}>{diff}</Text>
                    <Text style={[styles.daysLabel, { color: diff <= 1 ? colors.critical : colors.warning }]}>days</Text>
                  </View>
                  <Text style={[styles.deadlineTitle, { color: colors.text }]} numberOfLines={1}>{a.title}</Text>
                </View>
              );
            })}
          </View>
        </Section>
      )}
    </ScrollView>
  );
}

function Section({ title, badge, badgeColor, children }: {
  title: string; badge?: string; badgeColor?: string; children: React.ReactNode
}) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: (badgeColor ?? colors.primary) + '22' }]}>
            <Text style={[styles.badgeText, { color: badgeColor ?? colors.primary }]}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 8 },
  header: { paddingHorizontal: 4, paddingBottom: 16, gap: 4, position: 'relative', overflow: 'hidden' },
  headerBg: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, opacity: 0.4 },
  greeting: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  userName: { fontSize: 28, fontFamily: 'Nunito_700Bold', letterSpacing: -0.5 },
  date: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 8 },
  quoteBox: {
    borderRadius: 14, padding: 14, marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  quoteText: { fontSize: 13, fontFamily: 'Inter_400Regular', fontStyle: 'italic', lineHeight: 20 },
  section: { gap: 10, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold', flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  emptyBox: {
    borderRadius: 16, padding: 24, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  emptyEmoji: { fontSize: 32 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  classCard: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  classRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0EBE3' },
  classAccent: { width: 4, height: '100%', borderRadius: 2, minHeight: 40 },
  classInfo: { flex: 1, gap: 2 },
  classTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  className: { fontSize: 15, fontFamily: 'Inter_500Medium', flex: 1 },
  classMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  nowBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  nowText: { color: '#fff', fontSize: 10, fontFamily: 'Inter_700Bold' },
  doneMark: { fontSize: 14 },
  allDoneText: { textAlign: 'center', padding: 12, fontFamily: 'Inter_500Medium', fontSize: 14 },
  attRow: { flexDirection: 'row', gap: 10, paddingRight: 16 },
  attChip: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', gap: 4, minWidth: 90 },
  attSubject: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  attPct: { fontSize: 20, fontFamily: 'Nunito_700Bold' },
  list: { gap: 8 },
  asgCard: {
    flexDirection: 'row', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  asgAccent: { width: 4 },
  asgContent: { flex: 1, padding: 14, gap: 4 },
  asgTitle: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  asgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  asgDate: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  priorityDot: { width: 7, height: 7, borderRadius: 3.5 },
  habitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  habitCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  habitCheck: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  habitName: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  catPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  catLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'capitalize' },
  progressCard: {
    borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  progressInfo: { flex: 1, gap: 4 },
  progressTitle: { fontSize: 16, fontFamily: 'Nunito_700Bold' },
  progressSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  progressCelebrate: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  deadlineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  daysBadge: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  daysNum: { fontSize: 20, fontFamily: 'Nunito_700Bold', lineHeight: 24 },
  daysLabel: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  deadlineTitle: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
