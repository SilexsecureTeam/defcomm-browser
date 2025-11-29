export interface BrowserMenuProps {
  isOpen: boolean;
  onClose: () => void;
  webviewLabel: string;
}

export interface MenuItem {
  label: string;
  shortcut?: string;
  hasDivider?: boolean;
  hasSubmenu?: boolean;
  sublabel?: string;
  onClick?: () => void;
}
