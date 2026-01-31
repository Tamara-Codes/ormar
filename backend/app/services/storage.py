import base64
import uuid
from datetime import datetime
from app.database import supabase


async def upload_image(
    image_data: bytes | str,
    folder: str = "",
    user_id: str | None = None,
) -> str:
    """Upload image to Supabase Storage and return public URL.

    Args:
        image_data: Either raw bytes or base64 encoded string
        folder: Optional folder path (e.g., "collages")
        user_id: Optional user ID for user-specific paths
    """
    # Handle base64 string
    if isinstance(image_data, str):
        image_bytes = base64.b64decode(image_data.split(",")[-1])
    else:
        image_bytes = image_data

    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = uuid.uuid4()

    if user_id:
        filename = f"{user_id}/{timestamp}_{unique_id}.jpg"
    elif folder:
        filename = f"{folder}/{timestamp}_{unique_id}.jpg"
    else:
        filename = f"{timestamp}_{unique_id}.jpg"

    # Upload to Supabase Storage
    supabase.storage.from_("item-images").upload(filename, image_bytes)

    # Return public URL
    return supabase.storage.from_("item-images").get_public_url(filename)


async def delete_image(image_url: str, user_id: str) -> None:
    """Delete image from Supabase Storage."""
    # Extract filename from URL
    # URL format: https://project.supabase.co/storage/v1/object/public/item-images/user_id/timestamp.jpg
    try:
        path = image_url.split("/item-images/")[-1]
        supabase.storage.from_("item-images").remove([path])
    except Exception as e:
        print(f"Error deleting image: {e}")
