// Product categories the country research covers. Shared by the form and the API,
// so a category can only be one of these. Add a category here when the research supports it.
export const CATEGORIES = [
  "Apparel & accessories",
  "Beauty & personal care",
  "Home & living",
  "Food & beverage",
  "Health & wellness",
  "Technology",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// "Other" asks the founder to type their category (e.g. "pet care"); it's checked for sense before a plan runs.
export const OTHER = "Other";
export const OTHER_MAX = 60;
