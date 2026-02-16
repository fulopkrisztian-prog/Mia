use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::model::LlamaModel;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use sysinfo::System;
use std::collections::HashMap;

#[derive(serde::Serialize, serde::Deserialize, Clone, PartialEq)]
pub enum MiaMode {
    Auto,
    Basic,
    Philosophy,
    Search
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: u64,
}

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
    pub history: Mutex<Vec<ChatMessage>>,
    pub chats: Mutex<HashMap<String, Vec<ChatMessage>>>,
    pub active_chat_id: Mutex<String>,
    pub current_mode: Mutex<MiaMode>
}

impl AppState {
    #[allow(dead_code)]
    pub fn new() -> Self {
        let backend = LlamaBackend::init().expect("Llama backend init sikertelen!");

        println!("Llama backend inicializálva");

        Self {
            games_list: Arc::new(Mutex::new(Vec::new())),
            sys: Arc::new(Mutex::new(System::new_all())),
            mia_brain: Arc::new(Mutex::new(None)),
            backend: Arc::new(backend),
            history: Mutex::new(Vec::new()),
            chats: Mutex::new(HashMap::new()),
            active_chat_id: Mutex::new(String::new()),
            current_mode: Mutex::new(MiaMode::Auto)
        }
    }
}