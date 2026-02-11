use crate::commands::chat;
use crate::state::AppState;
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub async fn toggle_main_window(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let main = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    let floater = app
        .get_webview_window("floater")
        .ok_or("Floater window not found")?;

    if main.is_visible().unwrap_or(false) {
        // --- 1. ELREJTÉS ÉS VRAM ÜRÍTÉS ---
        main.hide().map_err(|e| e.to_string())?;
        floater.show().map_err(|e| e.to_string())?;

        // Közvetlen takarítás: nem csak None-ra állítjuk, hanem kényszerítjük a drop-ot
        let mut brain = state.mia_brain.lock().unwrap();
        if brain.is_some() {
            let old_brain = brain.take(); // Kiemeli a modellt az AppState-ből
            std::mem::drop(old_brain); // Megsemmisíti a modellt, kényszerítve a GPU ürítést

            // Jelezzük a floaternek is, hogy az AI már nincs a memóriában
            let _ = app.emit("mia-loading-status", false);
            println!(">>> Mia elrejtve: VRAM kényszerítve felszabadítva.");
        }
    } else {
        // --- 2. MEGJELENÍTÉS ÉS AI BETÖLTÉSE ---
        // Először elindítjuk a betöltést (ez küldi a 'loading: true' eseményt is)
        let _ = chat::load_mia(app.clone(), state).await;

        main.show().map_err(|e| e.to_string())?;
        main.set_focus().map_err(|e| e.to_string())?;
        floater.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn hide_main_window(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let main = app.get_webview_window("main").ok_or("Main window not found")?;
    let floater = app.get_webview_window("floater").ok_or("Floater window not found")?;

    // 1. Ablak elrejtése és floater mutatása
    main.hide().map_err(|e| e.to_string())?;
    floater.show().map_err(|e| e.to_string())?;

    // 2. KÉNYSZERÍTETT VRAM ÜRÍTÉS (Ez hiányzott!)
    let mut brain = state.mia_brain.lock().unwrap();
    if brain.is_some() {
        let old_brain = brain.take();
        std::mem::drop(old_brain);
        
        // Szólunk a frontendnek, hogy Mia "kiköltözött"
        let _ = app.emit("mia-loading-status", false);
        println!(">>> Egyedi X gomb: Mia elrejtve, VRAM kényszerítve felszabadítva.");
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
