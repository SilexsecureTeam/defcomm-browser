import { MenuItem } from "../types/navigations";

export const browserMenu: MenuItem[] = [
  { label: "New tab", shortcut: "Ctrl + T" },
  { label: "New private window", shortcut: "Ctrl + T", hasDivider: true },
  { label: "New identity", shortcut: "Ctrl + Shift + U" },
  {
    label: "New Deformm circuit",
    shortcut: "Ctrl + Shift + L",
    hasDivider: true,
  },
  { label: "Bookmarks", hasSubmenu: true },
  { label: "History", hasSubmenu: true },
  { label: "Downloads", shortcut: "Ctrl + J", hasDivider: true },
  { label: "Passwords" },
  {
    label: "Add-ons and themes",
    shortcut: "Ctrl + shift + A",
    hasDivider: true,
  },
  { label: "Print...", shortcut: "Ctrl + P" },
  { label: "Save page as...", shortcut: "Ctrl + S" },
  { label: "Find in page", shortcut: "Ctrl + F", hasDivider: true },
  { label: "Zoom", sublabel: "100%", hasSubmenu: true, hasDivider: true },
  { label: "Settings" },
  { label: "More tools", hasSubmenu: true },
  { label: "Help", hasSubmenu: true, hasDivider: true },
  { label: "Exit", shortcut: "Ctrl + Shift + Q" },
];

export const getSubmenuItems = (type: string) => {
  switch (type) {
    case "Bookmarks":
      return [
        { label: "Bookmark Manager", shortcut: "Ctrl+Shift+O" },
        { label: "Bookmark This Tab", shortcut: "Ctrl+D" },
        { label: "Bookmark All Tabs..." },
        { divider: true },
        { label: "Recently Bookmarked" },
        { label: "Bookmarks Bar" },
      ];
    case "History":
      return [
        { label: "History Manager", shortcut: "Ctrl+H" },
        { label: "Recently Closed" },
        { label: "Clear Recent History..." },
      ];
    case "Zoom":
      return [
        { label: "Zoom In", shortcut: "Ctrl++" },
        { label: "Zoom Out", shortcut: "Ctrl+-" },
        { label: "Actual Size", shortcut: "Ctrl+0" },
        { divider: true },
        { label: "Full Screen", shortcut: "F11" },
      ];
    case "More tools":
      return [
        { label: "Task Manager", shortcut: "Shift+Esc" },
        { label: "Developer Tools", shortcut: "F12" },
        { label: "Page Source", shortcut: "Ctrl+U" },
        { label: "Web Developer" },
        { divider: true },
        { label: "Sync and Save" },
        { label: "Cast..." },
      ];
    case "Help":
      return [
        { label: "Help Center" },
        { label: "Release Notes" },
        { label: "Report an Issue..." },
        { divider: true },
        { label: "About Browser" },
      ];
    default:
      return [];
  }
};

