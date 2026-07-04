import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [college, setCollege] = useState(user?.college ?? '');
  const [semester, setSemester] = useState(user?.semester?.toString() ?? '1');
  const [notifications, setNotifications] = useState(true);

  const save = async () => {
    await updateProfile({ name: name.trim(), college: college.trim(), semester: parseInt(semester, 10) || 1 });
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLogout = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/auth');
      }},
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Account?', 'This will permanently delete all your data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Permanently', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/auth');
      }},
    ]);
  };

  const initials = (user?.name ?? 'S').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: Platform.OS === 'web' ? 74 : 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar + Name */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {!editing ? (
          <View style={styles.nameSection}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'Student'}</Text>
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email || ''}</Text>
            {user?.college ? <Text style={[styles.userCollege, { color: colors.textSecondary }]}>{user.college}</Text> : null}
            <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.primaryLight }]} onPress={() => setEditing(true)} activeOpacity={0.8}>
              <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.editSection}>
            <InputRow label="Full Name" value={name} onChangeText={setName} placeholder="Your name" colors={colors} />
            <InputRow label="College / University" value={college} onChangeText={setCollege} placeholder="Your college" colors={colors} />
            <InputRow label="Current Semester" value={semester} onChangeText={setSemester} placeholder="1" keyboardType="number-pad" colors={colors} />
            <View style={styles.editBtns}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setEditing(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={save} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
        <StatBox label="Semester" value={user?.semester?.toString() ?? '1'} color={colors.academic} />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatBox label="College" value={user?.college ? user.college.slice(0, 8) + (user.college.length > 8 ? '…' : '') : '—'} color={colors.personal} />
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Settings</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.muted, true: colors.primary + '66' }}
              thumbColor={notifications ? colors.primary : colors.textMuted}
            />
          </View>
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>App Version</Text>
            <Text style={[styles.settingValue, { color: colors.textMuted }]}>1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Semester Manager */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Semester Manager</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Current Semester</Text>
            <Text style={[styles.settingValue, { color: colors.academic }]}>Semester {user?.semester ?? 1}</Text>
          </View>
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
          <Text style={[styles.comingSoon, { color: colors.textMuted }]}>Semester archive & GPA calculator coming soon</Text>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Account</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.settingRow} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Sign Out</Text>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>→</Text>
          </TouchableOpacity>
          <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.settingRow} onPress={handleDelete} activeOpacity={0.8}>
            <Text style={[styles.settingLabel, { color: colors.critical }]}>Delete Account</Text>
            <Text style={{ color: colors.critical, fontSize: 16 }}>→</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  const colors = useColors();
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function InputRow({ label, colors, ...props }: { label: string; colors: any } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[{ fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[{ backgroundColor: colors.input, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.text }]}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 16 },
  avatarSection: { alignItems: 'center', gap: 16, paddingVertical: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  avatarText: { fontSize: 30, fontFamily: 'Nunito_700Bold', color: '#fff' },
  nameSection: { alignItems: 'center', gap: 6 },
  userName: { fontSize: 24, fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  userEmail: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  userCollege: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  editBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  editBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  editSection: { width: '100%', gap: 12 },
  editBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Nunito_700Bold' },
  statsRow: { flexDirection: 'row', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  statBox: { flex: 1, paddingVertical: 20, alignItems: 'center', gap: 4 },
  statDivider: { width: 1 },
  statValue: { fontSize: 20, fontFamily: 'Nunito_700Bold' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  section: { gap: 10 },
  sectionLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', paddingLeft: 4 },
  settingsCard: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  settingLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  settingValue: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  settingDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 18 },
  comingSoon: { paddingHorizontal: 18, paddingBottom: 16, fontSize: 13, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
});
