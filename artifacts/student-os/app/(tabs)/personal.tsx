import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, PanResponder,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useApp, type Habit, type Skill, type Todo } from '@/context/AppContext';
import TopTabBar from '@/components/TopTabBar';
import * as Haptics from 'expo-haptics';

const TABS = ['Habits', 'Skills', 'To-Do'];
const CATEGORIES: Habit['category'][] = ['health', 'study', 'social', 'mindfulness', 'other'];
const HABIT_ICONS = ['💪', '📚', '🧘', '🏃', '💧', '🍎', '😴', '✍️', '🎯', '🌿'];
const SKILL_ICONS = ['🎸', '💻', '🎨', '📐', '🗣️', '📊', '🤸', '🍳', '📷', '🎵'];

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function PersonalScreen() {
  const [tab, setTab] = useState(0);
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopTabBar tabs={TABS} activeIndex={tab} onTabPress={setTab} accentColor={colors.personal} />
      <View style={{ flex: 1 }}>
        {tab === 0 && <HabitsTab />}
        {tab === 1 && <SkillsTab />}
        {tab === 2 && <TodoTab />}
      </View>
    </View>
  );
}

// ─── Habits Tab ──────────────────────────────────────────────────────────────
function HabitsTab() {
  const colors = useColors();
  const { habits, habitLogs, addHabit, removeHabit, toggleHabitLog } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💪');
  const [category, setCategory] = useState<Habit['category']>('health');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');

  const catColors: Record<string, string> = {
    health: colors.health, study: colors.study,
    social: colors.social, mindfulness: colors.mindfulness, other: colors.textMuted,
  };

  const save = () => {
    if (!name.trim()) { Alert.alert('Enter habit name'); return; }
    addHabit({ name: name.trim(), icon, category, frequency, targetDays: [] });
    setShowModal(false);
    setName(''); setIcon('💪'); setCategory('health'); setFrequency('daily');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const getLast7 = (habitId: string) => {
    const days: boolean[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      days.push(habitLogs.some(l => l.habitId === habitId && l.date === ds && l.completed));
    }
    return days;
  };

  const getStreak = (habitId: string) => {
    let streak = 0;
    const t = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(t);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (habitLogs.some(l => l.habitId === habitId && l.date === ds && l.completed)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.personal }]} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ New Habit</Text>
        </TouchableOpacity>

        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No habits yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Build positive routines one habit at a time.</Text>
          </View>
        ) : (
          habits.map(h => {
            const done = habitLogs.some(l => l.habitId === h.id && l.date === today() && l.completed);
            const last7 = getLast7(h.id);
            const streak = getStreak(h.id);
            const cc = catColors[h.category] || colors.personal;
            return (
              <View key={h.id} style={[styles.habitCard, { backgroundColor: colors.card }]}>
                <View style={styles.habitCardTop}>
                  <View style={[styles.habitIconCircle, { backgroundColor: cc + '22' }]}>
                    <Text style={styles.habitEmoji}>{h.icon}</Text>
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={[styles.habitName, { color: colors.text }]}>{h.name}</Text>
                    <View style={styles.habitMeta}>
                      <View style={[styles.catPill, { backgroundColor: cc + '22' }]}>
                        <Text style={[styles.catLabel, { color: cc }]}>{h.category}</Text>
                      </View>
                      {streak > 0 && <Text style={[styles.streak, { color: colors.warning }]}>🔥 {streak} day{streak !== 1 ? 's' : ''}</Text>}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.checkCircle, { borderColor: cc, backgroundColor: done ? cc : 'transparent' }]}
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      toggleHabitLog(h.id, today());
                    }}
                    activeOpacity={0.8}
                  >
                    {done && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                </View>
                {/* 7-day dots */}
                <View style={styles.dotRow}>
                  {last7.map((d, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: d ? cc : colors.muted }]} />
                  ))}
                </View>
                <TouchableOpacity onPress={() => Alert.alert('Remove habit?', `"${h.name}" will be deleted.`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeHabit(h.id) },
                ])} style={styles.deleteBtn}>
                  <Text style={[styles.deleteText, { color: colors.textMuted }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Habit</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>Habit Name</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text }]} value={name} onChangeText={setName} placeholder="e.g. Drink 8 glasses of water" placeholderTextColor={colors.textMuted} />
          <Text style={[styles.label, { color: colors.textMuted }]}>Icon</Text>
          <View style={styles.iconGrid}>
            {HABIT_ICONS.map(ic => (
              <TouchableOpacity key={ic} onPress={() => setIcon(ic)} style={[styles.iconBtn, { backgroundColor: icon === ic ? colors.personal + '33' : colors.muted }]} activeOpacity={0.8}>
                <Text style={styles.iconEmoji}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map(c => {
              const cc = catColors[c];
              return (
                <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.catBtn, { backgroundColor: category === c ? cc : colors.muted }]} activeOpacity={0.8}>
                  <Text style={[styles.catBtnText, { color: category === c ? '#fff' : colors.textSecondary }]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.label, { color: colors.textMuted }]}>Frequency</Text>
          <View style={styles.statusRow}>
            {(['daily', 'weekly'] as const).map(f => (
              <TouchableOpacity key={f} onPress={() => setFrequency(f)} style={[styles.statusBtn, { backgroundColor: frequency === f ? colors.personal : colors.muted }]} activeOpacity={0.8}>
                <Text style={[styles.statusBtnText, { color: frequency === f ? '#fff' : colors.textSecondary }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowModal(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtnModal, { backgroundColor: colors.personal, flex: 1 }]} onPress={save}>
              <Text style={styles.addBtnText}>Add Habit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </>
  );
}

// ─── Skills Tab ──────────────────────────────────────────────────────────────
function SkillsTab() {
  const colors = useColors();
  const { skills, addSkill, updateSkill, removeSkill } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💻');
  const [level, setLevel] = useState('0');
  const [target, setTarget] = useState('100');

  const save = () => {
    if (!name.trim()) { Alert.alert('Enter skill name'); return; }
    addSkill({ name: name.trim(), icon, level: parseInt(level, 10) || 0, targetLevel: parseInt(target, 10) || 100, totalTimeSpent: 0 });
    setShowModal(false);
    setName(''); setIcon('💻'); setLevel('0'); setTarget('100');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.study }]} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ New Skill</Text>
        </TouchableOpacity>

        {skills.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No skills yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Add a skill and track your progress over time.</Text>
          </View>
        ) : (
          skills.map(s => (
            <SkillCard key={s.id} skill={s} onLevelChange={(v) => updateSkill(s.id, { level: v })} onDelete={() => Alert.alert('Remove skill?', `"${s.name}" will be deleted.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => removeSkill(s.id) },
            ])} />
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Skill</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>Skill Name</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text }]} value={name} onChangeText={setName} placeholder="e.g. Guitar, Python, Design" placeholderTextColor={colors.textMuted} />
          <Text style={[styles.label, { color: colors.textMuted }]}>Icon</Text>
          <View style={styles.iconGrid}>
            {SKILL_ICONS.map(ic => (
              <TouchableOpacity key={ic} onPress={() => setIcon(ic)} style={[styles.iconBtn, { backgroundColor: icon === ic ? colors.study + '33' : colors.muted }]} activeOpacity={0.8}>
                <Text style={styles.iconEmoji}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Starting level (0-100)</Text>
              <TextInput style={[styles.inputSm, { backgroundColor: colors.input, color: colors.text }]} value={level} onChangeText={setLevel} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Target</Text>
              <TextInput style={[styles.inputSm, { backgroundColor: colors.input, color: colors.text }]} value={target} onChangeText={setTarget} keyboardType="number-pad" placeholder="100" placeholderTextColor={colors.textMuted} />
            </View>
          </View>
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowModal(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtnModal, { backgroundColor: colors.study, flex: 1 }]} onPress={save}>
              <Text style={styles.addBtnText}>Add Skill</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </>
  );
}

function SkillCard({ skill, onLevelChange, onDelete }: { skill: Skill; onLevelChange: (v: number) => void; onDelete: () => void }) {
  const colors = useColors();
  const [localLevel, setLocalLevel] = useState(skill.level);
  const TRACK_WIDTH = 260;

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    onPanResponderMove: (_, gs) => {
      // We'll compute based on the track's relative position
    },
    onPanResponderRelease: () => {
      onLevelChange(localLevel);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const milestones = [25, 50, 75, 100];
  const unlockedMilestones = milestones.filter(m => skill.level >= m);

  return (
    <View style={[styles.skillCard, { backgroundColor: colors.card }]}>
      <View style={styles.skillCardTop}>
        <View style={[styles.skillIconCircle, { backgroundColor: colors.study + '22' }]}>
          <Text style={styles.skillEmoji}>{skill.icon}</Text>
        </View>
        <View style={styles.skillInfo}>
          <Text style={[styles.skillName, { color: colors.text }]}>{skill.name}</Text>
          <Text style={[styles.skillLevel, { color: colors.textMuted }]}>Level {skill.level} / {skill.targetLevel}</Text>
        </View>
        <Text style={[styles.skillPct, { color: colors.study }]}>{skill.level}%</Text>
      </View>

      {/* Slider */}
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { backgroundColor: colors.study, width: `${skill.level}%` as any }]} />
      </View>
      <View style={styles.sliderBtns}>
        <TouchableOpacity style={[styles.sliderAdjust, { backgroundColor: colors.muted }]}
          onPress={() => { const v = Math.max(0, skill.level - 5); onLevelChange(v); }}>
          <Text style={[styles.sliderAdjustText, { color: colors.textSecondary }]}>-5</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sliderAdjust, { backgroundColor: colors.muted }]}
          onPress={() => { const v = Math.max(0, skill.level - 1); onLevelChange(v); }}>
          <Text style={[styles.sliderAdjustText, { color: colors.textSecondary }]}>-1</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={[styles.sliderAdjust, { backgroundColor: colors.study + '22' }]}
          onPress={() => { const v = Math.min(100, skill.level + 1); onLevelChange(v); }}>
          <Text style={[styles.sliderAdjustText, { color: colors.study }]}>+1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sliderAdjust, { backgroundColor: colors.study + '22' }]}
          onPress={() => { const v = Math.min(100, skill.level + 5); onLevelChange(v); }}>
          <Text style={[styles.sliderAdjustText, { color: colors.study }]}>+5</Text>
        </TouchableOpacity>
      </View>

      {unlockedMilestones.length > 0 && (
        <View style={styles.badgeRow}>
          {unlockedMilestones.map(m => (
            <View key={m} style={[styles.badge, { backgroundColor: colors.personal + '22' }]}>
              <Text style={[styles.badgeText, { color: colors.personal }]}>🏅 {m}%</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Text style={[styles.deleteText, { color: colors.textMuted }]}>Remove</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── To-Do Tab ───────────────────────────────────────────────────────────────
function TodoTab() {
  const colors = useColors();
  const { todos, addTodo, toggleTodo, removeTodo, toggleSubTask } = useApp();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubTask, setNewSubTask] = useState('');

  const add = () => {
    if (!title.trim()) return;
    addTodo({ title: title.trim(), isCompleted: false, priority, subTasks: [], isRecurring: false });
    setTitle('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const priorityColor = (p: Todo['priority']) =>
    p === 'high' ? colors.critical : p === 'medium' ? colors.warning : colors.textMuted;

  const active = todos.filter(t => !t.isCompleted);
  const done = todos.filter(t => t.isCompleted);

  return (
    <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Add a task…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <View style={styles.row}>
          <View style={styles.statusRow}>
            {(['high', 'medium', 'low'] as const).map(p => (
              <TouchableOpacity key={p} onPress={() => setPriority(p)} style={[styles.statusBtn, { backgroundColor: priority === p ? priorityColor(p) : colors.muted }]} activeOpacity={0.8}>
                <Text style={[styles.statusBtnText, { color: priority === p ? '#fff' : colors.textSecondary }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.addBtnSmall, { backgroundColor: colors.primary }]} onPress={add} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {todos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>All clear!</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Add tasks to stay on top of your day.</Text>
        </View>
      ) : (
        <>
          {active.map(t => (
            <TodoItem key={t.id} todo={t} expanded={expandedId === t.id}
              onToggle={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTodo(t.id); }}
              onExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
              onDelete={() => removeTodo(t.id)}
              onSubTaskToggle={(stId) => toggleSubTask(t.id, stId)}
            />
          ))}
          {done.length > 0 && (
            <>
              <Text style={[styles.doneLabel, { color: colors.textMuted }]}>Completed ({done.length})</Text>
              {done.map(t => (
                <TodoItem key={t.id} todo={t} expanded={false}
                  onToggle={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTodo(t.id); }}
                  onExpand={() => {}}
                  onDelete={() => removeTodo(t.id)}
                  onSubTaskToggle={(stId) => toggleSubTask(t.id, stId)}
                />
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function TodoItem({ todo, expanded, onToggle, onExpand, onDelete, onSubTaskToggle }: {
  todo: Todo; expanded: boolean;
  onToggle: () => void; onExpand: () => void;
  onDelete: () => void; onSubTaskToggle: (id: string) => void;
}) {
  const colors = useColors();
  const pc = todo.priority === 'high' ? colors.critical : todo.priority === 'medium' ? colors.warning : colors.textMuted;

  return (
    <View style={[styles.todoCard, { backgroundColor: colors.card }]}>
      <View style={styles.todoRow}>
        <TouchableOpacity
          style={[styles.todoCheck, { borderColor: pc, backgroundColor: todo.isCompleted ? pc : 'transparent' }]}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          {todo.isCompleted && <Text style={styles.checkMark}>✓</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={onExpand} activeOpacity={0.8}>
          <Text style={[styles.todoTitle, { color: todo.isCompleted ? colors.textMuted : colors.text }, todo.isCompleted && { textDecorationLine: 'line-through' }]}>
            {todo.title}
          </Text>
          {todo.subTasks.length > 0 && (
            <Text style={[styles.subTaskCount, { color: colors.textMuted }]}>
              {todo.subTasks.filter(s => s.isDone).length}/{todo.subTasks.length} subtasks
            </Text>
          )}
        </TouchableOpacity>
        <View style={[styles.priorityDot, { backgroundColor: pc }]} />
        <TouchableOpacity onPress={onDelete} hitSlop={12}>
          <Text style={[styles.removeX, { color: colors.textMuted }]}>×</Text>
        </TouchableOpacity>
      </View>
      {expanded && todo.subTasks.map(st => (
        <TouchableOpacity key={st.id} style={styles.subTask} onPress={() => onSubTaskToggle(st.id)} activeOpacity={0.8}>
          <View style={[styles.subCheck, { borderColor: colors.personal, backgroundColor: st.isDone ? colors.personal : 'transparent' }]}>
            {st.isDone && <Text style={{ color: '#fff', fontSize: 9 }}>✓</Text>}
          </View>
          <Text style={[styles.subTaskText, { color: st.isDone ? colors.textMuted : colors.textSecondary }, st.isDone && { textDecorationLine: 'line-through' }]}>
            {st.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16, gap: 12, paddingBottom: 120 },
  card: { borderRadius: 20, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: 'Inter_400Regular' },
  inputSm: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: 'Inter_400Regular', flex: 1 },
  addBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  addBtnModal: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  addBtnSmall: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12 },
  addBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Nunito_700Bold' },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
  emptyDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  habitCard: { borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  habitCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  habitEmoji: { fontSize: 22 },
  habitInfo: { flex: 1, gap: 4 },
  habitName: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  habitMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  catLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'capitalize' },
  streak: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  checkCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  dotRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  deleteBtn: { alignSelf: 'flex-end' },
  deleteText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  iconBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 24 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  catBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium', textTransform: 'capitalize' },
  statusRow: { flexDirection: 'row', gap: 8, flex: 1 },
  statusBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  statusBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  modalContent: { padding: 24, gap: 14, paddingBottom: 60 },
  modalTitle: { fontSize: 22, fontFamily: 'Nunito_700Bold', marginBottom: 4 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  skillCard: { borderRadius: 16, padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  skillCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skillIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  skillEmoji: { fontSize: 22 },
  skillInfo: { flex: 1, gap: 2 },
  skillName: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  skillLevel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  skillPct: { fontSize: 22, fontFamily: 'Nunito_700Bold' },
  sliderTrack: { height: 10, borderRadius: 5, backgroundColor: '#F0EBE3', overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 5 },
  sliderBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sliderAdjust: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  sliderAdjustText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  todoCard: { borderRadius: 14, padding: 14, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  todoCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  todoTitle: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  removeX: { fontSize: 20 },
  subTaskCount: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  subTask: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 34 },
  subCheck: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  subTaskText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  doneLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 8 },
});
