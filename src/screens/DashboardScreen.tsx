import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  FlatList,
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
import { getDateLabel, generateId } from '../utils/helpers';

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
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateLabel}>{getDateLabel(new Date())}</Text>
          <Text style={styles.greeting}>Hi, {profile?.displayName?.split(' ')[0] || 'there'}</Text>
        </View>
      </View>

      {/* ── COMPACT PROGRESS ── */}
      <View style={styles.progressCard}>
        <CalorieRing consumed={Math.round(totalCalories)} goal={calGoal} size={130} strokeWidth={10} />
        <Text style={styles.remainingText}>{remaining > 0 ? remaining : 0} kcal left</Text>
        <View style={styles.macroRow}>
          <MacroBar label="Protein" current={totalProtein} goal={profile?.proteinGoal || 150} color={COLORS.protein} />
          <MacroBar label="Carbs" current={totalCarbs} goal={profile?.carbsGoal || 250} color={COLORS.carbs} />
          <MacroBar label="Fat" current={totalFat} goal={profile?.fatGoal || 65} color={COLORS.fat} />
        </View>
      </View>

      {/* ── RECENT FOODS (1-TAP LOG) ── */}
      {recentFoods.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>⚡ Recent — tap to log</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recentFoods}
            keyExtractor={(item, i) => `${item.id}_${i}`}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentChip}
                onPress={() => instantLog(item)}
                activeOpacity={0.6}
              >
                <Text style={styles.recentName} numberOfLines={1}>{item.foodName}</Text>
                <Text style={styles.recentCal}>{Math.round(item.calories)} kcal</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ── FAVORITES (1-TAP LOG) ── */}
      {favorites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>❤️ Favorites — tap to log</Text>
          <View style={styles.favGrid}>
            {favorites.slice(0, 6).map((fav) => (
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
                <Text style={styles.favName} numberOfLines={2}>{fav.name}</Text>
                <Text style={styles.favCal}>{Math.round(fav.calories)} kcal</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── REPEAT YESTERDAY ── */}
      {yesterdayCount > 0 && (
        <TouchableOpacity style={styles.repeatBtn} onPress={handleRepeatYesterday} activeOpacity={0.7}>
          <Ionicons name="repeat" size={22} color="#fff" />
          <Text style={styles.repeatText}>Repeat Yesterday ({yesterdayCount} meals)</Text>
        </TouchableOpacity>
      )}

      {/* ── QUICK ADD CALORIES ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>⚡ Quick Add</Text>
        <View style={styles.quickCalRow}>
          {[100, 250, 500].map((amt) => (
            <TouchableOpacity
              key={amt}
              style={styles.quickCalBtn}
              onPress={() => handleQuickAdd(amt)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickCalText}>+{amt}</Text>
              <Text style={styles.quickCalUnit}>kcal</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── SEARCH BAR ── */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => onSearch('snack')}
        activeOpacity={0.7}
      >
        <Ionicons name="search" size={18} color={COLORS.textTertiary} />
        <Text style={styles.searchPlaceholder}>Search foods...</Text>
      </TouchableOpacity>

      {/* ── TODAY'S MEALS (collapsible) ── */}
      <TouchableOpacity
        style={styles.mealsToggle}
        onPress={() => setShowMeals(!showMeals)}
        activeOpacity={0.7}
      >
        <Text style={styles.mealsToggleText}>
          Today's Meals ({meals.length})
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

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.sm,
  },
  dateLabel: {
    fontSize: FONTS.sizes.xs, color: COLORS.textSecondary,
    fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  greeting: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text, marginTop: 2 },

  // Compact progress
  progressCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center',
    marginBottom: SPACING.md,
  },
  remainingText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: SPACING.md },
  macroRow: { flexDirection: 'row', gap: SPACING.md, width: '100%' },

  // Section
  section: { marginTop: SPACING.md, paddingHorizontal: SPACING.lg },
  sectionLabel: {
    fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  // Recent foods horizontal
  recentChip: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    marginRight: SPACING.sm, minWidth: 120, alignItems: 'center',
  },
  recentName: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  recentCal: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '700', marginTop: 2 },

  // Favorites grid
  favGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  favBtn: {
    width: '31%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', minHeight: 70, justifyContent: 'center',
  },
  favName: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  favCal: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '700', marginTop: 2 },

  // Repeat yesterday
  repeatBtn: {
    flexDirection: 'row', backgroundColor: COLORS.secondary || '#5856D6',
    borderRadius: BORDER_RADIUS.md, paddingVertical: 14,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md,
    alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  repeatText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '700' },

  // Quick add calories
  quickCalRow: { flexDirection: 'row', gap: SPACING.sm },
  quickCalBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  quickCalText: { fontSize: FONTS.sizes.lg, fontWeight: '800', color: COLORS.primary },
  quickCalUnit: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },

  // Search bar
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: 14,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md, gap: SPACING.sm,
  },
  searchPlaceholder: { fontSize: FONTS.sizes.md, color: COLORS.textTertiary },

  // Today's meals collapsible
  mealsToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginTop: SPACING.xl,
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
