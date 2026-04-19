import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { FoodItem, MealType, MealEntry } from '../types';
import { addMeal } from '../services/storageService';
import { generateId } from '../utils/helpers';
import DashboardScreen from '../screens/DashboardScreen';
import FoodSearchScreen from '../screens/FoodSearchScreen';
import FoodDetailScreen from '../screens/FoodDetailScreen';
import ManualEntryScreen from '../screens/ManualEntryScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import WeightScreen from '../screens/WeightScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditMealScreen from '../screens/EditMealScreen';
import WaterScreen from '../screens/WaterTrackerScreen';
import StatsScreen from '../screens/StatsScreen';
import RecipeScreen from '../screens/RecipeScreen';
import BMIScreen from '../screens/BMIScreen';
import { FONTS, SPACING } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';

type Screen =
  | { name: 'dashboard' }
  | { name: 'weight' }
  | { name: 'calendar' }
  | { name: 'settings' }
  | { name: 'water' }
  | { name: 'stats' }
  | { name: 'foodSearch'; mealType: MealType }
  | { name: 'foodDetail'; food: FoodItem; mealType: MealType }
  | { name: 'manualEntry'; mealType: MealType }
  | { name: 'barcodeScanner'; mealType: MealType }
  | { name: 'editMeal'; meal: MealEntry; mealType: MealType }
  | { name: 'recipes' }
  | { name: 'bmi' };

type TabName = 'dashboard' | 'water' | 'stats' | 'settings';

const TABS: { name: TabName; icon: string; label: string }[] = [
  { name: 'dashboard', icon: 'home', label: 'Home' },
  { name: 'water', icon: 'water', label: 'Water' },
  { name: 'stats', icon: 'stats-chart', label: 'Stats' },
  { name: 'settings', icon: 'ellipsis-horizontal', label: 'More' },
];

export default function AppNavigator() {
  const COLORS = useTheme().colors;
  const styles = makeStyles(COLORS);
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'dashboard' });
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  const navigateTab = (tab: TabName) => {
    setActiveTab(tab);
    setScreen({ name: tab } as Screen);
  };

  const goToDashboard = () => {
    setRefreshKey((k) => k + 1);
    setActiveTab('dashboard');
    setScreen({ name: 'dashboard' });
  };

  const renderScreen = () => {
    switch (screen.name) {
      case 'dashboard':
        return (
          <DashboardScreen
            key={refreshKey}
            onNavigateAddMeal={(mealType) =>
              setScreen({ name: 'foodSearch', mealType })
            }
            onEditMeal={(meal, mealType) =>
              setScreen({ name: 'editMeal', meal, mealType })
            }
            onSearch={(mealType) =>
              setScreen({ name: 'foodSearch', mealType })
            }
          />
        );
      case 'weight':
        return <WeightScreen />;
      case 'calendar':
        return <CalendarScreen />;
      case 'settings':
        return (
          <SettingsScreen
            onNavigateBMI={() => setScreen({ name: 'bmi' })}
            onNavigateRecipes={() => setScreen({ name: 'recipes' })}
            onNavigateCalendar={() => setScreen({ name: 'calendar' })}
            onNavigateStats={() => setScreen({ name: 'stats' })}
            onNavigateWeight={() => setScreen({ name: 'weight' })}
          />
        );
      case 'water':
        return <WaterScreen />;
      case 'stats':
        return <StatsScreen />;
      case 'foodSearch':
        return (
          <FoodSearchScreen
            mealType={screen.mealType}
            onSelectFood={(food) =>
              setScreen({ name: 'foodDetail', food, mealType: screen.mealType })
            }
            onInstantLog={async (food) => {
              if (!user) return;
              const now = Date.now();
              await addMeal({
                id: generateId(),
                foodName: food.name,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
                servingSize: food.servingSize,
                quantity: 1,
                mealType: screen.mealType,
                date: now,
                createdAt: now,
              }, user.uid);
              goToDashboard();
            }}
            onManualEntry={() =>
              setScreen({ name: 'manualEntry', mealType: screen.mealType })
            }
            onBarcodeScan={() =>
              setScreen({ name: 'barcodeScanner', mealType: screen.mealType })
            }
            onBack={goToDashboard}
          />
        );
      case 'foodDetail':
        return (
          <FoodDetailScreen
            food={screen.food}
            mealType={screen.mealType}
            onBack={() => setScreen({ name: 'foodSearch', mealType: screen.mealType })}
            onDone={goToDashboard}
          />
        );
      case 'manualEntry':
        return (
          <ManualEntryScreen
            mealType={screen.mealType}
            onBack={() => setScreen({ name: 'foodSearch', mealType: screen.mealType })}
            onDone={goToDashboard}
          />
        );
      case 'barcodeScanner':
        return (
          <BarcodeScannerScreen
            onFoodFound={(food) =>
              setScreen({ name: 'foodDetail', food, mealType: screen.mealType })
            }
            onBack={() => setScreen({ name: 'foodSearch', mealType: screen.mealType })}
          />
        );
      case 'editMeal':
        return (
          <EditMealScreen
            meal={screen.meal}
            mealType={screen.mealType}
            onBack={goToDashboard}
            onDone={goToDashboard}
          />
        );
      case 'recipes':
        return (
          <RecipeScreen
            onBack={() => { setActiveTab('settings'); setScreen({ name: 'settings' }); }}
          />
        );
      case 'bmi':
        return (
          <BMIScreen
            onBack={() => { setActiveTab('settings'); setScreen({ name: 'settings' }); }}
          />
        );
    }
  };

  const showTabs = ['dashboard', 'water', 'settings', 'weight', 'calendar', 'stats'].includes(screen.name);

  return (
    <View style={styles.container}>
      {renderScreen()}
      {showTabs && (
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tab}
                onPress={() => navigateTab(tab.name)}
              >
                <Ionicons
                  name={(isActive ? tab.icon : `${tab.icon}-outline`) as any}
                  size={24}
                  color={isActive ? COLORS.primary : COLORS.textTertiary}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const makeStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.tabBar,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.separator,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textTertiary,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
