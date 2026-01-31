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
    status: Optional[str] = "draft"  # draft, active, sold


class Item(ItemCreate):
    id: str
    created_at: datetime
    updated_at: datetime
    images: list[str]
    status: str = "draft"


class UpdateItemsStatusRequest(BaseModel):
    item_ids: list[str]
    status: str


class PostCreate(BaseModel):
    item_ids: list[str]
    description: Optional[str] = None
    collage_url: Optional[str] = None


class Post(PostCreate):
    id: str
    created_at: datetime
    updated_at: datetime


class GenerateDescriptionRequest(BaseModel):
    items: list[dict]


class PublicationCreate(BaseModel):
    post_id: Optional[str] = None
    item_ids: list[str]
    fb_page_name: str
    description: Optional[str] = None
    collage_url: Optional[str] = None


class Publication(PublicationCreate):
    id: str
    published_at: datetime
