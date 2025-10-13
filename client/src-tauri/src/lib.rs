use serde_json::json;
use tauri::{command, AppHandle, Manager};
use tiny_http::{Response, Server};

#[command]
async fn wait_for_oauth_callback(
    app: AppHandle,
    code_verifier: String,
    expected_state: String,
    backend_url: String,
    client_id: String,
    client_secret: String,
) -> Result<serde_json::Value, String> {
    let server =
        Server::http("127.0.0.1:1409").map_err(|e| format!("Failed to start server: {}", e))?;
    println!("Listening for OAuth callback on port 1409...");

    let mut oauth_result: Option<serde_json::Value> = None;

    // Wait for Google redirect
    for request in server.incoming_requests() {
        let url = request.url().to_string();
        println!("Received request: {}", url);

        // Parse URL parameters for OAuth callback
        if url.contains("/oauth/callback") {
            let parsed_url = url::Url::parse(&format!("http://localhost:1409{}", url))
                .map_err(|e| format!("Failed to parse URL: {}", e))?;

            let query_pairs: std::collections::HashMap<String, String> =
                parsed_url.query_pairs().into_owned().collect();

            // Check for OAuth error
            if let Some(error) = query_pairs.get("error") {
                let error_html = format!(
                    r#"
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Authentication Failed</title>
                        <style>
                            body {{
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                margin: 0;
                                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                                color: white;
                            }}
                            .container {{
                                text-align: center;
                                padding: 2rem;
                                background: rgba(255, 255, 255, 0.1);
                                border-radius: 10px;
                                backdrop-filter: blur(10px);
                            }}
                            h1 {{ margin: 0 0 1rem 0; }}
                            p {{ margin: 0; opacity: 0.9; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>✗ Authentication Failed</h1>
                            <p>Error: {}</p>
                            <p>You can close this window.</p>
                        </div>
                    </body>
                    </html>
                    "#,
                    error
                );
                let response = Response::from_string(error_html)
                    .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());
                let _ = request.respond(response);
                return Err(format!("OAuth error: {}", error));
            }

            // Get code and state
            let code = query_pairs
                .get("code")
                .ok_or("Missing authorization code")?;
            let state = query_pairs.get("state").ok_or("Missing state parameter")?;

            // Validate state
            if state != &expected_state {
                let error_html = r#"
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Authentication Failed</title>
                        <style>
                            body {
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                margin: 0;
                                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                                color: white;
                            }
                            .container {
                                text-align: center;
                                padding: 2rem;
                                background: rgba(255, 255, 255, 0.1);
                                border-radius: 10px;
                                backdrop-filter: blur(10px);
                            }
                            h1 { margin: 0 0 1rem 0; }
                            p { margin: 0; opacity: 0.9; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>✗ Authentication Failed</h1>
                            <p>Invalid state parameter</p>
                            <p>You can close this window.</p>
                        </div>
                    </body>
                    </html>
                "#;
                let response = Response::from_string(error_html)
                    .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());
                let _ = request.respond(response);
                return Err("Invalid state parameter".to_string());
            }

            println!("Got authorization code, exchanging for token...");

            // Send initial success response with redirect
            let html_response = r#"
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Sign in</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                        }
                        .container {
                            text-align: center;
                            padding: 2rem;
                            background: rgba(255, 255, 255, 0.1);
                            border-radius: 10px;
                            backdrop-filter: blur(10px);
                        }
                        h1 { margin: 0 0 1rem 0; }
                        p { margin: 0; opacity: 0.9; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <p>Authenticating...</p>
                    </div>
                    <script>
                        window.location.replace('http://localhost:1409');
                    </script>
                </body>
                </html>
            "#;

            let response = Response::from_string(html_response)
                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());

            if let Err(e) = request.respond(response) {
                eprintln!("Failed to respond to request: {}", e);
            }

            // Exchange code for access token using PKCE
            let token_response =
                exchange_code_for_token(code, &code_verifier, &client_id, &client_secret).await?;

            // Use the access token with your backend
            let backend_result =
                authenticate_with_backend(&token_response.access_token, &backend_url).await?;

            // Store the result to return later
            oauth_result = Some(backend_result);

            // Focus the app window after successful OAuth
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.show();
                let _ = window.unminimize();
            }

            // Continue to handle the redirect
            continue;
        } else if url == "/" || url == "/?" {
            // This handles the redirect from the script
            let success_html = r#"
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Success</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                        }
                        .container {
                            text-align: center;
                            padding: 2rem;
                            background: rgba(255, 255, 255, 0.1);
                            border-radius: 10px;
                            backdrop-filter: blur(10px);
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>✓ All Done!</h1>
                        <p id="message">You can close this window now.</p>
                    </div>
                </body>
                </html>
            "#;

            let response = Response::from_string(success_html)
                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());

            if let Err(e) = request.respond(response) {
                eprintln!("Failed to respond to request: {}", e);
            }

            // Give the browser time to render the page
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;

            // Now return the result
            if let Some(result) = oauth_result {
                return Ok(result);
            } else {
                return Err("OAuth process completed but no result stored".to_string());
            }
        }
    }

    Err("Server stopped without receiving callback".to_string())
}

#[derive(serde::Deserialize)]
struct TokenResponse {
    access_token: String,
    #[allow(dead_code)]
    token_type: String,
    #[allow(dead_code)]
    expires_in: u64,
}

async fn exchange_code_for_token(
    code: &str,
    code_verifier: &str,
    client_id: &str,
    client_secret: &str,
) -> Result<TokenResponse, String> {
    let client = reqwest::Client::new();

    let params = [
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("code", code),
        ("code_verifier", code_verifier),
        ("grant_type", "authorization_code"),
        ("redirect_uri", "http://localhost:1409/oauth/callback"),
    ];

    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {}", error_text));
    }

    let token_data: TokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    Ok(token_data)
}

async fn authenticate_with_backend(
    access_token: &str,
    backend_url: &str,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();

    let response = client
        .post(&format!("{}/api/auth/oauth", backend_url))
        .header("Content-Type", "application/json")
        .json(&json!({
            "token": access_token
        }))
        .send()
        .await
        .map_err(|e| format!("Backend request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Backend authentication failed: {}", error_text));
    }

    let backend_data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse backend response: {}", e))?;

    Ok(backend_data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_prevent_default::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![wait_for_oauth_callback])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}