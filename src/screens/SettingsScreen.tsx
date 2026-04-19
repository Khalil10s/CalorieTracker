import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { signOut } from '../services/localAuthService';
import { exportAllDataCSV } from '../services/storageService';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';

interface Props {
  onNavigateBMI: () => void;
  onNavigateRecipes: () => void;
  onNavigateCalendar: () => void;
  onNavigateStats: () => void;
  onNavigateWeight: () => void;
}

export default function SettingsScreen({ onNavigateBMI, onNavigateRecipes, onNavigateCalendar, onNavigateStats, onNavigateWeight }: Props) {
  const { colors: COLORS, mode, toggle: toggleTheme } = useTheme();
  const styles = makeStyles(COLORS);
  const { profile, updateProfile } = useAuth();
  const [calories, setCalories] = useState(String(profile?.calorieGoal ?? 2000));
  const [protein, setProtein] = useState(String(profile?.proteinGoal ?? 150));
  const [carbs, setCarbs] = useState(String(profile?.carbsGoal ?? 250));
  const [fat, setFat] = useState(String(profile?.fatGoal ?? 65));
  const [unit, setUnit] = useState<'kg' | 'lbs'>(profile?.weightUnit ?? 'kg');
  const [waterGoal, setWaterGoal] = useState(String(profile?.waterGoal ?? 2000));
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const c = parseInt(calories);
    const p = parseInt(protein);
    const cb = parseInt(carbs);
    const f = parseInt(fat);
    const wg = parseInt(waterGoal);
    if (isNaN(c) || isNaN(p) || isNaN(cb) || isNaN(f)) {
      Alert.alert('Error', 'Please enter valid numbers.');
      return;
    }
    Keyboard.dismiss();
    await updateProfile({
      calorieGoal: c,
      proteinGoal: p,
      carbsGoal: cb,
      fatGoal: f,
      weightUnit: unit,
      waterGoal: isNaN(wg) ? 2000 : wg,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionLabel}>Daily Goals</Text>

      {[
        { label: 'Calories (kcal)', value: calories, set: setCalories },
        { label: 'Protein (g)', value: protein, set: setProtein },
        { label: 'Carbs (g)', value: carbs, set: setCarbs },
        { label: 'Fat (g)', value: fat, set: setFat },
      ].map(({ label, value, set }) => (
        <View key={label} style={styles.field}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TextInput
            style={styles.fieldInput}
            value={value}
            onChangeText={set}
            keyboardType="number-pad"
          />
        </View>
      ))}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Weight Unit</Text>
        <View style={styles.toggleRow}>
          {(['kg', 'lbs'] as const).map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.toggle, unit === u && styles.toggleActive]}
              onPress={() => setUnit(u)}
            >
              <Text style={[styles.toggleText, unit === u && styles.toggleTextActive]}>
                {u.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Water Goal (ml)</Text>
        <TextInput
          style={styles.fieldInput}
          value={waterGoal}
          onChangeText={setWaterGoal}
          keyboardType="number-pad"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{saved ? '✓ Saved' : 'Save Changes'}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Tools</Text>
      <TouchableOpacity style={styles.linkRow} onPress={onNavigateCalendar}>
        <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
        <Text style={styles.linkText}>Calendar</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={onNavigateStats}>
        <Ionicons name="stats-chart-outline" size={22} color={COLORS.primary} />
        <Text style={styles.linkText}>Statistics</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={onNavigateWeight}>
        <Ionicons name="scale-outline" size={22} color={COLORS.primary} />
        <Text style={styles.linkText}>Weight Tracker</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={onNavigateBMI}>
        <Ionicons name="body-outline" size={22} color={COLORS.primary} />
        <Text style={styles.linkText}>BMI Calculator</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={onNavigateRecipes}>
        <Ionicons name="restaurant-outline" size={22} color={COLORS.primary} />
        <Text style={styles.linkText}>Recipe Builder</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkRow} onPress={async () => {
        try {
          const csv = await exportAllDataCSV();
          await Share.share({ message: csv, title: 'CalorieTracker Export' });
        } catch { Alert.alert('Error', 'Failed to export data.'); }
      }}>
        <Ionicons name="download-outline" size={22} color={COLORS.primary} />
        <Text style={styles.linkText}>Export Data (CSV)</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Appearance</Text>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Theme</Text>
        <View style={styles.toggleRow}>
          {(['light', 'dark'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toggle, mode === t && styles.toggleActive]}
              onPress={toggleTheme}
            >
              <Ionicons
                name={t === 'light' ? 'sunny' : 'moon'}
                size={16}
                color={mode === t ? '#fff' : COLORS.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.toggleText, mode === t && styles.toggleTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email</Text>
        <Text style={styles.fieldValue}>{profile?.email}</Text>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xxl,
  },
  sectionLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xxl,
  },
  field: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  fieldInput: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  fieldValue: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toggleTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  signOutText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.error,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  linkText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
});
