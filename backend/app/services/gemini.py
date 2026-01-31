import google.generativeai as genai
from PIL import Image
import json
import re
import os
import logging
from app.config import GEMINI_API_KEY
from app.models import AIAnalysis

logger = logging.getLogger(__name__)

genai.configure(api_key=GEMINI_API_KEY)
logger.info("[GEMINI] Gemini API configured")

PROMPT = """Analiziraj fotografiju proizvoda. Vrati odgovor kao JSON objekat sa sljedećim poljima:

{
  "naslov": "Kratak naslov (max 50 znakova)",
  "kategorija": "odjeca|obuca|oprema|igracke",
  "brend": "Ime brenda ili null ako nije vidljivo",
  "velicina": "Veličina ili null ako nije vidljiva",
  "cijena": "Procjena u eurima kao broj (npr. 25.00) ili null ako nije sigurna"
}

Pravila:
- Cijena: realna hrvatska cijena za rabljeno stanje
- Vrati SAMO JSON, bez dodatnog teksta"""


async def analyze_image(image_path: str) -> AIAnalysis:
    """Analyze image using Gemini Vision API and return structured analysis."""
    logger.info(f"[GEMINI] Starting image analysis for: {image_path}")

    model = genai.GenerativeModel("gemini-2.5-flash-lite")
    logger.info("[GEMINI] Model initialized: gemini-2.5-flash-lite")

    # Compress image to save API costs
    logger.info(f"[GEMINI] Opening image: {image_path}")
    img = Image.open(image_path)
    original_size = img.size
    img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    logger.info(f"[GEMINI] Image compressed from {original_size} to {img.size}")

    # Call Gemini API
    logger.info("[GEMINI] Calling Gemini API with image and prompt...")
    response = model.generate_content([PROMPT, img])
    logger.info(f"[GEMINI] Gemini response received. Text length: {len(response.text)}")
    logger.info(f"[GEMINI] Raw response: {response.text[:500]}")

    # Extract JSON from response
    json_match = re.search(r"\{[\s\S]*\}", response.text)
    if not json_match:
        logger.error(f"[GEMINI] Could not find JSON in response: {response.text}")
        raise ValueError("Could not parse Gemini response as JSON")

    logger.info("[GEMINI] JSON extracted from response")

    result = json.loads(json_match.group())
    logger.info(f"[GEMINI] Parsed JSON: {result}")

    # Map Croatian field names to English
    analysis = AIAnalysis(
        title=result.get("naslov", ""),
        category=result.get("kategorija", "odjeca"),
        brand=result.get("brend"),
        size=result.get("velicina"),
        estimatedPrice=result.get("cijena"),
    )
    logger.info(f"[GEMINI] Analysis complete: {analysis}")
    return analysis
