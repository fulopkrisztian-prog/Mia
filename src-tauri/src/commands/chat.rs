use crate::state::{AppState, MiaModel, ChatMessage};
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;
use llama_cpp_2::LlamaModelLoadError;
use std::num::NonZeroU32;
use std::path::PathBuf;
use tauri::{Manager, State};
use serde::Serialize;

#[derive(Serialize)]
pub struct MiaResponse{
    pub content: String,
    pub tokens: i32,
    pub speed: f32,
}

#[tauri::command]
pub async fn ask_mia(message: String, state: State<'_, AppState>) -> Result<MiaResponse, String> {
    {
        let mut history = state.history.lock().unwrap();
        history.push(ChatMessage { role: "user".into(), content: message.clone() });
        
        if history.len() > 20 { history.remove(0); }
    }

    let brain_lock = state.mia_brain.lock().unwrap();
    let brain = brain_lock.as_ref().ok_or("Mia agya nincs betöltve!")?;

    let ctx_params = LlamaContextParams::default().with_n_ctx(NonZeroU32::new(2048));
    let mut ctx = brain.model.new_context(&state.backend, ctx_params).map_err(|e| e.to_string())?;

    let mut prompt = String::from("<|im_start|>system\nTe Mia vagy, egy cuki és okos AI asszisztens.<|im_end|>\n");
    
    {
        let history = state.history.lock().unwrap();
        for msg in history.iter() {
            prompt.push_str(&format!("<|im_start|>{}\n{}<|im_end|>\n", msg.role, msg.content));
        }
    }
    prompt.push_str("<|im_start|>assistant\n");

    let tokens = brain.model.str_to_token(&prompt, AddBos::Never).map_err(|e| e.to_string())?;
    let mut batch = LlamaBatch::new(2048, 1);
    for (i, token) in tokens.iter().enumerate() {
        let _ = batch.add(*token, i as i32, &[0], i == tokens.len() - 1);
    }
    ctx.decode(&mut batch).map_err(|e| e.to_string())?;

    let start_time = std::time::Instant::now();
    let mut generated_tokens = 0;
    let seed: u32 = rand::random();

    let mut sampler = LlamaSampler::chain(vec![
        LlamaSampler::temp(0.8),
        LlamaSampler::top_k(40),
        LlamaSampler::top_p(0.95, 1),
        LlamaSampler::dist(seed),
    ], false, );

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
    let secs = duration.as_secs_f32();
    let speed = if secs > 0.0 { generated_tokens as f32 / secs } else { 0.0 };

    let final_resp = response.trim().to_string();
    {
        let mut history = state.history.lock().unwrap();
        history.push(ChatMessage { role: "assistant".into(), content: final_resp.clone() });
    }

    Ok(MiaResponse{
        content: final_resp,
        tokens: generated_tokens,
        speed,
    })
}

use tauri::Emitter;

#[tauri::command]
pub async fn load_mia(handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    if let Some(floater) = handle.get_webview_window("floater") {
        let _ = floater.emit("mia-loading-status", true);
    }

    let mut brain = state.mia_brain.lock().unwrap();

    if brain.is_some() {
        if let Some(floater) = handle.get_webview_window("floater") {
            let _ = floater.emit("mia-loading-status", false);
        }
        return Ok(());
    }

    let _ = handle.emit("mia-loading-status", true);

    let model_path = PathBuf::from("models/mia-brain-q4.gguf");

    let model_params = LlamaModelParams::default().with_n_gpu_layers(25);

    let model = LlamaModel::load_from_file(&state.backend, &model_path, &model_params).map_err(
        |e: LlamaModelLoadError| {
            let _ = handle.emit("mia-loading-status", false);
            e.to_string()
        },
    )?;

    *brain = Some(MiaModel { model });

    if let Some(floater) = handle.get_webview_window("floater") {
        let _ = floater.emit("mia-loading-status", false);
    }

    println!(">>> Mia agya online (RTX 3050 aktív, ctx: 512)");
    Ok(())
}

#[tauri::command]
pub async fn unload_mia(state: State<'_, AppState>) -> Result<(), String> {
    let mut brain = state.mia_brain.lock().unwrap();
    *brain = None;
    println!("Mia elment pihenni, VRAM felszabadítva.");
    Ok(())
}
