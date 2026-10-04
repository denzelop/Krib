import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

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

import { supabase } from "../../lib/supabase";
import { Property, useFavoritesStore } from "../../store/favoritesStore";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const colors = {
  bg: "#FAF9F6",
  surface: "#FFFFFF",
  ink: "#14181B",
  muted: "#71757C",
  faint: "#A6A9AD",
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

// Database raw row type interface
interface SupabasePropertyRow {
  id: string;
  title: string;
  locality: string;
  city: string | null;
  price: string;
  listing_type: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  area: string;
  image_url: string;
  description: string | null;
  featured: boolean;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  agent_phone: string | null;
}

export default function PropertyDetailsScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ id?: string | string[] }>();

  // Extract ID safely
  const propertyId = Array.isArray(searchParams.id)
    ? searchParams.id[0]
    : searchParams.id;

  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [rawProperty, setRawProperty] = useState<SupabasePropertyRow | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Zustand favorites integration
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  // Fetch single property by ID
  const fetchProperty = useCallback(async () => {
    if (!propertyId) {
      setError("Invalid property ID provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setRawProperty(data as SupabasePropertyRow);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch property details.");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  // Convert raw DB object to Zustand Property model
  const mappedProperty: Property | null = rawProperty
    ? {
        id: String(rawProperty.id),
        title: rawProperty.title,
        locality: rawProperty.locality,
        price: rawProperty.price,
        type: rawProperty.listing_type as "buy" | "rent",
        beds: rawProperty.bedrooms,
        propertyType: rawProperty.property_type as "Apartment" | "House",
        area: rawProperty.area,
        image: rawProperty.image_url,
        tag: rawProperty.featured ? "Featured" : undefined,
      }
    : null;

  const isSaved = mappedProperty
    ? favorites.some((item) => item.id === mappedProperty.id)
    : false;

  const handleToggleFavorite = () => {
    if (mappedProperty) {
      toggleFavorite(mappedProperty);
    }
  };

  // Open the device's map app / browser using exact coordinates or locality + city fallback
  const handleViewOnMap = async () => {
    if (!rawProperty) {
      return;
    }

    let mapsUrl = "";

    const hasCoordinates =
      typeof rawProperty.latitude === "number" &&
      !isNaN(rawProperty.latitude) &&
      typeof rawProperty.longitude === "number" &&
      !isNaN(rawProperty.longitude);

    if (hasCoordinates) {
      const lat = rawProperty.latitude;
      const lng = rawProperty.longitude;

      mapsUrl =
        Platform.OS === "ios"
          ? `http://maps.apple.com/?ll=${lat},${lng}&q=${lat},${lng}`
          : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else {
      const locationText = [rawProperty.locality, rawProperty.city]
        .filter((part): part is string =>
          Boolean(part && part.trim().length > 0),
        )
        .join(", ");

      if (locationText.length === 0) {
        Alert.alert(
          "Location unavailable",
          "This property doesn't have a location to show on the map.",
        );
        return;
      }

      const locationQuery = encodeURIComponent(locationText);
      mapsUrl =
        Platform.OS === "ios"
          ? `http://maps.apple.com/?q=${locationQuery}`
          : `https://www.google.com/maps/search/?api=1&query=${locationQuery}`;
    }

    try {
      await Linking.openURL(mapsUrl);
    } catch {
      try {
        if (hasCoordinates) {
          const lat = rawProperty.latitude;
          const lng = rawProperty.longitude;
          await Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
          );
        } else {
          const locationText = [rawProperty.locality, rawProperty.city]
            .filter((part): part is string =>
              Boolean(part && part.trim().length > 0),
            )
            .join(", ");
          const locationQuery = encodeURIComponent(locationText);
          await Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${locationQuery}`,
          );
        }
      } catch {
        Alert.alert(
          "Unable to open maps",
          "We couldn't open a maps app on your device. Please try again later.",
        );
      }
    }
  };

  // Open a WhatsApp chat with the agent of this specific property
  const handleContactAgent = async () => {
    if (!rawProperty) {
      return;
    }

    const phone = rawProperty.agent_phone?.replace(/\D/g, "");

    if (!phone || phone.length === 0) {
      Alert.alert(
        "Contact unavailable",
        "Contact details are unavailable for this listing.",
      );
      return;
    }

    // Drop any leading zeros (e.g. 09876543210), then normalise to include 91
    const nationalNumber = phone.replace(/^0+/, "");

    if (nationalNumber.length === 0) {
      Alert.alert(
        "Contact unavailable",
        "Contact details are unavailable for this listing.",
      );
      return;
    }

    let fullPhoneNumber = nationalNumber;

    if (nationalNumber.length === 10) {
      // Plain 10-digit Indian mobile number
      fullPhoneNumber = `91${nationalNumber}`;
    } else if (nationalNumber.startsWith("91")) {
      // Already contains the country code, don't add another 91
      fullPhoneNumber = nationalNumber;
    }

    const message = `Hi, I'm interested in "${rawProperty.title}" listed on Krib. Is it still available?`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${fullPhoneNumber}?text=${encodedMessage}`;

    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      Alert.alert(
        "Unable to open WhatsApp",
        "We couldn't open WhatsApp on this device.",
      );
    }
  };

  if (!fontsLoaded) {
    return <View style={styles.screen} />;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading property details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !rawProperty) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <View style={styles.centerContainer}>
          <View style={styles.iconCircle}>
            <Feather name="alert-circle" size={26} color={colors.accent} />
          </View>
          <Text style={styles.errorTitle}>Property Not Found</Text>
          <Text style={styles.errorSubtext}>
            {error || "We couldn't load the details for this property."}
          </Text>
          <Pressable style={styles.actionButton} onPress={() => router.back()}>
            <Text style={styles.actionButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayLocation = `${rawProperty.locality}${
    rawProperty.city ? `, ${rawProperty.city}` : ""
  }`;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Large Hero Image Container */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: rawProperty.image_url }}
            style={styles.heroImage}
          />

          <LinearGradient
            colors={["rgba(20,24,27,0.5)", "transparent", "rgba(20,24,27,0.8)"]}
            locations={[0, 0.4, 1]}
            style={styles.heroGradient}
          />

          {/* Top Bar Floating Buttons */}
          <SafeAreaView style={styles.heroOverlayHeader} edges={["top"]}>
            <Pressable
              style={styles.circleIconButton}
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Feather name="chevron-left" size={22} color={colors.ink} />
            </Pressable>

            <Pressable
              style={styles.circleIconButton}
              onPress={handleToggleFavorite}
              hitSlop={8}
            >
              {isSaved ? (
                <Text style={styles.filledHeart}>♥</Text>
              ) : (
                <Feather name="heart" size={20} color={colors.ink} />
              )}
            </Pressable>
          </SafeAreaView>

          {/* Featured Badge */}
          {rawProperty.featured && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>Featured</Text>
            </View>
          )}

          {/* Overlay Price Bottom */}
          <View style={styles.heroOverlayPrice}>
            <Text style={styles.priceText}>{rawProperty.price}</Text>
          </View>
        </View>

        {/* Main Details Body */}
        <View style={styles.bodyContainer}>
          {/* Title and Listing Type */}
          <View style={styles.headerRow}>
            <Text style={styles.titleText}>{rawProperty.title}</Text>
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>
                {rawProperty.listing_type === "buy" ? "For Sale" : "For Rent"}
              </Text>
            </View>
          </View>

          {/* Locality & City */}
          <View style={styles.localityRow}>
            <Feather name="map-pin" size={14} color={colors.accent} />
            <Text style={styles.localityText}>
              {rawProperty.locality}
              {rawProperty.city ? `, ${rawProperty.city}` : ""}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Specifications Grid */}
          <Text style={styles.sectionHeading}>Specifications</Text>
          <View style={styles.specsGrid}>
            <View style={styles.specCard}>
              <View style={styles.specIconCircle}>
                <Feather name="home" size={18} color={colors.accent} />
              </View>
              <Text style={styles.specValue}>{rawProperty.bedrooms} BHK</Text>
              <Text style={styles.specLabel}>Bedrooms</Text>
            </View>

            <View style={styles.specCard}>
              <View style={styles.specIconCircle}>
                <Feather name="droplet" size={18} color={colors.accent} />
              </View>
              <Text style={styles.specValue}>{rawProperty.bathrooms ?? 1}</Text>
              <Text style={styles.specLabel}>Bathrooms</Text>
            </View>

            <View style={styles.specCard}>
              <View style={styles.specIconCircle}>
                <Feather name="maximize-2" size={18} color={colors.accent} />
              </View>
              <Text style={styles.specValue}>{rawProperty.area}</Text>
              <Text style={styles.specLabel}>Area</Text>
            </View>

            <View style={styles.specCard}>
              <View style={styles.specIconCircle}>
                <Feather name="grid" size={18} color={colors.accent} />
              </View>
              <Text style={styles.specValue}>{rawProperty.property_type}</Text>
              <Text style={styles.specLabel}>Type</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* About Section */}
          <Text style={styles.sectionHeading}>About this property</Text>
          <Text style={styles.descriptionText}>
            {rawProperty.description &&
            rawProperty.description.trim().length > 0
              ? rawProperty.description
              : "No detailed description provided for this luxury property."}
          </Text>

          <View style={styles.divider} />

          {/* Location Section */}
          <Text style={styles.sectionHeading}>Location</Text>
          <View style={styles.locationCard}>
            {/* Map-preview style area */}
            <View style={styles.mapPreview}>
              {/* Decorative "street grid" */}
              <View style={[styles.gridLineH, { top: "22%" }]} />
              <View style={[styles.gridLineH, { top: "52%" }]} />
              <View style={[styles.gridLineH, { top: "80%" }]} />
              <View style={[styles.gridLineV, { left: "18%" }]} />
              <View style={[styles.gridLineV, { left: "48%" }]} />
              <View style={[styles.gridLineV, { left: "78%" }]} />

              {/* Diagonal "main road" accents */}
              <View style={styles.roadDiagonal} />
              <View style={styles.roadDiagonalSecondary} />

              {/* Soft "park" blocks */}
              <View style={styles.blockOne} />
              <View style={styles.blockTwo} />

              {/* Pin with halo rings */}
              <View style={styles.pinWrapper}>
                <View style={styles.pinHaloOuter} />
                <View style={styles.pinHaloInner} />
                <View style={styles.pinCircle}>
                  <Feather name="map-pin" size={20} color="#FFFFFF" />
                </View>
              </View>

              {/* Soft fade into the card body */}
              <LinearGradient
                colors={["transparent", "rgba(255,255,255,0.9)"]}
                style={styles.mapFade}
              />
            </View>

            {/* Location info */}
            <View style={styles.locationInfo}>
              <View style={styles.locationTextBlock}>
                <Text style={styles.locationEyebrow}>
                  View property location
                </Text>
                <Text style={styles.locationName} numberOfLines={2}>
                  {displayLocation}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.mapButton,
                  pressed && styles.mapButtonPressed,
                ]}
                onPress={handleViewOnMap}
              >
                <Feather name="navigation" size={15} color={colors.accent} />
                <Text style={styles.mapButtonText}>View on Map</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom CTA Bar */}
      <SafeAreaView style={styles.ctaBar} edges={["bottom"]}>
        <View style={styles.ctaContent}>
          <View>
            <Text style={styles.ctaSubtext}>Listed Price</Text>
            <Text style={styles.ctaPriceText}>{rawProperty.price}</Text>
          </View>

          <Pressable style={styles.contactButton} onPress={handleContactAgent}>
            <Feather name="phone-call" size={16} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>Contact Agent</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
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

  scrollContent: {
    paddingBottom: 110,
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },

  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  errorTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 20,
    color: colors.ink,
  },

  errorSubtext: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },

  actionButton: {
    marginTop: 8,
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },

  actionButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: "#FFFFFF",
  },

  // Hero Section
  heroContainer: {
    height: 340,
    width: "100%",
    position: "relative",
    backgroundColor: colors.chipInactive,
  },

  heroImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },

  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  heroOverlayHeader: {
    position: "absolute",
    top: Platform.OS === "android" ? 36 : 0,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },

  circleIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  filledHeart: {
    fontSize: 24,
    lineHeight: 26,
    color: "#E63946",
    textAlign: "center",
  },

  badgeContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },

  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: colors.ink,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  heroOverlayPrice: {
    position: "absolute",
    bottom: 18,
    left: 20,
  },

  priceText: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },

  // Main Content Body
  bodyContainer: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  titleText: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    lineHeight: 28,
  },

  typeTag: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },

  typeTagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.accent,
    textTransform: "uppercase",
  },

  localityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },

  localityText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.muted,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },

  sectionHeading: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 14,
  },

  // Specs Grid
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  specCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: "flex-start",
  },

  specIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  specValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },

  specLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },

  // Description
  descriptionText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 22,
  },

  // Location Section
  locationCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
  },

  mapPreview: {
    height: 160,
    width: "100%",
    backgroundColor: colors.accentSoft,
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(156, 122, 60, 0.16)",
  },

  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(156, 122, 60, 0.16)",
  },

  roadDiagonal: {
    position: "absolute",
    width: "140%",
    height: 10,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    transform: [{ rotate: "-18deg" }],
    top: "40%",
    left: "-20%",
  },

  roadDiagonalSecondary: {
    position: "absolute",
    width: "120%",
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    transform: [{ rotate: "24deg" }],
    top: "62%",
    left: "-10%",
  },

  blockOne: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 64,
    height: 38,
    borderRadius: 8,
    backgroundColor: "rgba(156, 122, 60, 0.12)",
  },

  blockTwo: {
    position: "absolute",
    bottom: 26,
    right: 18,
    width: 78,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(156, 122, 60, 0.12)",
  },

  pinWrapper: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  pinHaloOuter: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(156, 122, 60, 0.12)",
  },

  pinHaloInner: {
    position: "absolute",
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(156, 122, 60, 0.2)",
  },

  pinCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },

  mapFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 36,
  },

  locationInfo: {
    padding: 16,
    gap: 14,
  },

  locationTextBlock: {
    gap: 4,
  },

  locationEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  locationName: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
    lineHeight: 24,
  },

  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
  },

  mapButtonPressed: {
    opacity: 0.75,
  },

  mapButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent,
  },

  // CTA Bottom Bar
  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },

  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 4,
  },

  ctaSubtext: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted,
  },

  ctaPriceText: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    marginTop: 1,
  },

  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.ink,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },

  contactButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
