import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  progress: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

export default function ProgressRing({ progress, size = 80, strokeWidth = 7, label, color }: Props) {
  const colors = useColors();
  const ringColor = color ?? colors.primary;
  const pct = Math.max(0, Math.min(100, progress));
  const angle = (pct / 100) * 360;

  // Use two half-circle clips
  const half = size / 2;
  const rightDeg = pct > 50 ? 180 : (pct / 50) * 180;
  const leftDeg = pct > 50 ? ((pct - 50) / 50) * 180 : 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View style={[StyleSheet.absoluteFill, {
        borderRadius: half,
        borderWidth: strokeWidth,
        borderColor: colors.border,
      }]} />
      {/* Right half fill */}
      <View style={{ position: 'absolute', right: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: pct > 0 ? ringColor : 'transparent',
          position: 'absolute',
          transform: [{ rotate: `${rightDeg}deg` }],
        }} />
      </View>
      {/* Left half fill */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: half, height: size, overflow: 'hidden' }}>
        <View style={{
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: pct > 50 ? ringColor : 'transparent',
          position: 'absolute',
          transform: [{ rotate: `${leftDeg}deg` }],
        }} />
      </View>
      {/* Center */}
      <Text style={{ fontSize: size * 0.22, fontFamily: 'Nunito_700Bold', color: colors.text, letterSpacing: -0.5 }}>
        {Math.round(pct)}%
      </Text>
      {label && (
        <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 1 }}>{label}</Text>
      )}
    </View>
  );
}
