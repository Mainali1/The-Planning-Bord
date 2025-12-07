from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Dict, Any
from datetime import datetime, timedelta, date

from src.database import get_db
from src.models import Product, InventoryLog, Employee, Payment, User, Task, Attendance
from src.models.payment import PaymentStatus, PaymentType
from src.models.employee import EmployeeStatus
from src.services.offline_service import OfflineService
from src.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

@router.get("/summary")
async def get_dashboard_summary(db: Session = Depends(get_db)):
    """Get dashboard summary data"""
    try:
        today = date.today()
        start_of_month = today.replace(day=1)
        
        # Inventory metrics
        total_products = db.query(Product).filter(Product.is_active == True).count()
        low_stock_products = db.query(Product).filter(
            and_(
                Product.current_quantity < Product.minimum_quantity,
                Product.is_active == True
            )
        ).count()
        
        # Employee metrics
        total_employees = db.query(Employee).filter(Employee.status == EmployeeStatus.ACTIVE).count()
        
        # Today's attendance
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        
        present_today = db.query(Attendance).filter(
            and_(
                Attendance.check_in >= today_start,
                Attendance.check_in <= today_end,
                Attendance.status == "present"
            )
        ).count()
        
        # Payment metrics
        total_payments_this_month = db.query(func.sum(Payment.amount)).filter(
            and_(
                Payment.payment_date >= start_of_month,
                Payment.payment_date <= today,
                Payment.status == PaymentStatus.PAID
            )
        ).scalar() or 0
        
        pending_payments = db.query(func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.PENDING
        ).scalar() or 0
        
        overdue_payments = db.query(Payment).filter(
            and_(
                Payment.status == PaymentStatus.PENDING,
                Payment.due_date < today
            )
        ).count()
        
        # Task metrics
        total_tasks = db.query(Task).count()
        pending_tasks = db.query(Task).filter(Task.status == "pending").count()
        overdue_tasks = db.query(Task).filter(
            and_(
                Task.status != "completed",
                Task.due_date < datetime.utcnow()
            )
        ).count()
        
        return {
            "inventory": {
                "total_products": total_products,
                "low_stock_products": low_stock_products,
                "low_stock_percentage": (low_stock_products / total_products * 100) if total_products > 0 else 0
            },
            "employees": {
                "total_employees": total_employees,
                "present_today": present_today
            },
            "payments": {
                "total_paid_this_month": float(total_payments_this_month),
                "pending_payments": float(pending_payments),
                "overdue_payments": overdue_payments
            },
            "tasks": {
                "total_tasks": total_tasks,
                "pending_tasks": pending_tasks,
                "overdue_tasks": overdue_tasks
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch dashboard summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard summary"
        )

@router.get("/low-stock")
async def get_low_stock_items(db: Session = Depends(get_db)):
    """Get low stock items for dashboard"""
    try:
        low_stock_items = db.query(Product).filter(
            and_(
                Product.current_quantity < Product.minimum_quantity,
                Product.is_active == True
            )
        ).order_by(
            (Product.minimum_quantity - Product.current_quantity).desc()
        ).limit(10).all()
        
        return [{
            "id": item.id,
            "name": item.name,
            "sku": item.sku,
            "current_quantity": item.current_quantity,
            "minimum_quantity": item.minimum_quantity,
            "reorder_quantity": item.reorder_quantity,
            "unit_price": item.unit_price,
            "supplier_name": item.supplier_name,
            "supplier_email": item.supplier_email,
            "category": item.category
        } for item in low_stock_items]
        
    except Exception as e:
        logger.error(f"Failed to fetch low stock items: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch low stock items"
        )

@router.get("/recent-activities")
async def get_recent_activities(db: Session = Depends(get_db)):
    """Get recent activities for dashboard"""
    try:
        # Recent inventory activities
        recent_inventory = db.query(InventoryLog).join(Product).filter(
            InventoryLog.created_at >= datetime.utcnow() - timedelta(days=7)
        ).order_by(InventoryLog.created_at.desc()).limit(5).all()
        
        # Recent payments
        recent_payments = db.query(Payment).filter(
            Payment.created_at >= datetime.utcnow() - timedelta(days=7)
        ).order_by(Payment.created_at.desc()).limit(5).all()
        
        # Recent tasks
        recent_tasks = db.query(Task).join(Employee).filter(
            Task.created_at >= datetime.utcnow() - timedelta(days=7)
        ).order_by(Task.created_at.desc()).limit(5).all()
        
        activities = []
        
        # Add inventory activities
        for log in recent_inventory:
            activities.append({
                "type": "inventory",
                "timestamp": log.created_at.isoformat(),
                "title": f"Inventory {log.action}",
                "description": f"{log.action.title()} {log.quantity_change} units of {log.product.name}",
                "icon": "📦",
                "color": "blue"
            })
        
        # Add payment activities
        for payment in recent_payments:
            activities.append({
                "type": "payment",
                "timestamp": payment.created_at.isoformat(),
                "title": f"Payment {payment.status}",
                "description": f"{payment.payment_type.title()} payment of ${payment.amount:.2f}",
                "icon": "💰",
                "color": "green"
            })
        
        # Add task activities
        for task in recent_tasks:
            activities.append({
                "type": "task",
                "timestamp": task.created_at.isoformat(),
                "title": f"Task {task.status}",
                "description": f"Task '{task.title}' assigned to {task.employee.full_name()}",
                "icon": "📋",
                "color": "orange"
            })
        
        # Sort by timestamp (most recent first)
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return activities[:15]  # Return top 15 activities
        
    except Exception as e:
        logger.error(f"Failed to fetch recent activities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch recent activities"
        )

@router.get("/payment-trends")
async def get_payment_trends(days: int = 30, db: Session = Depends(get_db)):
    """Get payment trends for dashboard"""
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Get daily payment totals
        daily_payments = db.query(
            func.date(Payment.payment_date).label('date'),
            func.sum(Payment.amount).label('total')
        ).filter(
            and_(
                Payment.payment_date >= start_date,
                Payment.payment_date <= end_date,
                Payment.status == PaymentStatus.PAID
            )
        ).group_by(
            func.date(Payment.payment_date)
        ).order_by(
            func.date(Payment.payment_date)
        ).all()
        
        # Get payment breakdown by type
        payment_breakdown = db.query(
            Payment.payment_type,
            func.sum(Payment.amount).label('total')
        ).filter(
            and_(
                Payment.payment_date >= start_date,
                Payment.payment_date <= end_date,
                Payment.status == PaymentStatus.PAID
            )
        ).group_by(
            Payment.payment_type
        ).all()
        
        # Format data for charts
        dates = []
        totals = []
        for payment in daily_payments:
            dates.append(payment.date.isoformat())
            totals.append(float(payment.total))
        
        breakdown = {}
        for payment_type, total in payment_breakdown:
            breakdown[payment_type] = float(total)
        
        return {
            "daily_trends": {
                "dates": dates,
                "totals": totals
            },
            "breakdown": breakdown,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch payment trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch payment trends"
        )

@router.get("/employee-stats")
async def get_employee_stats(db: Session = Depends(get_db)):
    """Get employee statistics for dashboard"""
    try:
        today = date.today()
        start_of_month = today.replace(day=1)
        
        # Total employees by status
        employees_by_status = db.query(
            Employee.status,
            func.count(Employee.id).label('count')
        ).group_by(Employee.status).all()
        
        # Employees by department
        employees_by_department = db.query(
            Employee.department,
            func.count(Employee.id).label('count')
        ).filter(Employee.department != None).group_by(Employee.department).all()
        
        # Attendance this month
        attendance_stats = db.query(
            Attendance.status,
            func.count(Attendance.id).label('count')
        ).filter(
            and_(
                Attendance.check_in >= start_of_month,
                Attendance.check_in <= today
            )
        ).group_by(Attendance.status).all()
        
        # Task completion rate
        total_tasks = db.query(Task).count()
        completed_tasks = db.query(Task).filter(Task.status == "completed").count()
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        return {
            "employees_by_status": {status: count for status, count in employees_by_status},
            "employees_by_department": {dept: count for dept, count in employees_by_department if dept},
            "attendance_this_month": {status: count for status, count in attendance_stats},
            "task_completion_rate": completion_rate,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch employee stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch employee stats"
        )

@router.get("/system-status")
async def get_system_status():
    """Get system status for dashboard"""
    try:
        offline_service = OfflineService()
        status_info = await offline_service.get_status()
        
        return {
            "online": status_info["online"],
            "backend_status": "running",
            "database_status": "connected",
            "microsoft_365_status": "connected" if status_info["microsoft_365_available"] else "disconnected",
            "last_sync": status_info["last_sync"],
            "pending_operations": status_info["pending_operations"]
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch system status: {e}")
        return {
            "online": False,
            "backend_status": "error",
            "database_status": "error",
            "microsoft_365_status": "disconnected",
            "last_sync": None,
            "pending_operations": 0,
            "error": str(e)
        }

@router.get("/notifications")
async def get_dashboard_notifications(db: Session = Depends(get_db)):
    """Get dashboard notifications"""
    try:
        notifications = []
        today = date.today()
        
        # Low stock notifications
        low_stock_count = db.query(Product).filter(
            and_(
                Product.current_quantity < Product.minimum_quantity,
                Product.is_active == True
            )
        ).count()
        
        if low_stock_count > 0:
            notifications.append({
                "type": "warning",
                "title": f"{low_stock_count} products need restocking",
                "message": "Some products are below minimum stock levels",
                "action": "/inventory",
                "priority": "high"
            })
        
        # Overdue payments
        overdue_payments = db.query(Payment).filter(
            and_(
                Payment.status == PaymentStatus.PENDING,
                Payment.due_date < today
            )
        ).count()
        
        if overdue_payments > 0:
            notifications.append({
                "type": "error",
                "title": f"{overdue_payments} overdue payments",
                "message": "Some payments are past their due dates",
                "action": "/payments",
                "priority": "high"
            })
        
        # Overdue tasks
        overdue_tasks = db.query(Task).filter(
            and_(
                Task.status != "completed",
                Task.due_date < datetime.utcnow()
            )
        ).count()
        
        if overdue_tasks > 0:
            notifications.append({
                "type": "warning",
                "title": f"{overdue_tasks} overdue tasks",
                "message": "Some tasks are past their due dates",
                "action": "/employees",
                "priority": "medium"
            })
        
        # System status
        offline_service = OfflineService()
        status_info = await offline_service.get_status()
        if not status_info["online"]:
            notifications.append({
                "type": "info",
                "title": "Working offline",
                "message": "Some features may be limited while offline",
                "action": "/settings",
                "priority": "low"
            })
        
        return {
            "notifications": notifications,
            "total_count": len(notifications),
            "high_priority": len([n for n in notifications if n["priority"] == "high"])
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch notifications: {e}")
        return {
            "notifications": [],
            "total_count": 0,
            "high_priority": 0,
            "error": str(e)
        }