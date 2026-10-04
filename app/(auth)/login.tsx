import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  useFonts,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from "@expo-google-fonts/fraunces";

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";

import { supabase } from "../../lib/supabase";

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
// Login Screen
// ---------------------------------------------------------------------------

export default function LoginScreen() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert("Missing details", "Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        Alert.alert("Login failed", error.message);
        return;
      }

      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return <View style={styles.screen} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Brand */}

          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <Feather name="home" size={22} color="#FFFFFF" />
            </View>

            <Text style={styles.brand}>KRIB</Text>
          </View>

          {/* Heading */}

          <View style={styles.headingContainer}>
            <Text style={styles.heading}>Welcome back.</Text>

            <Text style={styles.subtitle}>
              Sign in to continue discovering your next place.
            </Text>
          </View>

          {/* Form */}

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>EMAIL ADDRESS</Text>

              <View style={styles.inputContainer}>
                <Feather name="mail" size={17} color={colors.inkMuted} />

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.passwordSection}>
              <Text style={styles.label}>PASSWORD</Text>

              <View style={styles.inputContainer}>
                <Feather name="lock" size={17} color={colors.inkMuted} />

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.inkFaint}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={styles.input}
                />

                <Pressable
                  onPress={() => setShowPassword((current) => !current)}
                  hitSlop={8}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={17}
                    color={colors.inkMuted}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {/* Login */}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && !loading && styles.loginButtonPressed,
                loading && styles.loginButtonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign in</Text>

                  <Feather name="arrow-right" size={17} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>

          {/* Divider */}

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />

            <Text style={styles.dividerText}>NEW TO KRIB?</Text>

            <View style={styles.divider} />
          </View>

          {/* Signup */}

          <Pressable
            style={styles.signupButton}
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text style={styles.signupText}>Create an account</Text>
          </Pressable>

          <Text style={styles.footer}>FIND YOUR PLACE</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
  flexGrow: 1,
  paddingHorizontal: 24,
  paddingTop: 30,
  paddingBottom: 140,
},

  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 42,
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  brand: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    letterSpacing: 3,
    color: colors.ink,
    marginLeft: 11,
  },

  headingContainer: {
    marginBottom: 34,
  },

  heading: {
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 44,
    color: colors.ink,
  },

  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkMuted,
    maxWidth: 330,
    marginTop: 9,
  },

  form: {
    width: "100%",
  },

  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.3,
    color: colors.inkMuted,
    marginBottom: 8,
    marginLeft: 2,
  },

  inputContainer: {
    height: 54,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  input: {
    flex: 1,
    height: "100%",
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },

  passwordSection: {
    marginTop: 19,
  },

  forgotButton: {
    alignSelf: "flex-end",
    marginTop: 12,
    paddingVertical: 3,
  },

  forgotText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.accent,
  },

  loginButton: {
    height: 55,
    borderRadius: 14,
    backgroundColor: colors.ink,
    marginTop: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  loginButtonPressed: {
    opacity: 0.85,
  },

  loginButtonDisabled: {
    opacity: 0.65,
  },

  loginButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: "#FFFFFF",
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  dividerText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: colors.inkFaint,
    marginHorizontal: 13,
  },

  signupButton: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  signupText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },

  footer: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 2.5,
    color: colors.inkFaint,
    textAlign: "center",
    marginTop: 36,
  },
});
