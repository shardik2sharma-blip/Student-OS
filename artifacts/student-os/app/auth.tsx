import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [semester, setSemester] = useState('1');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const insets = useSafeAreaInsets();

  const submit = async () => {
    if (!email.trim()) { Alert.alert('Enter your email'); return; }
    if (!password.trim()) { Alert.alert('Enter a password'); return; }
    if (mode === 'signup' && !name.trim()) { Alert.alert('Enter your name'); return; }
    try {
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await signup(name.trim(), email.trim(), college.trim(), parseInt(semester, 10) || 1);
      }
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFBF5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <Image source={require('../assets/images/icon.png')} style={styles.icon} />
          <Text style={styles.title}>{mode === 'login' ? 'Welcome back!' : 'Create account'}</Text>
          <Text style={styles.sub}>{mode === 'login' ? 'Sign in to continue your journey.' : 'Start your organized student life.'}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.card}>
          {mode === 'signup' && (
            <>
              <InputField label="Full Name" value={name} onChangeText={setName} placeholder="Alex Johnson" />
            </>
          )}
          <InputField label="Email" value={email} onChangeText={setEmail} placeholder="you@university.edu" keyboardType="email-address" />
          <InputField label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          {mode === 'signup' && (
            <>
              <InputField label="College / University" value={college} onChangeText={setCollege} placeholder="State University" />
              <InputField label="Current Semester" value={semester} onChangeText={setSemester} placeholder="1" keyboardType="number-pad" />
            </>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={submit}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={() => setMode(m => m === 'login' ? 'signup' : 'login')} style={styles.toggleBtn}>
          <Text style={styles.toggleText}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.toggleLink}>{mode === 'login' ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#C4B8B0"
        autoCapitalize="none"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 24 },
  header: { alignItems: 'center', gap: 12 },
  icon: { width: 72, height: 72, borderRadius: 18 },
  title: { fontSize: 28, fontFamily: 'Nunito_700Bold', color: '#1A1A2E', textAlign: 'center' },
  sub: { fontSize: 15, fontFamily: 'Inter_400Regular', color: '#9CA3AF', textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#6B7280' },
  input: {
    backgroundColor: '#F7F3EE',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#1A1A2E',
  },
  btn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },
  toggleBtn: { alignItems: 'center', paddingVertical: 8 },
  toggleText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#9CA3AF' },
  toggleLink: { color: '#FF6B6B', fontFamily: 'Inter_600SemiBold' },
});
