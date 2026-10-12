// Product categories the country research covers. Shared by the form and the API,
// so a category can only be one of these. Add a category here when the research supports it.
export const CATEGORIES = [
  "Apparel & accessories",
  "Beauty & personal care",
  "Jewellery",
  "Home & living",
  "Food & beverage",
  "Health & wellness",
] as const;

export type Category = (typeof CATEGORIES)[number];
