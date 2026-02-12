use std::process::Command;
use std::path::PathBuf;
use std::fs;
use std::time::Duration;
use tauri::Manager;
use tokio::sync::OnceCell;

static EMBEDDED_PG_CONN: OnceCell<String> = OnceCell::const_new();

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
    println!("Resource Dir: {:?}", dir);
    
    // Potential paths to check
    let mut paths = vec![
        dir.join("postgres").join(os_dir()).join("bin"),
        dir.join("resources").join("postgres").join(os_dir()).join("bin"),
    ];

    // In development, also check relative to the current working directory
    if cfg!(debug_assertions) {
        if let Ok(cwd) = std::env::current_dir() {
            paths.push(cwd.join("resources").join("postgres").join(os_dir()).join("bin"));
            paths.push(cwd.join("src-tauri").join("resources").join("postgres").join(os_dir()).join("bin"));
        }
    }

    for path in paths {
        println!("Checking bin path: {:?}", path);
        if path.join(exe_name("postgres")).exists() {
            println!("Found postgres at: {:?}", path);
            return Some(path);
        }
    }
    
    None
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
    // We try to find a free port to avoid conflicts with other Postgres instances (like default 5432)
    if let Ok(listener) = std::net::TcpListener::bind("127.0.0.1:0") {
        if let Ok(addr) = listener.local_addr() {
            return addr.port() as i32;
        }
    }
    // If dynamic binding fails, we pick a less common port than 5432 to minimize conflict risk
    54321
}

async fn wait_ready(conn: &str) -> bool {
    // Retry for up to 30 seconds (60 * 500ms)
    for i in 0..60 {
        let conn_clone = conn.to_string();
        let res = crate::db::postgres_init::init_db(&conn_clone).await;
        match res {
            Ok(_) => return true,
            Err(_) => {
                if i == 59 {
                    // Last attempt failed
                    return false;
                }
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }
    }
    false
}

fn create_db_if_missing(app: &tauri::AppHandle, port: i32) -> Result<(), String> {
    let bin = resource_bin(app).ok_or_else(|| "embedded postgres not found".to_string())?;
    let createdb = bin.join(exe_name("createdb"));
    let psql = bin.join(exe_name("psql"));

    if !createdb.exists() || !psql.exists() {
        return Err("database creation tools missing".to_string());
    }

    // Give the server a moment to fully initialize even after pg_ctl says it's ready
    let mut last_error = String::new();
    for i in 0..10 {
        // Check if database exists using psql
        let check_status = Command::new(&psql)
            .args([
                "-p", &port.to_string(),
                "-h", "localhost",
                "-U", "postgres",
                "-lqt",
            ])
            .env("PGPASSWORD", "")
            .output();

        match check_status {
            Ok(output) if output.status.success() => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if !stdout.contains("planning_bord") {
                    println!("Database 'planning_bord' not found. Creating...");
                    let create_status = Command::new(&createdb)
                        .args([
                            "-p", &port.to_string(),
                            "-h", "localhost",
                            "-U", "postgres",
                            "planning_bord"
                        ])
                        .env("PGPASSWORD", "")
                        .status()
                        .map_err(|e| e.to_string())?;

                    if !create_status.success() {
                        return Err("failed to create planning_bord database".to_string());
                    }
                    println!("Database 'planning_bord' created successfully.");
                }
                return Ok(());
            }
            Ok(output) => {
                last_error = String::from_utf8_lossy(&output.stderr).to_string();
            }
            Err(e) => {
                last_error = e.to_string();
            }
        }
        
        if i < 9 {
            std::thread::sleep(Duration::from_millis(1000));
        }
    }

    Err(format!("failed to connect to postgres to create database: {}", last_error))
}

pub async fn start_embedded_postgres(app: &tauri::AppHandle) -> Result<String, String> {
    EMBEDDED_PG_CONN.get_or_try_init(|| async {
        start_embedded_postgres_internal(app).await
    }).await.map(|s| s.clone())
}

