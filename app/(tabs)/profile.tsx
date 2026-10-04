import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
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
import { useFavoritesStore } from "../../store/favoritesStore";

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
// Menu Item
// ---------------------------------------------------------------------------

type MenuItemProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  badge?: string;
  danger?: boolean;
  onPress?: () => void;
};

function MenuItem({
  icon,
  title,
  subtitle,
  badge,
  danger = false,
  onPress,
}: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuPressed]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, danger && styles.dangerIcon]}>
        <Feather
          name={icon}
          size={18}
          color={danger ? colors.danger : colors.accent}
        />
      </View>

      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuTitle, danger && styles.dangerText]}>
          {title}
        </Text>

        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}

      {!danger && (
        <Feather name="chevron-right" size={18} color={colors.inkFaint} />
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Profile Screen
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const favorites = useFavoritesStore((state) => state.favorites);

  const [fullName, setFullName] = useState("Krib User");
  const [email, setEmail] = useState("");
  const [listingCount, setListingCount] = useState(0);
  const [userLoading, setUserLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Get actual Supabase user (refreshes every time the screen is focused,
  // so edits made in Personal Information show up immediately)
  // -------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        try {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();

          if (error) {
            console.log("Profile user error:", error.message);
            return;
          }

          if (user) {
            const name =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              "Krib User";

            setFullName(name);
            setEmail(user.email || "");
          }
        } catch (error) {
          console.log("Could not load user:", error);
        } finally {
          setUserLoading(false);
        }
      };

      loadUser();
    }, []),
  );

  // -------------------------------------------------------------------------
  // Fetch real listing count on screen focus
  // -------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      const loadListingCount = async () => {
        try {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            setListingCount(0);
            return;
          }

          const { count, error } = await supabase
            .from("properties")
            .select("*", { count: "exact", head: true })
            .eq("owner_id", user.id);

          if (error) {
            console.error("Listing count query error:", error);
            return;
          }

          setListingCount(count ?? 0);
        } catch (error) {
          console.error("Error loading listing count:", error);
        }
      };

      loadListingCount();
    }, []),
  );

  // -------------------------------------------------------------------------
  // Initials
  // -------------------------------------------------------------------------

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  const performLogout = async () => {
    try {
      setLogoutLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        Alert.alert("Logout failed", error.message);
      }

      // No manual navigation needed.
      // Root auth guard detects session = null
      // and redirects to Login.
    } catch (error) {
      Alert.alert(
        "Something went wrong",
        "Unable to log out. Please try again.",
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out?", "Are you sure you want to log out of Krib?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Log out",
        style: "destructive",
        onPress: performLogout,
      },
    ]);
  };

  if (!fontsLoaded || userLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}

        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Profile</Text>

            <Text style={styles.headerSubtitle}>Manage your Krib account</Text>
          </View>

          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push("/settings")}
          >
            <Feather name="settings" size={19} color={colors.ink} />
          </Pressable>
        </View>

        {/* Profile Card */}

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "K"}</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {fullName}
            </Text>

            <Text style={styles.profileEmail} numberOfLines={1}>
              {email}
            </Text>

            <View style={styles.verifiedRow}>
              <Feather name="check-circle" size={13} color={colors.accent} />

              <Text style={styles.verifiedText}>Verified account</Text>
            </View>
          </View>

          <Pressable
            style={styles.editButton}
            onPress={() => router.push("/personal-information")}
          >
            <Feather name="edit-2" size={15} color={colors.ink} />
          </Pressable>
        </View>

        {/* Stats */}

        <View style={styles.statsCard}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{favorites.length}</Text>

            <Text style={styles.statLabel}>Saved</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statNumber}>{listingCount}</Text>

            <Text style={styles.statLabel}>Listings</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.stat}>
            <Text style={styles.statNumber}>0</Text>

            <Text style={styles.statLabel}>Enquiries</Text>
          </View>
        </View>

        {/* Property */}

        <Text style={styles.sectionLabel}>PROPERTY</Text>

        <View style={styles.menuCard}>
          <MenuItem
            icon="home"
            title="My Listings"
            subtitle="Manage properties you've posted"
            onPress={() => router.push("/my-listings")}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon="heart"
            title="Saved Properties"
            subtitle="Homes you've shortlisted"
            badge={favorites.length > 0 ? String(favorites.length) : undefined}
            onPress={() => router.push("/(tabs)/saved")}
          />
        </View>

        {/* Account */}

        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        <View style={styles.menuCard}>
          <MenuItem
            icon="user"
            title="Personal Information"
            subtitle="Name, email and phone number"
            onPress={() => router.push("/personal-information")}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon="bell"
            title="Notifications"
            subtitle="Manage property alerts"
            onPress={() => router.push("/notifications")}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon="shield"
            title="Privacy & Security"
            subtitle="Password and account security"
            onPress={() => router.push("/privacy-security")}
          />
        </View>

        {/* Support */}

        <Text style={styles.sectionLabel}>SUPPORT</Text>

        <View style={styles.menuCard}>
          <MenuItem
            icon="help-circle"
            title="Help & Support"
            subtitle="Get help using Krib"
            onPress={() => router.push("/help-support")}
          />

          <View style={styles.menuDivider} />

          <MenuItem
            icon="info"
            title="About Krib"
            subtitle="Version 1.0.0"
            onPress={() => router.push("/about-krib")}
          />
        </View>

        {/* Logout */}

        <View style={styles.logoutCard}>
          {logoutLoading ? (
            <View style={styles.logoutLoading}>
              <ActivityIndicator size="small" color={colors.danger} />

              <Text style={styles.logoutLoadingText}>Logging out...</Text>
            </View>
          ) : (
            <MenuItem
              icon="log-out"
              title="Log out"
              danger
              onPress={handleLogout}
            />
          )}
        </View>

        <Text style={styles.footer}>KRIB · FIND YOUR PLACE</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  header: {
    paddingTop: Platform.OS === "android" ? 12 : 4,
    paddingBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heading: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.ink,
  },

  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.inkMuted,
    marginTop: 3,
  },

  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  profileCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: "#FFFFFF",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 13,
  },

  profileName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.ink,
  },

  profileEmail: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.inkMuted,
    marginTop: 3,
  },

  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },

  verifiedText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.accent,
  },

  editButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  statsCard: {
    backgroundColor: colors.ink,
    borderRadius: 18,
    marginTop: 14,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  stat: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    fontFamily: fonts.display,
    fontSize: 21,
    color: "#FFFFFF",
  },

  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: "#C7C9CB",
    marginTop: 3,
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#34383B",
  },

  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.inkFaint,
    marginTop: 27,
    marginBottom: 9,
    marginLeft: 3,
  },

  menuCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },

  menuItem: {
    minHeight: 67,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  menuPressed: {
    opacity: 0.6,
  },

  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  dangerIcon: {
    backgroundColor: "#FBECEC",
  },

  menuTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  menuTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },

  menuSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 2,
  },

  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },

  badge: {
    minWidth: 25,
    height: 25,
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.accent,
  },

  dangerText: {
    color: colors.danger,
  },

  logoutCard: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },

  logoutLoading: {
    minHeight: 67,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  logoutLoadingText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
  },

  footer: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.inkFaint,
    textAlign: "center",
    marginTop: 28,
  },
});