export const browserMenuScript = (menuHtml: string) => {
  return `
          // Remove any existing menu first
          document.querySelector('#browser-menu')?.remove();
          document.querySelectorAll('.submenu').forEach(el => el.remove());
          
          // Clean up any existing observers
          if (window.menuResizeObserver) {
            window.menuResizeObserver.disconnect();
          }
          
          // Insert the menu
          document.body.insertAdjacentHTML('beforeend', \`${menuHtml}\`);

          // Simple submenu function
          function showSubmenu(menuItem, type, title) {
            // Remove existing submenu
            document.querySelectorAll('.submenu').forEach(el => el.remove());
            
            let items = [];
            
            // Define submenu content
            if (type === 'bookmarks') {
              items = [
                { label: "Bookmark Manager", shortcut: "Ctrl+Shift+O" },
                { label: "Bookmark This Tab", shortcut: "Ctrl+D" },
                { label: "Bookmark All Tabs..." },
                { divider: true },
                { label: "Recently Bookmarked" },
                { label: "Bookmarks Bar" }
              ];
            } else if (type === 'history') {
              items = [
                { label: "History Manager", shortcut: "Ctrl+H" },
                { label: "Recently Closed" },
                { label: "Clear Recent History..." }
              ];
            } else if (type === 'zoom') {
              items = [
                { label: "Zoom In", shortcut: "Ctrl++" },
                { label: "Zoom Out", shortcut: "Ctrl+-" },
                { label: "Actual Size", shortcut: "Ctrl+0" },
                { divider: true },
                { label: "Full Screen", shortcut: "F11" }
              ];
            } else if (type === 'moreTools') {
              items = [
                { label: "Task Manager", shortcut: "Shift+Esc" },
                { label: "Developer Tools", shortcut: "F12" },
                { label: "Page Source", shortcut: "Ctrl+U" },
                { label: "Web Developer" },
                { divider: true },
                { label: "Sync and Save" },
                { label: "Cast..." }
              ];
            } else if (type === 'help') {
              items = [
                { label: "Help Center" },
                { label: "Release Notes" },
                { label: "Report an Issue..." },
                { divider: true },
                { label: "About Browser" }
              ];
            }
            
            // Build submenu HTML
            let submenuHTML = '<div class="submenu" style="position: fixed; top: 0; left: 0; width: 240px; background: white; border: 1px solid #c1c1c1; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: system-ui, sans-serif; font-size: 14px; z-index: 100000; padding: 4px 0;">';
            
            // Add title
            submenuHTML += '<div style="padding: 6px 16px; font-weight: 600; border-bottom: 1px solid #e8e8e8; margin-bottom: 4px;">' + title + '</div>';
            
            // Add items
            items.forEach(item => {
              if (item.divider) {
                submenuHTML += '<div style="border-top: 1px solid #e8e8e8; margin: 4px 0; padding-top: 4px;"></div>';
              } else {
                submenuHTML += '<div class="submenu-item" style="padding: 6px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; min-height: 24px;" onmouseover="this.style.backgroundColor=\\'#e8f4f8\\'" onmouseout="this.style.backgroundColor=\\'transparent\\'">';
                submenuHTML += '<span>' + item.label + '</span>';
                if (item.shortcut) {
                  submenuHTML += '<span style="opacity:0.6; font-size:12px; margin-left:8px">' + item.shortcut + '</span>';
                } else {
                  submenuHTML += '<span style="width:0px"></span>';
                }
                submenuHTML += '</div>';
              }
            });
            
            submenuHTML += '</div>';
            
            // Insert submenu
            document.body.insertAdjacentHTML('beforeend', submenuHTML);
            
            // Position submenu
            const submenu = document.querySelector('.submenu');
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
            
            submenu.style.left = left + 'px';
            submenu.style.top = top + 'px';
            
            // Store current menu item for resize observer
            window.currentMenuItem = menuItem;
            
            // Add click events to submenu items
            submenu.querySelectorAll('.submenu-item').forEach(el => {
              el.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Submenu clicked:', el.querySelector('span:first-child').textContent);
                closeAllMenus();
              });
            });
          }
          
          // Function to reposition submenu on resize
          function repositionSubmenu() {
            const submenu = document.querySelector('.submenu');
            const menuItem = window.currentMenuItem;
            
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
              
              submenu.style.left = left + 'px';
              submenu.style.top = top + 'px';
            }
          }
          
          // Set up ResizeObserver
          window.menuResizeObserver = new ResizeObserver(repositionSubmenu);
          window.menuResizeObserver.observe(document.body);
          
          // Function to handle Exit menu item
          function handleExit() {
            console.log('Exit menu item clicked');
            // Close the browser application
            if (window.__exitApplication) {
              window.__exitApplication();
            } else {
              // Fallback: try to close the window
              console.log('Attempting to close application...');
              // This will work in Tauri environment
              if (window.__TAURI__) {
                window.__TAURI__.process.exit();
              }
            }
          }
          
          // Function to close all menus
          function closeAllMenus() {
            document.querySelector('#browser-menu')?.remove();
            document.querySelectorAll('.submenu').forEach(el => el.remove());
            if (window.menuResizeObserver) {
              window.menuResizeObserver.disconnect();
            }
            window.currentMenuItem = null;
            window.__onMenuClose?.();
          }
          
          // Add hover events for submenu items
          document.querySelectorAll('#browser-menu .menu-item').forEach(el => {
  let timeout;

  el.addEventListener('mouseenter', function () {
    const hasSub = this.getAttribute("data-hassubmenu") === "true";

    // Always clear pending submenu timers
    if (timeout) clearTimeout(timeout);

    // If NOT submenu item → close submenu immediately
    if (!hasSub) {
      document.querySelectorAll('.submenu').forEach(s => s.remove());
      window.currentMenuItem = null;
      return;
    }

    // ✅ If it HAS submenu → open it after delay
    timeout = setTimeout(() => {
      const label = this.getAttribute("data-label");
      let type = "";

      if (label === "Bookmarks") type = "bookmarks";
      else if (label === "History") type = "history";
      else if (label === "Zoom") type = "zoom";
      else if (label === "More tools") type = "moreTools";
      else if (label === "Help") type = "help";

      if (type) {
        showSubmenu(this, type, label);
      }
    }, 200);
  });

  el.addEventListener("mouseleave", function () {
    if (timeout) clearTimeout(timeout);
  });
});

          
          // Simple click handler for regular menu items
          document.querySelectorAll('#browser-menu .menu-item[data-hassubmenu="false"]').forEach(el => {
            el.addEventListener('click', (e) => {
              const label = el.querySelector('span:first-child').textContent;
              console.log('Menu clicked:', label);
              
              // Handle Exit menu item specifically
              if (label === 'Exit') {
                handleExit();
              } else {
                closeAllMenus();
              }
            });
          });

          // Click outside to close
          setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
              const menu = document.querySelector('#browser-menu');
              const submenu = document.querySelector('.submenu');
              const isClickInside = (menu && menu.contains(e.target)) || (submenu && submenu.contains(e.target));
              
              if (!isClickInside) {
                closeAllMenus();
                document.removeEventListener('click', closeMenu);
              }
            });
          }, 10);

          // Escape key to close
          document.addEventListener('keydown', function closeOnEscape(e) {
            if (e.key === 'Escape') {
              closeAllMenus();
              document.removeEventListener('keydown', closeOnEscape);
            }
          });
        `;
};
