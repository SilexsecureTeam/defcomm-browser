import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { MenuItem } from "../../utils/types/navigations";
import { invoke } from "@tauri-apps/api/core";
import {
  browserMenu,
  browserMenuScript,
  getSubmenuItems,
} from "../../utils/browserUtil/menu";
import { webViewManager } from "../../services/WebViewManager";

const BrowserMenu = forwardRef(
  (
    { webviewLabel, onClose }: { webviewLabel: string; onClose: () => void },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [useReactMenu, setUseReactMenu] = useState(false);
    const menuItems: MenuItem[] = useMemo(() => browserMenu, []);
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const submenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    // Generate menu HTML for webview injection
    const menuHtml = useMemo(() => {
      return `
        <div id="browser-menu" style="
          position: fixed;
          top: 0px;
          right: 0px;
          width: 280px;
          max-height: 95vh;
          background: white;
          border: 1px solid #c1c1c1;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          z-index: 99999;
          overflow-y: auto;
          padding: 4px 0;
        ">
          ${menuItems
            .map(
              (item) => `
              <div class="menu-item" data-label="${
                item.label
              }" data-hassubmenu="${item.hasSubmenu}" style="
                padding: 6px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                min-height: 24px;
                ${
                  item.hasDivider
                    ? "border-top: 1px solid #e8e8e8; margin-top: 4px; padding-top: 10px;"
                    : ""
                }
              " onmouseover="this.style.backgroundColor='#e8f4f8'" onmouseout="this.style.backgroundColor='transparent'">
                <span>${item.label}</span>
                ${
                  item.hasSubmenu
                    ? '<span style="opacity:0.6; font-size:16px; margin-left:8px">›</span>'
                    : item.shortcut
                    ? `<span style="opacity:0.6; font-size:12px; margin-left:8px">${item.shortcut}</span>`
                    : item?.sublabel
                    ? `<span style="opacity:0.6; font-size:12px; margin-left:8px">${item?.sublabel}</span>`
                    : '<span style="width:0px"></span>'
                }
              </div>
            `
            )
            .join("")}
        </div>
      `;
    }, [menuItems]);

    // Position submenu properly
    useEffect(() => {
      if (openSubmenu && submenuRefs.current[openSubmenu]) {
        const submenu = submenuRefs.current[openSubmenu];
        const menuItem = document.querySelector(
          `[data-label="${openSubmenu}"]`
        );

        if (submenu && menuItem) {
          const rect = menuItem.getBoundingClientRect();
          const submenuRect = submenu.getBoundingClientRect();

          let left = rect.right - 10;
          let top = rect.top;

          // Adjust positioning if needed
          if (left + submenuRect.width > window.innerWidth) {
            left = rect.left - submenuRect.width + 10;
          }
          if (top + submenuRect.height > window.innerHeight) {
            top = window.innerHeight - submenuRect.height - 10;
          }

          submenu.style.left = `${left}px`;
          submenu.style.top = `${top}px`;
        }
      }
    }, [openSubmenu]);

    // Close when clicking outside or pressing escape
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        const menu = document.querySelector(
          "#browser-menu, #react-browser-menu"
        );
        const submenus = document.querySelectorAll(".submenu");
        let isInsideMenu = false;

        if (menu && menu.contains(e.target as Node)) {
          isInsideMenu = true;
        }

        submenus.forEach((submenu) => {
          if (submenu.contains(e.target as Node)) {
            isInsideMenu = true;
          }
        });

        if (!isInsideMenu) {
          closeMenu();
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeMenu();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }, [isOpen]);

    const closeMenu = () => {
      setIsOpen(false);
      setUseReactMenu(false);
      setOpenSubmenu(null);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      onClose();
    };

    const handleMenuItemClick = async (item: MenuItem) => {
      console.log("Menu clicked:", item.label);

      if (item.label === "Exit") {
        if ((window as any).__TAURI__) {
          (window as any).__TAURI__.process.exit();
        }
      }

      closeMenu();
    };

    const handleMenuItemHover = (item: MenuItem) => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // If this item does NOT have submenu → close the previous submenu
      if (!item.hasSubmenu) {
        setOpenSubmenu(null);
        return;
      }

      // If it HAS submenu → open it normally
      hoverTimeoutRef.current = setTimeout(() => {
        setOpenSubmenu(item.label);
      }, 50);
    };

    const handleMenuItemLeave = (item: MenuItem) => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Only close submenu if we're not hovering over the submenu itself
      hoverTimeoutRef.current = setTimeout(() => {
        if (item.hasSubmenu) {
          setOpenSubmenu(null);
        }
      }, 150);
    };

    const handleSubmenuHover = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };

    const handleSubmenuLeave = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setOpenSubmenu(null);
      }, 150);
    };

    const openWebViewMenu = async () => {
      await invoke("eval_in_webview", {
        label: webviewLabel,
        script: browserMenuScript(menuHtml),
      });
    };

    useImperativeHandle(ref, () => ({
      openMenu: async () => {
        console.log("Opening menu...");
        setIsOpen(true);

        const isNewTab =
          webviewLabel.includes("tab-webview-") &&
          !webViewManager.hasView(webviewLabel);

        if (isNewTab) {
          console.log("Using React menu for new tab");
          setUseReactMenu(true);
        } else {
          console.log("Using webview menu for regular page");
          setUseReactMenu(false);
          await openWebViewMenu();
        }
      },
      closeMenu: async () => {
        console.log("Closing menu...");
        if (!useReactMenu) {
          await invoke("eval_in_webview", {
            label: webviewLabel,
            script: `
              document.querySelector('#browser-menu')?.remove();
              document.querySelectorAll('.submenu').forEach(el => el.remove());
              if (window.menuResizeObserver) {
                window.menuResizeObserver.disconnect();
              }
              window.currentMenuItem = null;
              window.__onMenuClose?.();
            `,
          });
        }
        closeMenu();
      },
    }));

    if (!isOpen || !useReactMenu) return null;

    return createPortal(
      <>
        {/* Main Menu */}
        <div
          ref={menuRef}
          id="react-browser-menu"
          style={{
            position: "fixed",
            top: "100px",
            right: "0px",
            width: "280px",
            maxHeight: "80vh",
            background: "white",
            border: "1px solid #c1c1c1",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "14px",
            zIndex: 99999,
            overflowY: "auto",
            padding: "4px 0",
          }}
        >
          {menuItems.map((item, index) => (
            <div
              key={index}
              className="menu-item"
              data-label={item.label}
              style={{
                position: "relative",
                padding: "6px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                minHeight: "24px",
                backgroundColor:
                  openSubmenu === item.label ? "#e8f4f8" : "transparent",
                ...(item.hasDivider
                  ? {
                      borderTop: "1px solid #e8e8e8",
                      marginTop: "4px",
                      paddingTop: "10px",
                    }
                  : {}),
              }}
              onMouseEnter={() => handleMenuItemHover(item)}
              onMouseLeave={() => handleMenuItemLeave(item)}
              onClick={() => !item.hasSubmenu && handleMenuItemClick(item)}
            >
              <span>{item.label}</span>
              {item.hasSubmenu ? (
                <span
                  style={{ opacity: 0.6, fontSize: "16px", marginLeft: "8px" }}
                >
                  ›
                </span>
              ) : item.shortcut ? (
                <span
                  style={{ opacity: 0.6, fontSize: "12px", marginLeft: "8px" }}
                >
                  {item.shortcut}
                </span>
              ) : item.sublabel ? (
                <span
                  style={{ opacity: 0.6, fontSize: "12px", marginLeft: "8px" }}
                >
                  {item.sublabel}
                </span>
              ) : (
                <span style={{ width: "0px" }} />
              )}
            </div>
          ))}
        </div>

        {/* Submenus as separate portals */}
        {menuItems.map((item) =>
          item.hasSubmenu && openSubmenu === item.label ? (
            <div
              key={item.label}
              ref={(el) => {
                submenuRefs.current[item.label] = el;
              }}
              className="submenu"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "240px",
                background: "white",
                border: "1px solid #c1c1c1",
                borderRadius: "6px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: "14px",
                zIndex: 100000,
                padding: "4px 0",
              }}
              onMouseEnter={handleSubmenuHover}
              onMouseLeave={handleSubmenuLeave}
            >
              {/* Submenu Title */}
              <div
                style={{
                  padding: "6px 16px",
                  fontWeight: 600,
                  borderBottom: "1px solid #e8e8e8",
                  marginBottom: "4px",
                  color: "#000 !important",
                }}
              >
                {item.label}
              </div>

              {/* Submenu Items */}
              {getSubmenuItems(item.label).map((subitem, subIndex) => (
                <React.Fragment key={subIndex}>
                  {subitem.divider ? (
                    <div
                      style={{
                        borderTop: "1px solid #e8e8e8",
                        margin: "4px 0",
                        paddingTop: "4px",
                      }}
                    />
                  ) : (
                    <div
                      className="submenu-item"
                      style={{
                        padding: "6px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        minHeight: "24px",
                      }}
                      onClick={() => {
                        console.log("Submenu clicked:", subitem.label);
                        closeMenu();
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "#e8f4f8")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <span>{subitem.label}</span>
                      {subitem.shortcut ? (
                        <span
                          style={{
                            opacity: 0.6,
                            fontSize: "12px",
                            marginLeft: "8px",
                          }}
                        >
                          {subitem.shortcut}
                        </span>
                      ) : (
                        <span style={{ width: "0px" }} />
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : null
        )}
      </>,
      document.body
    );
  }
);

export default BrowserMenu;
