from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from app.services.gemini import analyze_image, generate_post_description
from app.services.background import remove_background
from app.services.collage import create_collage
from app.models import AIAnalysis, GenerateDescriptionRequest, PostCreate, Post, PublicationCreate, Publication
from app.database import supabase
from app.services.storage import upload_image
import os
import tempfile
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)


class CollageRequest(BaseModel):
    image_urls: list[str]
    columns: int = 2

router = APIRouter(prefix="/api", tags=["ai"])


@router.post("/analyze-image", response_model=AIAnalysis)
async def analyze_image_endpoint(image: UploadFile = File(...)) -> AIAnalysis:
    """Receive photo, call Gemini, return analysis."""
    logger.info(f"[ANALYZE-IMAGE] Received request for file: {image.filename}")
    logger.info(f"[ANALYZE-IMAGE] Content type: {image.content_type}")

    # Validate file type
    if not image.content_type or not image.content_type.startswith("image/"):
        logger.error(f"[ANALYZE-IMAGE] Invalid file type: {image.content_type}")
        raise HTTPException(status_code=400, detail="File must be an image")

    # Validate file size (max 10MB)
    content = await image.read()
    file_size_mb = len(content) / (1024 * 1024)
    logger.info(f"[ANALYZE-IMAGE] File size: {file_size_mb:.2f} MB")

    if len(content) > 10 * 1024 * 1024:
        logger.error(f"[ANALYZE-IMAGE] File too large: {file_size_mb:.2f} MB")
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    logger.info(f"[ANALYZE-IMAGE] Saved to temp file: {tmp_path}")

    try:
        # Analyze with Gemini
        logger.info(f"[ANALYZE-IMAGE] Calling Gemini API...")
        analysis = await analyze_image(tmp_path)
        logger.info(f"[ANALYZE-IMAGE] Analysis complete: title='{analysis.title}', category='{analysis.category}'")
        return analysis
    except Exception as e:
        logger.error(f"[ANALYZE-IMAGE] Error during analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
            logger.info(f"[ANALYZE-IMAGE] Cleaned up temp file")


@router.post("/create-collage")
async def create_collage_endpoint(request: CollageRequest) -> Response:
    """Create a collage from multiple image URLs."""
    logger.info(f"[COLLAGE] Received request with {len(request.image_urls)} images")

    if len(request.image_urls) == 0:
        raise HTTPException(status_code=400, detail="At least one image is required")

    if len(request.image_urls) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 images allowed")

    try:
        result = await create_collage(request.image_urls, request.columns)
        logger.info(f"[COLLAGE] Success, returning collage image")
        return Response(content=result, media_type="image/jpeg")
    except Exception as e:
        logger.error(f"[COLLAGE] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remove-background")
async def remove_background_endpoint(image: UploadFile = File(...)) -> Response:
    """Remove background from image and replace with white."""
    logger.info(f"[REMOVE-BG] Received request for file: {image.filename}")

    # Validate file type
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read content
    content = await image.read()
    file_size_mb = len(content) / (1024 * 1024)
    logger.info(f"[REMOVE-BG] File size: {file_size_mb:.2f} MB")

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    try:
        result = await remove_background(content)

        # Compress result for faster mobile download
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(result))

        # Resize if too large
        max_dim = 1200
        if img.width > max_dim or img.height > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        # Compress
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=85, optimize=True)
        compressed = output.getvalue()

        original_size = len(result) / 1024
        compressed_size = len(compressed) / 1024
        logger.info(f"[REMOVE-BG] Compressed {original_size:.0f}KB -> {compressed_size:.0f}KB")

        return Response(content=compressed, media_type="image/jpeg")
    except Exception as e:
        logger.error(f"[REMOVE-BG] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-description")
async def generate_description_endpoint(request: GenerateDescriptionRequest) -> dict:
    """Generate a post description using Gemini based on selected items."""
    logger.info(f"[GENERATE-DESC] Received request with {len(request.items)} items")

    if len(request.items) == 0:
        raise HTTPException(status_code=400, detail="At least one item is required")

    try:
        description = await generate_post_description(request.items)
        return {"description": description}
    except Exception as e:
        logger.error(f"[GENERATE-DESC] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts")
async def get_posts_endpoint() -> dict:
    """Get all saved posts."""
    logger.info("[GET-POSTS] Fetching saved posts")

    try:
        response = (
            supabase.table("posts")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return {"posts": response.data}
    except Exception as e:
        logger.error(f"[GET-POSTS] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/posts", response_model=Post)
async def create_post_endpoint(post: PostCreate) -> Post:
    """Save a post to Supabase."""
    logger.info(f"[CREATE-POST] Creating post with {len(post.item_ids)} items")

    post_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    post_data = {
        "id": post_id,
        "item_ids": post.item_ids,
        "description": post.description,
        "collage_url": post.collage_url,
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = supabase.table("posts").insert(post_data).execute()
        logger.info(f"[CREATE-POST] Post created with ID: {post_id}")
        return Post(**post_data)
    except Exception as e:
        logger.error(f"[CREATE-POST] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-collage")
async def upload_collage_endpoint(image: UploadFile = File(...)) -> dict:
    """Upload a collage image to storage and return its URL."""
    logger.info(f"[UPLOAD-COLLAGE] Received collage upload")

    content = await image.read()

    try:
        url = await upload_image(content, folder="collages")
        logger.info(f"[UPLOAD-COLLAGE] Collage uploaded: {url}")
        return {"url": url}
    except Exception as e:
        logger.error(f"[UPLOAD-COLLAGE] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/publications")
async def get_publications_endpoint() -> dict:
    """Get all publications."""
    logger.info("[GET-PUBLICATIONS] Fetching publications")

    try:
        response = (
            supabase.table("publications")
            .select("*")
            .order("published_at", desc=True)
            .execute()
        )
        return {"publications": response.data}
    except Exception as e:
        logger.error(f"[GET-PUBLICATIONS] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/publications", response_model=Publication)
async def create_publication_endpoint(pub: PublicationCreate) -> Publication:
    """Record a publication."""
    logger.info(f"[CREATE-PUBLICATION] Recording publication to {pub.fb_page_name}")

    pub_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    pub_data = {
        "id": pub_id,
        "post_id": pub.post_id,
        "item_ids": pub.item_ids,
        "fb_page_name": pub.fb_page_name,
        "description": pub.description,
        "collage_url": pub.collage_url,
        "published_at": now,
    }

    try:
        result = supabase.table("publications").insert(pub_data).execute()
        logger.info(f"[CREATE-PUBLICATION] Publication recorded with ID: {pub_id}")
        return Publication(**pub_data)
    except Exception as e:
        logger.error(f"[CREATE-PUBLICATION] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
