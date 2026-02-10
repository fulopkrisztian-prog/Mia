use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use sysinfo::System;

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

pub struct AppState {
    pub games_list: Arc<Mutex<Vec<String>>>,
    pub sys: Arc<Mutex<System>>,
}