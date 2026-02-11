use tauri::State;
use crate::state::{AppState, MiaModel};
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{LlamaModel, AddBos};
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::sampling::LlamaSampler;
use llama_cpp_2::LlamaModelLoadError;
use std::path::PathBuf;
use std::num::NonZeroU32;

#[tauri::command]
pub async fn ask_mia(message: String, state: State<'_, AppState>) -> Result<String, String> {
    let brain_lock = state.mia_brain.lock().unwrap();
    let brain = brain_lock.as_ref().ok_or("Mia agya nincs betöltve!")?;

    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(512)); 

    let mut ctx = brain.model.new_context(&state.backend, ctx_params)
        .map_err(|e| format!("Kontextus hiba: {}", e))?;

    let prompt = format!("<|im_start|>system\nTe Mia vagy.<|im_end|>\n<|im_start|>user\n{}<|im_end|>\n<|im_start|>assistant\n", message);
    let tokens = brain.model.str_to_token(&prompt, AddBos::Never)
        .map_err(|e| format!("Tokenizálási hiba: {}", e))?;

    let mut batch = LlamaBatch::new(512, 1);
    for (i, token) in tokens.iter().enumerate() {
        let _ = batch.add(*token, i as i32, &[0], i == tokens.len() - 1);
    }
    ctx.decode(&mut batch).map_err(|e| format!("Decode hiba: {}", e))?;

    let mut sampler = LlamaSampler::greedy();

    let mut response = String::new();
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut n_cur = tokens.len() as i32;

    let mut token = sampler.sample(&ctx, batch.n_tokens() - 1);

    for _ in 0..200 {
        if brain.model.is_eog_token(token) { break; }

        let piece = brain.model.token_to_piece(token, &mut decoder, false, None)
            .map_err(|e| e.to_string())?;
        response.push_str(&piece);

        batch.clear();
        batch.add(token, n_cur, &[0], true).map_err(|e| format!("Batch add hiba: {}", e))?;
        ctx.decode(&mut batch).map_err(|e| format!("Generálási hiba: {}", e))?;
        
        token = sampler.sample(&ctx, 0);
        n_cur += 1;
    }

    Ok(response.trim().to_string())
}

#[tauri::command]
pub async fn load_mia(state: State<'_, AppState>) -> Result<(), String> {
    let mut brain = state.mia_brain.lock().unwrap();
    if brain.is_some() { return Ok(()); }

    let model_path = PathBuf::from("models/mia-brain-q4.gguf");
    let model_params = LlamaModelParams::default().with_n_gpu_layers(25); 

    let model = LlamaModel::load_from_file(&state.backend, &model_path, &model_params)
        .map_err(|e: LlamaModelLoadError| e.to_string())?;

    *brain = Some(MiaModel { model });
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