from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime
import enum

class EmployeeRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"
    INTERN = "intern"

class EmployeeStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ON_LEAVE = "on_leave"
    TERMINATED = "terminated"

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True)
    
    # Personal Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(20))
    date_of_birth = Column(DateTime)
    
    # Employment Details
    role = Column(Enum(EmployeeRole), default=EmployeeRole.EMPLOYEE)
    department = Column(String(100))
    position = Column(String(100))
    hire_date = Column(DateTime)
    salary = Column(Float)
    
    # Status
    status = Column(Enum(EmployeeStatus), default=EmployeeStatus.ACTIVE)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    attendances = relationship("Attendance", back_populates="employee")
    tasks = relationship("Task", back_populates="employee")
    tools = relationship("ToolAssignment", back_populates="employee")
    complaints = relationship("Complaint", back_populates="employee")
    
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
    
    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "role": self.role,
            "department": self.department,
            "position": self.position,
            "hire_date": self.hire_date.isoformat() if self.hire_date else None,
            "salary": self.salary,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "full_name": self.full_name()
        }

class Attendance(Base):
    __tablename__ = "attendances"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    check_in = Column(DateTime, nullable=False)
    check_out = Column(DateTime)
    
    # Status tracking
    status = Column(String(50), default="present")  # present, absent, late, early_leave
    notes = Column(Text)
    
    # Location tracking (optional)
    location = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="attendances")
    
    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "check_in": self.check_in.isoformat() if self.check_in else None,
            "check_out": self.check_out.isoformat() if self.check_out else None,
            "status": self.status,
            "notes": self.notes,
            "location": self.location,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Assignment
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"))
    
    # Status and priority
    status = Column(String(50), default="pending")  # pending, active, completed, overdue
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    
    # Dates
    due_date = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Additional info
    notes = Column(Text)
    attachments = Column(Text)  # JSON array of file paths
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="tasks")
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "employee_id": self.employee_id,
            "assigned_by": self.assigned_by,
            "status": self.status,
            "priority": self.priority,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "notes": self.notes,
            "attachments": self.attachments,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class ToolAssignment(Base):
    __tablename__ = "tool_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    tool_name = Column(String(255), nullable=False)
    tool_description = Column(Text)
    
    # Assignment details
    assigned_date = Column(DateTime, default=datetime.utcnow)
    expected_return_date = Column(DateTime)
    actual_return_date = Column(DateTime)
    
    # Condition tracking
    condition_when_assigned = Column(String(255))
    condition_when_returned = Column(String(255))
    
    # Status
    status = Column(String(50), default="assigned")  # assigned, returned, damaged, lost
    damage_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="tools")
    
    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "tool_name": self.tool_name,
            "tool_description": self.tool_description,
            "assigned_date": self.assigned_date.isoformat() if self.assigned_date else None,
            "expected_return_date": self.expected_return_date.isoformat() if self.expected_return_date else None,
            "actual_return_date": self.actual_return_date.isoformat() if self.actual_return_date else None,
            "condition_when_assigned": self.condition_when_assigned,
            "condition_when_returned": self.condition_when_returned,
            "status": self.status,
            "damage_notes": self.damage_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Complaint(Base):
    __tablename__ = "complaints"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Complaint details
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100))  # harassment, safety, equipment, other
    
    # Anonymous flag
    is_anonymous = Column(Boolean, default=False)
    
    # Status
    status = Column(String(50), default="submitted")  # submitted, reviewed, resolved, dismissed
    
    # Resolution
    resolution_notes = Column(Text)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    employee = relationship("Employee", back_populates="complaints")
    
    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "subject": self.subject,
            "description": self.description,
            "category": self.category,
            "is_anonymous": self.is_anonymous,
            "status": self.status,
            "resolution_notes": self.resolution_notes,
            "resolved_by": self.resolved_by,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }