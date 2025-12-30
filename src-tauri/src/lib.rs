use serde::{Deserialize, Serialize};
use tauri::Manager;
use indexmap::IndexMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use walkdir::WalkDir;

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
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub categories: IndexMap<String, Vec<String>>,
    #[serde(default)]
    pub category_order: Vec<String>,
}

fn get_app_path() -> Option<PathBuf> {
    std::env::current_exe().ok()
}

#[cfg(target_os = "macos")]
fn get_app_bundle_path() -> Option<PathBuf> {
    // SkillManager.app/Contents/MacOS/app → SkillManager.app
    get_app_path()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))  // MacOS/
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))  // Contents/
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))  // SkillManager.app/
}

#[cfg(target_os = "windows")]
fn get_app_bundle_path() -> Option<PathBuf> {
    // Windows: exe のあるディレクトリ
    get_app_path()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn get_app_bundle_path() -> Option<PathBuf> {
    get_app_path()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
}

fn get_base_dir() -> Option<PathBuf> {
    #[cfg(target_os = "macos")]
    {
        // macOS: SkillManager.app の親ディレクトリ（.claude/を期待）
        get_app_bundle_path()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
    }
    #[cfg(target_os = "windows")]
    {
        // Windows: exe のあるディレクトリ自体が .claude/
        get_app_bundle_path()
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        get_app_bundle_path()
    }
}

fn is_in_claude_dir() -> bool {
    get_base_dir()
        .map(|p| p.file_name().map(|n| n == ".claude" || n == ".codex").unwrap_or(false))
        .unwrap_or(false)
}

fn get_agent_type_internal() -> String {
    get_base_dir()
        .and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_string()))
        .map(|name| match name.as_str() {
            ".claude" => "claude".to_string(),
            ".codex" => "codex".to_string(),
            _ => "none".to_string(),
        })
        .unwrap_or_else(|| "none".to_string())
}

#[tauri::command]
fn get_agent_type() -> String {
    get_agent_type_internal()
}

#[tauri::command]
fn get_available_agents() -> Vec<String> {
    let mut available = Vec::new();

    if let Some(base_dir) = get_base_dir() {
        if let Some(project_root) = base_dir.parent() {
            if project_root.join(".claude").exists() {
                available.push("claude".to_string());
            }
            if project_root.join(".codex").exists() {
                available.push("codex".to_string());
            }
        }
    }

    available
}

