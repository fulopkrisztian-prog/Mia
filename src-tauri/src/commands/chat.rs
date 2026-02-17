use crate::state::{AppState, MiaModel, ChatMessage, MiaMode, WebSource};
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;
use std::num::NonZeroU32;
use std::path::PathBuf;
use tauri::{Manager, State, Emitter};
use serde::Serialize;
use uuid::Uuid;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use std::collections::HashMap;
use std::fs;
use scraper::{Html, Selector};
use std::path::Path;
use pdf_extract::extract_text;
use dotext::*;
use std::io::Read;

#[derive(Serialize)]
pub struct MiaResponse {
    pub content: String,
    pub tokens: i32,
    pub speed: f32,
    pub sources: Vec<WebSource>,
}

#[derive(Serialize)]
pub struct ChatEntry {
    pub id: String,
    pub name: String,
    pub last_active: u64,
}

fn get_now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64
}

fn save_chats_to_disk(handle: &tauri::AppHandle, chats: &HashMap<String, Vec<ChatMessage>>) -> Result<(), String> {
    let app_dir = handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    let file_path = app_dir.join("chats_history.json");
    let json = serde_json::to_string_pretty(chats).map_err(|e| e.to_string())?;
    fs::write(file_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

async fn fetch_web_results(query: &str) -> (String, Vec<WebSource>) {
    let mut sources = Vec::new();
    let client = match reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build() {
            Ok(c) => c,
            Err(_) => return ("Search failed to initialize.".into(), Vec::new()),
        };

    let url = format!("https://html.duckduckgo.com/html/?q={}", query);
    let res = match client.get(url).send().await {
        Ok(r) => r,
        Err(_) => return ("Failed to connect to search engine.".into(), Vec::new()),
    };

    let html_content = res.text().await.unwrap_or_default();
    let document = Html::parse_document(&html_content);
    let result_selector = Selector::parse(".result__body").unwrap();
    let title_selector = Selector::parse(".result__a").unwrap();
    let snippet_selector = Selector::parse(".result__snippet").unwrap();

    let mut search_context = String::from("\nWeb Search Data (Current Date: 2026):\n");

    for result in document.select(&result_selector).take(5) {
        let title_el = result.select(&title_selector).next();
        let snippet_el = result.select(&snippet_selector).next();

        if let (Some(t_el), Some(s_el)) = (title_el, snippet_el) {
            let title = t_el.text().collect::<String>();
            let snippet = s_el.text().collect::<String>();
            let raw_url = t_el.value().attr("href").unwrap_or_default();

            if !title.is_empty() && !raw_url.is_empty() {
                let clean_url = if raw_url.starts_with("//") { 
                    format!("https:{}", raw_url) 
                } else if raw_url.contains("http") {
                    raw_url.to_string()
                } else {
                    format!("https://duckduckgo.com{}", raw_url)
                };

                sources.push(WebSource { 
                    title: title.clone(), 
                    url: clean_url.clone() 
                });
                
                search_context.push_str(&format!("- Source: {}\n  Content: {}\n\n", title, snippet));
            }
        }
    }

    if sources.is_empty() {
        println!("DEBUG: No sources found in HTML!");
        (String::from("No search results found on the web."), Vec::new())
    } else {
        (search_context, sources)
    }
}

fn get_settings_for_mode(content: &str, current_mode: &MiaMode) -> (String, f32) {
    let mut final_mode = current_mode.clone();

    if final_mode == MiaMode::Auto {
        let philo_keywords = vec!["miért", "élet", "halál", "értelem", "világ", "létezés", "igazság", "filozófia"];
        let lower_content = content.to_lowercase();
        if philo_keywords.iter().any(|&k| lower_content.contains(k)) {
            final_mode = MiaMode::Philosophy;
        }
    }

    match final_mode {
        MiaMode::Philosophy => (
            "You are Mia, in Philosopher Mode. Provide deep existential insights. Use poetic, serious language and challenge the user's perspective.".to_string(),
            1.25
        ),
        MiaMode::Search => (
            "You are Mia, a Fact-Checking Assistant. Answer using the provided web context accurately. \
             DO NOT include URLs or links in your response text. Provide ONLY the information. \
             The sources will be displayed as separate buttons by the system.".to_string(),
            0.3
        ),
        _ => (
            "You are Mia, a cute and smart AI assistant. Your goal is to be helpful and kind. Use a friendly tone and emojis.".to_string(),
            0.75
        ),
    }
}

#[tauri::command]
pub async fn set_mia_mode(mode: MiaMode, state: State<'_, AppState>) -> Result<(), String> {
    let mut current_mode = state.current_mode.lock().unwrap();
    *current_mode = mode;
    Ok(())
}

#[tauri::command]
pub async fn create_new_chat(handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let new_id = Uuid::new_v4().to_string();
    let mut chats = state.chats.lock().unwrap();
    
    chats.insert(new_id.clone(), vec![ChatMessage {
        role: "assistant".into(),
        content: "Hi! I'm Mia. How can I help you today?".into(),
        timestamp: get_now(),
        sources: None,
    }]);
    
    let mut active_id = state.active_chat_id.lock().unwrap();
    *active_id = new_id.clone();
    
    save_chats_to_disk(&handle, &chats)?;
    Ok(new_id)
}

#[tauri::command]
pub async fn get_all_chats(state: State<'_, AppState>) -> Result<Vec<ChatEntry>, String> {
    let chats = state.chats.lock().unwrap();
    let mut entries: Vec<ChatEntry> = Vec::new();
    
    for (id, history) in chats.iter() {
        let last_msg = history.last();
        let name = history.iter().find(|m| m.role == "user").or(history.first())
            .map(|m| {
                let mut s = m.content.chars().take(25).collect::<String>();
                if m.content.len() > 25 { s.push_str("..."); }
                s
            }).unwrap_or_else(|| "New conversation".to_string());

        entries.push(ChatEntry { id: id.clone(), name, last_active: history.last().map(|m| m.timestamp).unwrap_or(0) });
    }
    entries.sort_by(|a, b| b.last_active.cmp(&a.last_active));
    Ok(entries)
}

#[tauri::command]
pub async fn switch_chat(chat_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let chats = state.chats.lock().unwrap();
    if !chats.contains_key(&chat_id) { return Err("Chat not found".into()); }
    let mut active_id = state.active_chat_id.lock().unwrap();
    *active_id = chat_id;
    Ok(())
}

#[tauri::command]
pub async fn ask_mia(handle: tauri::AppHandle, message: String, state: State<'_, AppState>) -> Result<MiaResponse, String> {
    let chat_id = state.active_chat_id.lock().unwrap().clone();
    if chat_id.is_empty() { return Err("No active chat!".into()); }

    let user_mode = state.current_mode.lock().unwrap().clone();

    let (search_context, web_sources) = if user_mode == MiaMode::Search {
        println!(">>> Mia is searching the web for: {}", message);
        fetch_web_results(&message).await
    } else {
        (String::new(), Vec::new())
    };

    let (system_msg, temperature) = get_settings_for_mode(&message, &user_mode);

    {
        let mut chats = state.chats.lock().unwrap();
        let history = chats.entry(chat_id.clone()).or_insert(Vec::new());
        history.push(ChatMessage { role: "user".into(), content: message.clone(), timestamp: get_now(), sources: None });
        if history.len() > 15 { history.remove(0); }
    }

    let brain_lock = state.mia_brain.lock().unwrap();
    let brain = brain_lock.as_ref().ok_or("Mia's brain is not loaded!")?;

    let ctx_params = LlamaContextParams::default().with_n_ctx(NonZeroU32::new(2048));
    let mut ctx = brain.model.new_context(&state.backend, ctx_params).map_err(|e| e.to_string())?;

    let mut prompt = format!("<|im_start|>system\n{}{}<|im_end|>\n", system_msg, search_context);
    {
        let chats = state.chats.lock().unwrap();
        if let Some(history) = chats.get(&chat_id) {
            for msg in history.iter() {
                prompt.push_str(&format!("<|im_start|>{}\n{}<|im_end|>\n", msg.role, msg.content));
            }
        }
    }
    prompt.push_str("<|im_start|>assistant\n");

    let tokens = brain.model.str_to_token(&prompt, AddBos::Never).map_err(|e| e.to_string())?;
    let mut batch = LlamaBatch::new(2048, 1);
    for (i, token) in tokens.iter().enumerate() {
        let _ = batch.add(*token, i as i32, &[0], i == tokens.len() - 1);
    }
    ctx.decode(&mut batch).map_err(|e| e.to_string())?;

    let start_time = Instant::now();
    let mut generated_tokens = 0;
    let seed: u32 = rand::random();

    let mut sampler = LlamaSampler::chain(vec![
        LlamaSampler::temp(temperature),
        LlamaSampler::top_k(40),
        LlamaSampler::top_p(0.95, 1),
        LlamaSampler::dist(seed),
    ], false);

    let mut response = String::new();
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut n_cur = tokens.len() as i32;
    let mut token = sampler.sample(&ctx, batch.n_tokens() - 1);

    for _ in 0..512 {
        if brain.model.is_eog_token(token) { break; }
        let piece = brain.model.token_to_piece(token, &mut decoder, false, None).map_err(|e| e.to_string())?;
        response.push_str(&piece);

        batch.clear();
        batch.add(token, n_cur, &[0], true).map_err(|e| e.to_string())?;
        ctx.decode(&mut batch).map_err(|e| e.to_string())?;
        token = sampler.sample(&ctx, 0);
        n_cur += 1;
        generated_tokens += 1;
    }

    let duration = start_time.elapsed();
    let tps = if duration.as_secs_f32() > 0.0 { generated_tokens as f32 / duration.as_secs_f32() } else { 0.0 };

    let final_resp = response.trim().to_string();
    
    {
        let mut chats = state.chats.lock().unwrap();
        if let Some(history) = chats.get_mut(&chat_id) {
            history.push(ChatMessage { 
                role: "assistant".into(), 
                content: final_resp.clone(), 
                timestamp: get_now(),
                sources: if web_sources.is_empty() { None } else { Some(web_sources.clone()) } 
            });
        }
        save_chats_to_disk(&handle, &chats)?;
    }

    Ok(MiaResponse { 
        content: final_resp, 
        tokens: generated_tokens, 
        speed: tps, 
        sources: web_sources 
    })
}

#[tauri::command]
pub async fn load_mia(handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let mut brain = state.mia_brain.lock().unwrap();
    if brain.is_some() { return Ok(()); }
    let _ = handle.emit("mia-loading-status", true);
    let model_path = PathBuf::from("models/mia-brain-q4.gguf");
    let model = LlamaModel::load_from_file(&state.backend, &model_path, &LlamaModelParams::default().with_n_gpu_layers(25)).map_err(|e| e.to_string())?;
    *brain = Some(MiaModel { model });
    let _ = handle.emit("mia-loading-status", false);
    Ok(())
}

#[tauri::command]
pub async fn unload_mia(state: State<'_, AppState>) -> Result<(), String> {
    let mut brain = state.mia_brain.lock().unwrap();
    *brain = None;
    Ok(())
}

#[tauri::command]
pub async fn get_chat_history(chat_id: String, state: State<'_, AppState>) -> Result<Vec<ChatMessage>, String> {
    let chats = state.chats.lock().unwrap();
    Ok(chats.get(&chat_id).cloned().unwrap_or_default())
}

#[tauri::command]
pub async fn delete_chat(chat_id: String, handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let mut chats = state.chats.lock().unwrap();
    chats.remove(&chat_id);
    let mut active_id = state.active_chat_id.lock().unwrap();
    if *active_id == chat_id {
        *active_id = chats.keys().next().cloned().unwrap_or_default();
    }
    save_chats_to_disk(&handle, &chats)?;
    Ok(())
}

#[tauri::command]
pub async fn upload_file(path: String) -> Result<String, String> {
    let path_obj = Path::new(&path);
    let file_name = path_obj.file_name().unwrap_or_default().to_string_lossy();
    let extension = path_obj.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    let content = match extension.as_str() {
        "txt" | "md" | "rs" | "js" | "py" | "json" | "html" | "css" | "cpp" | "h" => {
            fs::read_to_string(&path).map_err(|e| format!("Szöveges hiba: {}", e))?
        },
        "pdf" => {
            extract_text(&path).map_err(|e| format!("PDF hiba: {}", e))?
        },
        "docx" => {
            let mut docx = Docx::open(&path).map_err(|e| format!("Word hiba: {}", e))?;
            let mut txt = String::new();
            docx.read_to_string(&mut txt).map_err(|e| format!("Word olvasási hiba: {}", e))?;
            txt
        },
        _ => return Err(format!("A(z) .{} formátumot még nem tanítottad meg nekem!", extension)),
    };

    Ok(format!("\n[DOKUMENTUM: {}]\n{}\n[DOKUMENTUM VÉGE]", file_name, content))
}