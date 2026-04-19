import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealEntry, WeightEntry, UserProfile, FoodItem, WaterEntry, Recipe } from '../types';
import { formatDate } from '../utils/helpers';

const KEYS = {
  profile: 'profile',
  meals: 'meals',
  weights: 'weights',
  customFoods: 'customFoods',
  favorites: 'favorites',
  water: 'water',
  recipes: 'recipes',
};

// ---- Helpers ----

const getJSON = async <T>(key: string): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
};

const setJSON = async (key: string, value: unknown): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

// ---- Profile ----

export const saveProfile = async (profile: UserProfile): Promise<void> => {
  await setJSON(KEYS.profile, profile);
};

export const getProfile = async (_uid?: string): Promise<UserProfile | null> => {
  return getJSON<UserProfile>(KEYS.profile);
};

// ---- Meals ----

const getAllMeals = async (): Promise<MealEntry[]> => {
  return (await getJSON<MealEntry[]>(KEYS.meals)) || [];
};

const saveMeals = async (meals: MealEntry[]): Promise<void> => {
  await setJSON(KEYS.meals, meals);
};

export const addMeal = async (meal: MealEntry, _uid?: string): Promise<void> => {
  const meals = await getAllMeals();
  meals.push(meal);
  await saveMeals(meals);
};

export const getMealsForDate = async (date: Date, _uid?: string): Promise<MealEntry[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const meals = await getAllMeals();
  return meals
    .filter((m) => m.date >= startOfDay.getTime() && m.date <= endOfDay.getTime())
    .sort((a, b) => a.date - b.date);
};

export const getMealsForRange = async (start: Date, end: Date, _uid?: string): Promise<MealEntry[]> => {
  const startTime = new Date(start);
  startTime.setHours(0, 0, 0, 0);
  const endTime = new Date(end);
  endTime.setHours(23, 59, 59, 999);

  const meals = await getAllMeals();
  return meals
    .filter((m) => m.date >= startTime.getTime() && m.date <= endTime.getTime())
    .sort((a, b) => a.date - b.date);
};

export const deleteMeal = async (mealId: string, _uid?: string): Promise<void> => {
  const meals = await getAllMeals();
  await saveMeals(meals.filter((m) => m.id !== mealId));
};

export const getRecentMeals = async (_uid?: string, count: number = 20): Promise<MealEntry[]> => {
  const meals = await getAllMeals();
  return meals.sort((a, b) => b.createdAt - a.createdAt).slice(0, count);
};

// ---- Weight ----

const getAllWeights = async (): Promise<WeightEntry[]> => {
  return (await getJSON<WeightEntry[]>(KEYS.weights)) || [];
};

const saveWeights = async (weights: WeightEntry[]): Promise<void> => {
  await setJSON(KEYS.weights, weights);
};

export const addWeight = async (entry: WeightEntry, _uid?: string): Promise<void> => {
  const weights = await getAllWeights();
  weights.push(entry);
  await saveWeights(weights);
};

export const getWeights = async (_uid?: string, count: number = 90): Promise<WeightEntry[]> => {
  const weights = await getAllWeights();
  return weights.sort((a, b) => a.date - b.date).slice(-count);
};

export const deleteWeight = async (entryId: string, _uid?: string): Promise<void> => {
  const weights = await getAllWeights();
  await saveWeights(weights.filter((w) => w.id !== entryId));
};

// ---- Custom Foods ----

export const addCustomFood = async (food: FoodItem, _uid?: string): Promise<void> => {
  const foods = (await getJSON<FoodItem[]>(KEYS.customFoods)) || [];
  foods.push(food);
  await setJSON(KEYS.customFoods, foods);
};

export const getCustomFoods = async (_uid?: string): Promise<FoodItem[]> => {
  const foods = (await getJSON<FoodItem[]>(KEYS.customFoods)) || [];
  return foods.sort((a, b) => a.name.localeCompare(b.name));
};

// ---- Edit Meal ----

export const updateMeal = async (updatedMeal: MealEntry, _uid?: string): Promise<void> => {
  const meals = await getAllMeals();
  const idx = meals.findIndex((m) => m.id === updatedMeal.id);
  if (idx !== -1) {
    meals[idx] = updatedMeal;
    await saveMeals(meals);
  }
};

// ---- Favorites ----

export const getFavorites = async (_uid?: string): Promise<FoodItem[]> => {
  return (await getJSON<FoodItem[]>(KEYS.favorites)) || [];
};

export const addFavorite = async (food: FoodItem, _uid?: string): Promise<void> => {
  const favs = await getFavorites();
  if (!favs.find((f) => f.id === food.id)) {
    favs.push({ ...food, isFavorite: true });
    await setJSON(KEYS.favorites, favs);
  }
};

export const removeFavorite = async (foodId: string, _uid?: string): Promise<void> => {
  const favs = await getFavorites();
  await setJSON(KEYS.favorites, favs.filter((f) => f.id !== foodId));
};

export const isFavorite = async (foodId: string): Promise<boolean> => {
  const favs = await getFavorites();
  return favs.some((f) => f.id === foodId);
};

