use std::process::{Command, Stdio};
use std::path::PathBuf;
use std::fs;
use std::io::Write;
use postgres::{Client, NoTls};
use std::time::Duration;
use tauri::Manager;

fn exe_name(base: &str) -> String {
    if cfg!(target_os = "windows") { format!("{}.exe", base) } else { base.to_string() }
}

fn os_dir() -> &'static str {
    if cfg!(target_os = "windows") { "windows-x64" }
    else if cfg!(target_os = "macos") { "macos-x64" }
    else { "linux-x64" }
}

fn resource_bin(app: &tauri::AppHandle) -> Option<PathBuf> {
    let dir = app.path().resource_dir().ok()?;
    Some(dir.join("postgres").join(os_dir()).join("bin"))
}

fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_local_data_dir().map_err(|_| "Failed to get app data dir".to_string())?;
    Ok(base.join("embedded_pg_data"))
}

fn pid_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_local_data_dir().map_err(|_| "Failed to get app data dir".to_string())?;
    Ok(base.join("embedded_pg.pid"))
}

fn pick_port() -> i32 {
    if let Ok(listener) = std::net::TcpListener::bind("127.0.0.1:0") {
        if let Ok(addr) = listener.local_addr() {
            return addr.port() as i32;
        }
    }
    5432 // Fallback to default if dynamic binding fails
}

fn wait_ready(conn: &str) -> bool {
    // Retry for up to 20 seconds (40 * 500ms)
    for i in 0..40 {
        match crate::db::postgres_init::init_db(conn) {
            Ok(_) => return true,
            Err(_) => {
                if i == 39 {
                    // Last attempt failed
                    return false;
                }
                std::thread::sleep(Duration::from_millis(500));
            }
        }
    }
    false
}

fn create_db_if_missing(port: i32) -> Result<(), String> {
    let mut client = Client::connect(&format!("host=localhost port={} user=postgres dbname=postgres", port), NoTls).map_err(|e| e.to_string())?;
    let rows = client.query("SELECT 1 FROM pg_database WHERE datname = 'planning_bord'", &[]).map_err(|e| e.to_string())?;
    if rows.is_empty() {
        client.execute("CREATE DATABASE planning_bord", &[]).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn start_embedded_postgres(app: &tauri::AppHandle) -> Result<String, String> {
    let bin = resource_bin(app).ok_or_else(|| "embedded postgres not found".to_string())?;
    let initdb = bin.join(exe_name("initdb"));
    let postgres = bin.join(exe_name("postgres"));
    if !initdb.exists() || !postgres.exists() {
        return Err("embedded postgres binaries missing".to_string());
    }
    let data = data_dir(app)?;
    if !data.exists() {
        fs::create_dir_all(&data).map_err(|e| e.to_string())?;
        let data_str = data.to_str().ok_or("Invalid data path encoding")?;
        let status = Command::new(&initdb).args(["-D", data_str, "-U", "postgres", "-A", "trust"]).status().map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("initdb failed".to_string());
        }
    }
    let port = pick_port();
    let data_str = data.to_str().ok_or("Invalid data path encoding")?;
    let child = Command::new(&postgres).args(["-D", data_str, "-p", &port.to_string()]).stdout(Stdio::null()).stderr(Stdio::null()).spawn().map_err(|e| e.to_string())?;
    let mut f = fs::File::create(pid_file(app)?).map_err(|e| e.to_string())?;
    write!(f, "{}", child.id()).map_err(|e| e.to_string())?;
    std::thread::sleep(Duration::from_secs(1));
    create_db_if_missing(port)?;
    let conn = format!("postgres://postgres:@localhost:{}/planning_bord?connect_timeout=2", port);
    if !wait_ready(&conn) {
        return Err("embedded postgres failed to start".to_string());
    }
    Ok(conn)
}

pub fn stop_embedded_postgres(app: &tauri::AppHandle) -> Result<(), String> {
    let pid_path = pid_file(app)?;
    if let Ok(s) = fs::read_to_string(&pid_path) {
        if let Ok(pid) = s.trim().parse::<u32>() {
            if cfg!(target_os = "windows") {
                let _ = Command::new("taskkill").args(["/PID", &pid.to_string(), "/F"]).status();
            } else {
                let _ = Command::new("kill").args([pid.to_string().as_str()]).status();
            }
        }
        let _ = fs::remove_file(pid_path);
    }
    Ok(())
}

pub fn embedded_available(app: &tauri::AppHandle) -> bool {
    if let Some(bin) = resource_bin(app) {
        let pg = bin.join(exe_name("postgres"));
        let init = bin.join(exe_name("initdb"));
        return pg.exists() && init.exists();
    }
    false
}
