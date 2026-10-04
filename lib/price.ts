// Price helpers for Krib.
//
// `price_amount` (numeric rupees) is the source of truth.
// `price` (text) is generated from it for display, so the two never drift.

export type PriceListingType = "buy" | "rent";
export type SaleUnit = "lakh" | "crore";

export const LAKH = 100000;
export const CRORE = 10000000;

// Sanity ceiling (₹1 lakh crore). Keeps values safely inside JS integer range.
const MAX_PRICE_AMOUNT = 1000000000000;

export type PriceResult =
  | { ok: true; amount: number; displayPrice: string }
  | { ok: false; message: string };

// ---------------------------------------------------------------------------
// Input sanitizers (used while typing)
// ---------------------------------------------------------------------------

// Digits and at most one dot. Commas / spaces / letters are dropped.
export function sanitizeDecimalInput(text: string): string {
  const cleaned = text.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");

  if (firstDot === -1) {
    return cleaned;
  }

  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
}

// Digits only (monthly rent in whole rupees).
export function sanitizeIntegerInput(text: string): string {
  return text.replace(/\D/g, "");
}

// ---------------------------------------------------------------------------
// Parsing / validation
// ---------------------------------------------------------------------------

function parsePositiveNumber(
  raw: string,
  allowDecimal: boolean,
): number | null {
  const cleaned = raw.replace(/[\s,]/g, "");
  const pattern = allowDecimal ? /^(\d+\.?\d*|\.\d+)$/ : /^\d+$/;

  if (!pattern.test(cleaned)) {
    return null;
  }

  const value = Number(cleaned);

  return Number.isFinite(value) && value > 0 ? value : null;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

// Indian digit grouping: 1234567 -> "12,34,567".
// Implemented manually so output doesn't depend on the JS engine's Intl data.
export function formatIndianInteger(value: number): string {
  const digits = String(Math.round(value));

  if (digits.length <= 3) {
    return digits;
  }

  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  return `${rest},${lastThree}`;
}

// 1.75 -> "1.75", 2.1 -> "2.1", 85 -> "85" (no trailing zeros).
function formatDecimal(value: number): string {
  return parseFloat(value.toFixed(4)).toString();
}

export function formatRentDisplay(amount: number): string {
  return `₹${formatIndianInteger(amount)} / month`;
}

export function formatSaleDisplay(amount: number, unit: SaleUnit): string {
  if (unit === "crore") {
    return `₹${formatDecimal(amount / CRORE)} Cr`;
  }

  return `₹${formatDecimal(amount / LAKH)} Lakh`;
}

// ---------------------------------------------------------------------------
// Main entry point: raw form input -> { amount, displayPrice }
// ---------------------------------------------------------------------------

export function buildPrice(
  listingType: PriceListingType,
  rawInput: string,
  saleUnit: SaleUnit,
): PriceResult {
  if (listingType === "rent") {
    const rent = parsePositiveNumber(rawInput, false);

    if (rent === null || rent > MAX_PRICE_AMOUNT) {
      return {
        ok: false,
        message: "Please enter a valid monthly rent in rupees (e.g. 85000).",
      };
    }

    return { ok: true, amount: rent, displayPrice: formatRentDisplay(rent) };
  }

  const value = parsePositiveNumber(rawInput, true);

  if (value === null) {
    return {
      ok: false,
      message: `Please enter a valid price greater than zero (e.g. 1.75 ${
        saleUnit === "crore" ? "Crore" : "Lakh"
      }).`,
    };
  }

  const multiplier = saleUnit === "crore" ? CRORE : LAKH;

  // Round to whole rupees to avoid float noise (e.g. 2.1 * 10000000).
  const amount = Math.round(value * multiplier);

  if (
    amount <= 0 ||
    !Number.isSafeInteger(amount) ||
    amount > MAX_PRICE_AMOUNT
  ) {
    return {
      ok: false,
      message: "That price is out of range. Please enter a valid amount.",
    };
  }

  return {
    ok: true,
    amount,
    displayPrice: formatSaleDisplay(amount, saleUnit),
  };
}

// ---------------------------------------------------------------------------
// Edit-screen helpers
// ---------------------------------------------------------------------------

// Supabase `numeric` can arrive as number or string depending on the client.
export function normalizePriceAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

// Backwards-compat ONLY: used when an old row has no price_amount.
// "₹1.75 Cr" -> 17500000, "₹85 Lakh" -> 8500000, "₹1,10,000 / month" -> 110000
export function parseLegacyPriceAmount(
  price: string | null | undefined,
): number | null {
  if (!price) {
    return null;
  }

  const match = price
    .replace(/,/g, "")
    .match(/(\d+(?:\.\d+)?)\s*(cr(?:ore)?|lakh|lac|l)?/i);

  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase();

  let multiplier = 1;

  if (unit && unit.startsWith("cr")) {
    multiplier = CRORE;
  } else if (unit && unit.startsWith("l")) {
    multiplier = LAKH;
  }

  const amount = Math.round(value * multiplier);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

// price_amount -> what the editor should show.
// 17500000 -> { "1.75", crore }, 8500000 -> { "85", lakh }, rent 85000 -> { "85000" }
export function amountToEditorState(
  listingType: PriceListingType,
  amount: number,
): { input: string; unit: SaleUnit } {
  if (listingType === "rent") {
    return { input: String(Math.round(amount)), unit: "crore" };
  }

  if (amount >= CRORE) {
    return { input: formatDecimal(amount / CRORE), unit: "crore" };
  }

  return { input: formatDecimal(amount / LAKH), unit: "lakh" };
}
