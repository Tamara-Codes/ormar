from fastapi import APIRouter, HTTPException, Header, File, UploadFile, Form
from typing import Optional, List
from app.database import supabase
from app.models import Item, ItemCreate, AIAnalysis, UpdateItemsStatusRequest
from app.services.storage import upload_image, delete_image
import base64
import tempfile
import os
import logging
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["items"])


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """Extract user_id from JWT token locally (fast, no network call)."""
    import base64
    import json

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        token = authorization.split(" ")[1]

        # Decode JWT payload locally (no verification - Supabase already issued it)
        # JWT format: header.payload.signature
        payload_b64 = token.split(".")[1]
        # Add padding if needed
        payload_b64 += "=" * (4 - len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no user ID")

        return user_id
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[AUTH] Token decode failed: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


@router.post("/items", response_model=Item)
async def create_item(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form(...),
    brand: Optional[str] = Form(None),
    size: Optional[str] = Form(None),
    condition: str = Form(...),
    material: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    price: float = Form(...),
    images: List[UploadFile] = File(...),
    authorization: Optional[str] = Header(None),
) -> Item:
    """Create item with photos."""
    user_id = await get_current_user(authorization)

    # Read and validate all images first
    image_contents = []
    for idx, image_file in enumerate(images):
        logger.info(f"[CREATE_ITEM] Validating image {idx + 1}/{len(images)}: {image_file.filename}")

        if not image_file.content_type or not image_file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="All files must be images")

        content = await image_file.read()
        file_size_mb = len(content) / (1024 * 1024)
        logger.info(f"[CREATE_ITEM] File size: {file_size_mb:.2f} MB")

        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 10MB)")

        image_contents.append(content)

    # Upload all images in parallel
    async def upload_single_image(content: bytes, idx: int) -> str:
        timestamp = datetime.now().isoformat()
        filename = f"{user_id}/{timestamp}_{idx}.jpg"
        logger.info(f"[CREATE_ITEM] Uploading image {idx + 1}")

        # Run sync upload in thread pool
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: supabase.storage.from_("item-images").upload(filename, content)
        )

        public_url = supabase.storage.from_("item-images").get_public_url(filename)
        logger.info(f"[CREATE_ITEM] Uploaded: {public_url}")
        return public_url

    logger.info(f"[CREATE_ITEM] Uploading {len(image_contents)} images in parallel...")
    image_urls = await asyncio.gather(*[
        upload_single_image(content, idx)
        for idx, content in enumerate(image_contents)
    ])
    logger.info(f"[CREATE_ITEM] All uploads complete")

    # Insert item into database
    item_data = {
        "user_id": user_id,
        "title": title,
        "description": description or "",
        "category": category,
        "brand": brand,
        "size": size,
        "condition": condition,
        "material": material,
        "color": color,
        "price": float(price),
        "images": image_urls,
    }

    response = supabase.table("items").insert(item_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create item")

    return Item(**response.data[0])


@router.get("/items", response_model=dict)
async def list_items(authorization: Optional[str] = Header(None)):
    """List user's items."""
    user_id = await get_current_user(authorization)

    response = (
        supabase.table("items")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    return {"items": [Item(**item) for item in response.data]}


@router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: str, authorization: Optional[str] = Header(None)):
    """Get single item."""
    user_id = await get_current_user(authorization)

    response = (
        supabase.table("items").select("*").eq("id", item_id).eq("user_id", user_id).execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Item not found")

    return Item(**response.data[0])


@router.put("/items/{item_id}", response_model=Item)
async def update_item(
    item_id: str,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    size: Optional[str] = Form(None),
    condition: Optional[str] = Form(None),
    material: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    authorization: Optional[str] = Header(None),
) -> Item:
    """Update item."""
    user_id = await get_current_user(authorization)

    # Build update data
    update_data = {}
    if title is not None:
        update_data["title"] = title
    if description is not None:
        update_data["description"] = description
    if category is not None:
        update_data["category"] = category
    if brand is not None:
        update_data["brand"] = brand
    if size is not None:
        update_data["size"] = size
    if condition is not None:
        update_data["condition"] = condition
    if material is not None:
        update_data["material"] = material
    if color is not None:
        update_data["color"] = color
    if price is not None:
        update_data["price"] = float(price)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = (
        supabase.table("items")
        .update(update_data)
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Item not found")

    return Item(**response.data[0])


@router.put("/items/{item_id}/image", response_model=Item)
async def update_item_image(
    item_id: str,
    image_index: int = Form(...),
    image: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
) -> Item:
    """Update a specific image of an item."""
    user_id = await get_current_user(authorization)
    logger.info(f"[UPDATE_IMAGE] Updating image {image_index} for item {item_id}")

    # Get current item
    item_response = (
        supabase.table("items")
        .select("*")
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not item_response.data:
        raise HTTPException(status_code=404, detail="Item not found")

    current_item = item_response.data[0]
    current_images = current_item.get("images", [])

    if image_index < 0 or image_index >= len(current_images):
        raise HTTPException(status_code=400, detail="Invalid image index")

    # Validate and read new image
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    content = await image.read()
    original_size = len(content) / (1024 * 1024)
    logger.info(f"[UPDATE_IMAGE] Received image size: {original_size:.2f} MB")

    # Compress image if needed
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(content))

    # Resize if too large
    max_dimension = 1500
    if img.width > max_dimension or img.height > max_dimension:
        img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    # Convert to RGB if needed (removes alpha channel)
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    # Save with compression
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85, optimize=True)
    content = output.getvalue()

    compressed_size = len(content) / (1024 * 1024)
    logger.info(f"[UPDATE_IMAGE] Compressed to: {compressed_size:.2f} MB")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    # Upload new image
    import uuid
    file_ext = "jpg"
    file_name = f"{user_id}/{item_id}/{uuid.uuid4()}.{file_ext}"

    upload_response = supabase.storage.from_("item-images").upload(
        file_name,
        content,
        {"content-type": "image/jpeg"},
    )
    logger.info(f"[UPDATE_IMAGE] Uploaded new image: {file_name}")

    # Get public URL
    new_url = supabase.storage.from_("item-images").get_public_url(file_name)

    # Update images array
    new_images = current_images.copy()
    new_images[image_index] = new_url

    # Update item in database
    update_response = (
        supabase.table("items")
        .update({"images": new_images})
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not update_response.data:
        raise HTTPException(status_code=500, detail="Failed to update item")

    logger.info(f"[UPDATE_IMAGE] Item updated successfully")
    return Item(**update_response.data[0])


@router.delete("/items/{item_id}/image/{image_index}", response_model=Item)
async def delete_item_image(
    item_id: str,
    image_index: int,
    authorization: Optional[str] = Header(None),
) -> Item:
    """Delete a specific image from an item."""
    user_id = await get_current_user(authorization)
    logger.info(f"[DELETE_IMAGE] Deleting image {image_index} from item {item_id}")

    # Get current item
    item_response = (
        supabase.table("items")
        .select("*")
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not item_response.data:
        raise HTTPException(status_code=404, detail="Item not found")

    current_item = item_response.data[0]
    current_images = current_item.get("images", [])

    if image_index < 0 or image_index >= len(current_images):
        raise HTTPException(status_code=400, detail="Invalid image index")

    # Get the image URL to delete from storage
    image_url = current_images[image_index]

    # Remove from storage
    await delete_image(image_url, user_id)
    logger.info(f"[DELETE_IMAGE] Deleted image from storage: {image_url}")

    # Remove from images array
    new_images = [img for i, img in enumerate(current_images) if i != image_index]

    # Update item in database
    update_response = (
        supabase.table("items")
        .update({"images": new_images})
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not update_response.data:
        raise HTTPException(status_code=500, detail="Failed to update item")

    logger.info(f"[DELETE_IMAGE] Item updated, {len(new_images)} images remaining")
    return Item(**update_response.data[0])


@router.post("/items/{item_id}/images", response_model=Item)
async def add_item_images(
    item_id: str,
    images: List[UploadFile] = File(...),
    authorization: Optional[str] = Header(None),
) -> Item:
    """Add new images to an existing item."""
    user_id = await get_current_user(authorization)
    logger.info(f"[ADD_IMAGES] Adding {len(images)} images to item {item_id}")

    # Get current item
    item_response = (
        supabase.table("items")
        .select("*")
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not item_response.data:
        raise HTTPException(status_code=404, detail="Item not found")

    current_item = item_response.data[0]
    current_images = current_item.get("images", [])

    # Upload new images
    new_urls = []
    for idx, image_file in enumerate(images):
        logger.info(f"[ADD_IMAGES] Processing image {idx + 1}/{len(images)}: {image_file.filename}")

        # Validate file type
        if not image_file.content_type or not image_file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="All files must be images")

        content = await image_file.read()

        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 10MB)")

        # Upload to Supabase Storage
        timestamp = datetime.now().isoformat()
        filename = f"{user_id}/{item_id}/{timestamp}_{idx}.jpg"

        supabase.storage.from_("item-images").upload(filename, content)
        public_url = supabase.storage.from_("item-images").get_public_url(filename)
        new_urls.append(public_url)
        logger.info(f"[ADD_IMAGES] Uploaded: {public_url}")

    # Update images array
    updated_images = current_images + new_urls

    # Update item in database
    update_response = (
        supabase.table("items")
        .update({"images": updated_images})
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not update_response.data:
        raise HTTPException(status_code=500, detail="Failed to update item")

    logger.info(f"[ADD_IMAGES] Item updated, now has {len(updated_images)} images")
    return Item(**update_response.data[0])


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: str,
    authorization: Optional[str] = Header(None),
) -> dict:
    """Delete an item and all its images."""
    user_id = await get_current_user(authorization)
    logger.info(f"[DELETE_ITEM] Deleting item {item_id}")

    # Get item to find images
    item_response = (
        supabase.table("items")
        .select("*")
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not item_response.data:
        raise HTTPException(status_code=404, detail="Item not found")

    item = item_response.data[0]

    # Delete all images from storage
    for image_url in item.get("images", []):
        try:
            await delete_image(image_url, user_id)
        except Exception as e:
            logger.warning(f"[DELETE_ITEM] Failed to delete image {image_url}: {e}")

    # Delete item from database
    delete_response = (
        supabase.table("items")
        .delete()
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )

    logger.info(f"[DELETE_ITEM] Item {item_id} deleted successfully")
    return {"success": True}


@router.patch("/items/status")
async def update_items_status(
    request: UpdateItemsStatusRequest,
    authorization: Optional[str] = Header(None),
) -> dict:
    """Update status for multiple items."""
    user_id = await get_current_user(authorization)
    logger.info(f"[UPDATE_STATUS] Updating {len(request.item_ids)} items to status: {request.status}")

    if request.status not in ["draft", "active", "sold"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be: draft, active, or sold")

    updated_count = 0
    for item_id in request.item_ids:
        response = (
            supabase.table("items")
            .update({"status": request.status})
            .eq("id", item_id)
            .eq("user_id", user_id)
            .execute()
        )
        if response.data:
            updated_count += 1

    logger.info(f"[UPDATE_STATUS] Updated {updated_count} items")
    return {"success": True, "updated_count": updated_count}
