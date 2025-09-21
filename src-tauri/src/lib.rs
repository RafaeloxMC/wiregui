use futures::future::join_all;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::{fs, task};

fn matches_pattern(filename: &str, query: &str) -> bool {
    let filename_lower = filename.to_lowercase();
    let query_lower = query.to_lowercase();

    if query_lower.starts_with("*.") {
        let extension = &query_lower[1..];
        return filename_lower.ends_with(&extension);
    } else if query_lower.starts_with('.') && !query_lower.contains(' ') {
        return filename_lower.ends_with(&query_lower);
    }

    filename_lower.contains(&query_lower)
}

async fn count_directory_items_async(dir_path: &Path) -> Option<u32> {
    if !dir_path.is_dir() {
        return None;
    }

    match fs::read_dir(dir_path).await {
        Ok(mut entries) => {
            let mut count = 0;
            while let Ok(Some(_)) = entries.next_entry().await {
                count += 1;
            }
            Some(count)
        }
        Err(_) => None,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    name: String,
    path: String,
    is_directory: bool,
    size: Option<u64>,
    modified: Option<String>,
    item_count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryContents {
    current_path: String,
    entries: Vec<FileEntry>,
}

#[derive(Clone)]
struct CacheEntry {
    data: DirectoryContents,
    timestamp: Instant,
}

type DirectoryCache = Arc<Mutex<HashMap<String, CacheEntry>>>;

static CACHE_TTL: Duration = Duration::from_secs(30);

fn get_directory_cache() -> DirectoryCache {
    static CACHE: std::sync::OnceLock<DirectoryCache> = std::sync::OnceLock::new();

    CACHE
        .get_or_init(|| Arc::new(Mutex::new(HashMap::new())))
        .clone()
}

#[tauri::command]
async fn list_directory(path: String) -> Result<DirectoryContents, String> {
    let cache = get_directory_cache();

    {
        let cache_guard = cache.lock().unwrap();
        if let Some(entry) = cache_guard.get(&path) {
            if entry.timestamp.elapsed() < CACHE_TTL {
                return Ok(entry.data.clone());
            }
        }
    }

    let result = list_directory_uncached(path.clone()).await;

    if let Ok(ref contents) = result {
        let mut cache_guard = cache.lock().unwrap();
        cache_guard.insert(
            path,
            CacheEntry {
                data: contents.clone(),
                timestamp: Instant::now(),
            },
        );

        cache_guard.retain(|_, entry| entry.timestamp.elapsed() < CACHE_TTL);
    }

    result
}

async fn list_directory_uncached(path: String) -> Result<DirectoryContents, String> {
    let dir_path = Path::new(&path);

    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !dir_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut dir_entries = fs::read_dir(dir_path)
        .await
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut entry_tasks = Vec::new();

    while let Ok(Some(entry)) = dir_entries.next_entry().await {
        let task = task::spawn(async move {
            let file_path = entry.path();
            let file_name = file_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Unknown")
                .to_string();

            let metadata = entry.metadata().await.ok();
            let size = if !file_path.is_dir() {
                metadata.as_ref().map(|m| m.len())
            } else {
                None
            };

            let modified = metadata.as_ref().and_then(|m| {
                m.modified().ok().and_then(|time| {
                    use std::time::UNIX_EPOCH;
                    let duration = time.duration_since(UNIX_EPOCH).ok()?;
                    Some(format!("{}", duration.as_secs()))
                })
            });

            let item_count = if file_path.is_dir() {
                count_directory_items_async(&file_path).await
            } else {
                None
            };

            FileEntry {
                name: file_name,
                path: file_path.to_string_lossy().to_string(),
                is_directory: file_path.is_dir(),
                size,
                modified,
                item_count,
            }
        });
        entry_tasks.push(task);
    }

    let mut entries = join_all(entry_tasks)
        .await
        .into_iter()
        .filter_map(|result| result.ok())
        .collect::<Vec<_>>();

    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(DirectoryContents {
        current_path: path.clone(),
        entries,
    })
}

#[tauri::command]
async fn get_home_directory() -> Result<String, String> {
    match dirs::home_dir() {
        Some(home_path) => Ok(home_path.to_string_lossy().to_string()),
        None => Err("Failed to get home directory".to_string()),
    }
}

#[tauri::command]
async fn search_files(
    path: String,
    query: String,
    max_depth: Option<u32>,
    max_results: Option<usize>,
) -> Result<Vec<FileEntry>, String> {
    let search_path = Path::new(&path);

    if !search_path.exists() {
        return Err("Search path does not exist".to_string());
    }

    if !search_path.is_dir() {
        return Err("Search path is not a directory".to_string());
    }

    let query_lower = query.to_lowercase();
    let max_depth = max_depth.unwrap_or(100);
    let max_results = max_results.unwrap_or(500);

    let results = Arc::new(Mutex::new(Vec::new()));
    let should_stop = Arc::new(Mutex::new(false));

    search_recursive_async(
        search_path.to_path_buf(),
        query_lower,
        results.clone(),
        0,
        max_depth,
        max_results,
        should_stop,
    )
    .await?;

    let mut final_results = results.lock().unwrap().clone();

    final_results.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(final_results)
}

async fn search_recursive_async(
    dir_path: std::path::PathBuf,
    query: String,
    results: Arc<Mutex<Vec<FileEntry>>>,
    current_depth: u32,
    max_depth: u32,
    max_results: usize,
    should_stop: Arc<Mutex<bool>>,
) -> Result<(), String> {
    let should_stop_now = {
        let stop_guard = should_stop.lock().unwrap();
        *stop_guard
    };

    if should_stop_now {
        return Ok(());
    }

    if current_depth >= max_depth {
        return Ok(());
    }

    let current_results_len = {
        let results_guard = results.lock().unwrap();
        results_guard.len()
    };

    if current_results_len >= max_results {
        let mut stop_guard = should_stop.lock().unwrap();
        *stop_guard = true;
        return Ok(());
    }

    let mut entries = match fs::read_dir(&dir_path).await {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };

    let mut tasks = Vec::new();
    let mut subdirs = Vec::new();

    while let Ok(Some(entry)) = entries.next_entry().await {
        let file_path = entry.path();
        let file_name = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown");

        if file_name.starts_with('.') {
            continue;
        }

        if matches_pattern(file_name, &query) {
            let results_clone = results.clone();
            let should_stop_clone = should_stop.clone();
            let file_path_clone = file_path.clone();
            let file_name_clone = file_name.to_string();

            let task = task::spawn(async move {
                let should_stop_now = {
                    let stop_guard = should_stop_clone.lock().unwrap();
                    *stop_guard
                };

                if should_stop_now {
                    return;
                }

                let metadata = tokio::fs::metadata(&file_path_clone).await.ok();
                let size = if !file_path_clone.is_dir() {
                    metadata.as_ref().map(|m| m.len())
                } else {
                    None
                };

                let modified = metadata.as_ref().and_then(|m| {
                    m.modified().ok().and_then(|time| {
                        use std::time::UNIX_EPOCH;
                        let duration = time.duration_since(UNIX_EPOCH).ok()?;
                        Some(format!("{}", duration.as_secs()))
                    })
                });

                let item_count = if file_path_clone.is_dir() {
                    let results_len = {
                        let results_guard = results_clone.lock().unwrap();
                        results_guard.len()
                    };

                    if results_len < 50 {
                        count_directory_items_async(&file_path_clone).await
                    } else {
                        None
                    }
                } else {
                    None
                };

                let file_entry = FileEntry {
                    name: file_name_clone,
                    path: file_path_clone.to_string_lossy().to_string(),
                    is_directory: file_path_clone.is_dir(),
                    size,
                    modified,
                    item_count,
                };

                let should_continue = {
                    let mut results_guard = results_clone.lock().unwrap();
                    if results_guard.len() < max_results {
                        results_guard.push(file_entry);
                        true
                    } else {
                        false
                    }
                };

                if !should_continue {
                    let mut stop_guard = should_stop_clone.lock().unwrap();
                    *stop_guard = true;
                }
            });

            tasks.push(task);
        }

        if file_path.is_dir() && current_depth < max_depth - 1 {
            subdirs.push(file_path);
        }

        if tasks.len() >= 50 {
            join_all(tasks.drain(..)).await;

            let should_stop_now = {
                let stop_guard = should_stop.lock().unwrap();
                *stop_guard
            };

            if should_stop_now {
                return Ok(());
            }
        }
    }

    if !tasks.is_empty() {
        join_all(tasks).await;
    }

    let should_stop_now = {
        let stop_guard = should_stop.lock().unwrap();
        *stop_guard
    };

    if should_stop_now {
        return Ok(());
    }

    let mut subdir_tasks = Vec::new();

    for subdir in subdirs {
        let query_clone = query.clone();
        let results_clone = results.clone();
        let should_stop_clone = should_stop.clone();

        let task = search_recursive_async(
            subdir,
            query_clone,
            results_clone,
            current_depth + 1,
            max_depth,
            max_results,
            should_stop_clone,
        );

        subdir_tasks.push(task);

        if subdir_tasks.len() >= 10 {
            futures::future::join_all(subdir_tasks.drain(..)).await;

            let should_stop_now = {
                let stop_guard = should_stop.lock().unwrap();
                *stop_guard
            };

            if should_stop_now {
                return Ok(());
            }
        }
    }

    if !subdir_tasks.is_empty() {
        futures::future::join_all(subdir_tasks).await;
    }

    Ok(())
}

#[tauri::command]
async fn search_files_streaming(
    app: AppHandle,
    path: String,
    query: String,
    max_depth: Option<u32>,
    max_results: Option<usize>,
) -> Result<(), String> {
    let search_path = Path::new(&path);

    if !search_path.exists() {
        return Err("Search path does not exist".to_string());
    }

    if !search_path.is_dir() {
        return Err("Search path is not a directory".to_string());
    }

    let query_lower = query.to_lowercase();
    let max_depth = max_depth.unwrap_or(100);
    let max_results = max_results.unwrap_or(500);

    let results_count = Arc::new(Mutex::new(0));
    let should_stop = Arc::new(Mutex::new(false));

    let _ = app.emit("search-started", ());

    search_recursive_streaming(
        app.clone(),
        search_path.to_path_buf(),
        query_lower,
        results_count,
        0,
        max_depth,
        max_results,
        should_stop,
    )
    .await?;

    let _ = app.emit("search-completed", ());

    Ok(())
}

async fn search_recursive_streaming(
    app: AppHandle,
    dir_path: std::path::PathBuf,
    query: String,
    results_count: Arc<Mutex<usize>>,
    current_depth: u32,
    max_depth: u32,
    max_results: usize,
    should_stop: Arc<Mutex<bool>>,
) -> Result<(), String> {
    let should_stop_now = {
        let stop_guard = should_stop.lock().unwrap();
        *stop_guard
    };

    if should_stop_now {
        return Ok(());
    }

    if current_depth >= max_depth {
        return Ok(());
    }

    let current_results_len = {
        let results_guard = results_count.lock().unwrap();
        *results_guard
    };

    if current_results_len >= max_results {
        let mut stop_guard = should_stop.lock().unwrap();
        *stop_guard = true;
        return Ok(());
    }

    let mut entries = match fs::read_dir(&dir_path).await {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };

    let mut tasks = Vec::new();
    let mut subdirs = Vec::new();

    while let Ok(Some(entry)) = entries.next_entry().await {
        let file_path = entry.path();
        let file_name = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown");

        if file_name.starts_with('.') {
            continue;
        }

        if matches_pattern(file_name, &query) {
            let app_clone = app.clone();
            let results_count_clone = results_count.clone();
            let should_stop_clone = should_stop.clone();
            let file_path_clone = file_path.clone();
            let file_name_clone = file_name.to_string();

            let task = task::spawn(async move {
                let should_stop_now = {
                    let stop_guard = should_stop_clone.lock().unwrap();
                    *stop_guard
                };

                if should_stop_now {
                    return;
                }

                let metadata = tokio::fs::metadata(&file_path_clone).await.ok();
                let size = if !file_path_clone.is_dir() {
                    metadata.as_ref().map(|m| m.len())
                } else {
                    None
                };

                let modified = metadata.as_ref().and_then(|m| {
                    m.modified().ok().and_then(|time| {
                        use std::time::UNIX_EPOCH;
                        let duration = time.duration_since(UNIX_EPOCH).ok()?;
                        Some(format!("{}", duration.as_secs()))
                    })
                });

                let item_count = if file_path_clone.is_dir() {
                    let results_len = {
                        let results_guard = results_count_clone.lock().unwrap();
                        *results_guard
                    };

                    if results_len < 50 {
                        count_directory_items_async(&file_path_clone).await
                    } else {
                        None
                    }
                } else {
                    None
                };

                let file_entry = FileEntry {
                    name: file_name_clone,
                    path: file_path_clone.to_string_lossy().to_string(),
                    is_directory: file_path_clone.is_dir(),
                    size,
                    modified,
                    item_count,
                };

                let should_continue = {
                    let mut results_guard = results_count_clone.lock().unwrap();
                    if *results_guard < max_results {
                        *results_guard += 1;
                        let _ = app_clone.emit("search-result", &file_entry);
                        true
                    } else {
                        false
                    }
                };

                if !should_continue {
                    let mut stop_guard = should_stop_clone.lock().unwrap();
                    *stop_guard = true;
                }
            });

            tasks.push(task);
        }

        if file_path.is_dir() && current_depth < max_depth - 1 {
            subdirs.push(file_path);
        }

        if tasks.len() >= 50 {
            join_all(tasks.drain(..)).await;

            let should_stop_now = {
                let stop_guard = should_stop.lock().unwrap();
                *stop_guard
            };

            if should_stop_now {
                return Ok(());
            }
        }
    }

    if !tasks.is_empty() {
        join_all(tasks).await;
    }

    let should_stop_now = {
        let stop_guard = should_stop.lock().unwrap();
        *stop_guard
    };

    if should_stop_now {
        return Ok(());
    }

    let mut subdir_tasks = Vec::new();

    for subdir in subdirs {
        let query_clone = query.clone();
        let results_count_clone = results_count.clone();
        let should_stop_clone = should_stop.clone();

        let task = search_recursive_streaming(
            app.clone(),
            subdir,
            query_clone,
            results_count_clone,
            current_depth + 1,
            max_depth,
            max_results,
            should_stop_clone,
        );

        subdir_tasks.push(task);

        if subdir_tasks.len() >= 10 {
            futures::future::join_all(subdir_tasks.drain(..)).await;

            let should_stop_now = {
                let stop_guard = should_stop.lock().unwrap();
                *stop_guard
            };

            if should_stop_now {
                return Ok(());
            }
        }
    }

    if !subdir_tasks.is_empty() {
        futures::future::join_all(subdir_tasks).await;
    }

    Ok(())
}

#[tauri::command]
async fn create_file(path: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    if file_path.exists() {
        return Err(format!("File already exists: {}", path));
    }

    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .await
                .map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
    }

    fs::write(file_path, "")
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn create_directory(path: String) -> Result<(), String> {
    let dir_path = Path::new(&path);

    if dir_path.exists() {
        return Err(format!("Directory already exists: {}", path));
    }

    fs::create_dir_all(dir_path)
        .await
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn rename_item(old_path: String, new_name: String) -> Result<(), String> {
    let old_path_buf = Path::new(&old_path);

    if !old_path_buf.exists() {
        return Err(format!("Item does not exist: {}", old_path));
    }

    let parent_dir = old_path_buf
        .parent()
        .ok_or_else(|| "Cannot determine parent directory".to_string())?;

    let new_path = parent_dir.join(&new_name);

    if new_path.exists() {
        return Err(format!("Item with name '{}' already exists", new_name));
    }

    fs::rename(old_path_buf, &new_path)
        .await
        .map_err(|e| format!("Failed to rename item: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn delete_item(path: String) -> Result<(), String> {
    let item_path = Path::new(&path);

    if !item_path.exists() {
        return Err(format!("Item does not exist: {}", path));
    }

    if item_path.is_dir() {
        fs::remove_dir_all(item_path)
            .await
            .map_err(|e| format!("Failed to delete directory: {}", e))?;
    } else {
        fs::remove_file(item_path)
            .await
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    unsafe {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_directory,
            get_home_directory,
            search_files,
            search_files_streaming,
            create_file,
            create_directory,
            rename_item,
            delete_item
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
