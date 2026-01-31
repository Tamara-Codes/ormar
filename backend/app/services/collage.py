import httpx
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import io
import math
import random
import logging

logger = logging.getLogger(__name__)


def add_shadow(img: Image.Image, offset: int = 8, blur: int = 15) -> Image.Image:
    """Add a drop shadow to an image."""
    # Create a larger canvas for shadow
    shadow_canvas = Image.new('RGBA', (img.width + offset + blur * 2, img.height + offset + blur * 2), (0, 0, 0, 0))

    # Create shadow
    shadow = Image.new('RGBA', img.size, (0, 0, 0, 80))
    shadow_canvas.paste(shadow, (blur + offset, blur + offset))
    shadow_canvas = shadow_canvas.filter(ImageFilter.GaussianBlur(blur))

    # Paste original image
    shadow_canvas.paste(img, (blur, blur), img if img.mode == 'RGBA' else None)

    return shadow_canvas


def add_border(img: Image.Image, border_width: int = 8, border_color: tuple = (255, 255, 255)) -> Image.Image:
    """Add a border/frame to an image."""
    bordered = Image.new('RGB', (img.width + border_width * 2, img.height + border_width * 2), border_color)
    bordered.paste(img, (border_width, border_width))
    return bordered


async def create_collage(
    image_urls: list[str],
    columns: int = 2,
    canvas_size: int = 1200,
    background_color: tuple = (245, 245, 245)
) -> bytes:
    """
    Create a stylish overlapping collage from multiple image URLs.

    Args:
        image_urls: List of image URLs to include in collage
        columns: Affects layout density (2=sparse, 3=medium, 4=dense)
        canvas_size: Size of the square canvas
        background_color: RGB tuple for background color

    Returns:
        JPEG image bytes of the collage
    """
    logger.info(f"[COLLAGE] Creating stylish collage with {len(image_urls)} images")

    # Download all images
    images = []
    async with httpx.AsyncClient() as client:
        for i, url in enumerate(image_urls):
            try:
                logger.info(f"[COLLAGE] Downloading image {i+1}/{len(image_urls)}: {url[:50]}...")
                response = await client.get(url, timeout=30.0)
                response.raise_for_status()
                img = Image.open(io.BytesIO(response.content))
                # Fix EXIF orientation
                img = ImageOps.exif_transpose(img)
                # Convert to RGB
                if img.mode in ('RGBA', 'P', 'LA', 'L'):
                    img = img.convert('RGB')
                images.append(img)
                logger.info(f"[COLLAGE] Downloaded image {i+1}: {img.size}")
            except Exception as e:
                logger.warning(f"[COLLAGE] Failed to download image {url}: {e}")
                continue

    if not images:
        raise ValueError("No images could be downloaded")

    num_images = len(images)

    # Create canvas with RGBA for shadow support
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (*background_color, 255))

    # Calculate image sizes based on number of images
    if num_images == 1:
        base_size = int(canvas_size * 0.85)
    elif num_images == 2:
        base_size = int(canvas_size * 0.65)
    elif num_images <= 4:
        base_size = int(canvas_size * 0.55)
    elif num_images <= 6:
        base_size = int(canvas_size * 0.48)
    else:
        base_size = int(canvas_size * 0.42)

    # Define positions with overlap - scattered layout
    random.seed(42)  # Consistent results

    positions = []

    if num_images == 1:
        positions = [(canvas_size // 2, canvas_size // 2, -3)]
    elif num_images == 2:
        positions = [
            (canvas_size * 0.35, canvas_size * 0.45, -4),
            (canvas_size * 0.65, canvas_size * 0.55, 3),
        ]
    elif num_images == 3:
        positions = [
            (canvas_size * 0.3, canvas_size * 0.35, -5),
            (canvas_size * 0.7, canvas_size * 0.4, 4),
            (canvas_size * 0.5, canvas_size * 0.7, -3),
        ]
    elif num_images == 4:
        positions = [
            (canvas_size * 0.3, canvas_size * 0.3, -4),
            (canvas_size * 0.7, canvas_size * 0.35, 5),
            (canvas_size * 0.35, canvas_size * 0.7, 3),
            (canvas_size * 0.68, canvas_size * 0.68, -3),
        ]
    elif num_images == 5:
        positions = [
            (canvas_size * 0.25, canvas_size * 0.28, -5),
            (canvas_size * 0.7, canvas_size * 0.25, 4),
            (canvas_size * 0.5, canvas_size * 0.5, -2),
            (canvas_size * 0.28, canvas_size * 0.72, 3),
            (canvas_size * 0.72, canvas_size * 0.7, -4),
        ]
    elif num_images == 6:
        positions = [
            (canvas_size * 0.22, canvas_size * 0.25, -4),
            (canvas_size * 0.5, canvas_size * 0.22, 3),
            (canvas_size * 0.78, canvas_size * 0.28, -5),
            (canvas_size * 0.25, canvas_size * 0.7, 4),
            (canvas_size * 0.52, canvas_size * 0.72, -3),
            (canvas_size * 0.78, canvas_size * 0.68, 3),
        ]
    else:
        # Generate positions for more images in a scattered pattern
        for i in range(num_images):
            row = i // 3
            col = i % 3
            x = canvas_size * (0.22 + col * 0.28) + random.randint(-20, 20)
            y = canvas_size * (0.22 + row * 0.28) + random.randint(-20, 20)
            # Small tilt, never horizontal (avoid 0)
            rotation = random.choice([-5, -4, -3, -2, 2, 3, 4, 5])
            positions.append((x, y, rotation))

    # Process and place each image
    processed_images = []

    for idx, img in enumerate(images):
        # Vary sizes slightly for visual interest
        size_variation = random.uniform(0.9, 1.1)
        target_size = int(base_size * size_variation)

        # Resize maintaining aspect ratio
        img_ratio = img.width / img.height
        if img_ratio > 1:
            new_width = target_size
            new_height = int(target_size / img_ratio)
        else:
            new_height = target_size
            new_width = int(target_size * img_ratio)

        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Add white border (like a photo print)
        img_bordered = add_border(img_resized, border_width=6, border_color=(255, 255, 255))

        # Convert to RGBA for rotation
        img_rgba = img_bordered.convert('RGBA')

        processed_images.append(img_rgba)

    # Place images on canvas (back to front for proper overlap)
    for idx, img in enumerate(processed_images):
        if idx >= len(positions):
            break

        x, y, rotation = positions[idx]
        x, y = int(x), int(y)

        # Rotate image
        if rotation != 0:
            img_rotated = img.rotate(rotation, expand=True, resample=Image.Resampling.BICUBIC)
        else:
            img_rotated = img

        # Add shadow
        img_with_shadow = add_shadow(img_rotated, offset=6, blur=12)

        # Calculate position (center the image)
        paste_x = x - img_with_shadow.width // 2
        paste_y = y - img_with_shadow.height // 2

        # Paste with alpha
        canvas.paste(img_with_shadow, (paste_x, paste_y), img_with_shadow)
        logger.info(f"[COLLAGE] Placed image {idx+1} at ({paste_x}, {paste_y}) with rotation {rotation}°")

    # Convert to RGB for JPEG
    final = Image.new('RGB', canvas.size, background_color)
    final.paste(canvas, mask=canvas.split()[3])

    # Save to bytes
    output = io.BytesIO()
    final.save(output, format='JPEG', quality=92, optimize=True)
    result = output.getvalue()

    logger.info(f"[COLLAGE] Stylish collage created, size: {len(result) / 1024:.1f} KB")
    return result
