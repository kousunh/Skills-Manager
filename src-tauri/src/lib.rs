use serde::{Deserialize, Serialize};
use indexmap::IndexMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use walkdir::WalkDir;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillFile {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub enabled: bool,
    pub content: String,
    pub path: String,
    pub files: Vec<SkillFile>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Config {
    pub categories: IndexMap<String, Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppSettings {
    pub project_path: Option<String>,
}

pub struct AppState {
    pub settings: Mutex<AppSettings>,
}

fn get_settings_path() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("skill-manager")
        .join("settings.json")
}

fn load_settings() -> AppSettings {
    let path = get_settings_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(settings) = serde_json::from_str(&content) {
                return settings;
            }
        }
    }
    AppSettings::default()
}

fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = get_settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn get_base_dir(state: &State<AppState>) -> Option<PathBuf> {
    let settings = state.settings.lock().unwrap();
    settings.project_path.as_ref().map(|p| PathBuf::from(p).join(".claude"))
}

fn get_config_path(state: &State<AppState>) -> Option<PathBuf> {
    get_base_dir(state).map(|p| p.join("skill-manager-config.json"))
}

fn get_skills_dir(state: &State<AppState>) -> Option<PathBuf> {
    get_base_dir(state).map(|p| p.join("skills"))
}

fn get_disabled_skills_dir(state: &State<AppState>) -> Option<PathBuf> {
    get_base_dir(state).map(|p| p.join("disabled-skills"))
}

#[tauri::command]
fn get_project_path(state: State<AppState>) -> Option<String> {
    let settings = state.settings.lock().unwrap();
    settings.project_path.clone()
}

#[tauri::command]
fn set_project_path(path: String, state: State<AppState>) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    settings.project_path = Some(path);
    save_settings(&settings)
}

fn parse_skill_description(content: &str) -> String {
    // Look for description in frontmatter or first paragraph
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("description:") {
            return trimmed.strip_prefix("description:").unwrap_or("").trim().trim_matches('"').to_string();
        }
    }

    // Fallback: use first non-empty, non-heading line
    for line in content.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() && !trimmed.starts_with('#') && !trimmed.starts_with("---") {
            return trimmed.chars().take(100).collect();
        }
    }

    "No description".to_string()
}

#[tauri::command]
fn load_skills(state: State<AppState>) -> Result<Vec<Skill>, String> {
    let skills_dir = get_skills_dir(&state).ok_or("Project path not set")?;
    let disabled_dir = get_disabled_skills_dir(&state).ok_or("Project path not set")?;

    let mut skills = Vec::new();

    // Helper function to get files in a skill directory
    let get_skill_files = |skill_dir: &std::path::Path| -> Vec<SkillFile> {
        let mut files = Vec::new();
        if let Ok(entries) = fs::read_dir(skill_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();
                // Skip SKILL.md as it's shown in main content
                if name == "SKILL.md" {
                    continue;
                }
                files.push(SkillFile {
                    name,
                    path: path.to_string_lossy().to_string(),
                    is_directory: path.is_dir(),
                });
            }
        }
        files.sort_by(|a, b| {
            // Directories first, then by name
            match (a.is_directory, b.is_directory) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.cmp(&b.name),
            }
        });
        files
    };

    // Helper function to load skills from a directory
    let load_from_dir = |dir: &PathBuf, enabled: bool, skills: &mut Vec<Skill>| {
        if !dir.exists() {
            return;
        }
        for entry in WalkDir::new(dir)
            .max_depth(2)  // skill-name/SKILL.md
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_name() == "SKILL.md" {
                if let Some(skill_dir) = entry.path().parent() {
                    let skill_name = skill_dir
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string();

                    let content = fs::read_to_string(entry.path()).unwrap_or_default();
                    let description = parse_skill_description(&content);
                    let files = get_skill_files(skill_dir);

                    skills.push(Skill {
                        name: skill_name,
                        description,
                        enabled,
                        content,
                        path: entry.path().to_string_lossy().to_string(),
                        files,
                    });
                }
            }
        }
    };

    // Load enabled skills
    load_from_dir(&skills_dir, true, &mut skills);

    // Load disabled skills
    load_from_dir(&disabled_dir, false, &mut skills);

    // Sort by name
    skills.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(skills)
}

#[tauri::command]
fn toggle_skill(skill_name: String, enabled: bool, state: State<AppState>) -> Result<(), String> {
    let skills_dir = get_skills_dir(&state).ok_or("Project path not set")?;
    let disabled_dir = get_disabled_skills_dir(&state).ok_or("Project path not set")?;

    // Create directories if they don't exist
    if !skills_dir.exists() {
        fs::create_dir_all(&skills_dir).map_err(|e| e.to_string())?;
    }
    if !disabled_dir.exists() {
        fs::create_dir_all(&disabled_dir).map_err(|e| e.to_string())?;
    }

    let (src, dst) = if enabled {
        // Move from disabled-skills to skills
        (disabled_dir.join(&skill_name), skills_dir.join(&skill_name))
    } else {
        // Move from skills to disabled-skills
        (skills_dir.join(&skill_name), disabled_dir.join(&skill_name))
    };

    if src.exists() {
        fs::rename(&src, &dst).map_err(|e| format!("Failed to move skill: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn load_config(state: State<AppState>) -> Result<Config, String> {
    let path = get_config_path(&state).ok_or("Project path not set")?;

    // ファイルが存在すれば読み込む
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return Ok(config);
            }
        }
    }

    // ファイルがなければデフォルトを作成して保存
    let mut categories = IndexMap::new();
    categories.insert("未分類".to_string(), Vec::new());
    let default_config = Config { categories };

    // ファイルに保存
    if let Ok(json) = serde_json::to_string_pretty(&default_config) {
        let _ = fs::write(&path, json);
    }

    Ok(default_config)
}

#[tauri::command]
fn save_config(config: Config, state: State<AppState>) -> Result<(), String> {
    let path = get_config_path(&state).ok_or("Project path not set")?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<SkillFile>, String> {
    let dir_path = PathBuf::from(&path);
    if !dir_path.is_dir() {
        return Err("Not a directory".to_string());
    }

    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir_path) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            files.push(SkillFile {
                name,
                path: path.to_string_lossy().to_string(),
                is_directory: path.is_dir(),
            });
        }
    }
    files.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    Ok(files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = load_settings();

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            settings: Mutex::new(settings),
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_skills,
            toggle_skill,
            load_config,
            save_config,
            read_file,
            write_file,
            list_directory,
            get_project_path,
            set_project_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
