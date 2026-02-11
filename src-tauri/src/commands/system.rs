use crate::state::AppState;
use serde_json::{json, Value};
use tauri::State;

#[tauri::command]
pub async fn get_system_stats(state: State<'_, AppState>) -> Result<Value, String> {
    let mut sys = state.sys.lock().unwrap();

    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpu_global = sys.global_cpu_usage();
    let used_mem = sys.used_memory();
    let total_mem = sys.total_memory();

    let core_loads: Vec<f32> = sys.cpus().iter().map(|cpu| cpu.cpu_usage()).collect();

    Ok(json!({
        "cpu": {
            "percentage": cpu_global,
            "cores": core_loads
        },
        "memory": {
            "percentage": (used_mem as f64 / total_mem as f64) * 100.0,
            "display": format!("{:.1} / {:.1} GB",
                used_mem as f64 / 1024.0 / 1024.0 / 1024.0,
                total_mem as f64 / 1024.0 / 1024.0 / 1024.0)
        }
    }))
}
