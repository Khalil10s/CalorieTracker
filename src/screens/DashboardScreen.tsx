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
  repeatYesterdayMeals, quickAddCalories,
} from '../services/storageService';
import { MealEntry, MealType, FoodItem, MEAL_TYPES } from '../types';
import CalorieRing from '../components/CalorieRing';
import MacroBar from '../components/MacroBar';
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
  const [showMeals, setShowMeals] = useState(false);

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── SEARCH BAR (TOP) ── */}
      <View style={styles.searchSection}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => onSearch('snack')}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={20} color={COLORS.textTertiary} />
          <Text style={styles.searchPlaceholder}>Search Food...</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => onNavigateAddMeal('snack')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── RECENT FOODS ── */}
      {recentFoods.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>RECENT FOODS</Text>
          <View style={styles.divider} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recentFoods.map((item, i) => (
              <TouchableOpacity
                key={`${item.id}_${i}`}
                style={styles.recentChip}
                onPress={() => instantLog(item)}
                activeOpacity={0.6}
              >
                <Text style={styles.recentName} numberOfLines={1}>{item.foodName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── FAVORITES ── */}
      {favorites.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>FAVORITES</Text>
          <View style={styles.divider} />
          <View style={styles.favGrid}>
            {favorites.slice(0, 8).map((fav) => (
              <TouchableOpacity
                key={fav.id}
                style={styles.favBtn}
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
                <Ionicons name="heart" size={28} color={COLORS.primary} />
                <Text style={styles.favName} numberOfLines={1}>{fav.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── REPEAT YESTERDAY ── */}
      <View style={styles.sectionBlock}>
        <TouchableOpacity
          style={[styles.repeatBtn, yesterdayCount === 0 && { opacity: 0.4 }]}
          onPress={handleRepeatYesterday}
          activeOpacity={0.7}
          disabled={yesterdayCount === 0}
        >
          <Ionicons name="repeat-outline" size={20} color={COLORS.text} />
          <Text style={styles.repeatText}>
            Repeat Yesterday{'\u2019'}s Meals{yesterdayCount > 0 ? ` (${yesterdayCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── QUICK ADD CALORIES ── */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>
          <Text style={{ fontWeight: '800' }}>QUICK ADD</Text> CALORIES
        </Text>
        <View style={styles.divider} />
        <View style={styles.quickCalRow}>
          {[100, 250, 500].map((amt) => (
            <TouchableOpacity
              key={amt}
              style={styles.quickCalBtn}
              onPress={() => handleQuickAdd(amt)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickCalText}>+{amt} <Text style={styles.quickCalUnit}>kcal</Text></Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── CALORIE SUMMARY ── */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>
          <Text style={{ fontWeight: '800' }}>CALORIE</Text> SUMMARY
        </Text>
        <View style={styles.divider} />
        <View style={styles.summaryCard}>
          <View style={styles.summaryRing}>
            <CalorieRing consumed={Math.round(totalCalories)} goal={calGoal} size={150} strokeWidth={12} />
          </View>
          <View style={styles.summaryMacros}>
            <MacroBar label="Protein" current={totalProtein} goal={profile?.proteinGoal || 150} color={COLORS.protein} />
            <View style={{ height: SPACING.md }} />
            <MacroBar label="Carbs" current={totalCarbs} goal={profile?.carbsGoal || 250} color={COLORS.carbs} />
            <View style={{ height: SPACING.md }} />
            <MacroBar label="Fat" current={totalFat} goal={profile?.fatGoal || 65} color={COLORS.fat} />
          </View>
        </View>
      </View>

      {/* ── TODAY'S MEALS ── */}
      <TouchableOpacity
        style={styles.mealsToggle}
        onPress={() => setShowMeals(!showMeals)}
        activeOpacity={0.7}
      >
        <Text style={styles.mealsToggleText}>
          Today{'\u2019'}s Meals ({meals.length})
        </Text>
        <Ionicons
          name={showMeals ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {showMeals && (
        <View style={styles.mealsList}>
          {MEAL_TYPES.map(({ type, label, icon }) => {
            const entries = meals.filter((m) => m.mealType === type);
            if (entries.length === 0) return null;
            return (
              <View key={type}>
                <View style={styles.mealTypeHeader}>
                  <Text style={styles.mealTypeLabel}>{icon} {label}</Text>
                  <TouchableOpacity onPress={() => onNavigateAddMeal(type)}>
                    <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                {entries.map((entry) => (
                  <MealRow
                    key={entry.id}
                    entry={entry}
                    onPress={() => onEditMeal(entry, type)}
                    onDelete={() => handleDelete(entry)}
                  />
                ))}
              </View>
            );
          })}
          {meals.length === 0 && (
            <Text style={styles.noMeals}>No meals logged yet today</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 100 },

  // Search bar top
  searchSection: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: 56, gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
    gap: SPACING.sm,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  searchPlaceholder: { fontSize: FONTS.sizes.md, color: COLORS.textTertiary, flex: 1 },
  addBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 4,
  },

  // Section block
  sectionBlock: {
    backgroundColor: COLORS.surface, marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  divider: {
    height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm,
  },

  // Recent foods
  recentRow: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  recentChip: {
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  recentName: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },

  // Favorites
  favGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.lg, justifyContent: 'flex-start' },
  favBtn: { alignItems: 'center', width: 72 },
  favName: {
    fontSize: FONTS.sizes.xs, fontWeight: '500', color: COLORS.text,
    textAlign: 'center', marginTop: SPACING.xs,
  },

  // Repeat yesterday
  repeatBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  repeatText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },

  // Quick add
  quickCalRow: { flexDirection: 'row', gap: SPACING.sm },
  quickCalBtn: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  quickCalText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  quickCalUnit: { fontSize: FONTS.sizes.sm, fontWeight: '400', color: COLORS.textSecondary },

  // Calorie summary
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  summaryRing: { flexShrink: 0 },
  summaryMacros: { flex: 1 },

  // Today's meals
  mealsToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  mealsToggleText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary },
  mealsList: { paddingHorizontal: SPACING.lg },
  mealTypeHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: SPACING.md, marginBottom: SPACING.xs,
  },
  mealTypeLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  noMeals: { fontSize: FONTS.sizes.md, color: COLORS.textTertiary, textAlign: 'center', marginTop: SPACING.lg },
});
