import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FONTS } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  label: string;
  current: number;
  goal: number;
  color: string;
  size?: number;
}

export default function MacroCircle({ label, current, goal, color, size = 56 }: Props) {
  const COLORS = useTheme().colors;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const left = Math.max(goal - Math.round(current), 0);

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={[styles.value, { color: COLORS.text }]}>{left}g</Text>
      </View>
      <Text style={[styles.label, { color: COLORS.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  value: {
    position: 'absolute',
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
