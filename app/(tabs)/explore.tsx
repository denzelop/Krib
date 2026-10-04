import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  GestureResponderEvent,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  useFonts,
} from "@expo-google-fonts/fraunces";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

import { Property, useFavoritesStore } from "../../store/favoritesStore";

import {
  CRORE,
  LAKH,
  normalizePriceAmount,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  type SaleUnit,
} from "../../lib/price";
import { supabase } from "../../lib/supabase";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const colors = {
  bg: "#FAF9F6",
  surface: "#FFFFFF",
  ink: "#14181B",
  inkMuted: "#71757C",
  inkFaint: "#A6A9AD",
  border: "#E7E4DD",
  accent: "#9C7A3C",
  accentSoft: "#F1E9DA",
  chipInactive: "#F1F0EC",
};

const fonts = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
};

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

const QUICK_FILTERS = [
  "All",
  "1 BHK",
  "2 BHK",
  "3 BHK",
  "Apartment",
  "House",
] as const;

type QuickFilter = (typeof QUICK_FILTERS)[number];

const PROPERTY_TYPE_OPTIONS = ["Any", "Apartment", "House"] as const;

type PropertyTypeFilter = (typeof PROPERTY_TYPE_OPTIONS)[number];

const BEDROOM_OPTIONS = ["Any", "1", "2", "3", "4+"] as const;

type BedroomFilter = (typeof BEDROOM_OPTIONS)[number];

const LISTED_OPTIONS = [
  "Any time",
  "Last 24 hours",
  "Last 7 days",
  "Last 30 days",
] as const;

type ListedFilter = (typeof LISTED_OPTIONS)[number];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Window (in ms) for each Listed option. null = no restriction.
const LISTED_WINDOWS: Record<ListedFilter, number | null> = {
  "Any time": null,
  "Last 24 hours": DAY_MS,
  "Last 7 days": 7 * DAY_MS,
  "Last 30 days": 30 * DAY_MS,
};

const SORT_OPTIONS = ["Featured", "Newest"] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

const UNIT_OPTIONS: { value: SaleUnit; label: string }[] = [
  { value: "lakh", label: "Lakh" },
  { value: "crore", label: "Crore" },
];

type ListingMode = "buy" | "rent";

// ---------------------------------------------------------------------------
// Price range model
//
// The user types friendly values (1.5 Crore / 75 Lakh / 30000 rent).
// These are converted to rupee amounts and compared against `priceAmount`.
// The legacy `price` display string is never parsed for filtering.
// ---------------------------------------------------------------------------

type PriceDraft = {
  minText: string;
  maxText: string;
  minUnit: SaleUnit;
  maxUnit: SaleUnit;
};

const EMPTY_PRICE: PriceDraft = {
  minText: "",
  maxText: "",
  minUnit: "crore",
  maxUnit: "crore",
};

type ParsedAmount = { ok: true; value: number | null } | { ok: false };

// Empty input is valid (both fields are optional) and yields null.
const parseAmountInput = (
  text: string,
  mode: ListingMode,
  unit: SaleUnit,
): ParsedAmount => {
  const cleaned = text.replace(/[\s,]/g, "");

  if (cleaned === "") {
    return { ok: true, value: null };
  }

  const pattern = mode === "rent" ? /^\d+$/ : /^(\d+\.?\d*|\.\d+)$/;

  if (!pattern.test(cleaned)) {
    return { ok: false };
  }

  const raw = Number(cleaned);

  if (!Number.isFinite(raw) || raw <= 0) {
    return { ok: false };
  }

  const multiplier = mode === "rent" ? 1 : unit === "crore" ? CRORE : LAKH;

  // Round to whole rupees to avoid float noise (e.g. 2.1 * 10000000)
  const amount = Math.round(raw * multiplier);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { ok: false };
  }

  return { ok: true, value: amount };
};

type PriceRangeResult =
  | { ok: true; min: number | null; max: number | null }
  | { ok: false; title: string; message: string };

