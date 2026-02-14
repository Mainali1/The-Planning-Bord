use std::time::Duration;
use std::process::Command;
use std::process::Stdio;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;
use rand::Rng;

async fn wait_for_postgres(conn: &str) -> bool {
    for _ in 0..30 {
        let conn_clone = conn.to_string();
        let res = crate::db::postgres_init::init_db(&conn_clone).await;
        if res.is_ok() {
            return true;
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    false
}

fn run_silent_ok(cmd: &str, args: &[&str]) -> bool {
    Command::new(cmd)
        .args(args)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

pub fn postgres_installed() -> bool {
    if cfg!(target_os = "windows") {
        if system_pg_bin().is_some() {
            return true;
        }
        if run_silent_ok("powershell", &["-NoProfile", "-ExecutionPolicy", "Bypass", "Get-Command", "psql", "-ErrorAction", "SilentlyContinue"]) {
            return true;
        }
        // Check winget as fallback
        run_silent_ok("winget", &["list", "PostgreSQL"])
    } else if cfg!(target_os = "macos") {
        run_silent_ok("bash", &["-lc", "command -v psql >/dev/null 2>&1"])
    } else {
        run_silent_ok("bash", &["-lc", "command -v psql >/dev/null 2>&1"])
    }
}

pub fn show_popup_and_exit(message: &str, title: &str) {
    if cfg!(target_os = "windows") {
        let _ = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show($args[0], $args[1])",
                message,
                title,
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    std::process::exit(0);
}

fn try_install_system_postgres() -> bool {
    if cfg!(target_os = "windows") {
        // Try multiple Winget IDs silently to avoid noisy terminal output
        let candidates = [
            // Generic PostgreSQL meta package
            "PostgreSQL.PostgreSQL",
            // Specific major versions commonly available
            "PostgreSQL.PostgreSQL.16",
            "PostgreSQL.PostgreSQL.15",
            // EnterpriseDB older IDs
            "EnterpriseDB.PostgreSQL",
        ];
        for id in candidates {
            if run_silent_ok(
                "winget",
                &[
                    "install",
                    "--id",
                    id,
                    "-e",
                    "--source",
                    "winget",
                    "--accept-package-agreements",
                    "--accept-source-agreements",
                    "--silent",
                ],
            ) {
                return true;
            }
        }
        false
    } else if cfg!(target_os = "macos") {
        run_silent_ok("brew", &["install", "postgresql"])
    } else {
        // Linux generic
        run_silent_ok("bash", &["-lc", "sudo apt-get update && sudo apt-get install -y postgresql || sudo yum install -y postgresql"])
    }
}

#[cfg(target_os = "windows")]
fn system_pg_bin() -> Option<PathBuf> {
    // Check common locations
    let roots = [
        PathBuf::from(r"C:\Program Files\PostgreSQL"),
        PathBuf::from(r"D:\Program Files\PostgreSQL"),
        PathBuf::from(r"C:\PostgreSQL"),
        PathBuf::from(r"D:\PostgreSQL"),
    ];

    for root in roots {
        if root.exists() {
            if let Ok(entries) = fs::read_dir(root) {
                 let mut candidates: Vec<PathBuf> = entries.filter_map(|e| {
                    let p = e.ok()?.path();
                    let bin = p.join("bin");
                    if bin.exists() { Some(bin) } else { None }
                }).collect();
                
                if !candidates.is_empty() {
                    candidates.sort();
                    return candidates.pop();
                }
            }
        }
    }
    
    // Fallback: Try to get from Registry via PowerShell
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", "Get-ItemProperty 'HKLM:\\SOFTWARE\\PostgreSQL\\Installations\\*' -Name 'Base Directory' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty 'Base Directory'"])
        .output()
        .ok()?;
        
    if output.status.success() {
        let s = String::from_utf8_lossy(&output.stdout);
        for line in s.lines() {
            let line = line.trim();
            if line.is_empty() { continue; }
            let p = PathBuf::from(line).join("bin");
            if p.exists() {
                return Some(p);
            }
        }
    }

    None
}

#[cfg(not(target_os = "windows"))]
fn system_pg_bin() -> Option<PathBuf> {
    None
}

fn system_pg_data_dir(app: &tauri::AppHandle) -> PathBuf {
    let base = app.path().app_local_data_dir().expect("app data dir");
    base.join("system_pgdata")
}

async fn start_system_postgres(app: &tauri::AppHandle) -> Result<String, String> {
    let bin = system_pg_bin().ok_or_else(|| "system postgres not found".to_string())?;
    let initdb = bin.join(if cfg!(target_os = "windows") { "initdb.exe" } else { "initdb" });
    let pg_ctl = bin.join(if cfg!(target_os = "windows") { "pg_ctl.exe" } else { "pg_ctl" });
    if !initdb.exists() || !pg_ctl.exists() {
        return Err("system postgres tools missing".to_string());
    }
    let data = system_pg_data_dir(app);
    if !data.exists() {
        fs::create_dir_all(&data).map_err(|e| e.to_string())?;
        let data_str = data.to_str().ok_or("Invalid data path encoding")?;
        let status = Command::new(&initdb)
            .args(["-D", data_str, "-U", "postgres", "-A", "md5"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err("initdb failed".to_string());
        }
    }
    let log_file = data.join("server.log");
    let mut log = fs::File::create(&log_file).map_err(|e| e.to_string())?;
    writeln!(log, "starting system postgres").map_err(|e| e.to_string())?;
    
    // Try start
    let data_str = data.to_str().ok_or("Invalid data path encoding")?;
    let log_str = log_file.to_str().ok_or("Invalid log path encoding")?;
    let _ = Command::new(&pg_ctl)
        .args(["-D", data_str, "-l", log_str, "start", "-o", "-p 5432"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();

    let secret_path = app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("secrets.json");
    let db_password = if secret_path.exists() {
        if let Ok(content) = fs::read_to_string(&secret_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                json["db_password"].as_str().unwrap_or("").to_string()
            } else { "".to_string() }
        } else { "".to_string() }
    } else { "".to_string() };
    let db_password = if db_password.is_empty() {
        let gen_pwd: String = (0..16)
            .map(|_| rand::thread_rng().r#gen::<u8>())
            .map(|b| format!("{:02x}", b))
            .collect();
        let merged = if secret_path.exists() {
            if let Ok(content) = fs::read_to_string(&secret_path) {
                if let Ok(mut json) = serde_json::from_str::<serde_json::Value>(&content) {
                    json["db_password"] = serde_json::Value::String(gen_pwd.clone());
                    if let Ok(out) = serde_json::to_string_pretty(&json) {
                        let _ = fs::write(&secret_path, out);
                    }
                }
            }
            gen_pwd.clone()
        } else {
            let json = serde_json::json!({ "db_password": gen_pwd });
            if let Ok(out) = serde_json::to_string_pretty(&json) {
                let _ = fs::write(&secret_path, out);
            }
            gen_pwd.clone()
        };
        merged
    } else { db_password };
    let psql = bin.join(if cfg!(target_os = "windows") { "psql.exe" } else { "psql" });
    if psql.exists() {
        let _ = Command::new(&psql)
            .args(["-U", "postgres", "-h", "localhost", "-p", "5432", "-c", &format!("ALTER USER postgres WITH PASSWORD '{}';", db_password)])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
        let _ = Command::new(&psql)
            .args(["-U", "postgres", "-h", "localhost", "-p", "5432", "-c", "CREATE DATABASE planning_bord;"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    let conn = format!("postgres://postgres:{}@localhost:5432/planning_bord?connect_timeout=2", db_password);
    if !wait_for_postgres(&conn).await {
        return Err("system postgres failed to start or connect".to_string());
    }
    Ok(conn)
}

pub async fn ensure_local_db(app: &tauri::AppHandle, custom_conn: Option<String>) -> Result<String, String> {
    if let Some(conn) = custom_conn {
        // If user provided a specific connection string, only try to connect to it.
        // We do not try to install or start system services if they provided explicit credentials.
        let conn_clone = conn.clone();
        let res = crate::db::postgres_init::init_db(&conn_clone).await;
        if let Err(e) = res {
            return Err(format!("Connection failed: {}", e));
        }
        return Ok(conn);
    }

    // 1. Check environment variable first
    if let Ok(env_conn) = std::env::var("DATABASE_URL") {
        let env_conn_clone = env_conn.clone();
        let res = crate::db::postgres_init::init_db(&env_conn_clone).await;
        if res.is_ok() {
            return Ok(env_conn);
        }
    }

    // 2. Default fallback (local trust auth)
    let default_conn = "postgres://postgres@localhost:5432/planning_bord?connect_timeout=2";
    let conn = default_conn;
    
    // 3. Try to connect first - if service is running and trust auth works
    let conn_clone = conn.to_string();
    let res = crate::db::postgres_init::init_db(&conn_clone).await;
    if res.is_ok() {
        return Ok(conn.to_string());
    }

    if crate::setup::embedded::embedded_available(app) {
        if let Ok(conn_emb) = crate::setup::embedded::start_embedded_postgres(app).await {
            return Ok(conn_emb);
        }
    }
    
    // 2. Check if system postgres exists, if not try install
    if system_pg_bin().is_none() {
        if !postgres_installed() {
            if !try_install_system_postgres() {
                 return Err("no local postgres available and installation failed".to_string());
            }
            // Give it a moment if installer started the service
            tokio::time::sleep(Duration::from_secs(5)).await;
        }
    }
    
    // 3. Try to connect again (maybe installer started it)
    let conn_clone = conn.to_string();
    let res = crate::db::postgres_init::init_db(&conn_clone).await;
    if res.is_ok() {
        return Ok(conn.to_string());
    }

    // 4. Try to start it using our tools (needs system_pg_bin)
    // This creates/uses a local data dir in AppData, which is separate from System install data.
    // However, if System install is running on port 5432, this will fail to bind port.
    if let Ok(conn_sys) = start_system_postgres(app).await {
        return Ok(conn_sys);
    }

    // 5. Last ditch connect attempt
    if wait_for_postgres(conn).await {
        return Ok(conn.to_string());
    }
    
    // If we are here, it means:
    // - We couldn't connect with 'password' (step 1 & 3)
    // - We couldn't start our own instance (step 4) - likely because port 5432 is taken by system postgres
    // - We couldn't connect with 'trust' (start_system_postgres checks this)
    
    // It's likely a system postgres exists but requires a different password.
    Err("Local Postgres detected but connection failed. Please check credentials.".to_string())
}

pub fn cleanup_local_db(app: &tauri::AppHandle) -> Result<(), String> {
    let _ = crate::setup::embedded::stop_embedded_postgres(app);
    Ok(())
}
