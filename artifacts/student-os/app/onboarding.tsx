import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '📚',
    title: 'Master Your\nAcademics',
    desc: 'Track attendance, assignments, classes, and exams — all in one beautiful place.',
    bg: '#EEF0FF',
    accent: '#6B7BFF',
  },
  {
    id: '2',
    emoji: '🌱',
    title: 'Build Better\nHabits',
    desc: 'Grow your skills, complete daily habits, and stay on top of your personal goals.',
    bg: '#E6F9F8',
    accent: '#4ECDC4',
  },
  {
    id: '3',
    emoji: '⭐',
    title: 'Every Day,\nYour Best Day',
    desc: 'A smart dashboard that shows you exactly what needs your attention, today.',
    bg: '#FFE8E8',
    accent: '#FF6B6B',
  },
];

export default function OnboardingScreen() {
  const [active, setActive] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const { markOnboardingSeen } = useAuth();

  const next = () => {
    if (active < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: active + 1 });
      setActive(active + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await markOnboardingSeen();
    router.replace('/auth');
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.emojiCircle, { backgroundColor: item.bg }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={[styles.title, { color: item.accent }]}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActive(idx);
        }}
      />
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[
              styles.dot,
              { backgroundColor: i === active ? slides[active].accent : '#D1D5DB' },
              i === active && styles.dotActive,
            ]} />
          ))}
        </View>
        <Animated.View entering={FadeInDown.duration(400)}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: slides[active].accent }]}
            onPress={next}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{active === slides.length - 1 ? 'Get Started' : 'Next'}</Text>
          </TouchableOpacity>
        </Animated.View>
        {active < slides.length - 1 && (
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: slides[active].accent }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFBF5' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  emojiCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: { fontSize: 72 },
  title: {
    fontSize: 34,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  desc: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: { paddingBottom: 48, alignItems: 'center', gap: 16 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  btn: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },
  skipBtn: { padding: 8 },
  skipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
