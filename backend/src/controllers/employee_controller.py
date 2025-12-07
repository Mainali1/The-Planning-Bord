from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, date

from src.database import get_db
from src.models.employee import Employee, Attendance, Task, ToolAssignment, Complaint, EmployeeRole, EmployeeStatus
from src.services.offline_service import OfflineService
from src.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

# Pydantic models
class EmployeeCreate(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    role: EmployeeRole = EmployeeRole.EMPLOYEE
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    salary: Optional[float] = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    role: Optional[EmployeeRole] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[date] = None
    salary: Optional[float] = None
    status: Optional[EmployeeStatus] = None

class AttendanceCreate(BaseModel):
    employee_id: int
    check_in: datetime
    check_out: Optional[datetime] = None
    status: str = "present"
    notes: Optional[str] = None
    location: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    employee_id: int
    assigned_by: Optional[int] = None
    status: str = "pending"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    notes: Optional[str] = None

class ToolAssignmentCreate(BaseModel):
    employee_id: int
    tool_name: str
    tool_description: Optional[str] = None
    expected_return_date: Optional[date] = None
    condition_when_assigned: Optional[str] = None

class ComplaintCreate(BaseModel):
    employee_id: int
    subject: str
    description: str
    category: Optional[str] = "other"
    is_anonymous: bool = False

class EmployeeResponse(BaseModel):
    id: int
    employee_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    date_of_birth: Optional[str]
    role: str
    department: Optional[str]
    position: Optional[str]
    hire_date: Optional[str]
    salary: Optional[float]
    status: str
    created_at: Optional[str]
    updated_at: Optional[str]
    full_name: str

@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    """Create a new employee"""
    try:
        # Check if employee_id already exists
        existing_employee = db.query(Employee).filter(Employee.employee_id == employee.employee_id).first()
        if existing_employee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee with this ID already exists"
            )
        
        # Check if email already exists
        existing_email = db.query(Employee).filter(Employee.email == employee.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee with this email already exists"
            )
        
        new_employee = Employee(**employee.dict())
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)
        
        logger.info(f"Created employee: {employee.first_name} {employee.last_name} (ID: {employee.employee_id})")
        return new_employee.to_dict()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create employee: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create employee"
        )

@router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(
    skip: int = 0,
    limit: int = 100,
    department: Optional[str] = None,
    role: Optional[EmployeeRole] = None,
    status: Optional[EmployeeStatus] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all employees with optional filtering"""
    try:
        query = db.query(Employee)
        
        if department:
            query = query.filter(Employee.department == department)
        
        if role:
            query = query.filter(Employee.role == role)
        
        if status:
            query = query.filter(Employee.status == status)
        
        if search:
            query = query.filter(
                Employee.first_name.contains(search) |
                Employee.last_name.contains(search) |
                Employee.email.contains(search) |
                Employee.employee_id.contains(search)
            )
        
        employees = query.offset(skip).limit(limit).all()
        
        return [employee.to_dict() for employee in employees]
        
    except Exception as e:
        logger.error(f"Failed to fetch employees: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch employees"
        )

@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: int, db: Session = Depends(get_db)):
    """Get a specific employee by ID"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    return employee.to_dict()

@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    employee_update: EmployeeUpdate,
    db: Session = Depends(get_db)
):
    """Update an employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Check if email already exists (if being updated)
    if employee_update.email and employee_update.email != employee.email:
        existing_email = db.query(Employee).filter(Employee.email == employee_update.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee with this email already exists"
            )
    
    # Update fields
    update_data = employee_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)
    
    employee.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(employee)
    
    logger.info(f"Updated employee: {employee.first_name} {employee.last_name} (ID: {employee_id})")
    return employee.to_dict()

@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    """Delete an employee (soft delete by setting status to terminated)"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    employee.status = EmployeeStatus.TERMINATED
    employee.updated_at = datetime.utcnow()
    db.commit()
    
    logger.info(f"Terminated employee: {employee.first_name} {employee.last_name} (ID: {employee_id})")
    return {"message": "Employee terminated successfully"}

