import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

interface Props {
  progress: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

export default function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 7,
  label,
  color,
}: Props) {
  const colors = useColors();
  const ringColor = color ?? colors.primary;
  const pct = Math.max(0, Math.min(100, progress));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {/* Center content */}
      <Text
        style={{
          fontSize: size * 0.22,
          fontFamily: 'Nunito_700Bold',
          color: colors.text,
          letterSpacing: -0.5,
        }}
      >
        {Math.round(pct)}%
      </Text>
      {label && (
        <Text style={{ fontSize: size * 0.11, color: colors.textMuted, marginTop: 1 }}>
          {label}
        </Text>
      )}
    </View>
  );
}
