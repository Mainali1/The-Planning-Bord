from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime
import enum

class PaymentType(str, enum.Enum):
    SUPPLIER = "supplier"
    SALARY = "salary"
    EXPENSE = "expense"
    OTHER = "other"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CHECK = "check"
    CREDIT_CARD = "credit_card"
    OTHER = "other"

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    payment_type = Column(Enum(PaymentType), nullable=False)
    
    # Payment details
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    description = Column(Text)
    
    # Status and dates
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_date = Column(DateTime)
    due_date = Column(DateTime)
    
    # Payment method
    payment_method = Column(Enum(PaymentMethod), default=PaymentMethod.BANK_TRANSFER)
    reference_number = Column(String(100))
    
    # Related entities
    employee_id = Column(Integer, ForeignKey("employees.id"))
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    
    # Additional information
    notes = Column(Text)
    attachments = Column(Text)  # JSON array of file paths
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee")
    supplier = relationship("Supplier")
    
    def to_dict(self):
        return {
            "id": self.id,
            "payment_type": self.payment_type,
            "amount": self.amount,
            "currency": self.currency,
            "description": self.description,
            "status": self.status,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "payment_method": self.payment_method,
            "reference_number": self.reference_number,
            "employee_id": self.employee_id,
            "supplier_id": self.supplier_id,
            "notes": self.notes,
            "attachments": self.attachments,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    
    # Address
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    
    # Business details
    tax_id = Column(String(100))
    website = Column(String(255))
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "contact_person": self.contact_person,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "postal_code": self.postal_code,
            "tax_id": self.tax_id,
            "website": self.website,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Salary(Base):
    __tablename__ = "salaries"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Salary details
    base_salary = Column(Float, nullable=False)
    bonus = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    
    # Pay period
    pay_period_start = Column(DateTime, nullable=False)
    pay_period_end = Column(DateTime, nullable=False)
    
    # Status
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    paid_date = Column(DateTime)
    
    # Calculations
    gross_pay = Column(Float)
    net_pay = Column(Float)
    
    # Additional information
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee")
    
    def calculate_gross_pay(self):
        return self.base_salary + self.bonus
    
    def calculate_net_pay(self):
        return self.calculate_gross_pay() - self.deductions
    
    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "base_salary": self.base_salary,
            "bonus": self.bonus,
            "deductions": self.deductions,
            "pay_period_start": self.pay_period_start.isoformat() if self.pay_period_start else None,
            "pay_period_end": self.pay_period_end.isoformat() if self.pay_period_end else None,
            "status": self.status,
            "paid_date": self.paid_date.isoformat() if self.paid_date else None,
            "gross_pay": self.gross_pay,
            "net_pay": self.net_pay,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class FinancialReport(Base):
    __tablename__ = "financial_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Report details
    report_type = Column(String(50), nullable=False)  # monthly, yearly, custom
    report_period_start = Column(DateTime, nullable=False)
    report_period_end = Column(DateTime, nullable=False)
    
    # Summary data (stored as JSON)
    total_expenses = Column(Float)
    total_payments = Column(Float)
    total_salaries = Column(Float)
    
    # Detailed breakdown (stored as JSON)
    category_breakdown = Column(Text)
    
    # File generation
    report_file_path = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "report_type": self.report_type,
            "report_period_start": self.report_period_start.isoformat() if self.report_period_start else None,
            "report_period_end": self.report_period_end.isoformat() if self.report_period_end else None,
            "total_expenses": self.total_expenses,
            "total_payments": self.total_payments,
            "total_salaries": self.total_salaries,
            "category_breakdown": self.category_breakdown,
            "report_file_path": self.report_file_path,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }