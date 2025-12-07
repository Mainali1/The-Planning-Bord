from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from ..database import get_db
from ..services.microsoft_service import Microsoft365Service
from ..services.offline_service import OfflineService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["microsoft"])

@router.get("/status")
async def get_microsoft_status():
    """Get Microsoft 365 connection status"""
    try:
        microsoft_service = Microsoft365Service()
        offline_service = OfflineService()
        
        # Check if we're online and Microsoft 365 is configured
        status_info = await offline_service.get_status()
        if not status_info["online"]:
            return {
                "configured": False,
                "authenticated": False,
                "user_info": None,
                "message": "Microsoft 365 features require internet connection"
            }
        
        return {
            "configured": microsoft_service.is_configured(),
            "authenticated": microsoft_service.is_authenticated(),
            "user_info": await microsoft_service.get_user_info() if microsoft_service.is_authenticated() else None,
            "message": None
        }
    except Exception as e:
        logger.error(f"Error checking Microsoft 365 status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/auth-url")
async def get_auth_url():
    """Get Microsoft 365 OAuth authorization URL"""
    try:
        offline_service = OfflineService()
        status_info = await offline_service.get_status()
        
        if not status_info["online"]:
            raise HTTPException(
                status_code=503,
                detail="Microsoft 365 authentication requires internet connection"
            )
        
        microsoft_service = Microsoft365Service()
        if not microsoft_service.is_configured():
            raise HTTPException(
                status_code=503,
                detail="Microsoft 365 is not configured. Please set up client credentials."
            )
        
        auth_url = microsoft_service.get_auth_url()
        return {"auth_url": auth_url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating auth URL: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate authorization URL")

@router.get("/callback")
async def handle_callback(code: str, request: Request):
    """Handle Microsoft 365 OAuth callback"""
    try:
        offline_service = OfflineService()
        status_info = await offline_service.get_status()
        
        if not status_info["online"]:
            return RedirectResponse(url="/microsoft/error?reason=offline")
        
        microsoft_service = Microsoft365Service()
        success = await microsoft_service.exchange_code_for_token(code)
        
        if success:
            return RedirectResponse(url="/microsoft/success")
        else:
            return RedirectResponse(url="/microsoft/error?reason=auth_failed")
    except Exception as e:
        logger.error(f"Error handling Microsoft 365 callback: {e}")
        return RedirectResponse(url="/microsoft/error?reason=server_error")

@router.post("/disconnect")
async def disconnect_microsoft():
    """Disconnect from Microsoft 365"""
    try:
        microsoft_service = Microsoft365Service()
        microsoft_service.disconnect()
        return {"message": "Successfully disconnected from Microsoft 365"}
    except Exception as e:
        logger.error(f"Error disconnecting Microsoft 365: {e}")
        raise HTTPException(status_code=500, detail="Failed to disconnect")

@router.post("/send-email")
async def send_email(
    to_email: str,
    subject: str,
    body: str,
    cc_emails: Optional[List[str]] = None
):
    """Send email via Microsoft 365"""
    try:
        offline_service = OfflineService()
        status_info = await offline_service.get_status()
        
        if not status_info["online"]:
            raise HTTPException(
                status_code=503,
                detail="Email sending requires internet connection"
            )
        
        microsoft_service = Microsoft365Service()
        if not microsoft_service.is_authenticated():
            raise HTTPException(
                status_code=401,
                detail="Not authenticated with Microsoft 365"
            )
        
        success = await microsoft_service.send_email(to_email, subject, body, cc_emails)
        if success:
            return {"message": "Email sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")

@router.post("/send-low-stock-notification")
async def send_low_stock_notification(
    product_name: str,
    sku: str,
    current_quantity: int,
    minimum_quantity: int,
    reorder_quantity: int,
    to_emails: List[str]
):
    """Send low stock notification emails"""
    try:
        offline_service = OfflineService()
        status_info = await offline_service.get_status()
        
        if not status_info["online"]:
            return {
                "message": "Notification queued - will be sent when online",
                "queued": True,
                "offline": True
            }
        
        microsoft_service = Microsoft365Service()
        if not microsoft_service.is_authenticated():
            raise HTTPException(
                status_code=401,
                detail="Not authenticated with Microsoft 365"
            )
        
        results = []
        for email in to_emails:
            success = await microsoft_service.send_low_stock_notification(
                email, product_name, sku, current_quantity, minimum_quantity, reorder_quantity
            )
            results.append({"email": email, "sent": success})
        
        successful = sum(1 for r in results if r["sent"])
        return {
            "message": f"Sent {successful}/{len(to_emails)} notifications",
            "results": results,
            "queued": False,
            "offline": False
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending low stock notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to send notifications")

@router.post("/send-payment-reminder")
async def send_payment_reminder(
    to_email: str,
    customer_name: str,
    amount: float,
    due_date: str,
    invoice_number: str
):
    """Send payment reminder email"""
    try:
        offline_service = OfflineService()
        status_info = await offline_service.get_status()
        
        if not status_info["online"]:
            return {
                "message": "Reminder queued - will be sent when online",
                "queued": True,
                "offline": True
            }
        
        microsoft_service = Microsoft365Service()
        if not microsoft_service.is_authenticated():
            raise HTTPException(
                status_code=401,
                detail="Not authenticated with Microsoft 365"
            )
        
        success = await microsoft_service.send_payment_reminder(
            to_email, customer_name, amount, due_date, invoice_number
        )
        
        if success:
            return {"message": "Payment reminder sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send payment reminder")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending payment reminder: {e}")
        raise HTTPException(status_code=500, detail="Failed to send payment reminder")

@router.post("/send-task-assignment")
async def send_task_assignment(
    to_email: str,
    employee_name: str,
    task_title: str,
    task_description: str,
    due_date: str,
    assigned_by: str
):
    """Send task assignment notification"""
    try:
        offline_service = OfflineService()
        status_info = await offline_service.get_status()
        
        if not status_info["online"]:
            return {
                "message": "Task notification queued - will be sent when online",
                "queued": True,
                "offline": True
            }
        
        microsoft_service = Microsoft365Service()
        if not microsoft_service.is_authenticated():
            raise HTTPException(
                status_code=401,
                detail="Not authenticated with Microsoft 365"
            )
        
        success = await microsoft_service.send_task_assignment_notification(
            to_email, employee_name, task_title, task_description, due_date, assigned_by
        )
        
        if success:
            return {"message": "Task assignment notification sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send task assignment")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending task assignment: {e}")
        raise HTTPException(status_code=500, detail="Failed to send task assignment")

@router.get("/success")
async def auth_success():
    """Microsoft 365 authentication success page"""
    return {
        "message": "Successfully connected to Microsoft 365",
        "status": "success"
    }

@router.get("/error")
async def auth_error(reason: str = "unknown"):
    """Microsoft 365 authentication error page"""
    error_messages = {
        "offline": "Microsoft 365 authentication requires internet connection",
        "auth_failed": "Authentication failed. Please try again.",
        "server_error": "Server error occurred. Please try again."
    }
    return {
        "message": error_messages.get(reason, "Unknown error occurred"),
        "status": "error",
        "reason": reason
    }