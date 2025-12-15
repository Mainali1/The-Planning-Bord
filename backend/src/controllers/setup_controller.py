from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import json
from datetime import datetime
from src.database import get_db
from src.models.user import User, UserRole
from src.controllers.auth_controller import hash_password
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/api/setup", tags=["setup"])

class SetupRequest(BaseModel):
    companyName: str
    companyType: str
    companyAddress: Optional[str] = None
    adminUsername: str
    adminPassword: str
    adminEmail: EmailStr
    databaseType: str = "sqlite"
    backupSchedule: str = "daily"
    enableCloudSync: bool = False
    licenseKey: str

class SetupStatusResponse(BaseModel):
    setup_complete: bool
    message: str

class SetupCompleteResponse(BaseModel):
    success: bool
    message: str
    admin_username: str
    admin_password: str  # Only returned for initial setup

@router.get("/status", response_model=SetupStatusResponse)
async def get_setup_status():
    """Check if the system has been set up"""
    try:
        db = next(get_db())
        
        # Check if any users exist
        user_count = db.query(User).count()
        
        setup_complete = user_count > 0
        
        return SetupStatusResponse(
            setup_complete=setup_complete,
            message="System setup status retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error checking setup status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check setup status"
        )

@router.post("/complete", response_model=SetupCompleteResponse)
async def complete_setup(setup_data: SetupRequest):
    """Complete the initial system setup"""
    try:
        db = next(get_db())
        
        # Check if setup is already complete
        existing_users = db.query(User).count()
        if existing_users > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="System is already set up"
            )
        
        # Validate license key (basic validation for demo)
        if not setup_data.licenseKey or len(setup_data.licenseKey) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid license key"
            )
        
        # Create admin user
        hashed_password = hash_password(setup_data.adminPassword)
        admin_user = User(
            username=setup_data.adminUsername,
            email=setup_data.adminEmail,
            hashed_password=hashed_password,
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Create company configuration
        config_data = {
            "company_name": setup_data.companyName,
            "company_type": setup_data.companyType,
            "company_address": setup_data.companyAddress,
            "database_type": setup_data.databaseType,
            "backup_schedule": setup_data.backupSchedule,
            "enable_cloud_sync": setup_data.enableCloudSync,
            "license_key": setup_data.licenseKey,
            "setup_completed_at": datetime.utcnow().isoformat(),
            "admin_user_id": admin_user.id
        }
        
        # Save configuration to file
        config_dir = os.path.join(os.path.expanduser("~"), ".planningbord")
        os.makedirs(config_dir, exist_ok=True)
        
        config_file = os.path.join(config_dir, "business_config.json")
        with open(config_file, "w") as f:
            json.dump(config_data, f, indent=2)
        
        logger.info(f"System setup completed by admin user: {admin_user.username}")
        
        return SetupCompleteResponse(
            success=True,
            message="System setup completed successfully",
            admin_username=setup_data.adminUsername,
            admin_password=setup_data.adminPassword  # Return password for auto-login
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing setup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete system setup"
        )

@router.post("/validate-license")
async def validate_license(license_key: str):
    """Validate a license key"""
    # Basic license validation for demo purposes
    # In a real application, this would connect to a license server
    
    if not license_key or len(license_key) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid license key format"
        )
    
    # Simple validation: check if license key starts with "PB-" and has valid format
    if license_key.startswith("PB-") and len(license_key) >= 15:
        return {
            "valid": True,
            "message": "License key is valid",
            "expires_at": "2025-12-31T23:59:59Z"  # Demo expiration
        }
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid license key"
    )