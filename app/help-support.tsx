import React, { useState } from "react";
import {
    Alert,
    Linking,
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

const SUPPORT_EMAIL = "support@krib.app";

const FAQS: { question: string; answer: string }[] = [
  {
    question: "How do I add a property?",
    answer:
      "Use the add listing option in the app, fill in the property details, photos and location, then submit. Once posted, you can view and manage it any time from Profile → My Listings.",
  },
  {
    question: "How do I save a property?",
    answer:
      "Tap the heart icon on a property card or on the property details screen. Your shortlisted homes appear under Saved Properties in your Profile.",
  },
  {
    question: "How do I contact an agent?",
    answer:
      "Open a property and tap Contact Agent at the bottom of the screen. This opens a WhatsApp chat with the agent for that listing, with a message already filled in.",
  },
  {
    question: "How does property location work?",
    answer:
      "Listings can include exact map coordinates. Tap View on Map on the property details screen to open the location in your maps app. If exact coordinates aren't available, Krib uses the locality and city instead.",
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  const handleContactSupport = async () => {
    const subject = encodeURIComponent("Krib Support Request");
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;

    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert(
        "Unable to open email",
        `We couldn't open your email app. You can reach us at ${SUPPORT_EMAIL}.`,
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

        <Text style={styles.headerTitle}>Help & Support</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.intro}>
          Quick answers to common questions about using Krib.
        </Text>

        <Text style={styles.sectionLabel}>FREQUENTLY ASKED</Text>

        <View style={styles.card}>
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <View key={item.question}>
                {index > 0 ? <View style={styles.divider} /> : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.faqRow,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setOpenIndex(isOpen ? null : index)}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Feather
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.inkFaint}
                    />
                  </View>

                  {isOpen ? (
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>STILL NEED HELP?</Text>

        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Feather name="mail" size={20} color={colors.accent} />
          </View>

          <Text style={styles.supportTitle}>Talk to our team</Text>
          <Text style={styles.supportText}>
            Can't find what you're looking for? Send us an email and we'll get
            back to you.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            onPress={handleContactSupport}
          >
            <Feather name="send" size={15} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Contact Support</Text>
          </Pressable>

          <Text style={styles.emailText}>{SUPPORT_EMAIL}</Text>
        </View>
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

  pressed: {
    opacity: 0.7,
  },

  faqRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  faqQuestion: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },

  faqAnswer: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkMuted,
    marginTop: 10,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  supportCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },

  supportIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  supportTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.ink,
    marginTop: 14,
  },

  supportText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkMuted,
    textAlign: "center",
    marginTop: 6,
  },

  primaryButton: {
    height: 50,
    alignSelf: "stretch",
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  primaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: "#FFFFFF",
  },

  emailText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.accent,
    marginTop: 12,
  },
});
