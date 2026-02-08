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

DEFAULT_CATEGORIES = [
    {"value": "odjeca", "label": "Odjeća"},
    {"value": "obuca", "label": "Obuća"},
    {"value": "oprema", "label": "Oprema"},
    {"value": "igracke", "label": "Igračke"},
]


def build_prompt(categories: list[dict] | None) -> str:
    """Build prompt with a dynamic category list."""
    allowed = categories if categories else DEFAULT_CATEGORIES
    categories_json = json.dumps(allowed, ensure_ascii=False)

    return f"""Analiziraj fotografiju proizvoda. Vrati odgovor kao JSON objekat sa sljedećim poljima:

{{
  "naslov": "Kratak naslov (maksimalno 3 riječi)",
  "kategorija": "Jedna od vrijednosti iz liste dostupnih kategorija",
  "brend": "Ime brenda ili null ako nije vidljivo",
  "velicina": "Veličina ili null ako nije vidljiva",
  "cijena": "Procjena u eurima kao broj (npr. 25.00) ili null ako nije sigurna"
}}

Dostupne kategorije (value + label):
{categories_json}

Pravila:
- Kategorija: MORA biti točno jedan od "value" iz liste dostupnih kategorija
- Naslov: MORA biti maksimalno 3 riječi, npr. "Zimska jakna Nike" ili "Tenisice Adidas"
- Cijena: realna hrvatska cijena za rabljeno stanje
- Vrati SAMO JSON, bez dodatnog teksta"""


async def analyze_image(image_path: str, categories: list[dict] | None = None) -> AIAnalysis:
    """Analyze image using Gemini Vision API and return structured analysis."""
    logger.info(f"[GEMINI] Starting image analysis for: {image_path}")

    model = genai.GenerativeModel("gemini-2.5-flash-lite")
    logger.info("[GEMINI] Model initialized: gemini-2.5-flash-lite")

    # Compress image to save API costs
    logger.info(f"[GEMINI] Opening image: {image_path}")
    img = Image.open(image_path)
    original_size = img.size
    img.thumbnail((800, 800), Image.Resampling.LANCZOS)
    logger.info(f"[GEMINI] Image compressed from {original_size} to {img.size}")

    # Call Gemini API (async)
    logger.info("[GEMINI] Calling Gemini API with image and prompt...")
    prompt = build_prompt(categories)
    response = await model.generate_content_async([prompt, img])
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


async def generate_post_description(items: list[dict], group_rules: str | None = None) -> str:
    """Generate a Facebook post description based on items and optional group rules."""
    logger.info(f"[GEMINI] Generating post description for {len(items)} items")
    if group_rules:
        logger.info(f"[GEMINI] Using group rules: {group_rules[:100]}...")

    model = genai.GenerativeModel("gemini-2.5-flash-lite")

    # Build item details for the prompt
    items_text = ""
    for i, item in enumerate(items, 1):
        items_text += f"\n{i}. {item.get('title', 'Artikl')}"
        if item.get('brand'):
            items_text += f" - {item['brand']}"
        if item.get('size'):
            items_text += f", veličina {item['size']}"
        if item.get('condition'):
            items_text += f", stanje: {item['condition']}"
        if item.get('price'):
            items_text += f", cijena: {item['price']}€"

    # Build base rules
    base_rules = """- Piši na hrvatskom jeziku
- Budi prijateljski i pozitivan
- Spomeni ključne detalje (brend, veličinu, stanje)
- Dodaj poziv na akciju (npr. "Javite se u inbox!")
- Maksimalno 3-4 rečenice
- Ne koristi hashtage
- Ne ponavljaj cijene, samo ih spomeni ako ima više artikala"""

    # Add group-specific rules if provided
    if group_rules:
        rules_section = f"""
Pravila grupe (MORAŠ slijediti ova pravila):
{group_rules}

Opća pravila:
{base_rules}"""
    else:
        rules_section = f"""
Pravila:
{base_rules}"""

    prompt = f"""Napiši kratak, privlačan opis za Facebook post za prodaju sljedećih artikala:
{items_text}
{rules_section}

Vrati SAMO tekst opisa, bez dodatnih objašnjenja."""

    response = await model.generate_content_async(prompt)
    description = response.text.strip()
    logger.info(f"[GEMINI] Generated description: {description[:100]}...")
    return description
