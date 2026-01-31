import base64
import os
from datetime import datetime
from app.database import supabase


async def upload_image(image_data: str, user_id: str) -> str:
    """Upload base64 image data to Supabase Storage and return public URL."""
    # Decode base64
    image_bytes = base64.b64decode(image_data.split(",")[-1])

    # Generate filename
    timestamp = datetime.now().isoformat()
    filename = f"{user_id}/{timestamp}.jpg"

    # Upload to Supabase Storage
    response = supabase.storage.from_("item-images").upload(filename, image_bytes)

    # Return public URL
    public_url = supabase.storage.from_("item-images").get_public_url(filename)
    return public_url


async def delete_image(image_url: str, user_id: str) -> None:
    """Delete image from Supabase Storage."""
    # Extract filename from URL
    # URL format: https://project.supabase.co/storage/v1/object/public/item-images/user_id/timestamp.jpg
    try:
        path = image_url.split("/item-images/")[-1]
        supabase.storage.from_("item-images").remove([path])
    except Exception as e:
        print(f"Error deleting image: {e}")
