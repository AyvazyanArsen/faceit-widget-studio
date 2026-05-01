# Faceit Widget Studio

Free animated Faceit overlay widgets with template gallery, custom backgrounds, and Google Fonts.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to https://vercel.com → New Project → Import the repo.
3. Vercel auto-detects Vite. Click Deploy.
4. Live in ~60 seconds at `your-project.vercel.app`.

## Configuration

Edit `FACEIT_API_KEY` near the top of `src/widget-studio.jsx` to use your own key.
Get a Client-side key at https://developers.faceit.com.

## Production notes

- The API key is in the client bundle and visible to anyone. Faceit Data API keys
  are read-only against public profile data, so blast radius is limited, but for a
  real product you'd move calls to a serverless function.
- Uploaded MP4 files use blob URLs that don't persist across reloads — paste a CDN
  URL in the admin template editor for backgrounds that stick.
- All persistence uses `localStorage` so it's per-browser. To share state across
  devices you'd need a real backend.
