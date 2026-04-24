/**
 * Date Formatting Utilities
 * Locale-aware date formatters for the warehouse system.
 */

/**
 * Format a Date object to a locale-appropriate string.
 * Defaults to "dd MMM yyyy" style output.
 */
export function formatDate(
  date: Date | string,
  locale: "en" | "tr" = "en"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a Date object to a locale-appropriate date-time string.
 */
export function formatDateTime(
  date: Date | string,
  locale: "en" | "tr" = "en"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns a human-readable relative time string (e.g. "2 hours ago").
 */
export function timeAgo(date: Date | string, locale: "en" | "tr" = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (locale === "tr") {
    if (diffSec < 60) return "az önce";
    if (diffMin < 60) return `${diffMin} dakika önce`;
    if (diffHr < 24) return `${diffHr} saat önce`;
    if (diffDay < 30) return `${diffDay} gün önce`;
    return formatDate(d, "tr");
  }

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  return formatDate(d, "en");
}
