use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};
use rusqlite::Connection;

// Data structures matching the database schema
#[derive(Debug, Serialize, Deserialize)]
pub struct Chapter {
    pub id: i32,
    pub name: String,
    pub order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Quest {
    pub id: i32,
    pub chapter_id: i32,
    pub name: String,
    pub q_type: String,
    pub description: String,
    pub prerequisites: String,
    pub chapter_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuestStep {
    pub id: i32,
    pub quest_id: i32,
    pub order: i32,
    pub description: String,
    pub location: Option<String>,
    pub rewards: String,
    pub image: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuestWithSteps {
    pub id: i32,
    pub chapter_id: i32,
    pub name: String,
    pub q_type: String,
    pub description: String,
    pub prerequisites: Vec<i32>,
    pub chapter_name: String,
    pub steps: Vec<QuestStep>,
}

// Database state
pub struct DbState(Mutex<Connection>);

fn get_db_path(app_handle: &tauri::AppHandle) -> std::path::PathBuf {
    // Try to get resource directory first, fallback to current dir
    app_handle
        .path()
        .resource_dir()
        .map(|p| p.join("data").join("bg3_guide.db"))
        .unwrap_or_else(|_| std::path::PathBuf::from("data/bg3_guide.db"))
}

// Tauri commands
#[tauri::command]
fn get_chapters(db: State<DbState>) -> Result<Vec<Chapter>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, `order` FROM chapters ORDER BY `order`")
        .map_err(|e| e.to_string())?;

    let chapters = stmt
        .query_map([], |row| {
            Ok(Chapter {
                id: row.get(0)?,
                name: row.get(1)?,
                order: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(chapters)
}

#[tauri::command]
fn get_quests(db: State<DbState>) -> Result<Vec<Quest>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT q.id, q.chapter_id, q.name, q.type, q.description, q.prerequisites, c.name as chapter_name
             FROM quests q
             LEFT JOIN chapters c ON q.chapter_id = c.id
             ORDER BY c.`order`, q.id"
        )
        .map_err(|e| e.to_string())?;

    let quests = stmt
        .query_map([], |row| {
            Ok(Quest {
                id: row.get(0)?,
                chapter_id: row.get(1)?,
                name: row.get(2)?,
                q_type: row.get(3)?,
                description: row.get(4)?,
                prerequisites: row.get(5)?,
                chapter_name: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(quests)
}

#[tauri::command]
fn get_quest_steps(quest_id: i32, db: State<DbState>) -> Result<Vec<QuestStep>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, quest_id, `order`, description, location, rewards, image
             FROM quest_steps
             WHERE quest_id = ?
             ORDER BY `order`"
        )
        .map_err(|e| e.to_string())?;

    let steps = stmt
        .query_map([quest_id], |row| {
            Ok(QuestStep {
                id: row.get(0)?,
                quest_id: row.get(1)?,
                order: row.get(2)?,
                description: row.get(3)?,
                location: row.get(4)?,
                rewards: row.get(5)?,
                image: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(steps)
}

#[tauri::command]
fn get_quests_with_steps(db: State<DbState>) -> Result<Vec<QuestWithSteps>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;

    // Get all quests with chapter names
    let mut quest_stmt = conn
        .prepare(
            "SELECT q.id, q.chapter_id, q.name, q.type, q.description, q.prerequisites, c.name as chapter_name
             FROM quests q
             LEFT JOIN chapters c ON q.chapter_id = c.id
             ORDER BY c.`order`, q.id"
        )
        .map_err(|e| e.to_string())?;

    let quests: Vec<(i32, i32, String, String, String, String, String)> = quest_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i32>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Get steps for each quest
    let mut result = Vec::new();
    for (id, chapter_id, name, q_type, description, prerequisites, chapter_name) in quests {
        let mut step_stmt = conn
            .prepare(
                "SELECT id, quest_id, `order`, description, location, rewards, image
                 FROM quest_steps
                 WHERE quest_id = ?
                 ORDER BY `order`"
            )
            .map_err(|e| e.to_string())?;

        let steps: Vec<QuestStep> = step_stmt
            .query_map([id], |row| {
                Ok(QuestStep {
                    id: row.get(0)?,
                    quest_id: row.get(1)?,
                    order: row.get(2)?,
                    description: row.get(3)?,
                    location: row.get(4)?,
                    rewards: row.get(5)?,
                    image: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        let prereqs: Vec<i32> = serde_json::from_str(&prerequisites).unwrap_or_default();

        result.push(QuestWithSteps {
            id,
            chapter_id,
            name,
            q_type,
            description,
            prerequisites: prereqs,
            chapter_name,
            steps,
        });
    }

    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize database connection
            let db_path = get_db_path(app.handle());
            println!("Database path: {:?}", db_path);

            let conn = Connection::open(&db_path)
                .expect("Failed to open database");

            // Store connection in state
            app.manage(DbState(Mutex::new(conn)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_chapters,
            get_quests,
            get_quest_steps,
            get_quests_with_steps
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}