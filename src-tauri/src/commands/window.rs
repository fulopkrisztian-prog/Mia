use tauri::{AppHandle, Manager, State};
use crate::state::AppState;
use crate::commands::chat;

#[tauri::command]
pub async fn toggle_main_window(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let main = app.get_webview_window("main").ok_or("Main window not found")?;
    let floater = app.get_webview_window("floater").ok_or("Floater window not found")?;
    if main.is_visible().unwrap_or(false) {
        main.hide().map_err(|e| e.to_string())?;
        floater.show().map_err(|e| e.to_string())?;
        let _ = chat::unload_mia(state).await;
    } else {
        let _ = chat::load_mia(state).await;
        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
        floater.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn hide_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        main.hide().map_err(|e| e.to_string())?;
    }
    if let Some(floater) = app.get_webview_window("floater") {
        floater.show().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn maximize_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(main_window) = app.get_webview_window("main") {
        if main_window.is_maximized().map_err(|e| e.to_string())? {
            main_window.unmaximize().map_err(|e| e.to_string())?;
        } else {
            main_window.maximize().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}