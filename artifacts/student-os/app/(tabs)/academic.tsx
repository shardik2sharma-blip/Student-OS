import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useApp, type Subject, type Assignment, type TimetableSlot } from '@/context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopTabBar from '@/components/TopTabBar';
import * as Haptics from 'expo-haptics';

const TABS = ['Subjects', 'Attendance', 'Assignments', 'Classes'];
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CAT_COLORS = ['#FFB3BA', '#B3C6FF', '#B3EFE4', '#FFE6B3', '#D4B3FF', '#B3FFD4', '#FFD4B3', '#B3DEFF'];
const STATUS_CYCLE: Assignment['status'][] = ['todo', 'inprogress', 'submitted', 'missed', 'graded'];

export default function AcademicScreen() {
  const [tab, setTab] = useState(0);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopTabBar tabs={TABS} activeIndex={tab} onTabPress={setTab} accentColor={colors.academic} />
      <View style={{ flex: 1 }}>
        {tab === 0 && <SubjectsTab />}
        {tab === 1 && <AttendanceTab />}
        {tab === 2 && <AssignmentsTab />}
        {tab === 3 && <ClassesTab />}
      </View>
    </View>
  );
}

// ─── Subjects Tab ───────────────────────────────────────────────────────────
function SubjectsTab() {
  const colors = useColors();
  const { subjects, addSubject, removeSubject } = useApp();
  const [name, setName] = useState('');
  const [minAtt, setMinAtt] = useState('75');
  const [credits, setCredits] = useState('3');

  const add = () => {
    const n = name.trim();
    if (!n) return;
    const colorIdx = subjects.length % CAT_COLORS.length;
    addSubject({
      name: n,
      code: n.slice(0, 3).toUpperCase(),
      color: CAT_COLORS[colorIdx],
      minAttendance: parseInt(minAtt, 10) || 75,
      totalClasses: 0,
      attendedClasses: 0,
      credits: parseInt(credits, 10) || 3,
    });
    setName('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Add Subject</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.text }]}
          value={name}
          onChangeText={setName}
          placeholder="Subject name"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Min. Attendance %</Text>
            <TextInput
              style={[styles.inputSm, { backgroundColor: colors.input, color: colors.text }]}
              value={minAtt}
              onChangeText={setMinAtt}
              keyboardType="number-pad"
              placeholder="75"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Credits</Text>
            <TextInput
              style={[styles.inputSm, { backgroundColor: colors.input, color: colors.text }]}
              value={credits}
              onChangeText={setCredits}
              keyboardType="number-pad"
              placeholder="3"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.academic }]} onPress={add} activeOpacity={0.85}>
          <Text style={styles.btnText}>Add Subject</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</Text>

      <View style={styles.chipsWrap}>
        {subjects.map(s => (
          <View key={s.id} style={[styles.chip, { backgroundColor: s.color }]}>
            <Text style={styles.chipText}>{s.name}</Text>
            <TouchableOpacity onPress={() => {
              Alert.alert('Remove subject?', `"${s.name}" and its data will be removed.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeSubject(s.id) },
              ]);
            }} hitSlop={12}>
              <Text style={styles.chipX}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {subjects.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No subjects yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Add your subjects above to get started.</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Attendance Tab ──────────────────────────────────────────────────────────
function AttendanceTab() {
  const colors = useColors();
  const { subjects, attendance, addAttendance, updateSubject } = useApp();
  const [selSubject, setSelSubject] = useState('');
  const [status, setStatus] = useState<'present' | 'absent' | 'cancelled'>('present');
  const [toast, setToast] = useState('');

  const canIBunk = (s: Subject) => {
    if (s.totalClasses === 0) return { canMiss: 0, mustAttend: 0, pct: 100 };
    const pct = (s.attendedClasses / s.totalClasses) * 100;
    if (pct >= s.minAttendance) {
      const canMiss = Math.max(0, Math.floor(s.attendedClasses / (s.minAttendance / 100)) - s.totalClasses);
      return { canMiss, mustAttend: 0, pct };
    } else {
      const mustAttend = Math.max(0, Math.ceil((s.totalClasses * (s.minAttendance / 100) - s.attendedClasses) / (1 - s.minAttendance / 100)));
      return { canMiss: 0, mustAttend, pct };
    }
  };

  const save = () => {
    if (!selSubject) { Alert.alert('Select a subject'); return; }
    addAttendance({
      subjectId: selSubject,
      date: new Date().toISOString(),
      status,
      note: '',
    });
    setToast('Attendance saved!');
    setTimeout(() => setToast(''), 2500);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false}>
      {toast !== '' && (
        <View style={[styles.toast, { backgroundColor: colors.safe }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Mark Attendance</Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {subjects.map(s => (
              <TouchableOpacity key={s.id} onPress={() => setSelSubject(s.id)} activeOpacity={0.8}
                style={[styles.subjectPill, { backgroundColor: selSubject === s.id ? s.color : colors.muted }]}>
                <Text style={[styles.subjectPillText, { color: selSubject === s.id ? '#1A1A2E' : colors.textSecondary }]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={[styles.label, { color: colors.textMuted }]}>Status</Text>
        <View style={styles.statusRow}>
          {(['present', 'absent', 'cancelled'] as const).map(s => (
            <TouchableOpacity key={s} onPress={() => setStatus(s)} style={[
              styles.statusBtn,
              { backgroundColor: status === s ? (s === 'present' ? colors.safe : s === 'absent' ? colors.critical : colors.warning) : colors.muted },
            ]} activeOpacity={0.8}>
              <Text style={[styles.statusBtnText, { color: status === s ? '#fff' : colors.textSecondary }]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.academic }]} onPress={save} activeOpacity={0.85}>
          <Text style={styles.btnText}>Save Record</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Attendance Overview</Text>
      {subjects.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No subjects</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Add subjects first to track attendance.</Text>
        </View>
      )}
      {subjects.map(s => {
        const { canMiss, mustAttend, pct } = canIBunk(s);
        const isOk = pct >= s.minAttendance;
        const accentColor = isOk ? (canMiss > 3 ? colors.safe : colors.warning) : colors.critical;
        return (
          <View key={s.id} style={[styles.attCard, { backgroundColor: colors.card }]}>
            <View style={styles.attHeader}>
              <View style={[styles.attDot, { backgroundColor: s.color }]} />
              <Text style={[styles.attSubName, { color: colors.text }]}>{s.name}</Text>
              <Text style={[styles.attPct, { color: accentColor }]}>{Math.round(pct)}%</Text>
            </View>
            <View style={[styles.attBar, { backgroundColor: colors.muted }]}>
              <View style={[styles.attBarFill, { backgroundColor: accentColor, width: `${Math.min(100, pct)}%` as any }]} />
            </View>
            <Text style={[styles.attMeta, { color: colors.textMuted }]}>
              {s.attendedClasses}/{s.totalClasses} classes · min {s.minAttendance}%
            </Text>
            {isOk && canMiss > 0 && (
              <Text style={[styles.bunkInfo, { color: colors.safe }]}>✓ You can miss {canMiss} more class{canMiss !== 1 ? 'es' : ''}</Text>
            )}
            {!isOk && mustAttend > 0 && (
              <Text style={[styles.bunkInfo, { color: colors.critical }]}>⚠ Attend {mustAttend} more class{mustAttend !== 1 ? 'es' : ''} to reach {s.minAttendance}%</Text>
            )}
            {/* Quick toggle row */}
            <View style={styles.quickToggle}>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.safeLight }]} activeOpacity={0.8}
                onPress={() => { addAttendance({ subjectId: s.id, date: new Date().toISOString(), status: 'present', note: '' }); }}>
                <Text style={[styles.quickBtnText, { color: colors.safe }]}>P</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: colors.criticalLight }]} activeOpacity={0.8}
                onPress={() => { addAttendance({ subjectId: s.id, date: new Date().toISOString(), status: 'absent', note: '' }); }}>
                <Text style={[styles.quickBtnText, { color: colors.critical }]}>A</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Assignments Tab ─────────────────────────────────────────────────────────
function AssignmentsTab() {
  const colors = useColors();
  const { assignments, subjects, addAssignment, updateAssignment, removeAssignment } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<Assignment['priority']>('medium');
  const [deadlineDays, setDeadlineDays] = useState('7');

  const save = () => {
    if (!title.trim()) { Alert.alert('Enter a title'); return; }
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (parseInt(deadlineDays, 10) || 7));
    addAssignment({
      title: title.trim(),
      subjectId: selSubject,
      description: desc,
      deadline: deadline.toISOString(),
      priority,
      status: 'todo',
    });
    setShowModal(false);
    setTitle(''); setDesc(''); setSelSubject(''); setPriority('medium'); setDeadlineDays('7');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const cycleStatus = (id: string, current: Assignment['status']) => {
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    updateAssignment(id, { status: next });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const statusColor: Record<Assignment['status'], string> = {
    todo: colors.pending, inprogress: colors.inProgress,
    submitted: colors.submitted, missed: colors.missed, graded: colors.graded,
  };
  const statusLabel: Record<Assignment['status'], string> = {
    todo: 'To Do', inprogress: 'In Progress',
    submitted: 'Submitted', missed: 'Missed', graded: 'Graded',
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ New Assignment</Text>
        </TouchableOpacity>

        {assignments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No assignments</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Tap "+ New Assignment" to add one.</Text>
          </View>
        ) : (
          assignments.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).map(a => {
            const sub = subjects.find(s => s.id === a.subjectId);
            const isOverdue = new Date(a.deadline) < new Date() && a.status !== 'submitted' && a.status !== 'graded';
            const sc = statusColor[a.status];
            return (
              <View key={a.id} style={[styles.asgCard2, { backgroundColor: colors.card }]}>
                <View style={styles.asgCardTop}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.asgCardTitle, { color: colors.text }]}>{a.title}</Text>
                    {sub && <Text style={[styles.asgMeta2, { color: colors.textMuted }]}>{sub.name}</Text>}
                    <Text style={[styles.asgMeta2, { color: isOverdue ? colors.critical : colors.textMuted }]}>
                      {isOverdue ? '⚠ Overdue · ' : ''}Due {new Date(a.deadline).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => cycleStatus(a.id, a.status)} activeOpacity={0.8}
                    style={[styles.statusPill, { backgroundColor: sc + '22' }]}>
                    <Text style={[styles.statusPillText, { color: sc }]}>{statusLabel[a.status]}</Text>
                  </TouchableOpacity>
                </View>
                {a.status === 'graded' && (
                  <View style={styles.marksRow}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Marks: </Text>
                    <TextInput
                      style={[styles.marksInput, { color: colors.text, borderColor: colors.border }]}
                      value={a.marks?.toString() ?? ''}
                      onChangeText={v => updateAssignment(a.id, { marks: parseInt(v, 10) || 0 })}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={[styles.label, { color: colors.textMuted }]}> / </Text>
                    <TextInput
                      style={[styles.marksInput, { color: colors.text, borderColor: colors.border }]}
                      value={a.totalMarks?.toString() ?? ''}
                      onChangeText={v => updateAssignment(a.id, { totalMarks: parseInt(v, 10) || 0 })}
                      keyboardType="number-pad"
                      placeholder="100"
                      placeholderTextColor={colors.textMuted}
                    />
                    {a.marks != null && a.totalMarks != null && a.totalMarks > 0 && (
                      <Text style={[styles.label, { color: colors.graded }]}> = {Math.round((a.marks / a.totalMarks) * 100)}%</Text>
                    )}
                  </View>
                )}
                <TouchableOpacity onPress={() => removeAssignment(a.id)} style={styles.deleteBtn}>
                  <Text style={[styles.deleteText, { color: colors.textMuted }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
        <Text style={[styles.moreFeatures, { color: colors.textMuted }]}>More features will be added soon</Text>
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Assignment</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>Title</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text }]} value={title} onChangeText={setTitle} placeholder="Assignment title" placeholderTextColor={colors.textMuted} />
          <Text style={[styles.label, { color: colors.textMuted }]}>Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {subjects.map(s => (
                <TouchableOpacity key={s.id} onPress={() => setSelSubject(s.id)} activeOpacity={0.8}
                  style={[styles.subjectPill, { backgroundColor: selSubject === s.id ? s.color : colors.muted }]}>
                  <Text style={[styles.subjectPillText, { color: selSubject === s.id ? '#1A1A2E' : colors.textSecondary }]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={[styles.label, { color: colors.textMuted }]}>Description (optional)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, height: 80, textAlignVertical: 'top' }]} value={desc} onChangeText={setDesc} placeholder="Details…" placeholderTextColor={colors.textMuted} multiline />
          <Text style={[styles.label, { color: colors.textMuted }]}>Priority</Text>
          <View style={styles.statusRow}>
            {(['high', 'medium', 'low'] as const).map(p => (
              <TouchableOpacity key={p} onPress={() => setPriority(p)} style={[
                styles.statusBtn,
                { backgroundColor: priority === p ? (p === 'high' ? colors.critical : p === 'medium' ? colors.warning : colors.textMuted) : colors.muted },
              ]} activeOpacity={0.8}>
                <Text style={[styles.statusBtnText, { color: priority === p ? '#fff' : colors.textSecondary }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.textMuted }]}>Due in (days)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text }]} value={deadlineDays} onChangeText={setDeadlineDays} keyboardType="number-pad" placeholder="7" placeholderTextColor={colors.textMuted} />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowModal(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]} onPress={save}>
              <Text style={styles.btnText}>Add Assignment</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </>
  );
}

// ─── Classes Tab ─────────────────────────────────────────────────────────────
function ClassesTab() {
  const colors = useColors();
  const { timetable, subjects, addTimetableSlot, removeTimetableSlot } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selDays, setSelDays] = useState<string[]>([]);
  const [selSubject, setSelSubject] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');
  const [teacher, setTeacher] = useState('');

  const toggleDay = (d: string) => setSelDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const save = () => {
    if (selDays.length === 0) { Alert.alert('Select at least one day'); return; }
    const sub = subjects.find(s => s.id === selSubject);
    selDays.forEach(day => {
      addTimetableSlot({
        subjectId: selSubject,
        subjectName: sub?.name ?? 'Class',
        day,
        startTime,
        endTime,
        room,
        teacher,
      });
    });
    setShowModal(false);
    setSelDays([]); setSelSubject(''); setRoom(''); setTeacher('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const slotsByDay = DAYS.map(d => ({
    day: d,
    slots: timetable.filter(s => s.day === d).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  })).filter(x => x.slots.length > 0);

  return (
    <>
      <ScrollView contentContainerStyle={styles.padded} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.academic }]} onPress={() => setShowModal(true)} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>+ Schedule Class</Text>
        </TouchableOpacity>

        {slotsByDay.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No classes scheduled</Text>
            <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Tap "Schedule Class" to set up your timetable.</Text>
          </View>
        ) : (
          slotsByDay.map(({ day, slots }) => (
            <View key={day} style={styles.dayGroup}>
              <Text style={[styles.dayLabel, { color: colors.academic }]}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
              {slots.map(slot => {
                const sub = subjects.find(s => s.id === slot.subjectId);
                return (
                  <View key={slot.id} style={[styles.slotCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.slotAccent, { backgroundColor: sub?.color ?? colors.academicLight }]} />
                    <View style={styles.slotInfo}>
                      <Text style={[styles.slotName, { color: colors.text }]}>{slot.subjectName}</Text>
                      <Text style={[styles.slotMeta, { color: colors.textMuted }]}>
                        {slot.startTime} – {slot.endTime}{slot.room ? ` · ${slot.room}` : ''}{slot.teacher ? ` · ${slot.teacher}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeTimetableSlot(slot.id)} hitSlop={12}>
                      <Text style={[styles.removeX, { color: colors.textMuted }]}>×</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))
        )}
        <Text style={[styles.moreFeatures, { color: colors.textMuted }]}>More features will be added soon</Text>
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.modalTitle, { color: colors.text }]}>Schedule Class</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>Days (multi-select)</Text>
          <View style={styles.daysRow}>
            {DAYS.map((d, i) => (
              <TouchableOpacity key={d} onPress={() => toggleDay(d)} activeOpacity={0.8}
                style={[styles.dayBtn, { backgroundColor: selDays.includes(d) ? colors.academic : colors.muted }]}>
                <Text style={[styles.dayBtnText, { color: selDays.includes(d) ? '#fff' : colors.textSecondary }]}>{DAY_SHORT[i]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.textMuted }]}>Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {subjects.map(s => (
                <TouchableOpacity key={s.id} onPress={() => setSelSubject(s.id)} activeOpacity={0.8}
                  style={[styles.subjectPill, { backgroundColor: selSubject === s.id ? s.color : colors.muted }]}>
                  <Text style={[styles.subjectPillText, { color: selSubject === s.id ? '#1A1A2E' : colors.textSecondary }]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Start time</Text>
              <TextInput style={[styles.inputSm, { backgroundColor: colors.input, color: colors.text }]} value={startTime} onChangeText={setStartTime} placeholder="09:00" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.label, { color: colors.textMuted }]}>End time</Text>
              <TextInput style={[styles.inputSm, { backgroundColor: colors.input, color: colors.text }]} value={endTime} onChangeText={setEndTime} placeholder="10:00" placeholderTextColor={colors.textMuted} />
            </View>
          </View>
          <Text style={[styles.label, { color: colors.textMuted }]}>Room</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text }]} value={room} onChangeText={setRoom} placeholder="Room 101" placeholderTextColor={colors.textMuted} />
          <Text style={[styles.label, { color: colors.textMuted }]}>Teacher</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text }]} value={teacher} onChangeText={setTeacher} placeholder="Dr. Smith" placeholderTextColor={colors.textMuted} />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowModal(false)}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.academic, flex: 1 }]} onPress={save}>
              <Text style={styles.btnText}>Add Class</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 16, gap: 12, paddingBottom: 120, marginTop: 1, marginBottom: 1 },
  card: {
    borderRadius: 20, padding: 20, gap: 12, justifyContent: 'flex-start',
    marginTop: 5, marginBottom: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  cardTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: 'Inter_400Regular' },
  inputSm: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: 'Inter_400Regular', flex: 1 },
  btn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontFamily: 'Nunito_700Bold' },
  addBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  addBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Nunito_700Bold' },
  sectionLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 4 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 30, gap: 8 },
  chipText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#1A1A2E' },
  chipX: { fontSize: 20, color: '#1A1A2E', lineHeight: 22 },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
  emptyDesc: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  subjectPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  subjectPillText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  statusBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  toast: { padding: 12, borderRadius: 14, alignItems: 'center', marginBottom: 4 },
  toastText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  attCard: {
    borderRadius: 16, padding: 16, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  attHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attDot: { width: 12, height: 12, borderRadius: 6 },
  attSubName: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  attPct: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  attBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  attBarFill: { height: '100%', borderRadius: 4 },
  attMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  bunkInfo: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  quickToggle: { flexDirection: 'row', gap: 8, marginTop: 4 },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  quickBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  asgCard2: {
    borderRadius: 16, padding: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  asgCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  asgCardTitle: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  asgMeta2: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, maxWidth: 110 },
  statusPillText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  marksRow: { flexDirection: 'row', alignItems: 'center' },
  marksInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, width: 50, textAlign: 'center', fontSize: 14, fontFamily: 'Inter_400Regular' },
  deleteBtn: { alignSelf: 'flex-end' },
  deleteText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  dayGroup: { gap: 8 },
  dayLabel: { fontSize: 14, fontFamily: 'Nunito_700Bold', textTransform: 'capitalize', marginTop: 8 },
  slotCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  slotAccent: { width: 5, minHeight: 56 },
  slotInfo: { flex: 1, padding: 14, gap: 3 },
  slotName: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  slotMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  removeX: { fontSize: 22, paddingRight: 14 },
  modalContent: { padding: 24, gap: 14, paddingBottom: 60 },
  modalTitle: { fontSize: 22, fontFamily: 'Nunito_700Bold', marginBottom: 4 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  dayBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  moreFeatures: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 12, fontStyle: 'italic' },
});
