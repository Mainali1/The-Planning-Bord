import os
import asyncio
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from src.database import get_db
from src.models import Product, InventoryLog
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

class OfflineService:
    """
    Service to manage offline/online functionality.
    When offline, certain features are disabled.
    When online, sync with cloud services and enable full functionality.
    """
    
    def __init__(self):
        self.is_online = False
        self.offline_mode = os.getenv("OFFLINE_MODE", "false").lower() == "true"
        self.cloud_api_url = os.getenv("CLOUD_API_URL", "")
        self.last_sync = None
        self.pending_sync_operations = []
        
    async def initialize(self):
        """Initialize the offline service and check connectivity"""
        await self.check_connectivity()
        
        if self.is_online and not self.offline_mode:
            await self.sync_with_cloud()
        
        logger.info(f"Offline service initialized. Online: {self.is_online}, Offline mode: {self.offline_mode}")
    
    async def check_connectivity(self):
        """Check if we have internet connectivity"""
        try:
            # Test connectivity to a reliable endpoint
            response = requests.get("https://www.microsoft.com", timeout=5)
            self.is_online = response.status_code == 200
        except Exception as e:
            logger.warning(f"Connectivity check failed: {e}")
            self.is_online = False
        
        return self.is_online
    
    async def get_status(self) -> Dict[str, Any]:
        """Get current system status"""
        return {
            "online": self.is_online,
            "offline_mode": self.offline_mode,
            "last_sync": self.last_sync.isoformat() if self.last_sync else None,
            "pending_operations": len(self.pending_sync_operations),
            "microsoft_365_available": self.is_microsoft_365_available(),
            "cloud_sync_available": self.is_cloud_sync_available()
        }
    
    def is_microsoft_365_available(self) -> bool:
        """Check if Microsoft 365 integration is available"""
        return self.is_online and not self.offline_mode and bool(os.getenv("MS_CLIENT_ID"))
    
    def is_cloud_sync_available(self) -> bool:
        """Check if cloud sync is available"""
        return self.is_online and not self.offline_mode and bool(self.cloud_api_url)
    
    def can_send_emails(self) -> bool:
        """Check if email functionality is available"""
        return self.is_microsoft_365_available() or bool(os.getenv("SMTP_SERVER"))
    
    def add_pending_operation(self, operation: Dict[str, Any]):
        """Add an operation to be synced when online"""
        operation["timestamp"] = datetime.utcnow()
        operation["status"] = "pending"
        self.pending_sync_operations.append(operation)
        logger.info(f"Added pending operation: {operation.get('type', 'unknown')}")
    
    async def sync_with_cloud(self):
        """Sync local data with cloud server"""
        if not self.is_cloud_sync_available():
            logger.warning("Cloud sync not available")
            return
        
        try:
            # Sync pending operations
            for operation in self.pending_sync_operations[:]:
                success = await self._sync_operation(operation)
                if success:
                    self.pending_sync_operations.remove(operation)
            
            # Sync inventory data
            await self._sync_inventory_data()
            
            self.last_sync = datetime.utcnow()
            logger.info("Cloud sync completed successfully")
            
        except Exception as e:
            logger.error(f"Cloud sync failed: {e}")
    
    async def _sync_operation(self, operation: Dict[str, Any]) -> bool:
        """Sync a single operation with cloud"""
        try:
            # Implement operation-specific sync logic
            operation_type = operation.get("type")
            
            if operation_type == "inventory_update":
                return await self._sync_inventory_update(operation)
            elif operation_type == "employee_add":
                return await self._sync_employee_add(operation)
            elif operation_type == "payment_add":
                return await self._sync_payment_add(operation)
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to sync operation {operation_type}: {e}")
            return False
    
    async def _sync_inventory_update(self, operation: Dict[str, Any]) -> bool:
        """Sync inventory update with cloud"""
        try:
            response = requests.post(
                f"{self.cloud_api_url}/inventory/sync",
                json=operation.get("data", {}),
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Inventory sync failed: {e}")
            return False
    
    async def _sync_employee_add(self, operation: Dict[str, Any]) -> bool:
        """Sync employee addition with cloud"""
        try:
            response = requests.post(
                f"{self.cloud_api_url}/employees/sync",
                json=operation.get("data", {}),
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Employee sync failed: {e}")
            return False
    
    async def _sync_payment_add(self, operation: Dict[str, Any]) -> bool:
        """Sync payment addition with cloud"""
        try:
            response = requests.post(
                f"{self.cloud_api_url}/payments/sync",
                json=operation.get("data", {}),
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Payment sync failed: {e}")
            return False
    
    async def _sync_inventory_data(self):
        """Sync inventory data with cloud"""
        try:
            db = next(get_db())
            
            # Get products that need sync
            products = db.query(Product).filter(Product.is_active == True).all()
            
            for product in products:
                sync_data = {
                    "local_id": product.id,
                    "sku": product.sku,
                    "name": product.name,
                    "current_quantity": product.current_quantity,
                    "last_updated": product.updated_at.isoformat() if product.updated_at else None
                }
                
                response = requests.post(
                    f"{self.cloud_api_url}/inventory/products/sync",
                    json=sync_data,
                    timeout=10
                )
                
                if response.status_code != 200:
                    logger.warning(f"Failed to sync product {product.sku}")
            
            logger.info(f"Synced {len(products)} products with cloud")
            
        except Exception as e:
            logger.error(f"Inventory data sync failed: {e}")
    
    def get_available_features(self) -> Dict[str, bool]:
        """Get available features based on connectivity"""
        return {
            "inventory_management": True,  # Always available offline
            "employee_management": True,   # Always available offline
            "payment_tracking": True,      # Always available offline
            "email_notifications": self.can_send_emails(),
            "microsoft_365_integration": self.is_microsoft_365_available(),
            "cloud_sync": self.is_cloud_sync_available(),
            "automatic_restock": self.can_send_emails(),
            "online_reports": self.is_online,
            "backup_to_cloud": self.is_cloud_sync_available()
        }
    
    async def switch_to_offline_mode(self):
        """Switch to offline mode"""
        self.offline_mode = True
        os.environ["OFFLINE_MODE"] = "true"
        logger.info("Switched to offline mode")
    
    async def switch_to_online_mode(self):
        """Switch to online mode"""
        self.offline_mode = False
        os.environ["OFFLINE_MODE"] = "false"
        
        if self.is_online:
            await self.sync_with_cloud()
        
        logger.info("Switched to online mode")