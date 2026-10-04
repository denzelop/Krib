import React from "react";

import {
  FlatList,
  GestureResponderEvent,
  Image,
  Platform,
  Pressable,
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
// Saved Screen
// ---------------------------------------------------------------------------

export default function SavedScreen() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const favorites = useFavoritesStore((state) => state.favorites);

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  if (!fontsLoaded) {
    return <View style={styles.screen} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          favorites.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          favorites.length > 0 ? (
            <View style={styles.header}>
              <View>
                <Text style={styles.heading}>Saved</Text>

                <Text style={styles.subheading}>
                  Your favourite places, all in one place
                </Text>
              </View>

              <View style={styles.savedCount}>
                <Text style={styles.savedCountText}>{favorites.length}</Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <SavedPropertyCard
            property={item}
            onRemove={() => toggleFavorite(item)}
          />
        )}
        ListEmptyComponent={<EmptySavedState />}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Saved Property Card
// ---------------------------------------------------------------------------

function SavedPropertyCard({
  property,
  onRemove,
}: {
  property: Property;
  onRemove: () => void;
}) {
  const handleCardPress = () => {
    router.push({
      pathname: "/property/[id]",
      params: {
        id: property.id,
      },
    });
  };

  const handleHeartPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onRemove();
  };

  return (
    <Pressable style={styles.card} onPress={handleCardPress}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: property.image }} style={styles.image} />

        <LinearGradient
          colors={["transparent", "rgba(20,24,27,0.72)"]}
          style={styles.gradient}
        />

        {property.tag ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{property.tag}</Text>
          </View>
        ) : null}

        <Pressable
          style={styles.heartButton}
          onPress={handleHeartPress}
          hitSlop={8}
        >
          <Text style={styles.filledHeart}>♥</Text>
        </Pressable>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{property.price}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <View style={styles.titleContent}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {property.title}
            </Text>

            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color={colors.inkMuted} />

              <Text style={styles.locality}>{property.locality}</Text>
            </View>
          </View>

          <Feather name="arrow-up-right" size={18} color={colors.accent} />
        </View>

        <View style={styles.divider} />

        <View style={styles.specRow}>
          <View style={styles.specItem}>
            <Feather name="home" size={14} color={colors.inkMuted} />

            <Text style={styles.specText}>{property.beds} BHK</Text>
          </View>

          <View style={styles.specDot} />

          <View style={styles.specItem}>
            <Feather name="maximize" size={14} color={colors.inkMuted} />

            <Text style={styles.specText}>{property.area}</Text>
          </View>

          <View style={styles.specDot} />

          <Text style={styles.propertyType}>{property.propertyType}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptySavedState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Feather name="heart" size={28} color={colors.accent} />
      </View>

      <Text style={styles.emptyHeading}>No saved properties yet</Text>

      <Text style={styles.emptyText}>
        Tap the heart on a property you love and it will appear here.
      </Text>

      <View style={styles.emptyHint}>
        <Feather name="compass" size={14} color={colors.accent} />

        <Text style={styles.emptyHintText}>
          Explore properties to get started
        </Text>
      </View>
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

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  header: {
    paddingTop: Platform.OS === "android" ? 12 : 4,
    paddingBottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    marginTop: 4,
  },

  savedCount: {
    minWidth: 38,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 19,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  savedCountText: {
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

  imageWrapper: {
    width: "100%",
    height: 205,
    position: "relative",
    backgroundColor: colors.chipInactive,
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
    height: "50%",
  },

  tag: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
  },

  tagText: {
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

  filledHeart: {
    fontSize: 24,
    lineHeight: 26,
    color: "#E63946",
    textAlign: "center",
  },

  priceContainer: {
    position: "absolute",
    left: 14,
    bottom: 12,
  },

  price: {
    fontFamily: fonts.display,
    fontSize: 21,
    color: "#FFFFFF",
  },

  cardBody: {
    padding: 15,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  titleContent: {
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

  locality: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.inkMuted,
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

  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  specText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkMuted,
  },

  specDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.inkFaint,
    marginHorizontal: 9,
  },

  propertyType: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.accent,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 80,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyHeading: {
    fontFamily: fonts.displayMedium,
    fontSize: 21,
    color: colors.ink,
    textAlign: "center",
  },

  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkMuted,
    textAlign: "center",
    maxWidth: 280,
    marginTop: 8,
  },

  emptyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },

  emptyHintText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.accent,
  },
});
