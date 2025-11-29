export const safeResolveUrl = (icon: string, base: string): string => {
  try {
    let newUrl = new URL(icon, base).href;
    return newUrl;
  } catch {
    // fallback: return the original unmodified icon
    return icon;
  }
};
