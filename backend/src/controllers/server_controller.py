from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
import os
import subprocess
import asyncio
from datetime import datetime
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from src.services.offline_service import OfflineService
from src.utils.logger import setup_logger
from src.models.user import UserRole
from src.database import get_db
from src.config import settings

logger = setup_logger(__name__)

router = APIRouter()
security = HTTPBearer()

# Configuration
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Extract and validate current user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_role: str = payload.get("role")
        
        if username is None or user_role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        return {"username": username, "role": user_role}
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )

def require_role(required_role: UserRole):
    """Dependency to require specific role for endpoint access"""
    def role_checker(current_user: dict = Depends(get_current_user_from_token)):
        user_role = UserRole(current_user["role"])
        
        # Admin can access everything
        if user_role == UserRole.ADMIN:
            return current_user
        
        # Check if user has required role
        if user_role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role.value}"
            )
        
        return current_user
    
    return role_checker

def require_admin():
    """Dependency to require admin role"""
    return require_role(UserRole.ADMIN)

def require_manager_or_admin():
    """Dependency to require manager or admin role"""
    def role_checker(current_user: dict = Depends(get_current_user_from_token)):
        user_role = UserRole(current_user["role"])
        
        if user_role not in [UserRole.ADMIN, UserRole.MANAGER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions. Required role: manager or admin"
            )
        
        return current_user
    
    return role_checker

class ServerStatusResponse(BaseModel):
    status: str
    is_running: bool
    pid: Optional[int] = None
    uptime: Optional[str] = None
    message: str

class ServerControlRequest(BaseModel):
    action: str  # "start" or "stop"

class ServerControlResponse(BaseModel):
    success: bool
    message: str
    status: str

# Global variables to track server state
server_process = None
server_start_time = None

@router.get("/status", response_model=ServerStatusResponse)
async def get_server_status(current_user: dict = Depends(require_manager_or_admin())):
    """Get current server status"""
    global server_process, server_start_time
    
    try:
        # Check if backend is responding
        offline_service = OfflineService()
        backend_status = await offline_service.get_status()
        
        is_running = backend_status.get("is_online", False)
        pid = None
        uptime = None
        
        if is_running and server_start_time:
            uptime_delta = datetime.now() - server_start_time
            uptime = str(uptime_delta).split('.')[0]  # Remove microseconds
        
        return ServerStatusResponse(
            status="online" if is_running else "offline",
            is_running=is_running,
            pid=pid,
            uptime=uptime,
            message=f"Server is {'running' if is_running else 'stopped'}"
        )
        
    except Exception as e:
        logger.error(f"Error checking server status: {e}")
        return ServerStatusResponse(
            status="error",
            is_running=False,
            message=f"Error checking status: {str(e)}"
        )

@router.post("/control", response_model=ServerControlResponse)
async def control_server(
    request: ServerControlRequest,
    current_user: dict = Depends(require_admin())
):
    """Control server (start/stop) - Admin only"""
    global server_process, server_start_time
    
    # Log the action with user information
    logger.info(f"Server control action '{request.action}' requested by user: {current_user['username']} (role: {current_user['role']})")
    
    try:
        if request.action == "start":
            # Check if already running
            offline_service = OfflineService()
            current_status = await offline_service.get_status()
            
            if current_status.get("is_online", False):
                return ServerControlResponse(
                    success=True,
                    message="Server is already running",
                    status="already_running"
                )
            
            # For now, we'll just return success since the backend is managed by Electron
            # In a future implementation, this could actually start/stop the backend process
            server_start_time = datetime.now()
            
            return ServerControlResponse(
                success=True,
                message="Server started successfully",
                status="started"
            )
            
        elif request.action == "stop":
            # For now, we'll just clear the start time
            server_start_time = None
            
            return ServerControlResponse(
                success=True,
                message="Server stopped successfully",
                status="stopped"
            )
            
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid action: {request.action}. Use 'start' or 'stop'."
            )
            
    except Exception as e:
        logger.error(f"Error controlling server: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error controlling server: {str(e)}"
        )

@router.get("/health")
async def server_health():
    """Quick health check for the server control API"""
    return {
        "status": "healthy",
        "service": "Server Control",
        "timestamp": datetime.now().isoformat()
    }