import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

type FieldErrors = {
  fullName?: string;
  phone?: string;
};

// Returns a normalised 10-digit number, "" when empty, or null when invalid
function normalizePhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");

  if (digits.length === 0) {
    return "";
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
    return null;
  }

  return digits;
}

export default function PersonalInformationScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

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
          Alert.alert("Unable to load details", error.message);
          return;
        }

        if (user) {
          setFullName(
            user.user_metadata?.full_name || user.user_metadata?.name || "",
          );
          setPhone(user.user_metadata?.phone || user.phone || "");
          setEmail(user.email || "");
        }
      } catch (err) {
        Alert.alert(
          "Something went wrong",
          "We couldn't load your details. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const nextErrors: FieldErrors = {};
    const trimmedName = fullName.trim();

    if (trimmedName.length < 2) {
      nextErrors.fullName = "Please enter your full name.";
    }

    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone === null) {
      nextErrors.phone = "Enter a valid 10-digit mobile number.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || normalizedPhone === null) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          phone: normalizedPhone,
        },
      });

      if (error) {
        Alert.alert("Couldn't save changes", error.message);
        return;
      }

      setFullName(trimmedName);
      setPhone(normalizedPhone);

      Alert.alert("Saved", "Your personal information has been updated.", [
        { text: "OK", onPress: handleBack },
      ]);
    } catch (err) {
      Alert.alert(
        "Something went wrong",
        "We couldn't save your changes. Please try again.",
      );
    } finally {
      setSaving(false);
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

        <Text style={styles.headerTitle}>Personal Information</Text>

        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.intro}>
              Keep your details up to date so agents can reach you easily.
            </Text>

            <View style={styles.card}>
              {/* Full name */}
              <Text style={styles.label}>Full name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.fullName ? styles.inputError : null,
                ]}
              >
                <Feather name="user" size={16} color={colors.accent} />
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errors.fullName) {
                      setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  placeholder="Your full name"
                  placeholderTextColor={colors.inkFaint}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!saving}
                />
              </View>
              {errors.fullName ? (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              ) : null}

              {/* Phone */}
              <Text style={[styles.label, styles.labelSpaced]}>
                Phone number
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.phone ? styles.inputError : null,
                ]}
              >
                <Feather name="phone" size={16} color={colors.accent} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errors.phone) {
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={!saving}
                />
              </View>
              {errors.phone ? (
                <Text style={styles.errorText}>{errors.phone}</Text>
              ) : null}

              {/* Email (read-only) */}
              <Text style={[styles.label, styles.labelSpaced]}>Email</Text>
              <View style={[styles.inputWrapper, styles.inputReadOnly]}>
                <Feather name="mail" size={16} color={colors.inkFaint} />
                <Text style={styles.readOnlyText} numberOfLines={1}>
                  {email || "—"}
                </Text>
                <Feather name="lock" size={14} color={colors.inkFaint} />
              </View>
              <Text style={styles.helperText}>
                Your email is linked to your account and can't be changed here.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                (pressed || saving) && styles.saveButtonPressed,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
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

  flex: {
    flex: 1,
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
    marginBottom: 16,
  },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
  },

  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.inkFaint,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 2,
  },

  labelSpaced: {
    marginTop: 18,
  },

  inputWrapper: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },

  inputError: {
    borderColor: colors.danger,
  },

  inputReadOnly: {
    backgroundColor: "#F4F3EF",
  },

  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.ink,
    paddingVertical: 0,
  },

  readOnlyText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.inkMuted,
  },

  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
    marginLeft: 2,
  },

  helperText: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.inkMuted,
    marginTop: 6,
    marginLeft: 2,
  },

  saveButton: {
    height: 52,
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonPressed: {
    opacity: 0.75,
  },

  saveButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: "#FFFFFF",
  },
});
