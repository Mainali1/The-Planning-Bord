import os
from typing import Optional

class Settings:
    """Application settings"""
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./planning_bord.db")
    
    # Microsoft 365 Integration
    MICROSOFT_CLIENT_ID: str = os.getenv("MICROSOFT_CLIENT_ID", "")
    MICROSOFT_CLIENT_SECRET: str = os.getenv("MICROSOFT_CLIENT_SECRET", "")
    MICROSOFT_TENANT_ID: str = os.getenv("MICROSOFT_TENANT_ID", "")
    MICROSOFT_REDIRECT_URI: str = os.getenv("MICROSOFT_REDIRECT_URI", "http://localhost:8000/api/microsoft/callback")
    
    # Email Settings
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.office365.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    
    # Application Settings
    APP_NAME: str = os.getenv("APP_NAME", "The Planning Bord")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Offline Mode
    OFFLINE_MODE: bool = os.getenv("OFFLINE_MODE", "false").lower() == "true"
    SYNC_INTERVAL: int = int(os.getenv("SYNC_INTERVAL", "300"))  # 5 minutes
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174"
    ]
    
    # File Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "./logs/app.log")
    
    # Backup Settings
    BACKUP_ENABLED: bool = os.getenv("BACKUP_ENABLED", "true").lower() == "true"
    BACKUP_INTERVAL: int = int(os.getenv("BACKUP_INTERVAL", "86400"))  # 24 hours
    BACKUP_RETENTION_DAYS: int = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
    
    # Cloud Sync Settings
    CLOUD_SYNC_ENABLED: bool = os.getenv("CLOUD_SYNC_ENABLED", "false").lower() == "true"
    CLOUD_API_URL: str = os.getenv("CLOUD_API_URL", "")
    CLOUD_API_KEY: str = os.getenv("CLOUD_API_KEY", "")
    
    @property
    def microsoft_enabled(self) -> bool:
        """Check if Microsoft 365 integration is enabled"""
        return bool(self.MICROSOFT_CLIENT_ID and self.MICROSOFT_CLIENT_SECRET and self.MICROSOFT_TENANT_ID)
    
    @property
    def email_enabled(self) -> bool:
        """Check if email functionality is enabled"""
        return bool(self.SMTP_SERVER and self.SMTP_USERNAME and self.SMTP_PASSWORD)
    
    @property
    def cloud_sync_enabled(self) -> bool:
        """Check if cloud sync is enabled"""
        return bool(self.CLOUD_SYNC_ENABLED and self.CLOUD_API_URL and self.CLOUD_API_KEY)

# Create settings instance
settings = Settings()