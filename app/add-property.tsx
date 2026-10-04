import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
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

import PriceInput from "../components/PriceInput";
import { buildPrice, type SaleUnit } from "../lib/price";
import { supabase } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Design
// ---------------------------------------------------------------------------

const colors = {
  bg: "#FAF9F6",
  surface: "#FFFFFF",
  ink: "#14181B",
  muted: "#71757C",
  faint: "#A6A9AD",
  border: "#E7E4DD",
  accent: "#9C7A3C",
  accentSoft: "#F1E9DA",
  danger: "#C94B4B",
};

const fonts = {
  display: "Fraunces_600SemiBold",
  displayMedium: "Fraunces_500Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
};

type ListingType = "buy" | "rent";
type PropertyType = "Apartment" | "House";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Route params can be string | string[] | undefined. Safely parse to a finite
// number, or return null if the value is missing/invalid.
function parseCoordinateParam(
  value: string | string[] | undefined,
): number | null {
  const raw = Array.isArray(value) ? value[0] : value;

  if (raw === undefined || raw.trim().length === 0) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : null;
}

// Validates Indian mobile number format (+91/91 optional, 10 digits starting with 6-9)
// Returns normalized 10-digit string if valid, or null if invalid.
function validateAndNormalizeIndianPhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s-]/g, "");

  if (!cleaned) {
    return null;
  }

  let tenDigits = cleaned;

  if (cleaned.startsWith("+91")) {
    tenDigits = cleaned.slice(3);
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    tenDigits = cleaned.slice(2);
  }

  const isValid = /^[6-9]\d{9}$/.test(tenDigits);

  return isValid ? tenDigits : null;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AddPropertyScreen() {
  const params = useLocalSearchParams<{
    latitude?: string | string[];
    longitude?: string | string[];
  }>();

  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [title, setTitle] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [priceInput, setPriceInput] = useState("");
  const [saleUnit, setSaleUnit] = useState<SaleUnit>("crore");
  const [area, setArea] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [description, setDescription] = useState("");

  const [listingType, setListingType] = useState<ListingType>("buy");

  const [propertyType, setPropertyType] = useState<PropertyType>("Apartment");

  const [imageUri, setImageUri] = useState<string | null>(null);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const hasExactLocation = latitude !== null && longitude !== null;

  // -------------------------------------------------------------------------
  // Receive coordinates from /choose-location
  //
  // /choose-location returns here with router.dismissTo("/add-property"),
  // which pops back to THIS existing screen instance (no remount), so all
  // form state above is preserved. The selected coordinates arrive as route
  // params on this same instance.
  // -------------------------------------------------------------------------

  const latitudeParam = Array.isArray(params.latitude)
    ? params.latitude[0]
    : params.latitude;
  const longitudeParam = Array.isArray(params.longitude)
    ? params.longitude[0]
    : params.longitude;

  useEffect(() => {
    const parsedLatitude = parseCoordinateParam(latitudeParam);
    const parsedLongitude = parseCoordinateParam(longitudeParam);

    if (parsedLatitude === null || parsedLongitude === null) {
      return;
    }

    setLatitude(parsedLatitude);
    setLongitude(parsedLongitude);
  }, [latitudeParam, longitudeParam]);

  // -------------------------------------------------------------------------
  // Listing type switch (resets price so an incompatible value is never saved)
  // -------------------------------------------------------------------------

  const handleListingTypeChange = (next: ListingType) => {
    if (next === listingType) {
      return;
    }

    setListingType(next);
    setPriceInput("");
    setSaleUnit("crore");
  };

  // -------------------------------------------------------------------------
  // Pick Image
  // -------------------------------------------------------------------------

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow gallery access to choose a property image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);

      Alert.alert("Error", "Could not open your photo gallery.");
    }
  };

  // -------------------------------------------------------------------------
  // Choose Exact Location (manual map selection)
  //
  // push() keeps this screen alive in the stack underneath the map screen.
  // -------------------------------------------------------------------------

  const handleChooseExactLocation = () => {
    router.push("/choose-location");
  };

  // -------------------------------------------------------------------------
  // Upload Image
  // -------------------------------------------------------------------------

  const uploadPropertyImage = async (uri: string, userId: string) => {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();

    const extension = uri.split(".").pop()?.toLowerCase() || "jpg";

    const safeExtension = extension.includes("?")
      ? extension.split("?")[0]
      : extension;

    const fileName = `${userId}/${Date.now()}.${safeExtension}`;

    const contentType =
      safeExtension === "png"
        ? "image/png"
        : safeExtension === "webp"
          ? "image/webp"
          : "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from("property-images")
      .upload(fileName, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("property-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  // -------------------------------------------------------------------------
  // Submit Property
  // -------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    if (!imageUri) {
      Alert.alert(
        "Property image required",
        "Please select an image from your gallery.",
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a property title.");
      return;
    }

    if (!locality.trim()) {
      Alert.alert("Locality required", "Please enter the property locality.");
      return;
    }

    if (!city.trim()) {
      Alert.alert("City required", "Please enter the city.");
      return;
    }

    const priceResult = buildPrice(listingType, priceInput, saleUnit);

    if (!priceResult.ok) {
      Alert.alert("Invalid price", priceResult.message);
      return;
    }

    if (!area.trim()) {
      Alert.alert("Area required", "Please enter the property area.");
      return;
    }

    const bedroomCount = Number(bedrooms);
    const bathroomCount = Number(bathrooms);

    if (
      !bedrooms.trim() ||
      !Number.isInteger(bedroomCount) ||
      bedroomCount < 0
    ) {
      Alert.alert(
        "Invalid bedrooms",
        "Please enter a valid number of bedrooms.",
      );
      return;
    }

    if (
      !bathrooms.trim() ||
      !Number.isInteger(bathroomCount) ||
      bathroomCount < 0
    ) {
      Alert.alert(
        "Invalid bathrooms",
        "Please enter a valid number of bathrooms.",
      );
      return;
    }

    const normalizedAgentPhone = validateAndNormalizeIndianPhone(
      agentPhone.trim(),
    );

    if (!normalizedAgentPhone) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +919876543210).",
      );
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You need to be logged in to post a property.");
      }

      // Upload gallery image first
      const publicImageUrl = await uploadPropertyImage(imageUri, user.id);

      // Create property
      const { error: insertError } = await supabase.from("properties").insert({
        title: title.trim(),
        locality: locality.trim(),
        city: city.trim(),
        price: priceResult.displayPrice,
        price_amount: priceResult.amount,
        listing_type: listingType,
        property_type: propertyType,
        bedrooms: bedroomCount,
        bathrooms: bathroomCount,
        area: area.trim(),
        agent_phone: normalizedAgentPhone,
        image_url: publicImageUrl,
        description: description.trim() || null,
        featured: false,
        owner_id: user.id,
        latitude,
        longitude,
      });

      if (insertError) {
        throw insertError;
      }

      Alert.alert(
        "Property posted",
        "Your listing has been published successfully.",
        [
          {
            text: "View Properties",
            onPress: () => {
              router.replace("/(tabs)/explore");
            },
          },
        ],
      );
    } catch (error: any) {
      console.error("Add property error:", error);

      Alert.alert(
        "Could not post property",
        error?.message || "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!fontsLoaded) {
    return <View style={styles.screen} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={22} color={colors.ink} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Add Property</Text>

          <Text style={styles.headerSubtitle}>Create a new listing</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Image */}

          <Text style={styles.sectionTitle}>Property photo</Text>

          <Pressable style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />

                <View style={styles.imageOverlay} />

                <View style={styles.changePhoto}>
                  <Feather name="camera" size={16} color="#FFFFFF" />

                  <Text style={styles.changePhotoText}>Change photo</Text>
                </View>
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={styles.cameraCircle}>
                  <Feather name="camera" size={24} color={colors.accent} />
                </View>

                <Text style={styles.imagePickerTitle}>Add property photo</Text>

                <Text style={styles.imagePickerText}>
                  Choose an image from your gallery
                </Text>
              </View>
            )}
          </Pressable>

          {/* Listing Type */}

          <Text style={styles.sectionTitle}>Listing type</Text>

          <View style={styles.optionRow}>
            <OptionButton
              label="For Sale"
              icon="tag"
              active={listingType === "buy"}
              onPress={() => handleListingTypeChange("buy")}
            />

            <OptionButton
              label="For Rent"
              icon="key"
              active={listingType === "rent"}
              onPress={() => handleListingTypeChange("rent")}
            />
          </View>

          {/* Property Type */}

          <Text style={styles.sectionTitle}>Property type</Text>

          <View style={styles.optionRow}>
            <OptionButton
              label="Apartment"
              icon="grid"
              active={propertyType === "Apartment"}
              onPress={() => setPropertyType("Apartment")}
            />

            <OptionButton
              label="House"
              icon="home"
              active={propertyType === "House"}
              onPress={() => setPropertyType("House")}
            />
          </View>

          {/* Details */}

          <Text style={styles.sectionTitle}>Property details</Text>

          <InputField
            label="Title"
            placeholder="e.g. Modern Sea View Apartment"
            value={title}
            onChangeText={setTitle}
          />

          <PriceInput
            listingType={listingType}
            value={priceInput}
            onChangeValue={setPriceInput}
            unit={saleUnit}
            onChangeUnit={setSaleUnit}
          />

          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <InputField
                label="Bedrooms"
                placeholder="2"
                value={bedrooms}
                onChangeText={setBedrooms}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.column}>
              <InputField
                label="Bathrooms"
                placeholder="2"
                value={bathrooms}
                onChangeText={setBathrooms}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <InputField
            label="Area"
            placeholder="e.g. 1,150 sq ft"
            value={area}
            onChangeText={setArea}
          />

          <InputField
            label="Agent Phone Number"
            placeholder="e.g. 9876543210"
            value={agentPhone}
            onChangeText={setAgentPhone}
            keyboardType="phone-pad"
          />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>

            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Tell buyers about the property..."
              placeholderTextColor={colors.faint}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Property Location */}

          <Text style={[styles.sectionTitle, styles.locationSectionTitle]}>
            Property location
          </Text>

          <InputField
            label="Locality"
            placeholder="e.g. Bandra West"
            value={locality}
            onChangeText={setLocality}
          />

          <InputField
            label="City"
            placeholder="e.g. Mumbai"
            value={city}
            onChangeText={setCity}
          />

          <Pressable
            style={({ pressed }) => [
              styles.locationButton,
              hasExactLocation && styles.locationButtonSuccess,
              pressed && styles.locationButtonPressed,
            ]}
            onPress={handleChooseExactLocation}
          >
            <Feather name="map-pin" size={17} color={colors.accent} />

            <Text style={styles.locationButtonText}>
              {hasExactLocation
                ? "Change Exact Location"
                : "Choose Exact Location"}
            </Text>
          </Pressable>

          {hasExactLocation ? (
            <View style={styles.locationSuccessRow}>
              <Feather name="check-circle" size={15} color={colors.accent} />

              <Text style={styles.locationSuccessText}>
                Exact location selected
              </Text>
            </View>
          ) : (
            <Text style={styles.locationHint}>
              Optional. Pick the exact spot of the property on the map.
            </Text>
          )}

          {/* Submit */}

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && !submitting && styles.submitPressed,
              submitting && styles.submitDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />

                <Text style={styles.submitText}>Publishing...</Text>
              </>
            ) : (
              <>
                <Feather name="plus-circle" size={18} color="#FFFFFF" />

                <Text style={styles.submitText}>Post Property</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.footerHint}>
            Your listing will appear in Explore after publishing.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function OptionButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.optionButton, active && styles.optionButtonActive]}
      onPress={onPress}
    >
      <Feather
        name={icon}
        size={17}
        color={active ? colors.accent : colors.muted}
      />

      <Text style={[styles.optionText, active && styles.optionTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "number-pad" | "phone-pad";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
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

  header: {
    height: 72,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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

  headerText: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
  },

  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 1,
  },

  headerSpacer: {
    width: 42,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 50,
  },

  sectionTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: colors.ink,
    marginBottom: 12,
    marginTop: 8,
  },

  locationSectionTitle: {
    marginTop: 12,
  },

  imagePicker: {
    height: 220,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },

  previewImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,24,27,0.20)",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  cameraCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  imagePickerTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },

  imagePickerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },

  changePhoto: {
    position: "absolute",
    bottom: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(20,24,27,0.78)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  changePhotoText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: "#FFFFFF",
  },

  optionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },

  optionButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  optionButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },

  optionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.muted,
  },

  optionTextActive: {
    color: colors.accent,
    fontFamily: fonts.bodySemiBold,
  },

  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.ink,
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },

  descriptionInput: {
    height: 120,
    paddingTop: 13,
    paddingBottom: 13,
  },

  twoColumn: {
    flexDirection: "row",
    gap: 12,
  },

  column: {
    flex: 1,
  },

  // Exact location (manual map selection)
  locationButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.accentSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  locationButtonSuccess: {
    borderColor: colors.accent,
  },

  locationButtonPressed: {
    opacity: 0.8,
  },

  locationButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent,
  },

  locationSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 10,
  },

  locationSuccessText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.accent,
  },

  locationHint: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 10,
    paddingHorizontal: 12,
  },

  submitButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 24,
  },

  submitPressed: {
    opacity: 0.85,
  },

  submitDisabled: {
    opacity: 0.65,
  },

  submitText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: "#FFFFFF",
  },

  footerHint: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted,
    textAlign: "center",
    marginTop: 12,
  },
});