#[tauri::command]
fn switch_agent_type(target: String) -> Result<(), String> {
    let current_type = get_agent_type_internal();
    if current_type == target {
        return Ok(());
    }

    let target_dir_name = match target.as_str() {
        "claude" => ".claude",
        "codex" => ".codex",
        _ => return Err("Invalid target type".to_string()),
    };

    // 現在のベースディレクトリの親（プロジェクトルート）を取得
    let base_dir = get_base_dir().ok_or("Could not get base directory")?;
    let project_root = base_dir.parent().ok_or("Could not get project root")?;
    let target_dir = project_root.join(target_dir_name);

    // ターゲットディレクトリを作成
    fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    #[cfg(target_os = "macos")]
    {
        let app_bundle = get_app_bundle_path().ok_or("Could not find app bundle")?;
        let app_name = app_bundle.file_name().ok_or("Could not get app name")?;
        let target_app = target_dir.join(app_name);

        if target_app.exists() {
            fs::remove_dir_all(&target_app).map_err(|e| format!("Failed to remove existing app: {}", e))?;
        }

        copy_dir_all(&app_bundle, &target_app).map_err(|e| format!("Failed to copy app: {}", e))?;

        Command::new("open")
            .arg(&target_app)
            .spawn()
            .map_err(|e| format!("Failed to launch app: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        let exe_path = get_app_path().ok_or("Could not find exe path")?;
        let exe_name = exe_path.file_name().ok_or("Could not get exe name")?;
        let target_exe = target_dir.join(exe_name);

        if target_exe.exists() {
            fs::remove_file(&target_exe).map_err(|e| format!("Failed to remove existing exe: {}", e))?;
        }

        fs::copy(&exe_path, &target_exe).map_err(|e| format!("Failed to copy exe: {}", e))?;

        Command::new(&target_exe)
            .spawn()
            .map_err(|e| format!("Failed to launch app: {}", e))?;
    }

    Ok(())
}

fn get_config_path() -> Option<PathBuf> {
    get_base_dir().map(|p| p.join("skillsmanager-config.json"))
}

fn get_skills_dir() -> Option<PathBuf> {
    get_base_dir().map(|p| p.join("skills"))
}

fn get_disabled_skills_dir() -> Option<PathBuf> {
    get_base_dir().map(|p| p.join("disabled-skills"))
}

#[tauri::command]
fn check_setup() -> Result<bool, String> {
    // .claudeディレクトリ内にいるかチェック
    Ok(is_in_claude_dir())
}

#[tauri::command]
fn get_current_project_path() -> Option<String> {
    if is_in_claude_dir() {
        get_base_dir()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .map(|p| p.to_string_lossy().to_string())
    } else {
        None
    }
}

#[tauri::command]
fn copy_app_to_project(project_path: String) -> Result<(), String> {
    let target_dir = PathBuf::from(&project_path).join(".claude");

    // .claudeディレクトリを作成
    fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create .claude directory: {}", e))?;

    #[cfg(target_os = "macos")]
    {
        // macOS: .appバンドルをコピー
        let app_bundle = get_app_bundle_path().ok_or("Could not find app bundle")?;
        let app_name = app_bundle.file_name().ok_or("Could not get app name")?;
        let target_app = target_dir.join(app_name);

        if target_app.exists() {
            fs::remove_dir_all(&target_app).map_err(|e| format!("Failed to remove existing app: {}", e))?;
        }

        copy_dir_all(&app_bundle, &target_app).map_err(|e| format!("Failed to copy app: {}", e))?;

        Command::new("open")
            .arg(&target_app)
            .spawn()
            .map_err(|e| format!("Failed to launch app: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        // Windows: exeファイルをコピー
        let exe_path = get_app_path().ok_or("Could not find exe path")?;
        let exe_name = exe_path.file_name().ok_or("Could not get exe name")?;
        let target_exe = target_dir.join(exe_name);

        if target_exe.exists() {
            fs::remove_file(&target_exe).map_err(|e| format!("Failed to remove existing exe: {}", e))?;
        }

        fs::copy(&exe_path, &target_exe).map_err(|e| format!("Failed to copy exe: {}", e))?;

        Command::new(&target_exe)
            .spawn()
            .map_err(|e| format!("Failed to launch app: {}", e))?;
    }

    Ok(())
}

fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn parse_skill_description(content: &str) -> String {
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("description:") {
            return trimmed.strip_prefix("description:").unwrap_or("").trim().trim_matches('"').to_string();
        }
    }

    for line in content.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() && !trimmed.starts_with('#') && !trimmed.starts_with("---") {
            return trimmed.chars().take(100).collect();
        }
    }

    "No description".to_string()
}

#[tauri::command]
fn load_skills() -> Result<Vec<Skill>, String> {
    let skills_dir = get_skills_dir().ok_or("Not in a valid project")?;
    let disabled_dir = get_disabled_skills_dir().ok_or("Not in a valid project")?;

    // skillsディレクトリがなければ作成
    if !skills_dir.exists() {
        fs::create_dir_all(&skills_dir).map_err(|e| format!("Failed to create skills directory: {}", e))?;
    }

    let mut skills = Vec::new();

    let get_skill_files = |skill_dir: &std::path::Path| -> Vec<SkillFile> {
        let mut files = Vec::new();
        if let Ok(entries) = fs::read_dir(skill_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();
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
            match (a.is_directory, b.is_directory) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.name.cmp(&b.name),
            }
        });
        files
    };

    let load_from_dir = |dir: &PathBuf, enabled: bool, skills: &mut Vec<Skill>| {
        if !dir.exists() {
            return;
        }
        for entry in WalkDir::new(dir)
            .max_depth(2)
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

    load_from_dir(&skills_dir, true, &mut skills);
    load_from_dir(&disabled_dir, false, &mut skills);
    skills.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(skills)
}

#[tauri::command]
fn toggle_skill(skill_name: String, enabled: bool) -> Result<(), String> {
    let skills_dir = get_skills_dir().ok_or("Not in a valid project")?;
    let disabled_dir = get_disabled_skills_dir().ok_or("Not in a valid project")?;

    if !skills_dir.exists() {
        fs::create_dir_all(&skills_dir).map_err(|e| e.to_string())?;
    }
    if !disabled_dir.exists() {
        fs::create_dir_all(&disabled_dir).map_err(|e| e.to_string())?;
    }

    let (src, dst) = if enabled {
        (disabled_dir.join(&skill_name), skills_dir.join(&skill_name))
    } else {
        (skills_dir.join(&skill_name), disabled_dir.join(&skill_name))
    };

    if src.exists() {
        fs::rename(&src, &dst).map_err(|e| format!("Failed to move skill: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
fn load_config() -> Result<Config, String> {
    let path = get_config_path().ok_or("Not in a valid project")?;

    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(mut config) = serde_json::from_str::<Config>(&content) {
                // category_orderが空なら、categoriesのキー順で初期化
                if config.category_order.is_empty() {
                    config.category_order = config.categories.keys().cloned().collect();
                }
                return Ok(config);
            }
        }
    }

    let mut categories = IndexMap::new();
    categories.insert("未分類".to_string(), Vec::new());
    let category_order = vec!["未分類".to_string()];
    let default_config = Config { categories, category_order };

    if let Ok(json) = serde_json::to_string_pretty(&default_config) {
        let _ = fs::write(&path, json);
    }

    Ok(default_config)
}

#[tauri::command]
fn save_config(config: Config) -> Result<(), String> {
    let path = get_config_path().ok_or("Not in a valid project")?;
    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn copy_skill_to_other_agent(skill_name: String, enabled: bool) -> Result<(), String> {
    let base_dir = get_base_dir().ok_or("Not in a valid project")?;
    let project_root = base_dir.parent().ok_or("Could not get project root")?;

    let current_type = get_agent_type_internal();
    let target_dir_name = match current_type.as_str() {
        "claude" => ".codex",
        "codex" => ".claude",
        _ => return Err("Invalid agent type".to_string()),
    };

    let target_agent_dir = project_root.join(target_dir_name);

    // ターゲットのエージェントディレクトリが存在するかチェック
    if !target_agent_dir.exists() {
        return Err(format!("{}ディレクトリが存在しません", target_dir_name));
    }

    // コピー元のパスを決定（有効/無効に応じて）
    let src_dir = if enabled {
        base_dir.join("skills").join(&skill_name)
    } else {
        base_dir.join("disabled-skills").join(&skill_name)
    };

    if !src_dir.exists() {
        return Err("スキルフォルダが見つかりません".to_string());
    }

    // コピー先のskillsディレクトリを作成（なければ）
    let target_skills_dir = target_agent_dir.join("skills");
    if !target_skills_dir.exists() {
        fs::create_dir_all(&target_skills_dir).map_err(|e| format!("Failed to create skills directory: {}", e))?;
    }

    let target_skill_dir = target_skills_dir.join(&skill_name);

    // 同名フォルダが存在するかチェック
    if target_skill_dir.exists() {
        return Err(format!("{}に同名のスキル「{}」が既に存在します", target_dir_name, skill_name));
    }

    // disabled-skillsにも存在するかチェック
    let target_disabled_dir = target_agent_dir.join("disabled-skills").join(&skill_name);
    if target_disabled_dir.exists() {
        return Err(format!("{}に同名のスキル「{}」が既に存在します（無効状態）", target_dir_name, skill_name));
    }

    // コピー実行
    copy_dir_all(&src_dir, &target_skill_dir).map_err(|e| format!("Failed to copy skill: {}", e))?;

    Ok(())
}

#[tauri::command]
fn can_show_command_button() -> bool {
    // .claudeの時のみ、かつskillsmanager.mdが存在しない場合のみtrue
    let agent_type = get_agent_type_internal();
    if agent_type != "claude" {
        return false;
    }

    if let Some(base_dir) = get_base_dir() {
        let md_path = base_dir.join("commands").join("skillsmanager.md");
        return !md_path.exists();
    }

    false
}

#[tauri::command]
fn copy_app_to_commands() -> Result<(), String> {
    let base_dir = get_base_dir().ok_or("Not in a valid project")?;
    let commands_dir = base_dir.join("commands");

    // commandsフォルダがなければ作成
    if !commands_dir.exists() {
        fs::create_dir_all(&commands_dir).map_err(|e| format!("Failed to create commands directory: {}", e))?;
    }

    // OS別のコマンドファイルを作成
    #[cfg(target_os = "macos")]
    let md_content = r#"---
description: Skills Managerアプリを起動
allowed-tools: Bash(open:*)
---

Skills Managerアプリケーションを起動:

!`open .claude/skillsmanager.app`

起動のみ行う。それ以外の操作は不要。終了する。
"#;

    #[cfg(target_os = "windows")]
    let md_content = r#"---
description: Skills Managerアプリを起動
allowed-tools: Bash(powershell:*)
---

Skills Managerアプリケーションを起動:

!`powershell -Command "Start-Process -FilePath '.\.claude\skillsmanager.exe'"`

起動のみ行う。それ以外の操作は不要。終了する。
"#;

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let md_content = r#"---
description: Skills Managerアプリを起動
---

Skills Managerアプリケーションを起動してください。

起動のみ行う。それ以外の操作は不要。終了する。
"#;

    fs::write(commands_dir.join("skillsmanager.md"), md_content)
        .map_err(|e| format!("Failed to create command file: {}", e))?;

    Ok(())
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
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 既存のウィンドウにフォーカス
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
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
            check_setup,
            get_current_project_path,
            copy_app_to_project,
            get_agent_type,
            get_available_agents,
            switch_agent_type,
            copy_skill_to_other_agent,
            can_show_command_button,
            copy_app_to_commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
