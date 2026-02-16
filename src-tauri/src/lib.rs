mod commands;
mod state;

use crate::state::{AppSettings, AppState, ChatMessage};
use llama_cpp_2::llama_backend::LlamaBackend;
use std::fs;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use sysinfo::{ProcessesToUpdate, System};
use tauri::{Emitter, LogicalPosition, Manager, WindowEvent};
use std::collections::HashMap;
use std::path::PathBuf;

fn load_chats_from_disk() -> HashMap<String, Vec<ChatMessage>> {
    let path = PathBuf::from("chats_history.json");
    if path.exists() {
        let data = fs::read_to_string(path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_else(|_| HashMap::new())
    } else {
        HashMap::new()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared_games: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
    let games_for_watcher = Arc::clone(&shared_games);

    let mut sys = System::new_all();
    sys.refresh_all();
    let system_info = Arc::new(Mutex::new(sys));

    let backend = match LlamaBackend::init() {
        Ok(b) => b,
        Err(e) => {
            eprintln!("Hiba: Nem sikerült a Vulkan inicializálása: {:?}", e);
            return;
        }
    };

    let initial_chats = load_chats_from_disk();
    let initial_active_id = initial_chats.keys().next().cloned().unwrap_or_default();

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(AppState { 
            games_list: shared_games,
            sys: system_info,
            mia_brain: Arc::new(Mutex::new(None)),
            backend: Arc::new(backend),
            history: Mutex::new(Vec::new()),
            chats: Mutex::new(initial_chats),
            active_chat_id: Mutex::new(initial_active_id)
        })
        .invoke_handler(tauri::generate_handler![
            commands::chat::ask_mia,
            commands::chat::load_mia,
            commands::chat::unload_mia,
            commands::chat::create_new_chat,
            commands::chat::get_all_chats,
            commands::chat::switch_chat,
            commands::window::toggle_main_window, 
            commands::window::hide_main_window, 
            commands::window::maximize_main_window,
            commands::system::get_system_stats,
            commands::settings::save_settings,
            commands::settings::get_settings
        ])
        .on_window_event(|window, event| {
            if window.label() == "main" {
                match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        api.prevent_close(); 
                        let _ = window.hide();
                        
                        let state = window.state::<AppState>();
                        let mut brain = state.mia_brain.lock().unwrap();
                        
                        if brain.is_some() {
                            let old_brain = brain.take();
                            std::mem::drop(old_brain); 
                            let _ = window.emit("mia-loading-status", false);
                            println!(">>> X gomb elkapva: Mia agya kényszerítve törölve, VRAM felszabadítva.");
                        }

                        if let Some(floater) = window.get_webview_window("floater") {
                            let _ = floater.show();
                        }
                    },
                    WindowEvent::Destroyed => {
                        let state = window.state::<AppState>();
                        let mut brain = state.mia_brain.lock().unwrap();
                        if brain.is_some() {
                            let _ = brain.take();
                        }
                    },
                    _ => {}
                }
            }
        })
        .setup(move |app| {
            let handle = app.handle().clone();
            
            let config_dir = handle.path().app_config_dir().unwrap();
            let file_path = config_dir.join("settings.json");
            if let Ok(content) = fs::read_to_string(&file_path) {
                if let Ok(loaded) = serde_json::from_str::<AppSettings>(&content) {
                    handle.state::<AppState>().games_list.lock().unwrap().clone_from(&loaded.games);
                }
            }

            if let Some(floater) = app.get_webview_window("floater") {
                if let Ok(Some(monitor)) = floater.current_monitor() {
                    let size = monitor.size();
                    let scale = monitor.scale_factor();
                    let x = (size.width as f64 / scale) - 140.0;
                    let y = (size.height as f64 / scale) - 180.0; 
                    let _ = floater.set_position(LogicalPosition::new(x, y));
                }
            }

            thread::spawn(move || {
                let mut watcher_sys = System::new_all();
                loop {
                    watcher_sys.refresh_processes(ProcessesToUpdate::All, true);
                    let games = games_for_watcher.lock().unwrap();
                    let is_running = watcher_sys.processes().values().any(|p| {
                        let name = p.name().to_string_lossy().to_lowercase();
                        games.iter().any(|g| name.contains(&g.to_lowercase()))
                    });
                    drop(games); 

                    if let Some(floater) = handle.get_webview_window("floater") {
                        let main_v = handle.get_webview_window("main")
                            .map(|m| m.is_visible().unwrap_or(false)).unwrap_or(false);
                        
                        if is_running || main_v { 
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