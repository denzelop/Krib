import React from "react";
import {
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
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

const FEATURES: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: "search", label: "Discover properties" },
  { icon: "heart", label: "Save favourites" },
  { icon: "edit-3", label: "Post and manage listings" },
  { icon: "map-pin", label: "Exact property locations" },
  { icon: "message-circle", label: "Contact agents through WhatsApp" },
];

export default function AboutKribScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
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

        <Text style={styles.headerTitle}>About Krib</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Brand */}
        <View style={styles.brandBlock}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>K</Text>
          </View>

          <Text style={styles.brandName}>Krib</Text>

          <View style={styles.versionPill}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.description}>
            Krib is a smart cross-platform real estate application designed to
            make discovering, saving, listing and contacting properties simple.
          </Text>
        </View>

        {/* Features */}
        <Text style={styles.sectionLabel}>WHAT YOU CAN DO</Text>

        <View style={styles.card}>
          {FEATURES.map((feature, index) => (
            <View key={feature.label}>
              {index > 0 ? <View style={styles.divider} /> : null}

              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Feather
                    name={feature.icon}
                    size={17}
                    color={colors.accent}
                  />
                </View>

                <Text style={styles.featureText}>{feature.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.builtWith}>
          Built with React Native, Expo and Supabase.
        </Text>

        <Text style={styles.footer}>KRIB · FIND YOUR PLACE</Text>
      </ScrollView>
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

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  brandBlock: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 24,
  },

  logoMark: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  logoLetter: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: "#FFFFFF",
  },

  brandName: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    marginTop: 14,
  },

  versionPill: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },

  versionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: colors.accent,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },

  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
    padding: 18,
    textAlign: "center",
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

  featureRow: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  featureText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 60,
  },

  builtWith: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 24,
  },

  footer: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.inkFaint,
    textAlign: "center",
    marginTop: 22,
  },
});
