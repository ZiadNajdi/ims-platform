/**
 * SKU Validation Utilities
 * Standard SKU format: IMS-XXXX-YYYY
 * Where X = alphanumeric category code, Y = numeric item identifier.
 */

const SKU_REGEX = /^IMS-[A-Z0-9]{4}-\d{4}$/;

/**
 * Validate a SKU string against the IMS-Platform format.
 */
export function isValidSku(sku: string): boolean {
  return SKU_REGEX.test(sku.toUpperCase().trim());
}

/**
 * Generate a new SKU given a category code and a numeric ID.
 * Example: generateSku("ELEC", 42) → "IMS-ELEC-0042"
 */
export function generateSku(categoryCode: string, itemId: number): string {
  const code = categoryCode.toUpperCase().padEnd(4, "0").slice(0, 4);
  const id = String(itemId).padStart(4, "0");
  return `IMS-${code}-${id}`;
}

/**
 * Parse a valid SKU into its category code and item ID components.
 * Returns null if the SKU is invalid.
 */
export function parseSku(
  sku: string
): { categoryCode: string; itemId: number } | null {
  const normalized = sku.toUpperCase().trim();
  if (!isValidSku(normalized)) return null;

  const parts = normalized.split("-");
  return {
    categoryCode: parts[1],
    itemId: parseInt(parts[2], 10),
  };
}
