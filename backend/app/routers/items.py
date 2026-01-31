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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["items"])


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """Extract user_id from JWT token. For development, use a test user if no token."""
    # Test user UUID for development
    TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"

    if not authorization:
        # Development mode: use test user
        import os
        if os.getenv("ENVIRONMENT") == "development":
            logger.info(f"[AUTH] Development mode: using test user ID {TEST_USER_ID}")
            return TEST_USER_ID
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        token = authorization.split(" ")[1]
        # Verify token with Supabase
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception as e:
        # Fallback to test user in development
        import os
        if os.getenv("ENVIRONMENT") == "development":
            logger.warning(f"[AUTH] Token verification failed, using test user: {str(e)}")
            return TEST_USER_ID
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

    # Upload images
    image_urls = []
    for idx, image_file in enumerate(images):
        logger.info(f"[CREATE_ITEM] Processing image {idx + 1}/{len(images)}: {image_file.filename}")

        # Validate file type
        if not image_file.content_type or not image_file.content_type.startswith("image/"):
            logger.error(f"[CREATE_ITEM] Invalid file type: {image_file.content_type}")
            raise HTTPException(status_code=400, detail="All files must be images")

        # Read file
        content = await image_file.read()
        file_size_mb = len(content) / (1024 * 1024)
        logger.info(f"[CREATE_ITEM] File size: {file_size_mb:.2f} MB")

        # Validate size
        if len(content) > 10 * 1024 * 1024:
            logger.error(f"[CREATE_ITEM] File too large: {file_size_mb:.2f} MB")
            raise HTTPException(status_code=413, detail="File too large (max 10MB)")

        # Save to temp file for processing
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        logger.info(f"[CREATE_ITEM] Temp file saved: {tmp_path}")

        try:
            # Upload to Supabase Storage
            timestamp = datetime.now().isoformat()
            filename = f"{user_id}/{timestamp}.jpg"
            logger.info(f"[CREATE_ITEM] Uploading to Supabase bucket 'item-images', path: {filename}")

            supabase.storage.from_("item-images").upload(filename, content)
            logger.info(f"[CREATE_ITEM] Upload successful")

            public_url = supabase.storage.from_("item-images").get_public_url(filename)
            logger.info(f"[CREATE_ITEM] Public URL: {public_url}")
            image_urls.append(public_url)
        except Exception as e:
            logger.error(f"[CREATE_ITEM] Upload failed: {str(e)}", exc_info=True)
            raise
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                logger.info(f"[CREATE_ITEM] Temp file cleaned up")

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
