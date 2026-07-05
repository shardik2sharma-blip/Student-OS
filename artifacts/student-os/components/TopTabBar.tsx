import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

interface Props {
  tabs: string[];
  activeIndex: number;
  onTabPress: (index: number) => void;
  accentColor?: string;
}

export default function TopTabBar({ tabs, activeIndex, onTabPress, accentColor }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const accent = accentColor ?? colors.primary;

  return (
    <View style={[
      styles.wrapper,
      { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top },
    ]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
      >
        {tabs.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => onTabPress(i)}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.label,
                { color: active ? accent : colors.textMuted },
                active && styles.activeLabel,
              ]}>
                {tab}
              </Text>
              {active && <View style={[styles.indicator, { backgroundColor: accent }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  scrollView: {
    marginTop: 0,
    marginBottom: 0,
  },
  scroll: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 0,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'left',
  },
  activeLabel: {
    fontFamily: 'Inter_600SemiBold',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    right: 14,
    height: 3,
    borderRadius: 2,
  },
});
