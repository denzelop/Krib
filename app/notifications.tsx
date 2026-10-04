import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
// Design Tokens
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
// Preferences model
// ---------------------------------------------------------------------------

type PreferenceKey =
  | "newProperties"
  | "priceChanges"
  | "savedSearches"
  | "enquiries";

type Preferences = Record<PreferenceKey, boolean>;

const DEFAULT_PREFERENCES: Preferences = {
  newProperties: true,
  priceChanges: true,
  savedSearches: false,
  enquiries: true,
};

type PreferenceRow = {
  key: PreferenceKey;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
};

const PREFERENCE_ROWS: PreferenceRow[] = [
  {
    key: "newProperties",
    icon: "home",
    title: "New property alerts",
    subtitle: "Be the first to know about new listings",
  },
  {
    key: "priceChanges",
    icon: "trending-down",
    title: "Price changes",
    subtitle: "Updates when a saved property's price changes",
  },
  {
    key: "savedSearches",
    icon: "search",
    title: "Saved search alerts",
    subtitle: "Matches for the searches you follow",
  },
  {
    key: "enquiries",
    icon: "message-circle",
    title: "Listing enquiries",
    subtitle: "When someone is interested in your listing",
  },
];

export default function NotificationsScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const stored = user?.user_metadata?.notification_preferences;

        if (stored && typeof stored === "object") {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...(stored as Partial<Preferences>),
          });
        }
      } catch (err) {
        console.log("Could not load notification preferences:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const handleToggle = async (key: PreferenceKey, value: boolean) => {
    const previous = preferences;
    const next: Preferences = { ...preferences, [key]: value };

    // Optimistic update
    setPreferences(next);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { notification_preferences: next },
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      setPreferences(previous);
      Alert.alert(
        "Couldn't update preference",
        "Please check your connection and try again.",
      );
    }
  };

  if (!fontsLoaded) {
    return <View style={styles.screen} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={8}>
          <Feather name="chevron-left" size={22} color={colors.ink} />
        </Pressable>

        <Text style={styles.headerTitle}>Notifications</Text>

        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.intro}>
            Choose the updates you'd like to hear about from Krib.
          </Text>

          <Text style={styles.sectionLabel}>PREFERENCES</Text>

          <View style={styles.card}>
            {PREFERENCE_ROWS.map((row, index) => (
              <View key={row.key}>
                {index > 0 ? <View style={styles.divider} /> : null}

                <View style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Feather name={row.icon} size={18} color={colors.accent} />
                  </View>

                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                  </View>

                  <Switch
                    value={preferences[row.key]}
                    onValueChange={(value) => handleToggle(row.key, value)}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={colors.border}
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.noteCard}>
            <Feather name="info" size={15} color={colors.accent} />
            <Text style={styles.noteText}>
              These are your notification preferences. Push notifications will
              be switched on in a future update.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
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
    paddingTop: Platform.OS === "android" ? 12 : 4,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
  },

  headerSpacer: {
    width: 40,
    height: 40,
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 40,
  },

  intro: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkMuted,
  },

  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.inkFaint,
    marginTop: 24,
    marginBottom: 9,
    marginLeft: 3,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },

  row: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  rowText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  rowTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },

  rowSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.inkMuted,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },

  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
  },

  noteText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkMuted,
  },
});
