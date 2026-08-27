/**
 * Client-side money formatting and validation helpers.
 * All amounts are handled in minor units (paise) to avoid floating point issues.
 */

export function formatMinor(amountMinor: number, currency: string = "INR"): string {
  const isNegative = amountMinor < 0;
  const absAmount = Math.abs(amountMinor);
  const major = Math.floor(absAmount / 100);
  const minor = absAmount % 100;
  
  let formatted = "";
  if (currency === "INR") {
    // Format major unit using Indian numbering system if appropriate, or standard locale string
    const majorStr = major.toLocaleString("en-IN");
    formatted = minor === 0 ? `₹${majorStr}` : `₹${majorStr}.${minor.toString().padStart(2, "0")}`;
  } else {
    formatted = `${(absAmount / 100).toFixed(2)} ${currency}`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

export function rupeeToPaise(rupeeString: string): number {
  // Strip currency symbols and commas
  const cleaned = rupeeString.replace(/[₹\s,]/g, "");
  const val = parseFloat(cleaned);
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
}

export function paiseToRupeeString(amountMinor: number): string {
  return (amountMinor / 100).toString();
}
