from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
import os
from dotenv import load_dotenv

from src.database import engine, Base
from src.controllers import (
    inventory_router,
    employee_router,
    payment_router,
    dashboard_router,
    auth_router,
    microsoft_router,
    setup_router,
    server_router
)
from src.services.offline_service import OfflineService
from src.utils.logger import setup_logger
from src.config import settings

load_dotenv()

logger = setup_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting The Planning Bord Desktop Backend...")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Initialize offline service
    offline_service = OfflineService()
    await offline_service.initialize()
    
    logger.info("Backend started successfully")
    yield
    
    # Shutdown
    logger.info("Shutting down backend...")

app = FastAPI(
    title="The Planning Bord Desktop API",
    description="Business Management System Desktop Application Backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(setup_router, prefix="/api/setup", tags=["Setup"])
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(inventory_router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(employee_router, prefix="/api/employees", tags=["Employees"])
app.include_router(payment_router, prefix="/api/payments", tags=["Payments"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(microsoft_router, prefix="/api/microsoft", tags=["Microsoft 365"])
app.include_router(server_router, prefix="/api/server", tags=["Server Management"])

@app.get("/")
async def root():
    return {
        "message": "The Planning Bord Desktop API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "The Planning Bord Desktop Backend",
        "offline_mode": os.getenv("OFFLINE_MODE", "false").lower() == "true"
    }

@app.get("/api/status")
async def get_system_status():
    """Get current system status including online/offline state"""
    offline_service = OfflineService()
    return await offline_service.get_status()

if __name__ == "__main__":
    host = settings.BACKEND_HOST if hasattr(settings, 'BACKEND_HOST') else "localhost"
    port = int(os.getenv("BACKEND_PORT", 8000))
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    )