const resolvePriceRange = (
  mode: ListingMode,
  price: PriceDraft,
): PriceRangeResult => {
  const min = parseAmountInput(price.minText, mode, price.minUnit);
  const max = parseAmountInput(price.maxText, mode, price.maxUnit);

  if (!min.ok || !max.ok) {
    return {
      ok: false,
      title: "Invalid price",
      message:
        "Please enter a valid amount greater than zero, or leave the field empty.",
    };
  }

  if (min.value !== null && max.value !== null && min.value > max.value) {
    return {
      ok: false,
      title: "Invalid price range",
      message: "Minimum price cannot be greater than maximum price.",
    };
  }

  return { ok: true, min: min.value, max: max.value };
};

// ---------------------------------------------------------------------------
// Property model
// ---------------------------------------------------------------------------

// Explore-specific extension of the shared Property type.
// The global Property interface is left untouched.
type ExploreProperty = Property & {
  featured: boolean;
  createdAt: string;
  priceAmount: number | null;
};

// Strip Explore-only fields before handing a property to the favorites store
const toBaseProperty = (item: ExploreProperty): Property => ({
  id: item.id,
  title: item.title,
  locality: item.locality,
  price: item.price,
  type: item.type,
  beds: item.beds,
  propertyType: item.propertyType,
  area: item.area,
  image: item.image,
  tag: item.tag,
});

const matchesBedrooms = (beds: number, filter: BedroomFilter): boolean => {
  switch (filter) {
    case "1":
      return beds === 1;
    case "2":
      return beds === 2;
    case "3":
      return beds === 3;
    case "4+":
      return beds >= 4;
    default:
      return true;
  }
};

// Returns null for missing / invalid dates
const parseTime = (value: string): number | null => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? null : time;
};

const toTime = (value: string): number => parseTime(value) ?? 0;

// ---------------------------------------------------------------------------
// Explore Screen
// ---------------------------------------------------------------------------

