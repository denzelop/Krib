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

const colors = {
  bg: "#FAF9F6",
  surface: "#FFFFFF",
  ink: "#14181B",
  inkMuted: "#71757C",
  inkFaint: "#A6A9AD",
  border: "#E7E4DD",
  accent: "#9C7A3C",
};

const fonts = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
};

export default function SignupScreen() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      Alert.alert("Missing details", "Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Password too short",
        "Your password must contain at least 6 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords don't match",
        "Please make sure both passwords are the same.",
      );
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      });

      if (error) {
        Alert.alert("Couldn't create account", error.message);
        return;
      }

      if (data.session) {
        Alert.alert(
          "Welcome to Krib",
          "Your account has been created successfully.",
        );

        router.replace("/(tabs)");
      } else {
        Alert.alert(
          "Check your email",
          "Your account was created. Please verify your email, then sign in.",
          [
            {
              text: "Go to login",
              onPress: () => router.replace("/(auth)/login"),
            },
          ],
        );
      }
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
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={colors.ink} />
          </Pressable>

          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <Feather name="home" size={21} color="#FFFFFF" />
            </View>

            <Text style={styles.brand}>KRIB</Text>
          </View>

          <View style={styles.headingContainer}>
            <Text style={styles.heading}>Find your place.</Text>

            <Text style={styles.subtitle}>
              Create your Krib account and start discovering homes made for you.
            </Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="FULL NAME"
              icon="user"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />

            <View style={styles.fieldSpacing}>
              <InputField
                label="EMAIL ADDRESS"
                icon="mail"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldSpacing}>
              <Text style={styles.label}>PASSWORD</Text>

              <View style={styles.inputContainer}>
                <Feather name="lock" size={17} color={colors.inkMuted} />

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 6 characters"
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

            <View style={styles.fieldSpacing}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>

              <View style={styles.inputContainer}>
                <Feather name="shield" size={17} color={colors.inkMuted} />

                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Enter password again"
                  placeholderTextColor={colors.inkFaint}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  style={styles.input}
                />

                <Pressable
                  onPress={() => setShowConfirmPassword((current) => !current)}
                  hitSlop={8}
                >
                  <Feather
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={17}
                    color={colors.inkMuted}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleSignup}
              disabled={loading}
              style={({ pressed }) => [
                styles.signupButton,
                pressed && !loading && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.signupButtonText}>Create account</Text>

                  <Feather name="arrow-right" size={17} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account?</Text>

            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.loginLink}>Sign in</Text>
            </Pressable>
          </View>

          <Text style={styles.terms}>
            By creating an account, you agree to Krib's Terms of Service and
            Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type InputFieldProps = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
};

function InputField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "words",
}: InputFieldProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <Feather name={icon} size={17} color={colors.inkMuted} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.input}
        />
      </View>
    </View>
  );
}

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
  paddingTop: 16,
  paddingBottom: 140,
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
    marginBottom: 25,
  },

  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  brand: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    letterSpacing: 3,
    color: colors.ink,
    marginLeft: 10,
  },

  headingContainer: {
    marginBottom: 29,
  },

  heading: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 42,
    color: colors.ink,
  },

  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkMuted,
    marginTop: 8,
    maxWidth: 340,
  },

  form: {
    width: "100%",
  },

  fieldSpacing: {
    marginTop: 17,
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

  signupButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.ink,
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  signupButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: "#FFFFFF",
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
    gap: 5,
  },

  loginPrompt: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
  },

  loginLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.accent,
  },

  terms: {
    fontFamily: fonts.body,
    fontSize: 10.5,
    lineHeight: 16,
    color: colors.inkFaint,
    textAlign: "center",
    marginTop: 25,
    paddingHorizontal: 18,
  },
});
