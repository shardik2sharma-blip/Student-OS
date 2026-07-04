import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export default function SplashScreen() {
  const { isLoading, isAuthenticated, hasSeenOnboarding } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else if (!hasSeenOnboarding) {
        router.replace('/onboarding');
      } else {
        router.replace('/auth');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, hasSeenOnboarding]);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(800)} style={styles.logoWrap}>
        <Image source={require('../assets/images/icon.png')} style={styles.icon} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.textWrap}>
        <Text style={styles.title}>StudentOS</Text>
        <Text style={styles.sub}>Your academic life, organized.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logoWrap: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  icon: {
    width: 110,
    height: 110,
    borderRadius: 28,
  },
  textWrap: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Nunito_700Bold',
    color: '#1A1A2E',
    letterSpacing: -1,
  },
  sub: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#9CA3AF',
  },
});
