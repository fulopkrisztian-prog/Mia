use tauri::{Manager, LogicalPosition, AppHandle};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use std::fs;
use std::thread;
use std::time::Duration;
use sysinfo::{System, ProcessesToUpdate};

#[derive(Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub games: Vec<String>,
    #[serde(rename = "searxngUrl")]
    pub searxng_url: String,
    #[serde(rename = "launchOnStartup")]
    pub launch_on_startup: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            games: vec!["cs2.exe".into(), "valorant.exe".into()],
            searxng_url: "https://searx.example.com".into(),
            launch_on_startup: true,
        }
    }
}

struct AppState {
    games_list: Arc<Mutex<Vec<String>>>,
}

#[tauri::command]
async fn get_settings(app: AppHandle) -> Result<AppSettings, String> {
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
async fn save_settings(
    settings: AppSettings, 
    state: tauri::State<'_, AppState>,
    app: AppHandle
) -> Result<(), String> {
    let mut list = state.games_list.lock().unwrap();
    *list = settings.games.clone();

    let config_dir = app.path().app_config_dir().unwrap();
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }
    
    let file_path = config_dir.join("settings.json");
    let json_data = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    
    fs::write(&file_path, json_data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn toggle_main_window(app: AppHandle) -> Result<(), String> {
    let main_window = app.get_webview_window("main").ok_or("Main window not found")?;
    let floater = app.get_webview_window("floater").ok_or("Floater window not found")?;

    if main_window.is_visible().unwrap_or(false) {
        main_window.hide().map_err(|e| e.to_string())?;
        floater.show().map_err(|e| e.to_string())?;
    } else {
        main_window.show().map_err(|e| e.to_string())?;
        main_window.set_focus().map_err(|e| e.to_string())?;
        floater.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn hide_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        main.hide().map_err(|e| e.to_string())?;
    }
    if let Some(floater) = app.get_webview_window("floater") {
        floater.show().map_err(|e| e.to_string())?;
    }
    Ok(())
}


#[tauri::command]
async fn maximize_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(main_window) = app.get_webview_window("main") {
        if main_window.is_maximized().map_err(|e| e.to_string())? {
            main_window.unmaximize().map_err(|e| e.to_string())?;
        } else {
            main_window.maximize().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn get_system_stats() -> Result<Value, String> {
    let mut sys = System::new_all();
    sys.refresh_cpu_all();
    sys.refresh_memory();
    thread::sleep(Duration::from_millis(150));
    sys.refresh_cpu_all();
    let cpu_usage = sys.global_cpu_usage();
    let total_mem = sys.total_memory();
    let used_mem = sys.used_memory();
    Ok(json!({
        "cpu": cpu_usage,
        "memory": (used_mem as f64 / total_mem as f64) * 100.0,
        "memory_str": format!("{:.1} / {:.1} GB", used_mem as f64 / 1024.0 / 1024.0 / 1024.0, total_mem as f64 / 1024.0 / 1024.0 / 1024.0)
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared_games = Arc::new(Mutex::new(Vec::new()));
    let games_for_watcher = Arc::clone(&shared_games);

    tauri::Builder::default()
        .manage(AppState { games_list: shared_games })
        .invoke_handler(tauri::generate_handler![
            toggle_main_window, 
            hide_main_window, 
            maximize_main_window,
            get_system_stats,
            save_settings,
            get_settings
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            let config_dir = handle.path().app_config_dir().unwrap();
            let file_path = config_dir.join("settings.json");
            if file_path.exists() {
                if let Ok(content) = fs::read_to_string(&file_path) {
                    if let Ok(loaded_settings) = serde_json::from_str::<AppSettings>(&content) {
                        let state = handle.state::<AppState>();
                        let mut list = state.games_list.lock().unwrap();
                        *list = loaded_settings.games;
                        println!("Settings loaded from: {:?}", file_path);
                    }
                }
            }

            if let Some(floater) = app.get_webview_window("floater") {
                if let Ok(Some(monitor)) = floater.current_monitor() {
                    let screen_size = monitor.size();
                    let scale_factor = monitor.scale_factor();
                    let x = (screen_size.width as f64 / scale_factor) - 140.0;
                    let y = (screen_size.height as f64 / scale_factor) - 180.0; 
                    let _ = floater.set_position(LogicalPosition::new(x, y));
                }
            }

            thread::spawn(move || {
                let mut sys = System::new_all();
                loop {
                    sys.refresh_processes(ProcessesToUpdate::All, true);
                    
                    let current_games = games_for_watcher.lock().unwrap();
                    let game_running = sys.processes().values().any(|p| {
                        let name = p.name().to_string_lossy().to_lowercase();
                        current_games.iter().any(|g| name.contains(&g.to_lowercase()))
                    });
                    drop(current_games); 

                    if let Some(floater) = handle.get_webview_window("floater") {
                        let main_visible = handle.get_webview_window("main")
                            .map(|m| m.is_visible().unwrap_or(false))
                            .unwrap_or(false);

                        if game_running || main_visible {
                            let _ = floater.hide();
                        } else {
                            let _ = floater.show();
                        }
                    }
                    thread::sleep(Duration::from_secs(3));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}