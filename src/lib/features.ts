/**
 * Feature flags.
 *
 * Feeding is hidden for now — the household doesn't feed plants, so every feed
 * UI surface (the detail segment, the add-plant fields, the status dot's brown
 * indicator) is gated behind this flag. The DB columns, the `/feed` API route,
 * and the species feed data all stay intact regardless, so bringing feeding
 * back is a one-line change with no data loss or migration.
 */
export const SHOW_FEED = false;
