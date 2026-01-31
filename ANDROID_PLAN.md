# Android App Plan - My Closet (Ormar)

## Goal
Convert the React web app to a native Android app using Capacitor, with local storage and photo gallery integration.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User takes photo                                       │
│         ↓                                               │
│  Uploaded to Supabase Storage (permanent, cloud)        │
│         ↓                                               │
│  Visible in app (phone gallery stays clean)             │
│         ↓                                               │
│  When posting to FB:                                    │
│         ↓                                               │
│  Download collage to "Ormar" temp folder on phone       │
│         ↓                                               │
│  User posts to FB                                       │
│         ↓                                               │
│  Delete from "Ormar" folder (cleanup)                   │
│         ↓                                               │
│  Photos still safe in Supabase                          │
└─────────────────────────────────────────────────────────┘
```

| Storage | Purpose |
|---------|---------|
| Supabase Storage | Permanent home for all photos |
| Supabase Database | Item data (title, price, etc.) |
| "Ormar" phone folder | Temp folder for FB posting only |

---

## Steps

### 1. Add Capacitor (30 min)
- Install Capacitor core and Android platform
- Configure `capacitor.config.ts`
- Run `npx cap add android`

### 2. Keep Supabase for Storage (already done)
- Photos uploaded to Supabase Storage (permanent)
- Item data in Supabase Database
- User's phone gallery stays clean

### 3. Add Photo Gallery Plugin (1 hour)
- Install `@capacitor-community/media`
- Create "Ormar" temp album on first launch
- Download collages here only when posting to FB
- Delete after posting (keeps phone clean)

### 4. Update Image Handling (1-2 hours)
- Use `@capacitor/camera` for taking/picking photos
- Store photos in app's gallery album
- Update UI to work with local file paths

### 5. Keep Minimal Backend (optional)
- AI image analysis (Gemini) - needs API key protection
- Background removal - needs API key protection
- Or remove these features for fully offline app

### 6. Build & Test (1 hour)
- Install Android Studio
- Run `npx cap sync android`
- Test on emulator or real device via USB

### 7. Publish to Play Store
- Create Google Play Developer account ($25)
- Generate signed APK/AAB
- Create store listing (screenshots, description)
- Submit for review (1-3 days)

---

## Facebook Sharing Flow

```
┌─────────────────────────────────┐
│  Post spreman!                  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 🧥 Zimska jakna - 25€     │  │
│  │ 👟 Tenisice Nike - 30€    │  │
│  │ Veličine: M, 38           │  │
│  └───────────────────────────┘  │
│                                 │
│  [📋 Kopiraj tekst]             │
│  [💾 Spremi post]  [📘 Otvori FB] │
└─────────────────────────────────┘
```

**How it works:**
1. App generates caption from selected items (title, price, size)
2. User taps "Kopiraj tekst" → copied to clipboard
3. User taps "Spremi post" → saved locally for later
4. User taps "Otvori FB" → deep link opens Facebook with collage image
5. User pastes caption in Facebook (one long-press)

**Note:** Facebook blocks pre-filled text (anti-spam), so clipboard + paste is the workaround.

---

## Plugins Needed

| Plugin | Purpose |
|--------|---------|
| `@capacitor/camera` | Take/pick photos |
| `@capacitor-community/media` | Save to "Ormar" temp album |
| `@capacitor/filesystem` | File management |
| `@capacitor/share` | Share to Facebook (deep link) |
| `@capacitor/clipboard` | Copy caption text |

---

## Timeline

| Phase | Time |
|-------|------|
| Setup & basic conversion | 1 day |
| Local storage implementation | 1 day |
| Testing & fixes | 1 day |
| Play Store submission | 1 day |
| **Total** | **~4 days** |

---

## Cost

**One-time:**
- Google Play Developer: **$25**

**Monthly (Supabase):**

| Users | Storage | Plan | Cost |
|-------|---------|------|------|
| 1-5 | <1GB | Free | $0/mo |
| 5-50 | 1-8GB | Pro | $25/mo |
| 50-500 | 8-75GB | Pro | $25/mo |
| 500+ | 75GB+ | Pro + extra | $25+/mo |

**Estimate:** ~150MB per user (50 items × 3 photos × 1MB)

**Bottom line:** Free while building, $25/mo once you have 10+ users
