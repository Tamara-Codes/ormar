from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AIAnalysis(BaseModel):
    title: str
    category: str
    brand: Optional[str] = None
    size: Optional[str] = None
    estimatedPrice: Optional[float] = None


class ItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    brand: Optional[str] = None
    size: Optional[str] = None
    condition: str
    material: Optional[str] = None
    color: Optional[str] = None
    price: float
    images: list[str] = []


class Item(ItemCreate):
    id: str
    status: str = "draft"
    created_at: datetime
    updated_at: datetime
    images: list[str]
