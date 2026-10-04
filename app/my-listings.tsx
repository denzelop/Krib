import React, { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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

import { supabase } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Listing = {
  id: string;
  title: string;
  locality: string;
  city: string | null;
  price: string;
  listing_type: "buy" | "rent";
  property_type: "Apartment" | "House";
  bedrooms: number;
  bathrooms: number;
  area: string;
  image_url: string;
  description: string | null;
  featured: boolean;
  owner_id: string | null;
  created_at: string;
};

type ListingCardProps = {
  listing: Listing;
  onDelete: (listingId: string) => Promise<void>;
  isDeleting: boolean;
};

// ---------------------------------------------------------------------------
// Design
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
  danger: "#C94A4A",
};

const fonts = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MyListingsScreen() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    try {
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to view your listings.");
      }

      const { data, error: fetchError } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (fetchError) {
        throw fetchError;
      }

      setListings((data ?? []) as Listing[]);
    } catch (err: unknown) {
      console.error("My Listings error:", err);

      const message =
        err instanceof Error ? err.message : "Unable to load your listings.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const handleDeleteListing = async (listingId: string) => {
    setDeletingId(listingId);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to delete a listing.");
      }

      const { error: deleteError } = await supabase
        .from("properties")
        .delete()
        .eq("id", listingId)
        .eq("owner_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      setListings((prevListings) =>
        prevListings.filter((item) => item.id !== listingId),
      );
    } catch (err: unknown) {
      console.error("Delete property error:", err);
      const message =
        err instanceof Error ? err.message : "Could not delete property.";
      Alert.alert("Delete failed", message);
    } finally {
      setDeletingId(null);
    }
  };

  if (!fontsLoaded) {
    return <View style={styles.screen} />;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

        <Header />

        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />

          <Text style={styles.loadingText}>Loading your listings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

        <Header />

        <View style={styles.center}>
          <View style={styles.stateIcon}>
            <Feather name="alert-circle" size={26} color={colors.accent} />
          </View>

          <Text style={styles.stateTitle}>Couldn't load listings</Text>

          <Text style={styles.stateText}>{error}</Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              setLoading(true);
              fetchListings();
            }}
          >
            <Feather name="refresh-cw" size={16} color="#FFFFFF" />

            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <Header />

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          listings.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          listings.length > 0 ? (
            <View style={styles.listTopRow}>
              <View>
                <Text style={styles.listHeading}>Your properties</Text>

                <Text style={styles.listSubtitle}>
                  Manage the homes you've posted
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>{listings.length}</Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            onDelete={handleDeleteListing}
            isDeleting={deletingId === item.id}
          />
        )}
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header() {
  return (
    <View style={styles.header}>
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <Feather name="chevron-left" size={22} color={colors.ink} />
      </Pressable>

      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>My Listings</Text>

        <Text style={styles.headerSubtitle}>Properties you've posted</Text>
      </View>

      <Pressable
        style={styles.addButton}
        onPress={() => router.push("/add-property")}
      >
        <Feather name="plus" size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Listing Card
// ---------------------------------------------------------------------------

function ListingCard({ listing, onDelete, isDeleting }: ListingCardProps) {
  const openProperty = () => {
    router.push({
      pathname: "/property/[id]",
      params: {
        id: listing.id,
      },
    });
  };

  const editProperty = () => {
    router.push({
      pathname: "/edit-property/[id]",
      params: {
        id: listing.id,
      },
    });
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete property?",
      "This listing will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete(listing.id);
          },
        },
      ],
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={openProperty}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{
            uri: listing.image_url,
          }}
          style={styles.image}
        />

        <LinearGradient
          colors={["transparent", "rgba(20,24,27,0.76)"]}
          style={styles.gradient}
        />

        <View style={styles.listingTypeBadge}>
          <Text style={styles.listingTypeText}>
            {listing.listing_type === "buy" ? "FOR SALE" : "FOR RENT"}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <Pressable
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              editProperty();
            }}
            hitSlop={8}
          >
            <Feather name="edit-2" size={15} color={colors.ink} />
          </Pressable>

          <Pressable
            style={styles.actionButton}
            disabled={isDeleting}
            onPress={(e) => {
              e.stopPropagation();
              confirmDelete();
            }}
            hitSlop={8}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Feather name="trash-2" size={16} color={colors.danger} />
            )}
          </Pressable>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{listing.price}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {listing.title}
            </Text>

            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color={colors.muted} />

              <Text style={styles.locationText} numberOfLines={1}>
                {listing.locality}
                {listing.city ? `, ${listing.city}` : ""}
              </Text>
            </View>
          </View>

          <Feather name="arrow-up-right" size={18} color={colors.accent} />
        </View>

        <View style={styles.divider} />

        <View style={styles.specRow}>
          <View style={styles.spec}>
            <Feather name="home" size={14} color={colors.muted} />

            <Text style={styles.specText}>{listing.bedrooms} BHK</Text>
          </View>

          <View style={styles.dot} />

          <View style={styles.spec}>
            <Feather name="maximize-2" size={14} color={colors.muted} />

            <Text style={styles.specText}>{listing.area}</Text>
          </View>

          <View style={styles.dot} />

          <Text style={styles.propertyType}>{listing.property_type}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.stateIcon}>
        <Feather name="home" size={27} color={colors.accent} />
      </View>

      <Text style={styles.stateTitle}>No listings yet</Text>

      <Text style={styles.stateText}>
        Post your first property and it will appear here.
      </Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push("/add-property")}
      >
        <Feather name="plus" size={17} color="#FFFFFF" />

        <Text style={styles.primaryButtonText}>Add Property</Text>
      </Pressable>
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

  header: {
    height: 72,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerText: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
  },

  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  listTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  listHeading: {
    fontFamily: fonts.displayMedium,
    fontSize: 20,
    color: colors.ink,
  },

  listSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 3,
  },

  countBadge: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accent,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 20,
  },

  cardPressed: {
    opacity: 0.9,
  },

  imageWrapper: {
    height: 205,
    width: "100%",
    position: "relative",
    backgroundColor: colors.accentSoft,
  },

  image: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },

  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },

  listingTypeBadge: {
    position: "absolute",
    top: 13,
    left: 13,
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  listingTypeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.ink,
  },

  actionsContainer: {
    position: "absolute",
    top: 13,
    right: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    alignItems: "center",
    justifyContent: "center",
  },

  priceContainer: {
    position: "absolute",
    left: 14,
    bottom: 12,
  },

  price: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: "#FFFFFF",
  },

  cardBody: {
    padding: 15,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },

  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },

  locationText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.muted,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 13,
  },

  specRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  spec: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  specText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },

  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.faint,
    marginHorizontal: 9,
  },

  propertyType: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.accent,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 50,
  },

  loadingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 12,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    paddingBottom: 70,
  },

  stateIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  stateTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 21,
    color: colors.ink,
    textAlign: "center",
  },

  stateText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 290,
    marginTop: 7,
  },

  primaryButton: {
    minHeight: 48,
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  primaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    color: "#FFFFFF",
  },
});
