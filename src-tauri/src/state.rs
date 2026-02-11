use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use sysinfo::System;
use llama_cpp_2::model::LlamaModel;
use llama_cpp_2::llama_backend::LlamaBackend;

#[derive(Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub games: Vec<String>,
    #[serde(rename = "searxngUrl")]
    pub searxng_url: String,
    #[serde(rename = "launchOnStartup")]
    pub launch_on_startup: bool,
}

pub struct MiaModel {
    pub model: LlamaModel,
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
    pub mia_brain: Arc<Mutex<Option<MiaModel>>>,
    pub backend: Arc<LlamaBackend>,
}

impl AppState {
    pub fn new() -> Self {
        let backend = LlamaBackend::init()
            .expect("Llama backend init sikertelen!");

        println!("Llama backend inicializálva");

        Self {
            games_list: Arc::new(Mutex::new(Vec::new())),
            sys: Arc::new(Mutex::new(System::new_all())),
            mia_brain: Arc::new(Mutex::new(None)),
            backend: Arc::new(backend),
        }
    }
}