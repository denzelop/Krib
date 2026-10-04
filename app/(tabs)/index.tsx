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
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../../lib/supabase";
import { Property, useFavoritesStore } from "../../store/favoritesStore";

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
// Types
// ---------------------------------------------------------------------------

const FEATURED_LIMIT = 5;
const RECENT_LIMIT = 5;

// Columns fetched from the `properties` table (all nullable-safe)
type SupabasePropertyRow = {
  id: string | number;
  title: string | null;
  locality: string | null;
  city: string | null;
  price: string | null;
  listing_type: string | null;
  property_type: string | null;
  bedrooms: number | null;
  area: string | null;
  image_url: string | null;
  featured: boolean | null;
  created_at: string | null;
};

type HomeProperty = {
  id: string;
  title: string;
  locality: string;
  price: string;
  type: "buy" | "rent";
  propertyType: "Apartment" | "House";
  beds: number;
  area: string;
  image: string;
  featured: boolean;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toHomeProperty = (row: SupabasePropertyRow): HomeProperty => ({
  id: String(row.id),
  title: row.title?.trim() || "Untitled property",
  locality: row.locality?.trim() || row.city?.trim() || "",
  price: row.price?.trim() || "Price on request",
  type: row.listing_type === "rent" ? "rent" : "buy",
  propertyType: row.property_type === "House" ? "House" : "Apartment",
  beds:
    typeof row.bedrooms === "number" && Number.isFinite(row.bedrooms)
      ? row.bedrooms
      : 0,
  area: row.area?.trim() || "",
  image: row.image_url?.trim() || "",
  featured: row.featured === true,
  createdAt: row.created_at ? String(row.created_at) : "",
});

// Shape expected by the existing favorites store
const toFavoriteProperty = (item: HomeProperty): Property => ({
  id: item.id,
  title: item.title,
  locality: item.locality,
  price: item.price,
  type: item.type,
  beds: item.beds,
  propertyType: item.propertyType,
  area: item.area,
  image: item.image,
  tag: item.featured ? "Featured" : undefined,
});

const toTime = (value: string): number => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

// "2 BHK · 1,150 sq ft" - skips whatever is missing
const formatSpecs = (beds: number, area: string): string => {
  const parts: string[] = [];

  if (beds > 0) {
    parts.push(`${beds} BHK`);
  }

  if (area) {
    parts.push(area);
  }

  return parts.join(" \u00B7 ");
};

const openProperty = (id: string) => {
  router.push({
    pathname: "/property/[id]",
    params: { id },
  });
};

const goToExplore = () => {
  router.navigate("/(tabs)/explore");
};

const goToSaved = () => {
  router.navigate("/(tabs)/saved");
};

const goToNotifications = () => {
  router.push("/notifications");
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [properties, setProperties] = useState<HomeProperty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Once we have data, later refreshes happen silently in the background
  const hasLoadedRef = useRef(false);

  // Global Zustand favorites (same store Explore uses)
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  const isFavorite = useCallback(
    (id: string) => favorites.some((property) => property.id === id),
    [favorites],
  );

  const loadProperties = useCallback(async () => {
    const isInitialLoad = !hasLoadedRef.current;

    if (isInitialLoad) {
      setLoading(true);
      setError(null);
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("properties")
        .select(
          "id, title, locality, city, price, listing_type, property_type, bedrooms, area, image_url, featured, created_at",
        )
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const rows: SupabasePropertyRow[] = data ?? [];

      setProperties(rows.map(toHomeProperty));
      setError(null);
      hasLoadedRef.current = true;
    } catch (err: unknown) {
      // A failed background refresh keeps showing the data we already have
      if (!hasLoadedRef.current) {
        const message =
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string"
            ? err.message
            : null;

        setError(message || "Failed to load properties");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever the Home tab gains focus (e.g. after Add / Edit property)
  useFocusEffect(
    useCallback(() => {
      loadProperties();
    }, [loadProperties]),
  );

  const featuredProperties = useMemo(
    () =>
      properties
        .filter((item) => item.featured)
        .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
        .slice(0, FEATURED_LIMIT),
    [properties],
  );

  const recentProperties = useMemo(
    () =>
      [...properties]
        .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
        .slice(0, RECENT_LIMIT),
    [properties],
  );

  if (!fontsLoaded) {
    // Keep this minimal — avoid a flash of unstyled text.
    return <View style={styles.screen} />;
  }

  const showContent = !loading && !error && properties.length > 0;
  const showEmpty = !loading && !error && properties.length === 0;

  let heroSubtext = "";

  if (loading) {
    heroSubtext = "Loading properties...";
  } else if (!error) {
    heroSubtext = `${properties.length} ${
      properties.length === 1 ? "property" : "properties"
    } available across Mumbai`;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>Krib</Text>
          <Pressable
            style={styles.bellButton}
            hitSlop={10}
            onPress={goToNotifications}
          >
            <Feather name="bell" size={19} color={colors.ink} />
          </Pressable>
        </View>

        {/* Hero heading */}
        <View style={styles.hero}>
          <Text style={styles.heroHeading}>
            Find your perfect{"\n"}place in Mumbai
          </Text>
          {heroSubtext ? (
            <Text style={styles.heroSubtext}>{heroSubtext}</Text>
          ) : null}
        </View>

        {/* Explore CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.exploreButton,
            pressed && styles.pressedOpacity,
          ]}
          onPress={goToExplore}
        >
          <View style={styles.exploreButtonLeft}>
            <Feather name="search" size={17} color="#FFFFFF" />
            <Text style={styles.exploreButtonText}>Explore properties</Text>
          </View>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </Pressable>

        {/* Quick actions */}
        <View style={styles.quickCard}>
          <QuickAction
            icon="home"
            title="Buy a Home"
            subtitle="Browse properties for sale"
            onPress={goToExplore}
          />
          <View style={styles.quickDivider} />
          <QuickAction
            icon="key"
            title="Find a Rental"
            subtitle="Explore homes for rent"
            onPress={goToExplore}
          />
          <View style={styles.quickDivider} />
          <QuickAction
            icon="heart"
            title="Saved Properties"
            subtitle="View your saved homes"
            onPress={goToSaved}
          />
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.stateBlock}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}

        {/* Error */}
        {!loading && error && (
          <View style={styles.stateBlock}>
            <View style={styles.stateIconCircle}>
              <Feather name="alert-circle" size={24} color={colors.accent} />
            </View>
            <Text style={styles.stateTitle}>Something went wrong</Text>
            <Text style={styles.stateSubtext}>{error}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.stateButton,
                pressed && styles.pressedOpacity,
              ]}
              onPress={loadProperties}
            >
              <Text style={styles.stateButtonText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Empty database */}
        {showEmpty && (
          <View style={styles.stateBlock}>
            <View style={styles.stateIconCircle}>
              <Feather name="home" size={24} color={colors.accent} />
            </View>
            <Text style={styles.stateTitle}>No properties yet</Text>
            <Text style={styles.stateSubtext}>
              New listings will show up here as soon as they are added.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.stateButton,
                pressed && styles.pressedOpacity,
              ]}
              onPress={goToExplore}
            >
              <Text style={styles.stateButtonText}>Explore properties</Text>
            </Pressable>
          </View>
        )}

        {/* Featured properties (hidden when there are none) */}
        {showContent && featuredProperties.length > 0 && (
          <>
            <SectionHeader title="Featured properties" onSeeAll={goToExplore} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredRow}
              decelerationRate="fast"
              snapToInterval={296}
              snapToAlignment="start"
            >
              {featuredProperties.map((property) => (
                <FeaturedCard
                  key={property.id}
                  property={property}
                  isFavorite={isFavorite(property.id)}
                  onToggleFavorite={() =>
                    toggleFavorite(toFavoriteProperty(property))
                  }
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Recently added */}
        {showContent && (
          <>
            <SectionHeader title="Recently added" onSeeAll={goToExplore} />

            <View style={styles.recentList}>
              {recentProperties.map((property) => (
                <RecentRow key={property.id} property={property} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll: () => void;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeading}>{title}</Text>
      <Pressable hitSlop={8} onPress={onSeeAll}>
        <Text style={styles.sectionLink}>See all</Text>
      </Pressable>
    </View>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.quickRow,
        pressed && styles.pressedOpacity,
      ]}
      onPress={onPress}
    >
      <View style={styles.quickIconCircle}>
        <Feather name={icon} size={17} color={colors.accent} />
      </View>

      <View style={styles.quickTextWrap}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSubtitle}>{subtitle}</Text>
      </View>

      <Feather name="chevron-right" size={18} color={colors.inkFaint} />
    </Pressable>
  );
}

function FeaturedCard({
  property,
  isFavorite,
  onToggleFavorite,
}: {
  property: HomeProperty;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const specs = formatSpecs(property.beds, property.area);

  const handleHeartPress = (e: GestureResponderEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <Pressable
      style={styles.featuredCard}
      onPress={() => openProperty(property.id)}
    >
      {property.image ? (
        <Image source={{ uri: property.image }} style={styles.featuredImage} />
      ) : (
        <View style={styles.featuredImageFallback} />
      )}

      <LinearGradient
        colors={["transparent", "rgba(20,24,27,0.78)"]}
        style={styles.featuredGradient}
      />

      <View style={styles.featuredTag}>
        <Text style={styles.featuredTagText}>Featured</Text>
      </View>

      {/* Favorite button */}
      <Pressable
        style={styles.heartButton}
        onPress={handleHeartPress}
        hitSlop={8}
      >
        {isFavorite ? (
          <Text style={styles.filledHeart}>{"\u2665"}</Text>
        ) : (
          <Feather name="heart" size={18} color={colors.ink} />
        )}
      </Pressable>

      <View style={styles.featuredContent}>
        <Text style={styles.featuredPrice}>{property.price}</Text>
        <Text style={styles.featuredTitle} numberOfLines={1}>
          {property.title}
        </Text>
        <View style={styles.featuredMetaRow}>
          {property.locality ? (
            <>
              <Feather name="map-pin" size={12} color="#FFFFFF" />
              <Text style={styles.featuredMeta}>{property.locality}</Text>
            </>
          ) : null}

          {property.locality && specs ? (
            <View style={styles.featuredMetaDivider} />
          ) : null}

          {specs ? <Text style={styles.featuredMeta}>{specs}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

function RecentRow({ property }: { property: HomeProperty }) {
  const specs = formatSpecs(property.beds, property.area);

  return (
    <Pressable
      style={({ pressed }) => [styles.recRow, pressed && styles.pressedOpacity]}
      onPress={() => openProperty(property.id)}
    >
      {property.image ? (
        <Image source={{ uri: property.image }} style={styles.recImage} />
      ) : (
        <View style={[styles.recImage, styles.recImageFallback]}>
          <Feather name="image" size={18} color={colors.inkFaint} />
        </View>
      )}

      <View style={styles.recBody}>
        <Text style={styles.recTitle} numberOfLines={1}>
          {property.title}
        </Text>

        {property.locality ? (
          <View style={styles.recLocalityRow}>
            <Feather name="map-pin" size={11} color={colors.inkMuted} />
            <Text style={styles.recLocality} numberOfLines={1}>
              {property.locality}
            </Text>
          </View>
        ) : null}

        {specs ? <Text style={styles.recMeta}>{specs}</Text> : null}
      </View>

      <View style={styles.recPriceBlock}>
        <Text style={styles.recPrice}>{property.price}</Text>
        <Feather name="arrow-up-right" size={14} color={colors.accent} />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  pressedOpacity: {
    opacity: 0.75,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 12 : 4,
    paddingBottom: 8,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 0.2,
    color: colors.ink,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  heroHeading: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    color: colors.ink,
  },
  heroSubtext: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.inkMuted,
    marginTop: 8,
  },

  // Explore CTA
  exploreButton: {
    marginHorizontal: 20,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  exploreButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exploreButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: "#FFFFFF",
  },

  // Quick actions
  quickCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  quickTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  quickSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  quickDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },

  // Loading / error / empty
  stateBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 48,
  },
  stateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stateTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 6,
  },
  stateSubtext: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  stateButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.ink,
  },
  stateButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: "#FFFFFF",
  },

  // Section headers
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionHeading: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
  },
  sectionLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.accent,
  },

  // Featured cards
  featuredRow: {
    paddingLeft: 20,
    paddingRight: 4,
    gap: 16,
  },
  featuredCard: {
    width: 280,
    height: 340,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },
  featuredImageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.chipInactive,
  },
  featuredGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "62%",
  },
  featuredTag: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  featuredTagText: {
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
  featuredContent: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  featuredPrice: {
    fontFamily: fonts.display,
    fontSize: 21,
    color: "#FFFFFF",
  },
  featuredTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: "#F3F1EC",
    marginTop: 2,
  },
  featuredMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 5,
  },
  featuredMeta: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: "#E4E1D9",
  },
  featuredMetaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#E4E1D9",
    marginHorizontal: 2,
  },

  // Recently added list
  recentList: {
    paddingHorizontal: 20,
    gap: 14,
  },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.chipInactive,
  },
  recImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  recBody: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  recTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  recLocalityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  recLocality: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
    flexShrink: 1,
  },
  recMeta: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.inkFaint,
    marginTop: 3,
  },
  recPriceBlock: {
    alignItems: "flex-end",
    gap: 4,
    maxWidth: 120,
  },
  recPrice: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    color: colors.ink,
    textAlign: "right",
  },
});
