from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from src.database import get_db
from src.models import Product, InventoryLog
from src.services.offline_service import OfflineService
from src.utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()

# Pydantic models
class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "other"
    sku: str
    current_quantity: int = 0
    minimum_quantity: int = 0
    reorder_quantity: int = 0
    unit_price: float = 0.0
    supplier_name: Optional[str] = None
    supplier_email: Optional[str] = None
    supplier_phone: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    current_quantity: Optional[int] = None
    minimum_quantity: Optional[int] = None
    reorder_quantity: Optional[int] = None
    unit_price: Optional[float] = None
    supplier_name: Optional[str] = None
    supplier_email: Optional[str] = None
    supplier_phone: Optional[str] = None
    is_active: Optional[bool] = None

class InventoryAdjustment(BaseModel):
    product_id: int
    quantity_change: int
    action: str  # 'add', 'remove', 'adjustment'
    notes: Optional[str] = None
    reference_id: Optional[str] = None

class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: str
    sku: str
    current_quantity: int
    minimum_quantity: int
    reorder_quantity: int
    unit_price: float
    supplier_name: Optional[str]
    supplier_email: Optional[str]
    supplier_phone: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    last_restocked: Optional[datetime]
    is_active: bool
    needs_restock: bool

@router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product"""
    try:
        # Check if SKU already exists
        existing_product = db.query(Product).filter(Product.sku == product.sku).first()
        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this SKU already exists"
            )
        
        new_product = Product(**product.dict())
        db.add(new_product)
        db.commit()
        db.refresh(new_product)
        
        # Log inventory adjustment
        inventory_log = InventoryLog(
            product_id=new_product.id,
            action="add",
            quantity_change=product.current_quantity,
            previous_quantity=0,
            new_quantity=product.current_quantity,
            notes="Initial stock added"
        )
        db.add(inventory_log)
        db.commit()
        
        logger.info(f"Created product: {product.name} (SKU: {product.sku})")
        return new_product.to_dict()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create product: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create product"
        )

@router.get("/products", response_model=List[ProductResponse])
async def get_products(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None,
    low_stock: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all products with optional filtering"""
    try:
        query = db.query(Product)
        
        if category:
            query = query.filter(Product.category == category)
        
        if search:
            query = query.filter(Product.name.contains(search) | Product.sku.contains(search))
        
        if low_stock is not None:
            if low_stock:
                query = query.filter(Product.current_quantity < Product.minimum_quantity)
            else:
                query = query.filter(Product.current_quantity >= Product.minimum_quantity)
        
        products = query.offset(skip).limit(limit).all()
        
        return [product.to_dict() for product in products]
        
    except Exception as e:
        logger.error(f"Failed to fetch products: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch products"
        )

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get a specific product by ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product.to_dict()

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db)
):
    """Update a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Update fields
    update_data = product_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)
    
    logger.info(f"Updated product: {product.name} (ID: {product_id})")
    return product.to_dict()

@router.post("/products/{product_id}/adjust")
async def adjust_inventory(
    product_id: int,
    adjustment: InventoryAdjustment,
    db: Session = Depends(get_db)
):
    """Adjust inventory for a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    previous_quantity = product.current_quantity
    
    # Apply adjustment
    if adjustment.action == "add":
        product.current_quantity += adjustment.quantity_change
    elif adjustment.action == "remove":
        if product.current_quantity < adjustment.quantity_change:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient inventory"
            )
        product.current_quantity -= adjustment.quantity_change
    elif adjustment.action == "adjustment":
        product.current_quantity = adjustment.quantity_change
    
    # Create inventory log
    inventory_log = InventoryLog(
        product_id=product_id,
        action=adjustment.action,
        quantity_change=adjustment.quantity_change,
        previous_quantity=previous_quantity,
        new_quantity=product.current_quantity,
        notes=adjustment.notes,
        reference_id=adjustment.reference_id
    )
    
    db.add(inventory_log)
    db.commit()
    
    # Check if restock notification is needed
    if product.needs_restock():
        await trigger_restock_notification(product, db)
    
    logger.info(f"Inventory adjusted for {product.name}: {adjustment.action} {adjustment.quantity_change}")
    
    return {
        "message": "Inventory adjusted successfully",
        "product": product.to_dict(),
        "previous_quantity": previous_quantity,
        "new_quantity": product.current_quantity
    }

@router.get("/products/{product_id}/logs")
async def get_inventory_logs(
    product_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get inventory logs for a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    logs = db.query(InventoryLog).filter(
        InventoryLog.product_id == product_id
    ).order_by(InventoryLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return [log.to_dict() for log in logs]

@router.get("/low-stock")
async def get_low_stock_products(db: Session = Depends(get_db)):
    """Get products that need restocking"""
    products = db.query(Product).filter(
        Product.current_quantity < Product.minimum_quantity,
        Product.is_active == True
    ).all()
    
    return [product.to_dict() for product in products]

@router.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """Get all product categories"""
    from src.models import ProductCategory
    return [category.value for category in ProductCategory]

async def trigger_restock_notification(product: Product, db: Session):
    """Trigger restock notification for a product"""
    try:
        offline_service = OfflineService()
        
        if offline_service.can_send_emails():
            # Queue restock notification (will be processed by automation service)
            logger.info(f"Restock notification queued for {product.name}")
            
            # Add to pending operations for cloud sync
            offline_service.add_pending_operation({
                "type": "restock_notification",
                "data": {
                    "product_id": product.id,
                    "product_name": product.name,
                    "current_quantity": product.current_quantity,
                    "minimum_quantity": product.minimum_quantity,
                    "reorder_quantity": product.reorder_quantity,
                    "supplier_email": product.supplier_email
                }
            })
        else:
            logger.warning(f"Cannot send restock notification - email service not available")
            
    except Exception as e:
        logger.error(f"Failed to trigger restock notification: {e}")