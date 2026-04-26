/**
 * Strict validation and formatting for Warehouse Management
 */

export const validateSKU = (sku: string): { isValid: boolean; error?: string } => {
  if (!sku) return { isValid: false, error: "SKU is required." };
  
  // SKU is numbers only
  const pattern = /^[0-9]+$/;
  if (!pattern.test(sku)) {
    return { 
      isValid: false, 
      error: "Invalid SKU format. Must contain only numbers." 
    };
  }
  
  return { isValid: true };
};

export const validateQuantity = (qty: number, min: number = 1): { isValid: boolean; error?: string } => {
  if (isNaN(qty) || qty < min) {
    return { isValid: false, error: `Quantity must be at least ${min}.` };
  }
  
  if (!Number.isInteger(qty)) {
    return { isValid: false, error: "Quantity must be a whole number." };
  }
  
  return { isValid: true };
};

export const formatInput = (val: string): string => {
  return val.trim().toUpperCase();
};
