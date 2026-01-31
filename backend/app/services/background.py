import httpx
import logging
from app.config import PHOTOROOM_API_KEY

logger = logging.getLogger(__name__)

PHOTOROOM_URL = "https://sdk.photoroom.com/v1/segment"


async def remove_background(image_bytes: bytes) -> bytes:
    """Remove background and create studio-quality product photo using PhotoRoom API."""
    logger.info("[PHOTOROOM] Starting studio photo processing")

    if not PHOTOROOM_API_KEY:
        raise Exception("PHOTOROOM_API_KEY not set in environment variables")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            PHOTOROOM_URL,
            headers={
                "x-api-key": PHOTOROOM_API_KEY,
            },
            files={
                "image_file": ("image.jpg", image_bytes, "image/jpeg"),
            },
            data={
                "bg_color": "#F5F5F5",  # Soft off-white background
                "shadow": "soft",  # Add soft drop shadow
                "crop": "true",  # Auto-crop to product
                "padding": "0.1",  # 10% padding around product
                "beautify": "ai",  # Fix fabric imperfections and lighting
                "output_format": "jpg",
                "output_quality": "high",
            },
            timeout=30.0,
        )

        if response.status_code != 200:
            logger.error(f"[PHOTOROOM] API error: {response.status_code} - {response.text}")
            raise Exception(f"PhotoRoom API error: {response.status_code}")

        logger.info("[PHOTOROOM] Studio photo processing complete")
        return response.content
