from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from src.database import Base
from datetime import datetime
import enum

class ProductCategory(str, enum.Enum):
    ELECTRONICS = "electronics"
    CLOTHING = "clothing"
    FOOD = "food"
    OFFICE = "office"
    TOOLS = "tools"
    OTHER = "other"

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    category = Column(Enum(ProductCategory), default=ProductCategory.OTHER)
    sku = Column(String(100), unique=True, index=True)
    
    # Inventory tracking
    current_quantity = Column(Integer, default=0, nullable=False)
    minimum_quantity = Column(Integer, default=0, nullable=False)
    reorder_quantity = Column(Integer, default=0, nullable=False)
    unit_price = Column(Float, default=0.0)
    
    # Supplier information
    supplier_name = Column(String(255))
    supplier_email = Column(String(255))
    supplier_phone = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_restocked = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Relationships
    inventory_logs = relationship("InventoryLog", back_populates="product")
    
    def needs_restock(self) -> bool:
        return self.current_quantity < self.minimum_quantity
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "sku": self.sku,
            "current_quantity": self.current_quantity,
            "minimum_quantity": self.minimum_quantity,
            "reorder_quantity": self.reorder_quantity,
            "unit_price": self.unit_price,
            "supplier_name": self.supplier_name,
            "supplier_email": self.supplier_email,
            "supplier_phone": self.supplier_phone,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_restocked": self.last_restocked.isoformat() if self.last_restocked else None,
            "is_active": self.is_active,
            "needs_restock": self.needs_restock()
        }

class InventoryLog(Base):
    __tablename__ = "inventory_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    action = Column(String(50), nullable=False)  # 'add', 'remove', 'adjustment', 'sale'
    quantity_change = Column(Integer, nullable=False)
    previous_quantity = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)
    
    # Optional references
    reference_id = Column(String(100))  # Sale ID, Purchase Order ID, etc.
    notes = Column(Text)
    
    # User tracking
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    product = relationship("Product", back_populates="inventory_logs")
    user = relationship("User", back_populates="inventory_logs")
    
    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "action": self.action,
            "quantity_change": self.quantity_change,
            "previous_quantity": self.previous_quantity,
            "new_quantity": self.new_quantity,
            "reference_id": self.reference_id,
            "notes": self.notes,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }