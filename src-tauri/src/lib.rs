use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Listener, Manager, State};

#[derive(Default)]
struct PendingRequests(
    Mutex<std::collections::HashMap<String, tokio::sync::oneshot::Sender<String>>>,
);

#[derive(Serialize, Deserialize, Debug, Default)]
struct PageMeta {
    url: String,
    canonical: String,
    title: String,
    description: String,
    icon: String,
    icons: Vec<String>,
    theme_color: String,
    lang: String,
}

fn eval_on_label(app: &AppHandle, label: &str, script: &str) -> Result<(), String> {
    if let Some(wv) = app.get_webview(label) {
        return wv.eval(script).map_err(|e| e.to_string());
    }
    if let Some(win) = app.get_webview_window(label) {
        return win.eval(script).map_err(|e| e.to_string());
    }
    Err(format!("Webview/WebviewWindow '{}' not found.", label))
}

#[tauri::command]
async fn eval_in_webview(app: AppHandle, label: String, script: String) -> Result<String, String> {
    eval_on_label(&app, &label, &script)?;
    Ok("Script executed successfully (result ignored)".to_string())
}

/// Evaluate arbitrary JS in the target webview and return a **JSON string**.
/// - Always JSON.stringify() the result inside the page.
/// - Use a timeout so the command never hangs if page can’t emit.
#[tauri::command]
async fn get_page_properties(
    app: AppHandle,
    pending_requests: State<'_, PendingRequests>,
    label: String,
    script: String,
) -> Result<String, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let request_id = uuid::Uuid::new_v4().to_string();

    {
        let mut map = pending_requests.0.lock().map_err(|e| e.to_string())?;
        map.insert(request_id.clone(), tx);
    }

    // Wrap the user script so it **returns** a value and stringify it.
    // If there is no Tauri Event API, this will not emit (hence we timeout).
    let response_script = format!(
        r#"(function () {{
          try {{
            const __value = (() => {{ return ( {user_script} ); }})();
            let __json;
            try {{ __json = JSON.stringify(__value); }}
            catch {{ __json = JSON.stringify(String(__value ?? "")); }}

            if (window.__TAURI__?.event?.emit) {{
              window.__TAURI__.event.emit('script-response', {{
                id: '{id}',
                value: __json
              }});
            }} else {{
              console.log('TAURI_SCRIPT_RESPONSE (no event API)', '{id}', __json);
            }}
          }} catch (e) {{
            const msg = e && e.toString ? e.toString() : 'Unknown error';
            if (window.__TAURI__?.event?.emit) {{
              window.__TAURI__.event.emit('script-response', {{
                id: '{id}',
                error: msg
              }});
            }} else {{
              console.log('TAURI_SCRIPT_ERROR (no event API)', '{id}', msg);
            }}
          }}
        }})();"#,
        user_script = script.replace('\\', "\\\\").replace('`', "\\`"),
        id = request_id
    );

    eval_on_label(&app, &label, &response_script)
        .map_err(|e| format!("Failed to run script: {}", e))?;

    // Wait with timeout so we never hang when the page cannot emit
    match tokio::time::timeout(Duration::from_millis(800), rx).await {
        Ok(Ok(payload)) => {
            if let Some(rest) = payload.strip_prefix("__ERR__:") {
                Err(rest.to_string())
            } else {
                Ok(payload) // this is a **JSON string**
            }
        }
        Ok(Err(_)) => Err("Channel closed before response".to_string()),
        Err(_) => Err("Timed out waiting for script response".to_string()),
    }
}

/// Try to read metadata via page injection; if that fails, fetch HTML and parse.
#[tauri::command]
async fn get_page_metadata(
    app: AppHandle,
    pending_requests: State<'_, PendingRequests>,
    label: String,
    url: Option<String>, // optional URL to enable HTTP fallback
) -> Result<String, String> {
    // Script to extract meta in-page (SPA-friendly).
    let metadata_js = r#"
      (function() {
        const $ = (s) => document.querySelector(s);
        const meta = (s) => ($(s)?.content ?? "");
        const abs = (href) => { try { return href ? new URL(href, document.baseURI).href : ""; } catch { return href || ""; } };

        const iconNodes = Array.from(document.querySelectorAll(
          "link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon'], link[rel='mask-icon'], link[rel='fluid-icon']"
        ));
        const icons = iconNodes.map(n => abs(n.getAttribute('href'))).filter(Boolean);

        const title =
          document.title ||
          meta("meta[property='og:title']") ||
          meta("meta[name='twitter:title']") ||
          (document.querySelector('h1')?.textContent?.trim() || "");

        const description =
          meta("meta[name='description']") ||
          meta("meta[property='og:description']") ||
          meta("meta[name='twitter:description']");

        return {
          url: location.href,
          canonical: $("link[rel='canonical']")?.href || "",
          title,
          description,
          icon: icons[0] || "",
          icons,
          themeColor: meta("meta[name='theme-color']"),
          lang: document.documentElement.getAttribute('lang') || ""
        };
      })()
    "#.to_string();

    // Try in-page first
    if let Ok(json_str) = get_page_properties(
        app.clone(),
        pending_requests.clone(),
        label.clone(),
        metadata_js,
    )
    .await
    {
        // ensure it's JSON
        return Ok(json_str);
    }

    // Fallback: HTTP fetch & parse
    let url = if let Some(u) = url {
        u
    } else {
        return Err("In-page metadata failed and no URL provided for fallback".into());
    };

    let meta = fetch_metadata_via_http(&url)
        .await
        .unwrap_or_else(|| PageMeta {
            url: url.clone(),
            ..Default::default()
        });

    Ok(serde_json::to_string(&meta).unwrap_or_else(|_| "{}".to_string()))
}

/// Simple metadata command that only uses HTTP fallback (no webview injection)
#[tauri::command]
async fn get_page_metadata_simple(url: String) -> Result<String, String> {
    // Only use HTTP fallback - webview injection doesn't work reliably
    let meta = fetch_metadata_via_http(&url)
        .await
        .unwrap_or_else(|| PageMeta {
            url: url.clone(),
            title: "".to_string(), // Frontend will handle fallback
            ..Default::default()
        });

    Ok(serde_json::to_string(&meta).unwrap_or_else(|_| "{}".to_string()))
}

async fn fetch_metadata_via_http(url: &str) -> Option<PageMeta> {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(5))
        .user_agent("DefcommBrowser/0.1")
        .build()
        .ok()?;

    let resp = client.get(url).send().await.ok()?;
    let final_url = resp.url().to_string();
    let text = resp.text().await.ok()?;

    use scraper::{Html, Selector};

    let doc = Html::parse_document(&text);
    let sel_title = Selector::parse("title").ok()?;
    let sel_canon = Selector::parse("link[rel='canonical']").ok()?;
    let sel_meta_desc = Selector::parse("meta[name='description'], meta[property='og:description'], meta[name='twitter:description']").ok()?;
    let sel_icons = Selector::parse("link[rel*='icon']").ok()?;
    let sel_html = Selector::parse("html").ok()?;
    let sel_theme = Selector::parse("meta[name='theme-color']").ok()?;

    let title = doc
        .select(&sel_title)
        .next()
        .and_then(|n| n.text().next())
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    let description = doc
        .select(&sel_meta_desc)
        .filter_map(|n| n.value().attr("content"))
        .map(|s| s.trim().to_string())
        .next()
        .unwrap_or_default();

    let canonical = doc
        .select(&sel_canon)
        .next()
        .and_then(|n| n.value().attr("href"))
        .unwrap_or_default()
        .to_string();

    let icons: Vec<String> = doc
        .select(&sel_icons)
        .filter_map(|n| n.value().attr("href"))
        .map(|s| s.to_string())
        .collect();

    let html_lang = doc
        .select(&sel_html)
        .next()
        .and_then(|n| n.value().attr("lang"))
        .unwrap_or_default()
        .to_string();

    let theme_color = doc
        .select(&sel_theme)
        .next()
        .and_then(|n| n.value().attr("content"))
        .unwrap_or_default()
        .to_string();

    Some(PageMeta {
        url: final_url,
        canonical,
        title,
        description,
        icon: icons.get(0).cloned().unwrap_or_default(),
        icons,
        theme_color: theme_color,
        lang: html_lang,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(PendingRequests::default())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let ah = app_handle.clone();

            // Listen for script responses
            app_handle.listen("script-response", move |event| {
                let payload = event.payload();
                let pending_state = ah.state::<PendingRequests>();

                if let Ok(json) = serde_json::from_str::<Value>(payload) {
                    let id = json["id"].as_str().unwrap_or("").to_string();

                    if let Ok(mut map) = pending_state.0.lock() {
                        if let Some(tx) = map.remove(&id) {
                            if let Some(err) = json["error"].as_str() {
                                let _ = tx.send(format!("__ERR__:{}", err));
                            } else if let Some(val) = json["value"].as_str() {
                                let _ = tx.send(val.to_string());
                            } else {
                                let _ = tx.send("".to_string());
                            }
                        }
                    }
                }
            });

            // Listen for tab-metadata events from the webview bridge
            let app_handle_metadata = app.handle().clone();
            app_handle.listen("tab-metadata", move |event| {
                println!("[Rust] Received tab-metadata event: {}", event.payload());
                // Forward to ALL frontend listeners
                let _ = app_handle_metadata.emit("tab-metadata", event.payload());
            });

            // Listen for tab-beforeunload events
            let app_handle_beforeunload = app.handle().clone();
            app_handle.listen("tab-beforeunload", move |event| {
                println!(
                    "[Rust] Received tab-beforeunload event: {}",
                    event.payload()
                );
                // Forward to ALL frontend listeners
                let _ = app_handle_beforeunload.emit("tab-beforeunload", event.payload());
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            eval_in_webview,
            get_page_properties,
            get_page_metadata,
            get_page_metadata_simple,
        ])
        .run(tauri::generate_context!())
        .expect("error while running app");
}
