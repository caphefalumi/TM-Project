use tauri::{Manager, command};
use tiny_http::{Server, Response};
use serde_json::json;

#[command]
async fn wait_for_oauth_callback(code_verifier: String, expected_state: String, backend_url: String, client_id: String, client_secret: String) -> Result<serde_json::Value, String> {
    let server = Server::http("127.0.0.1:1409").map_err(|e| format!("Failed to start server: {}", e))?;
    println!("Listening for OAuth callback on port 1409...");

    // Wait for Google redirect
    for request in server.incoming_requests() {
        let url = request.url().to_string();
        println!("Received request: {}", url);

        // Send simple response to browser
        let response = Response::from_string("Authentication successful! You may now close this window.");
        if let Err(e) = request.respond(response) {
            eprintln!("Failed to respond to request: {}", e);
        }

        // Parse URL parameters
        if url.contains("/oauth/callback") {
            let parsed_url = url::Url::parse(&format!("http://localhost:1409{}", url))
                .map_err(|e| format!("Failed to parse URL: {}", e))?;
            
            let query_pairs: std::collections::HashMap<String, String> = parsed_url
                .query_pairs()
                .into_owned()
                .collect();

            // Check for OAuth error
            if let Some(error) = query_pairs.get("error") {
                return Err(format!("OAuth error: {}", error));
            }

            // Get code and state
            let code = query_pairs.get("code")
                .ok_or("Missing authorization code")?;
            let state = query_pairs.get("state")
                .ok_or("Missing state parameter")?;

            // Validate state
            if state != &expected_state {
                return Err("Invalid state parameter".to_string());
            }

            println!("Got authorization code, exchanging for token...");

            // Exchange code for access token using PKCE
            let token_response = exchange_code_for_token(code, &code_verifier, &client_id, &client_secret).await?;
            
            // Use the access token with your backend
            let backend_result = authenticate_with_backend(&token_response.access_token, &backend_url).await?;
            
            return Ok(backend_result);
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

async fn exchange_code_for_token(code: &str, code_verifier: &str, client_id: &str, client_secret: &str) -> Result<TokenResponse, String> {
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

async fn authenticate_with_backend(access_token: &str, backend_url: &str) -> Result<serde_json::Value, String> {
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
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main")
            .expect("no main window")
            .set_focus();
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_prevent_default::init())
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
