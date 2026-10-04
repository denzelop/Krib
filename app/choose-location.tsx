import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Feather } from "@expo/vector-icons";
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

const colors = {
  bg: "#FAF9F6",
  surface: "#FFFFFF",
  ink: "#14181B",
  muted: "#71757C",
  faint: "#A6A9AD",
  border: "#E7E4DD",
  accent: "#9C7A3C",
  accentSoft: "#F1E9DA",
};

const fonts = {
  display: "Fraunces_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type SearchResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function finiteCoordinate(value: string | undefined): number | null {
  if (!value || value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function formatCoordinates(location: Coordinates): string {
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export default function ChooseLocationScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    propertyId?: string | string[];
    initialLatitude?: string | string[];
    initialLongitude?: string | string[];
  }>();

  const returnTo = firstParam(params.returnTo);
  const propertyId = firstParam(params.propertyId);
  const initialLatitude = finiteCoordinate(firstParam(params.initialLatitude));
  const initialLongitude = finiteCoordinate(
    firstParam(params.initialLongitude),
  );

  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(
    () =>
      initialLatitude !== null &&
      initialLongitude !== null &&
      isValidCoordinates(initialLatitude, initialLongitude)
        ? { latitude: initialLatitude, longitude: initialLongitude }
        : null,
  );
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);

  const handleSearch = async () => {
    const query = searchText.trim();

    if (query.length < 2) {
      Alert.alert(
        "Enter a location",
        "Search for an area, landmark, building, or address.",
      );
      return;
    }

    try {
      setSearching(true);
      setResults([]);
      Keyboard.dismiss();

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          query,
        )}&limit=5&countrycodes=in`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Krib-RealEstate-App",
          },
        },
      );

      if (!response.ok) throw new Error("Location search failed.");

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid location search response.");
      }

      const validResults: SearchResult[] = [];

      for (const item of data) {
        if (typeof item !== "object" || item === null) continue;

        const candidate = item as Record<string, unknown>;

        if (
          typeof candidate.place_id === "number" &&
          typeof candidate.lat === "string" &&
          typeof candidate.lon === "string" &&
          typeof candidate.display_name === "string"
        ) {
          validResults.push({
            place_id: candidate.place_id,
            lat: candidate.lat,
            lon: candidate.lon,
            display_name: candidate.display_name,
          });
        }
      }

      setResults(validResults.slice(0, 5));
      setHasSearched(true);

      if (validResults.length === 0) {
        Alert.alert(
          "No locations found",
          "Try a nearby landmark, area, or more specific address.",
        );
      }
    } catch (error) {
      console.error("Location search error:", error);
      Alert.alert(
        "Search unavailable",
        "Could not search that location. Try again or try a different search.",
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    if (!isValidCoordinates(latitude, longitude)) {
      Alert.alert(
        "Invalid location",
        "This result has unusable coordinates. Please pick another one.",
      );
      return;
    }

    setSelectedLocation({ latitude, longitude });
    setSelectedAddress(result.display_name);
    setSelectedResultId(result.place_id);
    Keyboard.dismiss();
  };

  const handleConfirm = () => {
    if (!selectedLocation) return;

    const coordinateParams = {
      latitude: String(selectedLocation.latitude),
      longitude: String(selectedLocation.longitude),
    };

    if (returnTo === "edit" && propertyId) {
      router.dismissTo({
        pathname: "/edit-property/[id]",
        params: {
          id: propertyId,
          ...coordinateParams,
        },
      });
      return;
    }

    router.dismissTo({
      pathname: "/add-property",
      params: coordinateParams,
    });
  };

  if (!fontsLoaded) {
    return <View style={styles.screen} />;
  }

  const hasSelection = selectedLocation !== null;
  const showEmptyState = !hasSelection && results.length === 0 && !searching;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <SafeAreaView style={styles.headerSafeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Feather name="chevron-left" size={22} color={colors.ink} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Choose Location</Text>
            <Text style={styles.headerSubtitle}>
              Search for the property's area, landmark or address
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <View style={styles.searchArea}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={(value) => {
              setSearchText(value);
              if (results.length > 0) setResults([]);
            }}
            placeholder="Search area, landmark or address"
            placeholderTextColor={colors.faint}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoCorrect={false}
          />

          {searching ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : searchText.length > 0 ? (
            <Pressable
              onPress={() => {
                setSearchText("");
                setResults([]);
                setHasSearched(false);
              }}
              hitSlop={8}
            >
              <Feather name="x" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.searchButton,
            pressed && styles.searchButtonPressed,
          ]}
          onPress={handleSearch}
          disabled={searching}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SEARCH RESULTS</Text>

            <View style={styles.resultsCard}>
              {results.map((item, index) => {
                const isSelected = item.place_id === selectedResultId;

                return (
                  <Pressable
                    key={String(item.place_id)}
                    style={({ pressed }) => [
                      styles.resultItem,
                      index !== results.length - 1 && styles.resultItemBorder,
                      isSelected && styles.resultItemSelected,
                      pressed && !isSelected && styles.resultItemPressed,
                    ]}
                    onPress={() => handleSelectResult(item)}
                  >
                    <View
                      style={[
                        styles.resultIcon,
                        isSelected && styles.resultIconSelected,
                      ]}
                    >
                      <Feather
                        name="map-pin"
                        size={15}
                        color={isSelected ? "#FFFFFF" : colors.accent}
                      />
                    </View>

                    <Text
                      style={[
                        styles.resultText,
                        isSelected && styles.resultTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {item.display_name}
                    </Text>

                    {isSelected ? (
                      <Feather
                        name="check-circle"
                        size={18}
                        color={colors.accent}
                      />
                    ) : (
                      <Feather
                        name="chevron-right"
                        size={17}
                        color={colors.faint}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {hasSelection && selectedLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECTED LOCATION</Text>

            <View style={styles.selectedCard}>
              <View style={styles.selectedAccentBar} />

              <View style={styles.selectedBody}>
                <View style={styles.selectedTopRow}>
                  <View style={styles.selectedBadge}>
                    <Feather name="check" size={12} color={colors.accent} />
                    <Text style={styles.selectedBadgeText}>Selected</Text>
                  </View>
                </View>

                <View style={styles.selectedMainRow}>
                  <View style={styles.selectedIcon}>
                    <Feather name="map-pin" size={20} color={colors.accent} />
                  </View>

                  <View style={styles.selectedTextBlock}>
                    <Text style={styles.selectedTitle}>
                      {selectedAddress ??
                        "Previously selected property location"}
                    </Text>
                    <Text style={styles.selectedCoords}>
                      {formatCoordinates(selectedLocation)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Text style={styles.selectedHint}>
              Not right? Search again and pick a different result.
            </Text>
          </View>
        )}

        {hasSearched && results.length === 0 && !searching && !hasSelection && (
          <View style={styles.noResults}>
            <Feather name="search" size={16} color={colors.faint} />
            <Text style={styles.noResultsText}>
              No matches yet. Try a nearby landmark or a more specific address.
            </Text>
          </View>
        )}

        {showEmptyState && (
          <View style={styles.emptyState}>
            <View style={styles.emptyOuterRing}>
              <View style={styles.emptyMiddleRing}>
                <View style={styles.emptyCore}>
                  <Feather name="map-pin" size={30} color={colors.accent} />
                </View>
              </View>

              <View style={[styles.emptyOrbit, styles.emptyOrbitTopRight]}>
                <Feather name="home" size={14} color={colors.accent} />
              </View>
              <View style={[styles.emptyOrbit, styles.emptyOrbitBottomLeft]}>
                <Feather name="navigation" size={14} color={colors.accent} />
              </View>
              <View style={[styles.emptyOrbit, styles.emptyOrbitTopLeft]}>
                <Feather name="search" size={13} color={colors.accent} />
              </View>
            </View>

            <Text style={styles.emptyTitle}>Where is the property?</Text>
            <Text style={styles.emptyText}>
              Search for an area, landmark, building or full address, then tap a
              result to pin the property location.
            </Text>
          </View>
        )}
      </ScrollView>

      <SafeAreaView style={styles.panelSafeArea} edges={["bottom"]}>
        <View style={styles.panel}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIcon,
                hasSelection && styles.statusIconSuccess,
              ]}
            >
              <Feather
                name={hasSelection ? "check-circle" : "map-pin"}
                size={16}
                color={hasSelection ? colors.accent : colors.muted}
              />
            </View>

            <View style={styles.statusTextBlock}>
              <Text style={styles.statusTitle}>
                {hasSelection
                  ? "Property location selected"
                  : "Search above and tap a result to select it."}
              </Text>

              {hasSelection && (
                <Text style={styles.statusHint} numberOfLines={1}>
                  {selectedAddress ?? "Previously selected property location"}
                </Text>
              )}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              !hasSelection && styles.confirmButtonDisabled,
              pressed && hasSelection && styles.confirmButtonPressed,
            ]}
            onPress={handleConfirm}
            disabled={!hasSelection}
          >
            <Feather name="check" size={18} color="#FFFFFF" />
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  headerSafeArea: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    height: 72,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
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
  headerText: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
    textAlign: "center",
  },
  headerSpacer: { width: 42 },

  searchArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBox: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 9,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 0,
  },
  searchButton: {
    height: 48,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonPressed: { opacity: 0.85 },
  searchButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: "#FFFFFF",
  },

  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 22,
  },
  section: { gap: 10 },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.muted,
    paddingHorizontal: 4,
  },

  resultsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  resultItem: {
    minHeight: 64,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.surface,
  },
  resultItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  resultItemPressed: { backgroundColor: colors.bg },
  resultItemSelected: { backgroundColor: colors.accentSoft },
  resultIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  resultIconSelected: { backgroundColor: colors.accent },
  resultText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.ink,
  },
  resultTextSelected: { fontFamily: fonts.bodyMedium },

  selectedCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.accent,
    overflow: "hidden",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  selectedAccentBar: { width: 5, backgroundColor: colors.accent },
  selectedBody: { flex: 1, padding: 16, gap: 12 },
  selectedTopRow: { flexDirection: "row", alignItems: "center" },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accentSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectedBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.accent,
  },
  selectedMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  selectedIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedTextBlock: { flex: 1, gap: 5 },
  selectedTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
  },
  selectedCoords: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.faint,
    letterSpacing: 0.3,
  },
  selectedHint: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted,
    paddingHorizontal: 4,
  },

  noResults: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  noResultsText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.muted,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyOuterRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  emptyMiddleRing: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCore: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyOrbit: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyOrbitTopRight: { top: 10, right: 10 },
  emptyOrbitBottomLeft: { bottom: 14, left: 8 },
  emptyOrbitTopLeft: { top: 24, left: -4 },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 290,
  },

  panelSafeArea: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  panel: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 16,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconSuccess: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
  statusTextBlock: { flex: 1, gap: 2 },
  statusTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.ink,
    lineHeight: 19,
  },
  statusHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  confirmButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmButtonPressed: { opacity: 0.85 },
  confirmButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
