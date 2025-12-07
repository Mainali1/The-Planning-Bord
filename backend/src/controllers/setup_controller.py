from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
import json
import os
from pathlib import Path
from datetime import datetime

router = APIRouter(prefix="/setup", tags=["setup"])

class SetupRequest(BaseModel):
    licenseKey: str
    companyName: str
    adminEmail: EmailStr
    adminPassword: str
    serverMode: str  # 'local' or 'cloud'
    cloudServerUrl: Optional[str] = None
    cloudApiKey: Optional[str] = None
    ms365ClientId: Optional[str] = None
    ms365TenantId: Optional[str] = None
    ms365ClientSecret: Optional[str] = None
    enableNotifications: bool = True
    enableInventory: bool = True
    enableEmployees: bool = True
    enableFinance: bool = True

class SetupResponse(BaseModel):
    success: bool
    message: str
    config: dict

# Store configuration in user's home directory
CONFIG_DIR = Path.home() / ".planningbord"
CONFIG_FILE = CONFIG_DIR / "config.json"
LICENSE_FILE = CONFIG_DIR / "license.key"

def ensure_config_dir():
    """Ensure configuration directory exists"""
    CONFIG_DIR.mkdir(exist_ok=True)

def save_config(config_data: dict):
    """Save configuration to file"""
    ensure_config_dir()
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config_data, f, indent=2)

def load_config():
    """Load configuration from file"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_license_key(license_key: str):
    """Save license key to file"""
    ensure_config_dir()
    with open(LICENSE_FILE, 'w') as f:
        f.write(license_key)

def validate_license_key(license_key: str) -> bool:
    """
    Validate license key format and structure
    This is a basic validation - in production, you'd connect to a license server
    """
    # Basic format validation: XXXX-XXXX-XXXX-XXXX
    parts = license_key.split('-')
    if len(parts) != 4:
        return False
    
    for part in parts:
        if len(part) != 4 or not part.isalnum():
            return False
    
    # TODO: In production, validate against license server
    # For now, accept any properly formatted key
    return True

@router.post("/complete", response_model=SetupResponse)
async def complete_setup(request: SetupRequest):
    """
    Complete the initial setup process
    """
    try:
        # Validate license key
        if not validate_license_key(request.licenseKey):
            raise HTTPException(
                status_code=400,
                detail="Invalid license key format. Please use format: XXXX-XXXX-XXXX-XXXX"
            )
        
        # Create configuration
        config_data = {
            "version": "1.0.0",
            "setup_completed_at": datetime.now().isoformat(),
            "company": {
                "name": request.companyName,
                "admin_email": request.adminEmail
            },
            "server": {
                "mode": request.serverMode,
                "cloud_server_url": request.cloudServerUrl,
                "cloud_api_key": request.cloudApiKey
            },
            "microsoft_365": {
                "client_id": request.ms365ClientId,
                "tenant_id": request.ms365TenantId,
                "client_secret": request.ms365ClientSecret,
                "enabled": bool(request.ms365ClientId and request.ms365TenantId)
            },
            "features": {
                "inventory": request.enableInventory,
                "employees": request.enableEmployees,
                "finance": request.enableFinance,
                "notifications": request.enableNotifications
            },
            "security": {
                "first_run": True,
                "setup_complete": True
            }
        }
        
        # Save configuration
        save_config(config_data)
        
        # Save license key separately for security
        save_license_key(request.licenseKey)
        
        # Create initial admin user (this would be handled by your auth system)
        # TODO: Create admin user with request.adminEmail and request.adminPassword
        
        return SetupResponse(
            success=True,
            message="Setup completed successfully. You can now log in to The Planning Bord.",
            config=config_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to complete setup: {str(e)}"
        )

@router.get("/status")
async def get_setup_status():
    """
    Check if setup has been completed
    """
    config = load_config()
    is_setup_complete = config.get("security", {}).get("setup_complete", False)
    
    return {
        "setup_complete": is_setup_complete,
        "company_name": config.get("company", {}).get("name"),
        "features": config.get("features", {})
    }

@router.get("/config")
async def get_config():
    """
    Get current configuration (for authenticated users only)
    """
    config = load_config()
    # Remove sensitive data
    safe_config = {
        "company": config.get("company", {}),
        "server": {
            "mode": config.get("server", {}).get("mode"),
            "cloud_server_url": config.get("server", {}).get("cloud_server_url")
        },
        "microsoft_365": {
            "enabled": config.get("microsoft_365", {}).get("enabled", False)
        },
        "features": config.get("features", {})
    }
    return safe_config

@router.post("/validate-license")
async def validate_license_endpoint(license_key: str):
    """
    Validate a license key
    """
    is_valid = validate_license_key(license_key)
    return {
        "valid": is_valid,
        "message": "License key is valid" if is_valid else "Invalid license key"
    }