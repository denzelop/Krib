import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
    buildPrice,
    sanitizeDecimalInput,
    sanitizeIntegerInput,
    type PriceListingType,
    type SaleUnit,
} from "../lib/price";

const colors = {
  surface: "#FFFFFF",
  ink: "#14181B",
  muted: "#71757C",
  faint: "#A6A9AD",
  border: "#E7E4DD",
  accent: "#9C7A3C",
  accentSoft: "#F1E9DA",
};

const fonts = {
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemiBold: "Inter_600SemiBold",
};

const UNITS: { value: SaleUnit; label: string }[] = [
  { value: "lakh", label: "Lakh" },
  { value: "crore", label: "Crore" },
];

type Props = {
  listingType: PriceListingType;
  value: string;
  onChangeValue: (value: string) => void;
  unit: SaleUnit;
  onChangeUnit: (unit: SaleUnit) => void;
};

export default function PriceInput({
  listingType,
  value,
  onChangeValue,
  unit,
  onChangeUnit,
}: Props) {
  const isRent = listingType === "rent";

  // Live preview so the user can see exactly what will be saved/displayed.
  const preview = value.trim() ? buildPrice(listingType, value, unit) : null;

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{isRent ? "Monthly Rent" : "Price"}</Text>

      {isRent ? (
        <View style={styles.rentRow}>
          <Text style={styles.rupee}>₹</Text>

          <TextInput
            style={styles.rentInput}
            placeholder="85000"
            placeholderTextColor={colors.faint}
            value={value}
            onChangeText={(text) => onChangeValue(sanitizeIntegerInput(text))}
            keyboardType="number-pad"
          />
        </View>
      ) : (
        <View style={styles.saleRow}>
          <TextInput
            style={styles.amountInput}
            placeholder="1.75"
            placeholderTextColor={colors.faint}
            value={value}
            onChangeText={(text) => onChangeValue(sanitizeDecimalInput(text))}
            keyboardType="decimal-pad"
          />

          <View style={styles.unitSwitch}>
            {UNITS.map((item) => {
              const active = unit === item.value;

              return (
                <Pressable
                  key={item.value}
                  style={[styles.unitOption, active && styles.unitOptionActive]}
                  onPress={() => onChangeUnit(item.value)}
                >
                  <Text
                    style={[styles.unitText, active && styles.unitTextActive]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {preview && preview.ok ? (
        <Text style={styles.preview}>
          Will be listed as {preview.displayPrice}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
  },

  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.ink,
    marginBottom: 7,
  },

  saleRow: {
    flexDirection: "row",
    gap: 10,
  },

  amountInput: {
    flex: 1,
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

  unitSwitch: {
    width: 138,
    height: 50,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 4,
    gap: 4,
  },

  unitOption: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  unitOptionActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },

  unitText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.muted,
  },

  unitTextActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
  },

  rentRow: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    gap: 8,
  },

  rupee: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.muted,
  },

  rentInput: {
    flex: 1,
    height: "100%",
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },

  preview: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted,
    marginTop: 7,
  },
});
