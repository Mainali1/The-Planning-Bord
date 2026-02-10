use lettre::transport::smtp::authentication::Credentials;
use lettre::{Message, SmtpTransport, Transport};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub from_email: String,
    pub use_ssl: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmailRequest {
    pub to: String,
    pub subject: String,
    pub body: String,
    pub config: SmtpConfig,
}

#[tauri::command]
pub async fn send_email(request: EmailRequest) -> Result<String, String> {
    let email = Message::builder()
        .from(request.config.from_email.parse().map_err(|e: lettre::address::AddressError| e.to_string())?)
        .to(request.to.parse().map_err(|e: lettre::address::AddressError| e.to_string())?)
        .subject(request.subject)
        .header(lettre::message::header::ContentType::TEXT_PLAIN)
        .body(request.body)
        .map_err(|e| e.to_string())?;

    let creds = Credentials::new(request.config.username, request.config.password);

    // Build the mailer
    // Note: In a real production app, you might want to reuse the transport, 
    // but for simplicity and dynamic config we build it per request here.
    // For Gmail: port 587 (STARTTLS) or 465 (SSL/TLS).
    
    let mailer = if request.config.use_ssl {
        // SSL/TLS (usually port 465)
        SmtpTransport::relay(&request.config.host)
            .map_err(|e| e.to_string())?
            .credentials(creds)
            .port(request.config.port) // Legacy name, but sets port
            .build()
    } else {
        // STARTTLS (usually port 587) or Plain
        // We'll assume STARTTLS for security if not using implicit SSL
        SmtpTransport::starttls_relay(&request.config.host)
            .map_err(|e| e.to_string())?
            .credentials(creds)
            .port(request.config.port)
            .build()
    };

    match mailer.send(&email) {
        Ok(_) => Ok("Email sent successfully".to_string()),
        Err(e) => Err(format!("Failed to send email: {}", e)),
    }
}
