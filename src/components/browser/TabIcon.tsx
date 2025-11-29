import { useEffect, useState } from "react";
import { safeResolveUrl } from "../../utils/formmater";

const FALLBACK_ICON = "/defcomm.png";

interface TabIconProps {
  icon?: string;
  url: string;
  alt?: string;
}

export const TabIcon: React.FC<TabIconProps> = ({ icon, url, alt = "" }) => {
  const [src, setSrc] = useState<string>(FALLBACK_ICON);
  const [loaded, setLoaded] = useState(false);

  // Whenever icon or url changes, try to load new icon
  useEffect(() => {
    if (!icon) {
      setSrc(FALLBACK_ICON);
      setLoaded(true);
      return;
    }

    const resolved = safeResolveUrl(icon, url);
    setSrc(resolved);
    setLoaded(false);
  }, [icon, url]);

  return (
    <img
      src={src}
      alt={alt}
      className={`w-4 h-4 rounded-sm shrink-0 transition-opacity ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
      onLoad={() => {
        // Mark visible once it actually loaded
        setLoaded(true);
      }}
      onError={() => {
        // If loading favicon fails, lock to fallback
        if (src !== FALLBACK_ICON) {
          setSrc(FALLBACK_ICON);
          setLoaded(true);
        }
      }}
    />
  );
};
