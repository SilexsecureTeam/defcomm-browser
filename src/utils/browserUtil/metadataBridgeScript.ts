export function metadataBridgeScript(label: string) {
  return `
    (function(){
      if (window.__DEFCOMM_META_BRIDGE__) return;
      window.__DEFCOMM_META_BRIDGE__ = true;
      const LABEL = ${JSON.stringify(label)};

      const emit = (meta) => {
        try { window.__TAURI__.event.emit('tab-meta', { label: LABEL, meta }); } catch {}
      };

      const abs = (href) => { try { return href ? new URL(href, document.baseURI).href : ''; } catch { return href || ''; } };
      const metaContent = (sel) => {
        const n = document.querySelector(sel);
        return (n && 'content' in n) ? (n.content || '') : '';
      };

      const collect = () => {
        const iconNodes = Array.from(document.querySelectorAll(
          "link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon'], link[rel='mask-icon'], link[rel='fluid-icon']"
        ));
        const icons = iconNodes.map(n => {
          const sizes = (n.getAttribute('sizes') || '').toLowerCase();
          let w = 0;
          if (/^\\d+x\\d+$/i.test(sizes)) {
            const p = sizes.split('x')[0]; const m = parseInt(p, 10); w = isNaN(m) ? 0 : m;
          }
          return { href: abs(n.getAttribute('href')), sizes, w, rel: n.getAttribute('rel') || '' };
        }).filter(i => i.href);
        icons.sort((a,b) => b.w - a.w);

        const bestIcon = (icons[0]?.href) || '';

        const title =
          document.title ||
          metaContent("meta[property='og:title']") ||
          metaContent("meta[name='twitter:title']") ||
          (document.querySelector('h1')?.textContent?.trim() || '');

        const description =
          metaContent("meta[name='description']") ||
          metaContent("meta[property='og:description']") ||
          metaContent("meta[name='twitter:description']");

        const canonical = document.querySelector("link[rel='canonical']")?.href || '';
        const themeColor = metaContent("meta[name='theme-color']");
        const lang = document.documentElement.getAttribute('lang') || '';

        return {
          url: location.href,
          title, description,
          icon: bestIcon,
          icons: icons.map(i => i.href),
          canonical,
          themeColor,
          lang
        };
      };

      // Throttle to avoid floods
      let last = 0; const THRESH = 250;
      const schedule = () => {
        const now = Date.now();
        if (now - last < THRESH) return;
        last = now;
        emit(collect());
      };

      // Initial emit
      document.addEventListener('DOMContentLoaded', schedule, { once: true });
      window.addEventListener('load', schedule, { once: true });
      setTimeout(schedule, 50);

      // SPA navigations
      ['pushState','replaceState'].forEach(fn => {
        const orig = history[fn];
        history[fn] = function(...args){
          const r = orig.apply(this, args);
          queueMicrotask(schedule);
          return r;
        };
      });
      window.addEventListener('popstate', schedule);
      window.addEventListener('hashchange', schedule);

      // Title / description / icon changes
      const head = document.querySelector('head') || document.documentElement;
      const mo = new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type === 'childList' || m.type === 'attributes') { schedule(); break; }
        }
      });
      mo.observe(head, { subtree: true, childList: true, attributes: true, attributeFilter: ['href','content'] });

      // Visibility (tab re-focus)
      document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
    })();
  `;
}
