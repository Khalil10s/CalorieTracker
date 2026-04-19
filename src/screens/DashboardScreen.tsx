import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Keyboard,
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
  const [quickCalInput, setQuickCalInput] = useState('');

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

  // Custom quick add
  const handleCustomQuickAdd = async () => {
    const val = parseInt(quickCalInput);
    if (!user || isNaN(val) || val <= 0) return;
    Keyboard.dismiss();
    await quickAddCalories(val, user.uid);
    setQuickCalInput('');
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
    >
      {/* ⚡ 1. QUICK LOG BAR (PRIMARY ACTION) */}
      <View style={styles.quickLogBar}>
        <TouchableOpacity
          style={styles.addFoodBtn}
          onPress={() => onSearch('snack')}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addFoodText}>Add Food</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickCalBtn}
          onPress={() => handleQuickAdd(100)}
          activeOpacity={0.7}
        >
          <Ionicons name="flash" size={18} color={COLORS.primary} />
          <Text style={styles.quickCalBtnText}>+100 kcal</Text>
        </TouchableOpacity>
      </View>

      {/* 🔁 2. RECENT FOODS (1-TAP LOG) */}
      {recentFoods.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT FOODS</Text>
          <View style={styles.recentGrid}>
            {recentFoods.slice(0, 12).map((item, i) => (
              <TouchableOpacity
                key={`${item.id}_${i}`}
                style={styles.recentItem}
                onPress={() => instantLog(item)}
                onLongPress={() => onEditMeal(item, item.mealType || 'snack')}
                activeOpacity={0.6}
              >
                <Text style={styles.recentCalories}>{Math.round(item.calories)}</Text>
                <Text style={styles.recentName} numberOfLines={2}>{item.foodName}</Text>
                <Text style={styles.recentKcal}>kcal</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ❤️ 3. FAVORITES (1-TAP LOG) */}
      {favorites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FAVORITES</Text>
          <View style={styles.favGrid}>
            {favorites.slice(0, 10).map((fav) => (
              <TouchableOpacity
                key={fav.id}
                style={styles.favItem}
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
                <Ionicons name="heart" size={20} color={COLORS.error} />
                <Text style={styles.favName} numberOfLines={1}>{fav.name}</Text>
                <Text style={styles.favCal}>{fav.calories} kcal</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 🔁 4. REPEAT PANEL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>REPEAT</Text>
        <View style={styles.repeatRow}>
          <TouchableOpacity
            style={[styles.repeatBtn, yesterdayCount === 0 && styles.repeatDisabled]}
            onPress={handleRepeatYesterday}
            activeOpacity={0.7}
            disabled={yesterdayCount === 0}
          >
            <Ionicons name="repeat-outline" size={20} color={yesterdayCount > 0 ? COLORS.primary : COLORS.textTertiary} />
            <Text style={[styles.repeatText, yesterdayCount === 0 && styles.repeatTextDisabled]}>
              Yesterday{yesterdayCount > 0 ? ` (${yesterdayCount})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.repeatBtn}
            onPress={handleRepeatLastMeal}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-redo-outline" size={20} color={COLORS.primary} />
            <Text style={styles.repeatText}>Last Meal</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔍 5. SEARCH (SECONDARY) */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => onSearch('snack')}
        activeOpacity={0.7}
      >
        <Ionicons name="search-outline" size={20} color={COLORS.textTertiary} />
        <Text style={styles.searchPlaceholder}>Search food...</Text>
      </TouchableOpacity>

      {/* ⚡ QUICK ADD CALORIES */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>QUICK ADD CALORIES</Text>
        <View style={styles.quickAddRow}>
          {[100, 250, 500].map((amt) => (
            <TouchableOpacity
              key={amt}
              style={styles.quickAddChip}
              onPress={() => handleQuickAdd(amt)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickAddChipText}>+{amt}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.quickAddCustom}>
            <TextInput
              style={styles.quickAddInput}
              placeholder="Custom"
              placeholderTextColor={COLORS.textTertiary}
              value={quickCalInput}
              onChangeText={setQuickCalInput}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={handleCustomQuickAdd}
            />
            <TouchableOpacity onPress={handleCustomQuickAdd} style={styles.quickAddGo}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 📊 6. TODAY SUMMARY (MINIMAL) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TODAY</Text>
        <View style={styles.summaryCard}>
          <CalorieRing consumed={Math.round(totalCalories)} goal={calGoal} size={120} strokeWidth={10} />
          <View style={styles.summaryMacros}>
            <MacroBar label="Protein" current={totalProtein} goal={profile?.proteinGoal || 150} color={COLORS.protein} />
            <View style={{ height: SPACING.sm }} />
            <MacroBar label="Carbs" current={totalCarbs} goal={profile?.carbsGoal || 250} color={COLORS.carbs} />
            <View style={{ height: SPACING.sm }} />
            <MacroBar label="Fat" current={totalFat} goal={profile?.fatGoal || 65} color={COLORS.fat} />
          </View>
        </View>
      </View>

      {/* TODAY'S MEALS (COLLAPSIBLE) */}
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
  content: { paddingBottom: 100, paddingTop: 56 },

  // ⚡ Quick Log Bar
  quickLogBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  addFoodBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  addFoodText: {
    color: '#fff',
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  quickCalBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickCalBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Sections
  section: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },

  // Recent Foods grid
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  recentItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    minWidth: 90,
    flex: 1,
    maxWidth: '31%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  recentCalories: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  recentName: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 2,
  },
  recentKcal: {
    fontSize: 9,
    color: COLORS.textTertiary,
    fontWeight: '600',
    marginTop: 1,
  },

  // Favorites grid
  favGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  favItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
    maxWidth: '31%',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  favName: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 4,
  },
  favCal: {
    fontSize: 9,
    fontWeight: '500',
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  // Repeat panel
  repeatRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  repeatBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  repeatDisabled: {
    opacity: 0.4,
  },
  repeatText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  repeatTextDisabled: {
    color: COLORS.textTertiary,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchPlaceholder: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textTertiary,
    flex: 1,
  },

  // Quick add calories row
  quickAddRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickAddChip: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickAddChipText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  quickAddCustom: {
    flexDirection: 'row',
    flex: 1,
    minWidth: 100,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  quickAddInput: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  quickAddGo: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Today summary
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  summaryMacros: { flex: 1 },

  // Today's meals
  mealsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  mealsToggleText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  mealsList: { paddingHorizontal: SPACING.lg },
  mealTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  mealTypeLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  noMeals: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
