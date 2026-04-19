import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  getMealsForDate, deleteMeal, addMeal,
  getRecentFoodsRanked, getFavorites, getYesterdayMeals,
  repeatYesterdayMeals, repeatLastMeal, quickAddCalories,
} from '../services/storageService';
import { MealEntry, MealType, FoodItem, MEAL_TYPES } from '../types';
import CalorieRing from '../components/CalorieRing';
import MacroCircle from '../components/MacroCircle';
import MealRow from '../components/MealRow';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';
import { generateId } from '../utils/helpers';

interface Props {
  onNavigateAddMeal: (mealType: MealType) => void;
  onEditMeal: (meal: MealEntry, mealType: MealType) => void;
  onSearch: (mealType: MealType) => void;
}

export default function DashboardScreen({ onNavigateAddMeal, onEditMeal, onSearch }: Props) {
  const COLORS = useTheme().colors;
  const styles = makeStyles(COLORS);
  const { user, profile } = useAuth();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [recentFoods, setRecentFoods] = useState<MealEntry[]>([]);
  const [favorites, setFavorites] = useState<FoodItem[]>([]);
  const [yesterdayCount, setYesterdayCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [data, recent, favs, yesterday] = await Promise.all([
        getMealsForDate(new Date(), user.uid),
        getRecentFoodsRanked(user.uid, 10),
        getFavorites(user.uid),
        getYesterdayMeals(user.uid),
      ]);
      setMeals(data);
      setRecentFoods(recent);
      setFavorites(favs);
      setYesterdayCount(yesterday.length);
    } catch (err) {
      console.error('Failed to load', err);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // 1-TAP: Re-log a recent or favorite food instantly
  const instantLog = async (entry: { foodName: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string; mealType?: MealType }) => {
    if (!user) return;
    const now = Date.now();
    await addMeal({
      id: generateId(),
      foodName: entry.foodName,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      servingSize: entry.servingSize,
      quantity: 1,
      mealType: entry.mealType || 'snack',
      date: now,
      createdAt: now,
    }, user.uid);
    await load();
  };

  // Repeat yesterday
  const handleRepeatYesterday = async () => {
    if (!user || yesterdayCount === 0) return;
    const count = await repeatYesterdayMeals(user.uid);
    Alert.alert('Done', `Logged ${count} meals from yesterday.`);
    await load();
  };

  // Quick add calories
  const handleQuickAdd = async (amount: number) => {
    if (!user) return;
    await quickAddCalories(amount, user.uid);
    await load();
  };

  // Repeat last meal
  const handleRepeatLastMeal = async () => {
    if (!user) return;
    const result = await repeatLastMeal(user.uid);
    if (result) {
      await load();
    } else {
      Alert.alert('No Meals', 'No previous meals found to repeat.');
    }
  };

  const handleDelete = (meal: MealEntry) => {
    Alert.alert('Delete', `Remove ${meal.foodName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteMeal(meal.id, user?.uid);
        await load();
      }},
    ]);
  };

  const totalCalories = meals.reduce((s, m) => s + m.calories * m.quantity, 0);
  const totalProtein = meals.reduce((s, m) => s + m.protein * m.quantity, 0);
  const totalCarbs = meals.reduce((s, m) => s + m.carbs * m.quantity, 0);
  const totalFat = meals.reduce((s, m) => s + m.fat * m.quantity, 0);
  const calGoal = profile?.calorieGoal || 2000;
  const remaining = calGoal - Math.round(totalCalories);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* ── HEADER: Date ── */}
      <Text style={styles.dateLabel}>Today</Text>

      {/* ── CALORIE RING + MACRO CIRCLES ── */}
      <View style={styles.summaryCard}>
        <CalorieRing consumed={Math.round(totalCalories)} goal={calGoal} size={160} strokeWidth={12} />
        <View style={styles.macroRow}>
          <MacroCircle label="Carbs" current={totalCarbs} goal={profile?.carbsGoal || 250} color={COLORS.carbs} />
          <MacroCircle label="Protein" current={totalProtein} goal={profile?.proteinGoal || 150} color={COLORS.protein} />
          <MacroCircle label="Fat" current={totalFat} goal={profile?.fatGoal || 65} color={COLORS.fat} />
        </View>
      </View>

      {/* ── DIARY: Meal Sections ── */}
      {MEAL_TYPES.map(({ type, label, icon, color }) => {
        const entries = meals.filter((m) => m.mealType === type);
        const sectionCal = entries.reduce((s, m) => s + m.calories * m.quantity, 0);
        return (
          <View key={type} style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <View style={styles.mealHeaderLeft}>
                <View style={[styles.mealDot, { backgroundColor: color }]} />
                <Text style={styles.mealLabel}>{label}</Text>
                {sectionCal > 0 && (
                  <Text style={styles.mealCal}>{Math.round(sectionCal)} kcal</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => onSearch(type)}
                style={styles.mealAddBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            {entries.length > 0 ? (
              entries.map((entry) => (
                <MealRow
                  key={entry.id}
                  entry={entry}
                  onPress={() => onEditMeal(entry, type)}
                  onDelete={() => handleDelete(entry)}
                />
              ))
            ) : (
              <TouchableOpacity
                style={styles.mealEmpty}
                onPress={() => onSearch(type)}
                activeOpacity={0.6}
              >
                <Ionicons name="add-circle-outline" size={20} color={COLORS.textTertiary} />
                <Text style={styles.mealEmptyText}>Add {label.toLowerCase()}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* ── QUICK ACTIONS ── */}
      <View style={styles.quickSection}>
        <Text style={styles.quickTitle}>QUICK ACTIONS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {/* Quick add chips */}
          {[100, 250, 500].map((amt) => (
            <TouchableOpacity
              key={amt}
              style={styles.quickChip}
              onPress={() => handleQuickAdd(amt)}
              activeOpacity={0.7}
            >
              <Ionicons name="flash-outline" size={16} color={COLORS.primary} />
              <Text style={styles.quickChipText}>+{amt} kcal</Text>
            </TouchableOpacity>
          ))}
          {/* Repeat yesterday */}
          <TouchableOpacity
            style={[styles.quickChip, yesterdayCount === 0 && { opacity: 0.4 }]}
            onPress={handleRepeatYesterday}
            activeOpacity={0.7}
            disabled={yesterdayCount === 0}
          >
            <Ionicons name="repeat-outline" size={16} color={COLORS.primary} />
            <Text style={styles.quickChipText}>Yesterday{yesterdayCount > 0 ? ` (${yesterdayCount})` : ''}</Text>
          </TouchableOpacity>
          {/* Repeat last meal */}
          <TouchableOpacity
            style={styles.quickChip}
            onPress={handleRepeatLastMeal}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-redo-outline" size={16} color={COLORS.primary} />
            <Text style={styles.quickChipText}>Last Meal</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── RECENT FOODS (horizontal) ── */}
      {recentFoods.length > 0 && (
        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>RECENT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recentFoods.slice(0, 12).map((item, i) => (
              <TouchableOpacity
                key={`${item.id}_${i}`}
                style={styles.recentChip}
                onPress={() => instantLog(item)}
                onLongPress={() => onEditMeal(item, item.mealType || 'snack')}
                activeOpacity={0.6}
              >
                <Text style={styles.recentChipName} numberOfLines={1}>{item.foodName}</Text>
                <Text style={styles.recentChipCal}>{Math.round(item.calories)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── FAVORITES (horizontal) ── */}
      {favorites.length > 0 && (
        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>FAVORITES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {favorites.slice(0, 10).map((fav) => (
              <TouchableOpacity
                key={fav.id}
                style={styles.favChip}
                onPress={() => instantLog({
                  foodName: fav.name,
                  calories: fav.calories,
                  protein: fav.protein,
                  carbs: fav.carbs,
                  fat: fav.fat,
                  servingSize: fav.servingSize,
                })}
                activeOpacity={0.6}
              >
                <Ionicons name="heart" size={14} color={COLORS.error} />
                <Text style={styles.favChipName} numberOfLines={1}>{fav.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 100,
  },

  // Header
  dateLabel: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    color: COLORS.text,
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    marginBottom: SPACING.md,
  },

  // Summary card
  summaryCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: SPACING.xl,
  },

  // Meal diary sections
  mealSection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  mealDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mealLabel: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  mealCal: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  mealAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  mealEmptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },

  // Quick actions
  quickSection: {
    marginBottom: SPACING.lg,
  },
  quickTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  quickRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Recent foods
  recentRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  recentChip: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  recentChipName: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.text,
  },
  recentChipCal: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },

  // Favorites
  favChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    gap: 6,
  },
  favChipName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
});
