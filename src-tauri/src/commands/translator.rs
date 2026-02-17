use rust_bert::pipelines::translation::{TranslationConfig, TranslationModel, Language};
use std::sync::Mutex;
use once_cell::sync::Lazy;

static HU_EN_MODEL: Lazy<Mutex<TranslationModel>> = Lazy::new(|| {
    let config = TranslationConfig::new(Language::Hungarian, Language::English);
    Mutex::new(TranslationModel::new(config).unwrap())
});

static EN_HU_MODEL: Lazy<Mutex<TranslationModel>> = Lazy::new(|| {
    let config = TranslationConfig::new(Language::English, Language::Hungarian);
    Mutex::new(TranslationModel::new(config).unwrap())
});

pub fn translate_to_en(text: &str) -> String {
    let model = HU_EN_MODEL.lock().unwrap();
    let output = model.translate(&[text], None, Language::English);
    output[0].clone()
}

pub fn translate_to_hu(text: &str) -> String {
    let model = EN_HU_MODEL.lock().unwrap();
    let output = model.translate(&[text], None, Language::Hungarian);
    output[0].clone()
}