// ---- Water ----

const getAllWater = async (): Promise<WaterEntry[]> => {
  return (await getJSON<WaterEntry[]>(KEYS.water)) || [];
};

export const addWater = async (entry: WaterEntry, _uid?: string): Promise<void> => {
  const all = await getAllWater();
  all.push(entry);
  await setJSON(KEYS.water, all);
};

export const getWaterForDate = async (date: Date, _uid?: string): Promise<WaterEntry[]> => {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(date); end.setHours(23, 59, 59, 999);
  const all = await getAllWater();
  return all.filter((w) => w.date >= start.getTime() && w.date <= end.getTime());
};

export const deleteWater = async (entryId: string, _uid?: string): Promise<void> => {
  const all = await getAllWater();
  await setJSON(KEYS.water, all.filter((w) => w.id !== entryId));
};

// ---- Recipes ----

export const getRecipes = async (_uid?: string): Promise<Recipe[]> => {
  return (await getJSON<Recipe[]>(KEYS.recipes)) || [];
};

export const addRecipe = async (recipe: Recipe, _uid?: string): Promise<void> => {
  const all = await getRecipes();
  all.push(recipe);
  await setJSON(KEYS.recipes, all);
};

export const deleteRecipe = async (recipeId: string, _uid?: string): Promise<void> => {
  const all = await getRecipes();
  await setJSON(KEYS.recipes, all.filter((r) => r.id !== recipeId));
};

// ---- Streaks ----

export const getStreak = async (_uid?: string): Promise<number> => {
  const meals = await getAllMeals();
  if (meals.length === 0) return 0;

  const datesSet = new Set<string>();
  meals.forEach((m) => {
    const d = new Date(m.date);
    datesSet.add(formatDate(d));
  });

  let streak = 0;
  const today = new Date();
  const check = new Date(today);

  // If nothing logged today, start from yesterday
  if (!datesSet.has(formatDate(check))) {
    check.setDate(check.getDate() - 1);
  }

  while (datesSet.has(formatDate(check))) {
    streak++;
    check.setDate(check.getDate() - 1);
  }

  return streak;
};

// ---- Recent Foods (frequency + recency ranked) ----

export const getRecentFoodsRanked = async (_uid?: string, limit: number = 20): Promise<MealEntry[]> => {
  const meals = await getAllMeals();
  // Build frequency map by foodName
  const freq: Record<string, { meal: MealEntry; count: number; lastDate: number }> = {};
  for (const m of meals) {
    const key = m.foodName.toLowerCase();
    if (!freq[key] || m.date > freq[key].lastDate) {
      freq[key] = { meal: m, count: (freq[key]?.count || 0) + 1, lastDate: m.date };
    } else {
      freq[key].count++;
    }
  }
  // Sort by weighted score: frequency * 2 + recency
  const now = Date.now();
  return Object.values(freq)
    .sort((a, b) => {
      const scoreA = a.count * 2 + (1 - (now - a.lastDate) / (30 * 86400000));
      const scoreB = b.count * 2 + (1 - (now - b.lastDate) / (30 * 86400000));
      return scoreB - scoreA;
    })
    .slice(0, limit)
    .map((f) => f.meal);
};

// ---- Repeat Yesterday ----

export const getYesterdayMeals = async (_uid?: string): Promise<MealEntry[]> => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getMealsForDate(yesterday, _uid);
};

export const repeatYesterdayMeals = async (_uid?: string): Promise<number> => {
  const yesterdayMeals = await getYesterdayMeals(_uid);
  if (yesterdayMeals.length === 0) return 0;
  const now = Date.now();
  for (const m of yesterdayMeals) {
    await addMeal({
      ...m,
      id: `${now}_${Math.random().toString(36).slice(2)}`,
      date: now,
      createdAt: now,
    }, _uid);
  }
  return yesterdayMeals.length;
};

// ---- Quick Add Calories ----

export const quickAddCalories = async (amount: number, _uid?: string): Promise<void> => {
  const now = Date.now();
  await addMeal({
    id: `${now}_${Math.random().toString(36).slice(2)}`,
    foodName: `Quick add +${amount}`,
    calories: amount,
    protein: 0,
    carbs: 0,
    fat: 0,
    servingSize: `${amount} kcal`,
    quantity: 1,
    mealType: 'snack',
    date: now,
    createdAt: now,
  }, _uid);
};

// ---- Export ----

export const exportAllDataCSV = async (_uid?: string): Promise<string> => {
  const meals = await getAllMeals();
  const header = 'Date,Meal Type,Food Name,Calories,Protein(g),Carbs(g),Fat(g),Serving,Quantity';
  const rows = meals
    .sort((a, b) => a.date - b.date)
    .map((m) => {
      const d = new Date(m.date).toISOString().split('T')[0];
      const name = m.foodName.replace(/,/g, ' ');
      return `${d},${m.mealType},${name},${m.calories},${m.protein},${m.carbs},${m.fat},${m.servingSize},${m.quantity}`;
    });
  return [header, ...rows].join('\n');
};
