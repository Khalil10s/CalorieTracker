import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchByName } from '../services/foodService';
import { getFavorites } from '../services/storageService';
import { FoodItem, MealType } from '../types';
import { FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  mealType: MealType;
  onSelectFood: (food: FoodItem) => void;
  onInstantLog?: (food: FoodItem) => void;
  onManualEntry: () => void;
  onBarcodeScan: () => void;
  onBack: () => void;
}

export default function FoodSearchScreen({ mealType, onSelectFood, onInstantLog, onManualEntry, onBarcodeScan, onBack }: Props) {
  const COLORS = useTheme().colors;
  const styles = makeStyles(COLORS);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [favorites, setFavorites] = useState<FoodItem[]>([]);

  const loadFavorites = useCallback(async () => {
    const favs = await getFavorites();
    setFavorites(favs);
  }, []);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const data = await searchByName(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const renderItem = ({ item }: { item: FoodItem }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => onInstantLog ? onInstantLog(item) : onSelectFood(item)}
      onLongPress={() => onSelectFood(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemMeta}>{item.servingSize} · P:{Math.round(item.protein)}g C:{Math.round(item.carbs)}g F:{Math.round(item.fat)}g</Text>
        {onInstantLog && <Text style={styles.tapHint}>Tap = log · Hold = edit</Text>}
      </View>
      <View style={styles.itemCal}>
        <Text style={styles.itemCalText}>{Math.round(item.calories)}</Text>
        <Text style={styles.itemCalUnit}>kcal</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Food</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search foods..."
            placeholderTextColor={COLORS.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onBarcodeScan}>
          <Ionicons name="barcode-outline" size={22} color={COLORS.primary} />
          <Text style={styles.actionText}>Scan Barcode</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onManualEntry}>
          <Ionicons name="create-outline" size={22} color={COLORS.primary} />
          <Text style={styles.actionText}>Manual Entry</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            !searched && favorites.length > 0 ? (
              <View style={styles.favSection}>
                <Text style={styles.favTitle}>⭐ Favorites</Text>
                {favorites.map((fav) => (
                  <TouchableOpacity
                    key={fav.id}
                    style={styles.item}
                    onPress={() => onInstantLog ? onInstantLog(fav) : onSelectFood(fav)}
                    onLongPress={() => onSelectFood(fav)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{fav.name}</Text>
                      <Text style={styles.itemMeta}>{fav.servingSize} · P:{Math.round(fav.protein)}g C:{Math.round(fav.carbs)}g F:{Math.round(fav.fat)}g</Text>
                    </View>
                    <View style={styles.itemCal}>
                      <Text style={styles.itemCalText}>{Math.round(fav.calories)}</Text>
                      <Text style={styles.itemCalUnit}>kcal</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            searched ? (
              <Text style={styles.emptyText}>No results found. Try a different search or add manually.</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const makeStyles = (COLORS: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  searchRow: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12,
    gap: SPACING.sm,
  },
  actionText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  itemInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  itemName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemMeta: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemCal: {
    alignItems: 'flex-end',
  },
  itemCalText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  itemCalUnit: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textTertiary,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginTop: 40,
    paddingHorizontal: SPACING.xxl,
  },
  favSection: {
    marginBottom: SPACING.lg,
  },
  favTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  tapHint: {
    fontSize: FONTS.sizes.xs - 1,
    color: COLORS.textTertiary,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
