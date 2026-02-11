use crate::state::{AppSettings, AppState};
use std::fs;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
    let config_dir = app.path().app_config_dir().unwrap();
    let file_path = config_dir.join("settings.json");

    if file_path.exists() {
        let content = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
        let settings: AppSettings = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(settings)
    } else {
        Ok(AppSettings::default())
    }
}

#[tauri::command]
pub async fn save_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let mut list = state.games_list.lock().unwrap();
    *list = settings.games.clone();

    let config_dir = app.path().app_config_dir().unwrap();
    fs::create_dir_all(&config_dir).ok();

    let file_path = config_dir.join("settings.json");
    let json_data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;

    fs::write(&file_path, json_data).map_err(|e| e.to_string())?;
    Ok(())
}