# Attendance endpoints
@router.post("/employees/{employee_id}/attendance")
async def create_attendance(
    employee_id: int,
    attendance: AttendanceCreate,
    db: Session = Depends(get_db)
):
    """Create attendance record"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Validate check_out is after check_in if provided
    if attendance.check_out and attendance.check_out <= attendance.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out time must be after check-in time"
        )
    
    new_attendance = Attendance(**attendance.dict())
    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)
    
    logger.info(f"Created attendance record for employee: {employee.full_name()}")
    return new_attendance.to_dict()

@router.get("/employees/{employee_id}/attendance")
async def get_employee_attendance(
    employee_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get attendance records for an employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    attendance_records = db.query(Attendance).filter(
        Attendance.employee_id == employee_id
    ).order_by(Attendance.check_in.desc()).offset(skip).limit(limit).all()
    
    return [record.to_dict() for record in attendance_records]

# Task endpoints
@router.post("/employees/{employee_id}/tasks")
async def create_task(
    employee_id: int,
    task: TaskCreate,
    db: Session = Depends(get_db)
):
    """Create task for an employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    new_task = Task(**task.dict())
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    logger.info(f"Created task '{task.title}' for employee: {employee.full_name()}")
    return new_task.to_dict()

@router.get("/employees/{employee_id}/tasks")
async def get_employee_tasks(
    employee_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get tasks for an employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    query = db.query(Task).filter(Task.employee_id == employee_id)
    
    if status:
        query = query.filter(Task.status == status)
    
    tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()
    
    return [task.to_dict() for task in tasks]

# Tool assignment endpoints
@router.post("/employees/{employee_id}/tools")
async def assign_tool(
    employee_id: int,
    tool_assignment: ToolAssignmentCreate,
    db: Session = Depends(get_db)
):
    """Assign a tool to an employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    new_assignment = ToolAssignment(**tool_assignment.dict())
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    
    logger.info(f"Assigned tool '{tool_assignment.tool_name}' to employee: {employee.full_name()}")
    return new_assignment.to_dict()

@router.get("/employees/{employee_id}/tools")
async def get_employee_tools(
    employee_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get tool assignments for an employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    query = db.query(ToolAssignment).filter(ToolAssignment.employee_id == employee_id)
    
    if status:
        query = query.filter(ToolAssignment.status == status)
    
    tools = query.order_by(ToolAssignment.assigned_date.desc()).offset(skip).limit(limit).all()
    
    return [tool.to_dict() for tool in tools]

# Complaint endpoints
@router.post("/employees/{employee_id}/complaints")
async def create_complaint(
    employee_id: int,
    complaint: ComplaintCreate,
    db: Session = Depends(get_db)
):
    """Create complaint for an employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    new_complaint = Complaint(**complaint.dict())
    db.add(new_complaint)
    db.commit()
    db.refresh(new_complaint)
    
    logger.info(f"Created complaint '{complaint.subject}' for employee: {employee.full_name()}")
    return new_complaint.to_dict()

@router.get("/employees/{employee_id}/complaints")
async def get_employee_complaints(
    employee_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get complaints for an employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    query = db.query(Complaint).filter(Complaint.employee_id == employee_id)
    
    if status:
        query = query.filter(Complaint.status == status)
    
    complaints = query.order_by(Complaint.created_at.desc()).offset(skip).limit(limit).all()
    
    return [complaint.to_dict() for complaint in complaints]

# Utility endpoints
@router.get("/departments")
async def get_departments(db: Session = Depends(get_db)):
    """Get all departments"""
    departments = db.query(Employee.department).distinct().filter(Employee.department != None).all()
    return [dept[0] for dept in departments]

@router.get("/roles")
async def get_roles():
    """Get all employee roles"""
    return [role.value for role in EmployeeRole]

@router.get("/statuses")
async def get_statuses():
    """Get all employee statuses"""
    return [status.value for status in EmployeeStatus]