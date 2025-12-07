from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, date

from src.database import get_db
from src.models.payment import Payment, Supplier, Salary, FinancialReport, PaymentType, PaymentStatus, PaymentMethod
from src.services.offline_service import OfflineService
from src.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

# Pydantic models
class PaymentCreate(BaseModel):
    payment_type: PaymentType
    amount: float
    currency: str = "USD"
    description: Optional[str] = None
    status: PaymentStatus = PaymentStatus.PENDING
    payment_date: Optional[date] = None
    due_date: Optional[date] = None
    payment_method: PaymentMethod = PaymentMethod.BANK_TRANSFER
    reference_number: Optional[str] = None
    employee_id: Optional[int] = None
    supplier_id: Optional[int] = None
    notes: Optional[str] = None

class PaymentUpdate(BaseModel):
    payment_type: Optional[PaymentType] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    status: Optional[PaymentStatus] = None
    payment_date: Optional[date] = None
    due_date: Optional[date] = None
    payment_method: Optional[PaymentMethod] = None
    reference_number: Optional[str] = None
    employee_id: Optional[int] = None
    supplier_id: Optional[int] = None
    notes: Optional[str] = None

class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    tax_id: Optional[str] = None
    website: Optional[str] = None

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    tax_id: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None

class SalaryCreate(BaseModel):
    employee_id: int
    base_salary: float
    bonus: float = 0.0
    deductions: float = 0.0
    pay_period_start: date
    pay_period_end: date
    status: PaymentStatus = PaymentStatus.PENDING
    notes: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    payment_type: str
    amount: float
    currency: str
    description: Optional[str]
    status: str
    payment_date: Optional[str]
    due_date: Optional[str]
    payment_method: str
    reference_number: Optional[str]
    employee_id: Optional[int]
    supplier_id: Optional[int]
    notes: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

@router.post("/payments", response_model=PaymentResponse)
async def create_payment(payment: PaymentCreate, db: Session = Depends(get_db)):
    """Create a new payment"""
    try:
        # Validate employee/supplier based on payment type
        if payment.payment_type == PaymentType.SALARY and not payment.employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee ID is required for salary payments"
            )
        
        if payment.payment_type == PaymentType.SUPPLIER and not payment.supplier_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Supplier ID is required for supplier payments"
            )
        
        new_payment = Payment(**payment.dict())
        db.add(new_payment)
        db.commit()
        db.refresh(new_payment)
        
        logger.info(f"Created payment: {payment.payment_type} - ${payment.amount}")
        return new_payment.to_dict()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment"
        )

@router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(
    skip: int = 0,
    limit: int = 100,
    payment_type: Optional[PaymentType] = None,
    status: Optional[PaymentStatus] = None,
    employee_id: Optional[int] = None,
    supplier_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get all payments with optional filtering"""
    try:
        query = db.query(Payment)
        
        if payment_type:
            query = query.filter(Payment.payment_type == payment_type)
        
        if status:
            query = query.filter(Payment.status == status)
        
        if employee_id:
            query = query.filter(Payment.employee_id == employee_id)
        
        if supplier_id:
            query = query.filter(Payment.supplier_id == supplier_id)
        
        if start_date:
            query = query.filter(Payment.payment_date >= start_date)
        
        if end_date:
            query = query.filter(Payment.payment_date <= end_date)
        
        payments = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()
        
        return [payment.to_dict() for payment in payments]
        
    except Exception as e:
        logger.error(f"Failed to fetch payments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch payments"
        )

@router.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: int, db: Session = Depends(get_db)):
    """Get a specific payment by ID"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return payment.to_dict()

@router.put("/payments/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    payment_update: PaymentUpdate,
    db: Session = Depends(get_db)
):
    """Update a payment"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Update fields
    update_data = payment_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(payment, field, value)
    
    payment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(payment)
    
    logger.info(f"Updated payment: {payment_id}")
    return payment.to_dict()

@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: int, db: Session = Depends(get_db)):
    """Delete a payment"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    db.delete(payment)
    db.commit()
    
    logger.info(f"Deleted payment: {payment_id}")
    return {"message": "Payment deleted successfully"}

# Supplier endpoints
@router.post("/suppliers")
async def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db)):
    """Create a new supplier"""
    try:
        new_supplier = Supplier(**supplier.dict())
        db.add(new_supplier)
        db.commit()
        db.refresh(new_supplier)
        
        logger.info(f"Created supplier: {supplier.name}")
        return new_supplier.to_dict()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create supplier: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create supplier"
        )

@router.get("/suppliers")
async def get_suppliers(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all suppliers with optional filtering"""
    try:
        query = db.query(Supplier)
        
        if is_active is not None:
            query = query.filter(Supplier.is_active == is_active)
        
        if search:
            query = query.filter(Supplier.name.contains(search))
        
        suppliers = query.offset(skip).limit(limit).all()
        
        return [supplier.to_dict() for supplier in suppliers]
        
    except Exception as e:
        logger.error(f"Failed to fetch suppliers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch suppliers"
        )

@router.get("/suppliers/{supplier_id}")
async def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Get a specific supplier by ID"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    return supplier.to_dict()

@router.put("/suppliers/{supplier_id}")
async def update_supplier(
    supplier_id: int,
    supplier_update: SupplierUpdate,
    db: Session = Depends(get_db)
):
    """Update a supplier"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    
    # Update fields
    update_data = supplier_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    
    supplier.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(supplier)
    
    logger.info(f"Updated supplier: {supplier_id}")
    return supplier.to_dict()

# Salary endpoints
@router.post("/salaries")
async def create_salary(salary: SalaryCreate, db: Session = Depends(get_db)):
    """Create a new salary record"""
    try:
        # Calculate gross and net pay
        gross_pay = salary.base_salary + salary.bonus
        net_pay = gross_pay - salary.deductions
        
        new_salary = Salary(**salary.dict())
        new_salary.gross_pay = gross_pay
        new_salary.net_pay = net_pay
        
        db.add(new_salary)
        db.commit()
        db.refresh(new_salary)
        
        logger.info(f"Created salary record for employee: {salary.employee_id}")
        return new_salary.to_dict()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create salary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create salary"
        )

@router.get("/salaries")
async def get_salaries(
    skip: int = 0,
    limit: int = 100,
    employee_id: Optional[int] = None,
    status: Optional[PaymentStatus] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get all salary records with optional filtering"""
    try:
        query = db.query(Salary)
        
        if employee_id:
            query = query.filter(Salary.employee_id == employee_id)
        
        if status:
            query = query.filter(Salary.status == status)
        
        if start_date:
            query = query.filter(Salary.pay_period_start >= start_date)
        
        if end_date:
            query = query.filter(Salary.pay_period_end <= end_date)
        
        salaries = query.order_by(Salary.pay_period_start.desc()).offset(skip).limit(limit).all()
        
        return [salary.to_dict() for salary in salaries]
        
    except Exception as e:
        logger.error(f"Failed to fetch salaries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch salaries"
        )

# Financial summary endpoints
@router.get("/financial-summary")
async def get_financial_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get financial summary for a date range"""
    try:
        query = db.query(Payment)
        
        if start_date:
            query = query.filter(Payment.payment_date >= start_date)
        
        if end_date:
            query = query.filter(Payment.payment_date <= end_date)
        
        payments = query.all()
        
        # Calculate totals by type and status
        total_expenses = sum(p.amount for p in payments if p.payment_type != PaymentType.SALARY)
        total_salaries = sum(p.amount for p in payments if p.payment_type == PaymentType.SALARY)
        total_payments = sum(p.amount for p in payments)
        
        # Status breakdown
        pending_payments = sum(p.amount for p in payments if p.status == PaymentStatus.PENDING)
        paid_payments = sum(p.amount for p in payments if p.status == PaymentStatus.PAID)
        overdue_payments = sum(p.amount for p in payments if p.status == PaymentStatus.OVERDUE)
        
        return {
            "total_expenses": total_expenses,
            "total_salaries": total_salaries,
            "total_payments": total_payments,
            "pending_payments": pending_payments,
            "paid_payments": paid_payments,
            "overdue_payments": overdue_payments,
            "payment_count": len(payments),
            "date_range": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch financial summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch financial summary"
        )

# Utility endpoints
@router.get("/payment-types")
async def get_payment_types():
    """Get all payment types"""
    return [payment_type.value for payment_type in PaymentType]

@router.get("/payment-statuses")
async def get_payment_statuses():
    """Get all payment statuses"""
    return [status.value for status in PaymentStatus]

@router.get("/payment-methods")
async def get_payment_methods():
    """Get all payment methods"""
    return [method.value for method in PaymentMethod]