export default function ExploreScreen() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [mode, setMode] = useState<ListingMode>("buy");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter>("All");

  // Advanced filters (committed) - these drive the actual results
  const [advancedType, setAdvancedType] = useState<PropertyTypeFilter>("Any");
  const [advancedBeds, setAdvancedBeds] = useState<BedroomFilter>("Any");
  const [advancedListed, setAdvancedListed] =
    useState<ListedFilter>("Any time");
  const [advancedPrice, setAdvancedPrice] = useState<PriceDraft>(EMPTY_PRICE);
  const [advancedFeaturedOnly, setAdvancedFeaturedOnly] = useState(false);

  // Advanced filters (draft) - only used while the modal is open
  const [draftType, setDraftType] = useState<PropertyTypeFilter>("Any");
  const [draftBeds, setDraftBeds] = useState<BedroomFilter>("Any");
  const [draftListed, setDraftListed] = useState<ListedFilter>("Any time");
  const [draftPrice, setDraftPrice] = useState<PriceDraft>(EMPTY_PRICE);
  const [draftFeaturedOnly, setDraftFeaturedOnly] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Sorting
  const [sortOption, setSortOption] = useState<SortOption>("Featured");
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const [properties, setProperties] = useState<ExploreProperty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Global Zustand favorites
  const favorites = useFavoritesStore((state) => state.favorites);

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  const isFavorite = useCallback(
    (id: string) => {
      return favorites.some((property) => property.id === id);
    },
    [favorites],
  );

  // Buy and Rent use completely different price scales, so switching tabs
  // clears the committed AND draft price range (other advanced filters stay).
  const handleModeChange = useCallback(
    (nextMode: ListingMode) => {
      if (nextMode === mode) {
        return;
      }

      setMode(nextMode);
      setAdvancedPrice(EMPTY_PRICE);
      setDraftPrice(EMPTY_PRICE);
    },
    [mode],
  );

  // Fetch properties from Supabase
  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        const mappedProperties: ExploreProperty[] = data.map((item) => ({
          id: String(item.id),
          title: item.title,
          locality: item.locality,
          price: item.price,
          type: item.listing_type as "buy" | "rent",
          beds: item.bedrooms,
          propertyType: item.property_type as "Apartment" | "House",
          area: item.area,
          image: item.image_url,
          tag: item.featured ? "Featured" : undefined,
          featured: Boolean(item.featured),
          createdAt: item.created_at ? String(item.created_at) : "",
          priceAmount: normalizePriceAmount(item.price_amount),
        }));

        setProperties(mappedProperties);
      }
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof err.message === "string"
          ? err.message
          : null;

      setError(message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Committed price range as rupee amounts (validated on Apply, so this is
  // always valid in practice; fall back to "no filter" if it ever isn't).
  const committedRange = useMemo(() => {
    const result = resolvePriceRange(mode, advancedPrice);

    return result.ok
      ? { min: result.min, max: result.max }
      : { min: null, max: null };
  }, [mode, advancedPrice]);

  const hasPriceFilter =
    committedRange.min !== null || committedRange.max !== null;

  // Number of active advanced filter CATEGORIES (for the badge, max 5).
  // Price range counts once even if both min and max are set.
  const activeAdvancedCount =
    (advancedType !== "Any" ? 1 : 0) +
    (advancedBeds !== "Any" ? 1 : 0) +
    (advancedListed !== "Any time" ? 1 : 0) +
    (hasPriceFilter ? 1 : 0) +
    (advancedFeaturedOnly ? 1 : 0);

  // Filter modal handlers
  const openFilterModal = useCallback(() => {
    setDraftType(advancedType);
    setDraftBeds(advancedBeds);
    setDraftListed(advancedListed);
    setDraftPrice(advancedPrice);
    setDraftFeaturedOnly(advancedFeaturedOnly);
    setFilterModalVisible(true);
  }, [
    advancedType,
    advancedBeds,
    advancedListed,
    advancedPrice,
    advancedFeaturedOnly,
  ]);

  const closeFilterModal = useCallback(() => {
    // Discard any un-applied draft selections
    setFilterModalVisible(false);
  }, []);

  const applyAdvancedFilters = useCallback(() => {
    // Validate the price range BEFORE committing anything
    const priceResult = resolvePriceRange(mode, draftPrice);

    if (!priceResult.ok) {
      Alert.alert(priceResult.title, priceResult.message);
      return;
    }

    setAdvancedType(draftType);
    setAdvancedBeds(draftBeds);
    setAdvancedListed(draftListed);
    setAdvancedPrice(draftPrice);
    setAdvancedFeaturedOnly(draftFeaturedOnly);
    setFilterModalVisible(false);
  }, [mode, draftType, draftBeds, draftListed, draftPrice, draftFeaturedOnly]);

  // Reset INSIDE the modal only touches the DRAFT. Results don't change
  // until Apply Filters is pressed.
  const resetDraftFilters = useCallback(() => {
    setDraftType("Any");
    setDraftBeds("Any");
    setDraftListed("Any time");
    setDraftPrice(EMPTY_PRICE);
    setDraftFeaturedOnly(false);
  }, []);

  // Empty-state reset: search + quick filter + ALL advanced filters
  // (Buy / Rent mode is intentionally left alone)
  const resetAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedFilter("All");

    setAdvancedType("Any");
    setAdvancedBeds("Any");
    setAdvancedListed("Any time");
    setAdvancedPrice(EMPTY_PRICE);
    setAdvancedFeaturedOnly(false);

    setDraftType("Any");
    setDraftBeds("Any");
    setDraftListed("Any time");
    setDraftPrice(EMPTY_PRICE);
    setDraftFeaturedOnly(false);
  }, []);

  // Search + filters
  const filteredProperties = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = Date.now();
    const listedWindow = LISTED_WINDOWS[advancedListed];

    return properties.filter((item) => {
      // Buy / Rent
      if (item.type !== mode) {
        return false;
      }

      // Search
      if (query.length > 0) {
        const matchesLocality = item.locality
          ? item.locality.toLowerCase().includes(query)
          : false;

        const matchesTitle = item.title
          ? item.title.toLowerCase().includes(query)
          : false;

        if (!matchesLocality && !matchesTitle) {
          return false;
        }
      }

      // Quick filters
      if (selectedFilter === "1 BHK" && item.beds !== 1) {
        return false;
      }

      if (selectedFilter === "2 BHK" && item.beds !== 2) {
        return false;
      }

      if (selectedFilter === "3 BHK" && item.beds !== 3) {
        return false;
      }

      if (selectedFilter === "Apartment" && item.propertyType !== "Apartment") {
        return false;
      }

      if (selectedFilter === "House" && item.propertyType !== "House") {
        return false;
      }

      // Advanced: property type
      if (advancedType !== "Any" && item.propertyType !== advancedType) {
        return false;
      }

      // Advanced: bedrooms
      if (!matchesBedrooms(item.beds, advancedBeds)) {
        return false;
      }

      // Advanced: listed (missing/invalid createdAt never matches)
      if (listedWindow !== null) {
        const created = parseTime(item.createdAt);

        if (created === null || created < now - listedWindow) {
          return false;
        }
      }

      // Advanced: price range (uses priceAmount, never the `price` string)
      if (committedRange.min !== null || committedRange.max !== null) {
        if (item.priceAmount === null) {
          return false;
        }

        if (
          committedRange.min !== null &&
          item.priceAmount < committedRange.min
        ) {
          return false;
        }

        if (
          committedRange.max !== null &&
          item.priceAmount > committedRange.max
        ) {
          return false;
        }
      }

      // Advanced: featured only
      if (advancedFeaturedOnly && !item.featured) {
        return false;
      }

      return true;
    });
  }, [
    properties,
    mode,
    searchQuery,
    selectedFilter,
    advancedType,
    advancedBeds,
    advancedListed,
    committedRange,
    advancedFeaturedOnly,
  ]);

  // Sorting happens AFTER filtering and never mutates the original arrays
  const sortedProperties = useMemo(() => {
    const copy = [...filteredProperties];

    copy.sort((a, b) => {
      if (sortOption === "Featured" && a.featured !== b.featured) {
        return a.featured ? -1 : 1;
      }

      return toTime(b.createdAt) - toTime(a.createdAt);
    });

    return copy;
  }, [filteredProperties, sortOption]);

  if (!fontsLoaded) {
    return <View style={styles.screen} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <FlatList
        data={sortedProperties}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Header */}
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.heading}>Explore</Text>

                <Text style={styles.subheading}>
                  Discover curated residences in Mumbai
                </Text>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchBar}>
              <Feather name="search" size={17} color={colors.inkMuted} />

              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search locality or property..."
                placeholderTextColor={colors.inkFaint}
                style={styles.searchInput}
              />

              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                  <Feather name="x" size={16} color={colors.inkMuted} />
                </Pressable>
              )}

              <Pressable
                hitSlop={8}
                style={[
                  styles.filterButton,
                  activeAdvancedCount > 0 && styles.filterButtonActive,
                ]}
                onPress={openFilterModal}
              >
                <Feather
                  name="sliders"
                  size={16}
                  color={activeAdvancedCount > 0 ? "#FFFFFF" : colors.ink}
                />

                {activeAdvancedCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {activeAdvancedCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* Buy / Rent */}
            <View style={styles.segmented}>
              <Pressable
                onPress={() => handleModeChange("buy")}
                style={[
                  styles.segmentItem,
                  mode === "buy" && styles.segmentItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    mode === "buy" && styles.segmentLabelActive,
                  ]}
                >
                  Buy
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleModeChange("rent")}
                style={[
                  styles.segmentItem,
                  mode === "rent" && styles.segmentItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    mode === "rent" && styles.segmentLabelActive,
                  ]}
                >
                  Rent
                </Text>
              </Pressable>
            </View>

            {/* Quick Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickFiltersContainer}
            >
              {QUICK_FILTERS.map((filter) => {
                const active = selectedFilter === filter;

                return (
                  <Pressable
                    key={filter}
                    onPress={() => setSelectedFilter(filter)}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Result count */}
            <View style={styles.resultMetaRow}>
              <Text style={styles.resultCountText}>
                <Text style={styles.resultCountBold}>
                  {sortedProperties.length}
                </Text>{" "}
                {sortedProperties.length === 1 ? "property" : "properties"}{" "}
                found
              </Text>

              <Pressable
                hitSlop={6}
                style={styles.sortButton}
                onPress={() => setSortModalVisible(true)}
              >
                <Text style={styles.sortText}>Sort: {sortOption}</Text>

                <Feather
                  name="chevron-down"
                  size={14}
                  color={colors.inkMuted}
                />
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ExplorePropertyCard
            property={item}
            isFavorite={isFavorite(item.id)}
            onToggleFavorite={() => toggleFavorite(toBaseProperty(item))}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.loadingText}>Fetching properties...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Feather name="alert-circle" size={24} color={colors.accent} />
              </View>

              <Text style={styles.emptyTitle}>Something went wrong</Text>

              <Text style={styles.emptySubtext}>{error}</Text>

              <Pressable style={styles.resetButton} onPress={fetchProperties}>
                <Text style={styles.resetButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Feather name="search" size={24} color={colors.accent} />
              </View>

              <Text style={styles.emptyTitle}>No properties found</Text>

              <Text style={styles.emptySubtext}>
                Try altering your search locality or filter choices to see more
                listings.
              </Text>

              <Pressable style={styles.resetButton} onPress={resetAllFilters}>
                <Text style={styles.resetButtonText}>Reset filters</Text>
              </Pressable>
            </View>
          )
        }
      />

      {/* Advanced filter modal */}
      <FilterModal
        visible={filterModalVisible}
        mode={mode}
        draftType={draftType}
        draftBeds={draftBeds}
        draftListed={draftListed}
        draftPrice={draftPrice}
        draftFeaturedOnly={draftFeaturedOnly}
        onChangeType={setDraftType}
        onChangeBeds={setDraftBeds}
        onChangeListed={setDraftListed}
        onChangePrice={setDraftPrice}
        onChangeFeaturedOnly={setDraftFeaturedOnly}
        onClose={closeFilterModal}
        onReset={resetDraftFilters}
        onApply={applyAdvancedFilters}
      />

      {/* Sort modal */}
      <SortModal
        visible={sortModalVisible}
        selected={sortOption}
        onSelect={(option) => {
          setSortOption(option);
          setSortModalVisible(false);
        }}
        onClose={() => setSortModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Filter Modal
// ---------------------------------------------------------------------------

function FilterModal({
  visible,
  mode,
  draftType,
  draftBeds,
  draftListed,
  draftPrice,
  draftFeaturedOnly,
  onChangeType,
  onChangeBeds,
  onChangeListed,
  onChangePrice,
  onChangeFeaturedOnly,
  onClose,
  onReset,
  onApply,
}: {
  visible: boolean;
  mode: ListingMode;
  draftType: PropertyTypeFilter;
  draftBeds: BedroomFilter;
  draftListed: ListedFilter;
  draftPrice: PriceDraft;
  draftFeaturedOnly: boolean;
  onChangeType: (value: PropertyTypeFilter) => void;
  onChangeBeds: (value: BedroomFilter) => void;
  onChangeListed: (value: ListedFilter) => void;
  onChangePrice: (value: PriceDraft) => void;
  onChangeFeaturedOnly: (value: boolean) => void;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
}) {
  const insets = useSafeAreaInsets();

  const isRent = mode === "rent";

  const rootRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Height of the modal root as laid out right now (shrinks if the window
  // itself is resized by the keyboard, stays full-height if it isn't).
  const [rootHeight, setRootHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // How many px of the modal root are covered by the keyboard.
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);

  // Works regardless of whether the platform resizes the window
  // (adjustResize) or not (edge-to-edge / EAS builds): we measure how much
  // of the modal root the keyboard actually covers and lift the sheet by
  // exactly that amount. If the window already resized, overlap is 0.
  useEffect(() => {
    if (!visible) {
      setKeyboardVisible(false);
      setKeyboardOverlap(0);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const keyboardTop = event.endCoordinates.screenY;

      const measure = () => {
        rootRef.current?.measureInWindow((_x, y, _width, height) => {
          setKeyboardOverlap(Math.max(0, y + height - keyboardTop));
        });
      };

      setKeyboardVisible(true);

      if (timer) {
        clearTimeout(timer);
      }

      if (Platform.OS === "android") {
        // Give Android a moment to finish any window resize first
        timer = setTimeout(measure, 60);
      } else {
        measure();
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      if (timer) {
        clearTimeout(timer);
      }

      setKeyboardVisible(false);
      setKeyboardOverlap(0);
    });

    return () => {
      if (timer) {
        clearTimeout(timer);
      }

      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  // Scroll the focused price field into view once the layout has adjusted
  const handleFieldFocus = useCallback((fieldY: number) => {
    setTimeout(
      () => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, fieldY - 12),
          animated: true,
        });
      },
      Platform.OS === "android" ? 300 : 150,
    );
  }, []);

  const availableHeight = rootHeight - keyboardOverlap;

  // Closed keyboard: identical to the original 88% sheet.
  // Open keyboard: never taller than the space above the keyboard.
  const sheetMaxHeight =
    rootHeight > 0
      ? Math.min(rootHeight * 0.88, availableHeight - insets.top - 8)
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        ref={rootRef}
        style={styles.modalRoot}
        onLayout={(event) => setRootHeight(event.nativeEvent.layout.height)}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View
          style={[
            styles.filterSheet,
            sheetMaxHeight !== null && { maxHeight: sheetMaxHeight },
            {
              marginBottom: keyboardOverlap,
              paddingBottom: keyboardVisible ? 16 : Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>

            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.sheetCloseButton}
            >
              <Feather name="x" size={18} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            contentContainerStyle={[
              styles.sheetScrollContent,
              keyboardVisible && styles.sheetScrollContentKeyboard,
            ]}
          >
            {/* Property type */}
            <Text style={styles.sheetSectionLabel}>PROPERTY TYPE</Text>

            <View style={styles.optionWrap}>
              {PROPERTY_TYPE_OPTIONS.map((option) => {
                const active = draftType === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => onChangeType(option)}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Bedrooms */}
            <Text style={[styles.sheetSectionLabel, styles.sheetSectionSpaced]}>
              BEDROOMS
            </Text>

            <View style={styles.optionWrap}>
              {BEDROOM_OPTIONS.map((option) => {
                const active = draftBeds === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => onChangeBeds(option)}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Listed */}
            <Text style={[styles.sheetSectionLabel, styles.sheetSectionSpaced]}>
              LISTED
            </Text>

            <View style={styles.optionWrap}>
              {LISTED_OPTIONS.map((option) => {
                const active = draftListed === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => onChangeListed(option)}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Price range */}
            <Text style={[styles.sheetSectionLabel, styles.sheetSectionSpaced]}>
              PRICE RANGE
            </Text>

            <PriceRangeField
              label={isRent ? "Minimum Monthly Rent" : "Minimum Price"}
              mode={mode}
              text={draftPrice.minText}
              unit={draftPrice.minUnit}
              onFieldFocus={handleFieldFocus}
              onChangeText={(text) =>
                onChangePrice({ ...draftPrice, minText: text })
              }
              onChangeUnit={(unit) =>
                onChangePrice({ ...draftPrice, minUnit: unit })
              }
            />

            <PriceRangeField
              label={isRent ? "Maximum Monthly Rent" : "Maximum Price"}
              mode={mode}
              text={draftPrice.maxText}
              unit={draftPrice.maxUnit}
              onFieldFocus={handleFieldFocus}
              onChangeText={(text) =>
                onChangePrice({ ...draftPrice, maxText: text })
              }
              onChangeUnit={(unit) =>
                onChangePrice({ ...draftPrice, maxUnit: unit })
              }
            />

            {/* Featured only */}
            <Text style={[styles.sheetSectionLabel, styles.sheetSectionSpaced]}>
              FEATURED
            </Text>

            <View style={styles.featuredRow}>
              <View style={styles.featuredTextWrap}>
                <Text style={styles.featuredTitle}>Featured Only</Text>

                <Text style={styles.featuredSubtitle}>
                  Show only featured listings
                </Text>
              </View>

              <Switch
                value={draftFeaturedOnly}
                onValueChange={onChangeFeaturedOnly}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.border}
              />
            </View>
          </ScrollView>

          <View style={styles.sheetFooter}>
            <Pressable
              onPress={onReset}
              style={({ pressed }) => [
                styles.sheetResetButton,
                pressed && styles.pressedOpacity,
              ]}
            >
              <Text style={styles.sheetResetText}>Reset</Text>
            </Pressable>

            <Pressable
              onPress={onApply}
              style={({ pressed }) => [
                styles.sheetApplyButton,
                pressed && styles.pressedOpacity,
              ]}
            >
              <Text style={styles.sheetApplyText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Price range field (Buy: amount + Lakh/Crore, Rent: ₹ amount)
// ---------------------------------------------------------------------------

function PriceRangeField({
  label,
  mode,
  text,
  unit,
  onChangeText,
  onChangeUnit,
  onFieldFocus,
}: {
  label: string;
  mode: ListingMode;
  text: string;
  unit: SaleUnit;
  onChangeText: (text: string) => void;
  onChangeUnit: (unit: SaleUnit) => void;
  onFieldFocus: (fieldY: number) => void;
}) {
  // Y position of this field inside the filter ScrollView content
  const fieldY = useRef(0);

  return (
    <View
      style={styles.priceField}
      onLayout={(event) => {
        fieldY.current = event.nativeEvent.layout.y;
      }}
    >
      <Text style={styles.priceFieldLabel}>{label}</Text>

      {mode === "rent" ? (
        <View style={styles.rentRow}>
          <Text style={styles.rupeeSymbol}>₹</Text>

          <TextInput
            style={styles.rentInput}
            placeholder="e.g. 30000"
            placeholderTextColor={colors.inkFaint}
            value={text}
            onChangeText={(value) => onChangeText(sanitizeIntegerInput(value))}
            onFocus={() => onFieldFocus(fieldY.current)}
            keyboardType="number-pad"
            maxLength={12}
          />
        </View>
      ) : (
        <View style={styles.saleRow}>
          <TextInput
            style={styles.amountInput}
            placeholder="e.g. 1.5"
            placeholderTextColor={colors.inkFaint}
            value={text}
            onChangeText={(value) => onChangeText(sanitizeDecimalInput(value))}
            onFocus={() => onFieldFocus(fieldY.current)}
            keyboardType="decimal-pad"
            maxLength={12}
          />

          <View style={styles.unitSwitch}>
            {UNIT_OPTIONS.map((option) => {
              const active = unit === option.value;

              return (
                <Pressable
                  key={option.value}
                  style={[styles.unitOption, active && styles.unitOptionActive]}
                  onPress={() => onChangeUnit(option.value)}
                >
                  <Text
                    style={[styles.unitText, active && styles.unitTextActive]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sort Modal
// ---------------------------------------------------------------------------

function SortModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: SortOption;
  onSelect: (option: SortOption) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.sortModalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View style={styles.sortMenu}>
          <Text style={styles.sortMenuTitle}>SORT BY</Text>

          {SORT_OPTIONS.map((option, index) => {
            const active = selected === option;

            return (
              <View key={option}>
                {index > 0 && <View style={styles.sortMenuDivider} />}

                <Pressable
                  onPress={() => onSelect(option)}
                  style={({ pressed }) => [
                    styles.sortMenuItem,
                    pressed && styles.pressedOpacity,
                  ]}
                >
                  <Text
                    style={[
                      styles.sortMenuItemText,
                      active && styles.sortMenuItemTextActive,
                    ]}
                  >
                    {option}
                  </Text>

                  {active && (
                    <Feather name="check" size={16} color={colors.accent} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Property Card
// ---------------------------------------------------------------------------

function ExplorePropertyCard({
  property,
  isFavorite,
  onToggleFavorite,
}: {
  property: ExploreProperty;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const handleCardPress = () => {
    router.push({
      pathname: "/property/[id]",
      params: { id: property.id },
    });
  };

  const handleHeartPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <Pressable style={styles.cardContainer} onPress={handleCardPress}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: property.image }} style={styles.cardImage} />

        <LinearGradient
          colors={["transparent", "rgba(20,24,27,0.72)"]}
          style={styles.cardGradient}
        />

        {property.tag && (
          <View style={styles.cardTag}>
            <Text style={styles.cardTagText}>{property.tag}</Text>
          </View>
        )}

        {/* Favorite button */}
        <Pressable
          style={styles.heartButton}
          onPress={handleHeartPress}
          hitSlop={8}
        >
          {isFavorite ? (
            <Text style={styles.filledHeart}>♥</Text>
          ) : (
            <Feather name="heart" size={18} color={colors.ink} />
          )}
        </Pressable>

        <View style={styles.imageOverlayContent}>
          <Text style={styles.cardPrice}>{property.price}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {property.title}
        </Text>

        <View style={styles.cardMetaRow}>
          <View style={styles.localityContainer}>
            <Feather name="map-pin" size={12} color={colors.inkMuted} />

            <Text style={styles.cardLocality}>{property.locality}</Text>
          </View>

          <View style={styles.dotDivider} />

          <Text style={styles.cardSpecs}>
            {property.beds} BHK · {property.area}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  listContent: {
    paddingBottom: 32,
  },

  headerSection: {
    paddingTop: Platform.OS === "android" ? 12 : 4,
    paddingHorizontal: 20,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  heading: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
  },

  subheading: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.inkMuted,
    marginTop: 3,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },

  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.ink,
  },

  filterButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonActive: {
    backgroundColor: colors.ink,
  },

  filterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  filterBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: "#FFFFFF",
  },

  segmented: {
    flexDirection: "row",
    marginTop: 14,
    backgroundColor: colors.chipInactive,
    borderRadius: 12,
    padding: 4,
  },

  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },

  segmentItemActive: {
    backgroundColor: colors.ink,
  },

  segmentLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.inkMuted,
  },

  segmentLabelActive: {
    color: "#FFFFFF",
  },

  quickFiltersContainer: {
    paddingVertical: 16,
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  filterChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },

  filterChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.inkMuted,
  },

  filterChipTextActive: {
    color: colors.accent,
    fontFamily: fonts.bodySemiBold,
  },

  resultMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  resultCountText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
  },

  resultCountBold: {
    fontFamily: fonts.bodySemiBold,
    color: colors.ink,
  },

  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  sortText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.inkMuted,
  },

  pressedOpacity: {
    opacity: 0.7,
  },

  // Modals (shared)
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,24,27,0.45)",
  },

  // Filter sheet
  filterSheet: {
    maxHeight: "88%",
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
  },

  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetScrollContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },

  // Extra scroll room while the keyboard is open so the focused field and
  // the Featured section can always be scrolled fully into view
  sheetScrollContentKeyboard: {
    paddingBottom: 96,
  },

  sheetSectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.inkFaint,
    marginBottom: 12,
    marginLeft: 2,
  },

  sheetSectionSpaced: {
    marginTop: 26,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  // Price range fields
  priceField: {
    marginBottom: 14,
  },

  priceFieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.ink,
    marginBottom: 7,
  },

  saleRow: {
    flexDirection: "row",
    gap: 10,
  },

  amountInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },

  unitSwitch: {
    width: 138,
    height: 50,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 4,
    gap: 4,
  },

  unitOption: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  unitOptionActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },

  unitText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.inkMuted,
  },

  unitTextActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
  },

  rentRow: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    gap: 8,
  },

  rupeeSymbol: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.inkMuted,
  },

  rentInput: {
    flex: 1,
    height: "100%",
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },

  // Featured only
  featuredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  featuredTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  featuredTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },

  featuredSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },

  sheetFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
  },

  sheetResetButton: {
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetResetText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },

  sheetApplyButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetApplyText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: "#FFFFFF",
  },

  // Sort menu
  sortModalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  sortMenu: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 16,
    paddingBottom: 6,
    overflow: "hidden",
  },

  sortMenuTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.inkFaint,
    marginBottom: 6,
    marginHorizontal: 18,
  },

  sortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 15,
  },

  sortMenuItemText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14.5,
    color: colors.ink,
  },

  sortMenuItemTextActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
  },

  sortMenuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 18,
  },

  // Property card
  cardContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  imageWrapper: {
    height: 200,
    width: "100%",
    position: "relative",
    backgroundColor: colors.chipInactive,
  },

  cardImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },

  cardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },

  cardTag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  cardTagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.ink,
  },

  heartButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Solid red heart when saved
  filledHeart: {
    fontSize: 24,
    lineHeight: 26,
    color: "#E63946",
    textAlign: "center",
  },

  imageOverlayContent: {
    position: "absolute",
    left: 14,
    bottom: 12,
  },

  cardPrice: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: "#FFFFFF",
  },

  cardBody: {
    padding: 14,
  },

  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },

  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  localityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  cardLocality: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.inkMuted,
  },

  dotDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.inkFaint,
    marginHorizontal: 8,
  },

  cardSpecs: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.inkMuted,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 48,
  },

  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 6,
  },

  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },

  resetButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.ink,
  },

  resetButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: "#FFFFFF",
  },

  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },

  loadingText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.inkMuted,
  },
});
