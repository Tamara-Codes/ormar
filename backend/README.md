# Ormar Backend

FastAPI backend for photo upload and AI-powered item analysis.

## Setup

1. **Create `.env` file** (copy from `.env.example`):
```bash
cp .env.example .env
```

2. **Add your credentials**:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Supabase anon key (public)
- `GEMINI_API_KEY`: Your Google Gemini API key

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Run the server**:
```bash
uvicorn app.main:app --reload --port 8000
```

Server will be available at `http://localhost:8000`

## API Endpoints

### AI Analysis
- `POST /api/analyze-image` - Analyze photo with Gemini Vision API

### Items
- `POST /api/items` - Create new item
- `GET /api/items` - List user's items
- `GET /api/items/{id}` - Get single item
- `PUT /api/items/{id}` - Update item

## Authentication

All item endpoints require Bearer token in Authorization header:
```
Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN
```

## Database Setup

Run SQL from `../database-schema.sql` in Supabase SQL editor:

1. Create items table with constraints and indexes
2. Enable RLS (Row Level Security)
3. Create storage bucket `item-images` and policies

## Development

- Auto-reload enabled with `--reload` flag
- CORS configured for localhost:5173 and localhost:3000
- Temp files cleaned up automatically after image processing




