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

type SettingsRoute =
  | "/personal-information"
  | "/notifications"
  | "/privacy-security"
  | "/help-support"
  | "/about-krib";

type SettingsRow = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  route: SettingsRoute;
};

const ACCOUNT_ROWS: SettingsRow[] = [
  {
    icon: "user",
    title: "Personal Information",
    subtitle: "Name, email and phone number",
    route: "/personal-information",
  },
  {
    icon: "bell",
    title: "Notifications",
    subtitle: "Manage property alerts",
    route: "/notifications",
  },
  {
    icon: "shield",
    title: "Privacy & Security",
    subtitle: "Password and account security",
    route: "/privacy-security",
  },
];

const SUPPORT_ROWS: SettingsRow[] = [
  {
    icon: "help-circle",
    title: "Help & Support",
    subtitle: "Get help using Krib",
    route: "/help-support",
  },
  {
    icon: "info",
    title: "About Krib",
    subtitle: "Version 1.0.0",
    route: "/about-krib",
  },
];

export default function SettingsScreen() {
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

  const renderRows = (rows: SettingsRow[]) => (
    <View style={styles.card}>
      {rows.map((row, index) => (
        <View key={row.route}>
          {index > 0 ? <View style={styles.divider} /> : null}

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push(row.route)}
          >
            <View style={styles.rowIcon}>
              <Feather name={row.icon} size={18} color={colors.accent} />
            </View>

            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
            </View>

            <Feather name="chevron-right" size={18} color={colors.inkFaint} />
          </Pressable>
        </View>
      ))}
    </View>
  );

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

        <Text style={styles.headerTitle}>Settings</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        {renderRows(ACCOUNT_ROWS)}

        <Text style={styles.sectionLabel}>SUPPORT</Text>
        {renderRows(SUPPORT_ROWS)}

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

  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.inkFaint,
    marginTop: 14,
    marginBottom: 9,
    marginLeft: 3,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },

  row: {
    minHeight: 67,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  rowPressed: {
    opacity: 0.6,
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
  },

  rowTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },

  rowSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },

  footer: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.inkFaint,
    textAlign: "center",
    marginTop: 24,
  },
});
