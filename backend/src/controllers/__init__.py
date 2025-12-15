# Controllers Package
from .inventory_controller import router as inventory_router
from .employee_controller import router as employee_router
from .payment_controller import router as payment_router
from .dashboard_controller import router as dashboard_router
from .auth_controller import router as auth_router
from .microsoft_controller import router as microsoft_router
from .setup_controller import router as setup_router
from .server_controller import router as server_router

__all__ = [
    'inventory_router', 'employee_router', 'payment_router', 
    'dashboard_router', 'auth_router', 'microsoft_router', 'setup_router',
    'server_router'
]