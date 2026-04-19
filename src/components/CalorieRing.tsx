import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from 'react-native';
import { FONTS } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export default function CalorieRing({ consumed, goal, size = 200, strokeWidth = 14 }: Props) {
  const COLORS = useTheme().colors;
  const styles = makeStyles(COLORS);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / goal, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const remaining = Math.max(goal - consumed, 0);
  const isOver = consumed > goal;
  const over = consumed - goal;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
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
          stroke={isOver ? COLORS.error : COLORS.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        {isOver ? (
          <>
            <Text style={[styles.bigNumber, { fontSize: Math.max(size * 0.22, 18), color: COLORS.error }]}>
              +{Math.round(over)}
            </Text>
            <Text style={[styles.label, { fontSize: Math.max(size * 0.08, 9) }]}>kcal over</Text>
          </>
        ) : (
          <>
            <Text style={[styles.bigNumber, { fontSize: Math.max(size * 0.22, 18) }]}>
              {Math.round(remaining)}
            </Text>
            <Text style={[styles.label, { fontSize: Math.max(size * 0.08, 9) }]}>kcal left</Text>
          </>
        )}
        <Text style={[styles.subLabel, { fontSize: Math.max(size * 0.065, 8) }]}>
          {Math.round(consumed)} eaten
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (COLORS: any) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  bigNumber: {
    fontWeight: '800',
    color: COLORS.text,
  },
  label: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  subLabel: {
    color: COLORS.textTertiary,
    fontWeight: '500',
    marginTop: 2,
  },
});