async fn start_embedded_postgres_internal(app: &tauri::AppHandle) -> Result<String, String> {
    let bin = resource_bin(app).ok_or_else(|| "embedded postgres not found".to_string())?;
    let pg_ctl = bin.join(exe_name("pg_ctl"));
    let initdb = bin.join(exe_name("initdb"));
    
    if !pg_ctl.exists() || !initdb.exists() {
        return Err("embedded postgres binaries missing".to_string());
    }

    let data = data_dir(app)?;
    let data_str = data.to_str().ok_or("Invalid data path encoding")?;
    
    if !data.exists() {
        fs::create_dir_all(&data).map_err(|e| e.to_string())?;
        // Use trust for all connection types to ensure no password prompts
        let status = Command::new(&initdb)
            .args(["-D", data_str, "-U", "postgres", "--auth-local=trust", "--auth-host=trust", "--no-instructions"])
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            let _ = fs::remove_dir_all(&data);
            return Err("initdb failed".to_string());
        }
    }
    
    // Ensure config is correct
    let hba_path = data.join("pg_hba.conf");
    let trust_config = "host    all             all             127.0.0.1/32            trust\nhost    all             all             ::1/128                 trust\nlocal   all             all                                     trust\nhost    all             all             localhost               trust";
    let _ = fs::write(hba_path, trust_config);

    let conf_path = data.join("postgresql.conf");
    if let Ok(content) = fs::read_to_string(&conf_path) {
        let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
        let mut changed = false;

        // Remove invalid password_encryption=plain if present
        lines.retain(|line| !line.contains("password_encryption = plain"));
        
        if !content.contains("listen_addresses = 'localhost'") {
            lines.push("listen_addresses = 'localhost'".to_string());
            changed = true;
        }
        
        if changed || content.contains("password_encryption = plain") {
            let _ = fs::write(&conf_path, lines.join("\n"));
        }
    }

    // Pick a port
    let port = pick_port();
    
    // Use pg_ctl to start the database. This is more reliable on Windows as it handles the service wrapper.
    // We use "start" and wait for it to be ready.
    println!("Starting Postgres via pg_ctl on port {}...", port);
    
    // Stop any existing instance first
    let _ = Command::new(&pg_ctl)
        .args(["stop", "-D", data_str, "-m", "fast"])
        .status();

    // Force remove postmaster.pid if it still exists (stale lock)
    let pid_lock = data.join("postmaster.pid");
    if pid_lock.exists() {
        println!("Found stale postmaster.pid, removing...");
        let _ = fs::remove_file(pid_lock);
    }

    let status = Command::new(&pg_ctl)
        .args([
            "start", 
            "-D", data_str, 
            "-o", &format!("-p {} -c listen_addresses=localhost", port),
            "-w", // Wait for startup to complete
            "-t", "30" // Timeout 30 seconds
        ])
        .env("PGUSER", "postgres")
        .env("PGPASSWORD", "")
        .status()
        .map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("pg_ctl start failed".to_string());
    }

    // Create DB if missing
    create_db_if_missing(app, port)?;
    
    let conn = format!("postgres://postgres:@localhost:{}/planning_bord?connect_timeout=5", port);
    if !wait_ready(&conn).await {
        return Err("embedded postgres failed to become ready".to_string());
    }
    
    Ok(conn)
}

pub fn stop_embedded_postgres(app: &tauri::AppHandle) -> Result<(), String> {
    let bin = resource_bin(app).ok_or_else(|| "embedded postgres not found".to_string())?;
    let pg_ctl = bin.join(exe_name("pg_ctl"));
    let data = data_dir(app)?;
    let data_str = data.to_str().ok_or("Invalid data path encoding")?;

    if pg_ctl.exists() && data.exists() {
        let _ = Command::new(&pg_ctl)
            .args(["stop", "-D", data_str, "-m", "fast"])
            .status();
    }
    
    let pid_path = pid_file(app)?;
    let _ = fs::remove_file(pid_path);
    
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
