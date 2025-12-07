import os
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

class Microsoft365Service:
    """
    Microsoft 365 integration service for email notifications and calendar integration.
    Supports hybrid offline/online functionality.
    """
    
    def __init__(self):
        self.client_id = os.getenv("MS_CLIENT_ID")
        self.client_secret = os.getenv("MS_CLIENT_SECRET")
        self.tenant_id = os.getenv("MS_TENANT_ID", "common")
        self.redirect_uri = os.getenv("MS_REDIRECT_URI", "http://localhost:8000/auth/microsoft/callback")
        
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
        
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.auth_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0"
        
        # Email templates
        self.email_templates = {
            "low_stock": {
                "subject": "Low Stock Alert - {product_name}",
                "body": """
                <html>
                <body>
                    <h2>Low Stock Alert</h2>
                    <p>The following product is running low on stock:</p>
                    <ul>
                        <li><strong>Product:</strong> {product_name}</li>
                        <li><strong>SKU:</strong> {sku}</li>
                        <li><strong>Current Quantity:</strong> {current_quantity}</li>
                        <li><strong>Minimum Quantity:</strong> {minimum_quantity}</li>
                        <li><strong>Reorder Quantity:</strong> {reorder_quantity}</li>
                    </ul>
                    <p>Please consider restocking this item.</p>
                    <p>Best regards,<br>The Planning Bord System</p>
                </body>
                </html>
                """
            },
            "payment_reminder": {
                "subject": "Payment Reminder - Invoice {invoice_number}",
                "body": """
                <html>
                <body>
                    <h2>Payment Reminder</h2>
                    <p>This is a reminder for the following payment:</p>
                    <ul>
                        <li><strong>Invoice Number:</strong> {invoice_number}</li>
                        <li><strong>Amount:</strong> ${amount}</li>
                        <li><strong>Due Date:</strong> {due_date}</li>
                        <li><strong>Customer:</strong> {customer_name}</li>
                    </ul>
                    <p>Please process this payment at your earliest convenience.</p>
                    <p>Best regards,<br>The Planning Bord System</p>
                </body>
                </html>
                """
            },
            "task_assignment": {
                "subject": "New Task Assignment - {task_title}",
                "body": """
                <html>
                <body>
                    <h2>New Task Assignment</h2>
                    <p>You have been assigned a new task:</p>
                    <ul>
                        <li><strong>Task:</strong> {task_title}</li>
                        <li><strong>Description:</strong> {task_description}</li>
                        <li><strong>Due Date:</strong> {due_date}</li>
                        <li><strong>Priority:</strong> {priority}</li>
                    </ul>
                    <p>Please complete this task by the due date.</p>
                    <p>Best regards,<br>The Planning Bord System</p>
                </body>
                </html>
                """
            }
        }
    
    async def initialize(self) -> bool:
        """Initialize the Microsoft 365 service"""
        try:
            if not self.is_configured():
                logger.warning("Microsoft 365 integration not configured")
                return False
            
            # Try to load existing tokens
            await self.load_tokens()
            
            # Validate current token
            if self.access_token and await self.validate_token():
                logger.info("Microsoft 365 service initialized successfully")
                return True
            
            # Try to refresh token if we have a refresh token
            if self.refresh_token:
                success = await self.refresh_access_token()
                if success:
                    logger.info("Microsoft 365 service initialized with refreshed token")
                    return True
            
            logger.info("Microsoft 365 service requires authentication")
            return False
            
        except Exception as e:
            logger.error(f"Failed to initialize Microsoft 365 service: {e}")
            return False
    
    def is_configured(self) -> bool:
        """Check if Microsoft 365 is properly configured"""
        return bool(self.client_id and self.client_secret)
    
    def is_authenticated(self) -> bool:
        """Check if the service is currently authenticated"""
        return bool(self.access_token and self.token_expires_at and datetime.utcnow() < self.token_expires_at)
    
    async def load_tokens(self):
        """Load tokens from environment or secure storage"""
        self.access_token = os.getenv("MS_ACCESS_TOKEN")
        self.refresh_token = os.getenv("MS_REFRESH_TOKEN")
        
        expires_at_str = os.getenv("MS_TOKEN_EXPIRES_AT")
        if expires_at_str:
            try:
                self.token_expires_at = datetime.fromisoformat(expires_at_str)
            except ValueError:
                pass
    
    async def save_tokens(self):
        """Save tokens to environment or secure storage"""
        os.environ["MS_ACCESS_TOKEN"] = self.access_token or ""
        os.environ["MS_REFRESH_TOKEN"] = self.refresh_token or ""
        os.environ["MS_TOKEN_EXPIRES_AT"] = self.token_expires_at.isoformat() if self.token_expires_at else ""
    
    async def validate_token(self) -> bool:
        """Validate the current access token"""
        if not self.access_token:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                async with session.get(f"{self.base_url}/me", headers=headers) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Refresh the access token using the refresh token"""
        if not self.refresh_token:
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": self.refresh_token,
                    "grant_type": "refresh_token",
                    "scope": "https://graph.microsoft.com/.default"
                }
                
                async with session.post(f"{self.auth_url}/token", data=data) as response:
                    if response.status == 200:
                        token_data = await response.json()
                        self.access_token = token_data.get("access_token")
                        self.refresh_token = token_data.get("refresh_token", self.refresh_token)
                        
                        expires_in = token_data.get("expires_in", 3600)
                        self.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                        
                        await self.save_tokens()
                        logger.info("Access token refreshed successfully")
                        return True
                    else:
                        logger.error(f"Token refresh failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return False
    
    async def get_auth_url(self, state: str = None) -> str:
        """Get the Microsoft authentication URL"""
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "scope": "https://graph.microsoft.com/.default",
            "state": state or "planning_bord_auth"
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items() if v])
        return f"{self.auth_url}/authorize?{query_string}"
    
    async def exchange_code_for_token(self, code: str) -> bool:
        """Exchange authorization code for access token"""
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                    "scope": "https://graph.microsoft.com/.default"
                }
                
                async with session.post(f"{self.auth_url}/token", data=data) as response:
                    if response.status == 200:
                        token_data = await response.json()
                        self.access_token = token_data.get("access_token")
                        self.refresh_token = token_data.get("refresh_token")
                        
                        expires_in = token_data.get("expires_in", 3600)
                        self.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                        
                        await self.save_tokens()
                        logger.info("Access token obtained successfully")
                        return True
                    else:
                        error_data = await response.json()
                        logger.error(f"Token exchange failed: {error_data}")
                        return False
                        
        except Exception as e:
            logger.error(f"Token exchange failed: {e}")
            return False
    
    async def send_email(self, to_email: str, subject: str, body: str, cc_emails: List[str] = None) -> bool:
        """Send an email using Microsoft Graph API"""
        if not self.is_authenticated():
            logger.error("Not authenticated to send email")
            return False
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json"
                }
                
                email_data = {
                    "message": {
                        "subject": subject,
                        "body": {
                            "contentType": "HTML",
                            "content": body
                        },
                        "toRecipients": [{"emailAddress": {"address": to_email}}]
                    },
                    "saveToSentItems": True
                }
                
                if cc_emails:
                    email_data["message"]["ccRecipients"] = [
                        {"emailAddress": {"address": email}} for email in cc_emails
                    ]
                
                async with session.post(f"{self.base_url}/me/sendMail", headers=headers, json=email_data) as response:
                    if response.status == 202:
                        logger.info(f"Email sent successfully to {to_email}")
                        return True
                    else:
                        logger.error(f"Email sending failed: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Email sending failed: {e}")
            return False
    
    async def send_low_stock_notification(self, product_data: Dict[str, Any]) -> bool:
        """Send low stock notification email"""
        if not self.is_configured():
            return False
        
        template = self.email_templates["low_stock"]
        subject = template["subject"].format(**product_data)
        body = template["body"].format(**product_data)
        
        # Get notification email from environment or product data
        notification_email = product_data.get("notification_email") or os.getenv("NOTIFICATION_EMAIL")
        
        if not notification_email:
            logger.warning("No notification email configured for low stock alerts")
            return False
        
        return await self.send_email(notification_email, subject, body)
    
    async def send_payment_reminder(self, payment_data: Dict[str, Any]) -> bool:
        """Send payment reminder email"""
        if not self.is_configured():
            return False
        
        template = self.email_templates["payment_reminder"]
        subject = template["subject"].format(**payment_data)
        body = template["body"].format(**payment_data)
        
        # Get notification email
        notification_email = payment_data.get("notification_email") or os.getenv("NOTIFICATION_EMAIL")
        
        if not notification_email:
            logger.warning("No notification email configured for payment reminders")
            return False
        
        return await self.send_email(notification_email, subject, body)
    
    async def send_task_assignment_notification(self, task_data: Dict[str, Any], employee_email: str) -> bool:
        """Send task assignment notification email"""
        if not self.is_configured():
            return False
        
        template = self.email_templates["task_assignment"]
        subject = template["subject"].format(**task_data)
        body = template["body"].format(**task_data)
        
        return await self.send_email(employee_email, subject, body)
    
    async def get_user_info(self) -> Optional[Dict[str, Any]]:
        """Get current user information"""
        if not self.is_authenticated():
            return None
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                async with session.get(f"{self.base_url}/me", headers=headers) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return None
        except Exception as e:
            logger.error(f"Failed to get user info: {e}")
            return None
    
    async def disconnect(self):
        """Disconnect from Microsoft 365"""
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
        
        # Clear environment variables
        os.environ.pop("MS_ACCESS_TOKEN", None)
        os.environ.pop("MS_REFRESH_TOKEN", None)
        os.environ.pop("MS_TOKEN_EXPIRES_AT", None)
        
        logger.info("Disconnected from Microsoft 365")

# Global instance
microsoft_service = Microsoft365Service()