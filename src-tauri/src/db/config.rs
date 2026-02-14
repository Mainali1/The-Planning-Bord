use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum DbType {
    Local,
    Embedded,
    Cloud,
    Embedded,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DbConfig {
    pub db_type: DbType,
    pub connection_string: String,
}

impl DbConfig {
    pub fn load(app_dir: &PathBuf) -> Option<Self> {
        // DEV HACK: Use a different config file to simulate fresh install
        let config_path = app_dir.join("db_config_v2.json");
        if config_path.exists() {
            if let Ok(content) = fs::read_to_string(config_path) {
                return serde_json::from_str(&content).ok();
            }
        }
        None
    }

    pub fn save(&self, app_dir: &PathBuf) -> Result<(), String> {
        let config_path = app_dir.join("db_config_v2.json");
        let content = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(config_path, content).map_err(|e| e.to_string())
    }
}
