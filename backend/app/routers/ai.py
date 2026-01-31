from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from app.services.gemini import analyze_image
from app.services.background import remove_background
from app.models import AIAnalysis
import os
import tempfile
import logging

logger = logging.getLogger(__name__)

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
        logger.info(f"[REMOVE-BG] Success, returning image")
        return Response(content=result, media_type="image/jpeg")
    except Exception as e:
        logger.error(f"[REMOVE-BG] Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
