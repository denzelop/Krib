import React, { useEffect, useState } from "react";
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

export default function PrivacySecurityScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [loading, setLoading] = useState(true);
  const [sendingReset, setSendingReset] = useState(false);
  const [email, setEmail] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          Alert.alert("Unable to load account", error.message);
          return;
        }

        if (user) {
          setEmail(user.email || "");
          setIsVerified(Boolean(user.email_confirmed_at));
        }
      } catch (err) {
        Alert.alert(
          "Something went wrong",
          "We couldn't load your account details.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleChangePassword = async () => {
    if (sendingReset) {
      return;
    }

    if (!email) {
      Alert.alert(
        "Email unavailable",
        "We couldn't find an email address for your account.",
      );
      return;
    }

    try {
      setSendingReset(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        Alert.alert("Couldn't send reset email", error.message);
        return;
      }

      Alert.alert(
        "Check your email",
        `We've sent a password reset link to ${email}.`,
      );
    } catch (err) {
      Alert.alert(
        "Something went wrong",
        "We couldn't send the reset email. Please try again.",
      );
    } finally {
      setSendingReset(false);
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

        <Text style={styles.headerTitle}>Privacy & Security</Text>

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
          <Text style={styles.sectionLabel}>ACCOUNT</Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Feather name="mail" size={18} color={colors.accent} />
              </View>

              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Account email</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {email || "—"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Feather
                  name={isVerified ? "check-circle" : "alert-circle"}
                  size={18}
                  color={colors.accent}
                />
              </View>

              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Account status</Text>
                <Text style={styles.rowSubtitle}>
                  {isVerified ? "Verified account" : "Email not yet verified"}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>PASSWORD</Text>

          <View style={styles.card}>
            <View style={styles.passwordBlock}>
              <View style={styles.rowIcon}>
                <Feather name="lock" size={18} color={colors.accent} />
              </View>

              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Change password</Text>
                <Text style={styles.rowSubtitle}>
                  We'll email you a secure link to set a new password.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || sendingReset) && styles.buttonPressed,
              ]}
              onPress={handleChangePassword}
              disabled={sendingReset}
            >
              {sendingReset ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Change Password</Text>
              )}
            </Pressable>
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
    paddingBottom: 40,
  },

  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    color: colors.inkFaint,
    marginTop: 12,
    marginBottom: 9,
    marginLeft: 3,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
  },

  row: {
    minHeight: 67,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
  },

  rowTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },

  rowSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkMuted,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },

  passwordBlock: {
    paddingHorizontal: 14,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  primaryButton: {
    height: 50,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonPressed: {
    opacity: 0.75,
  },

  primaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: "#FFFFFF",
  },
});
