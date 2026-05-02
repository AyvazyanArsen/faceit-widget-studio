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

## Routes

- `/` — the studio (template gallery, customizer, OBS URL builder)
- `/widget/<nickname>?...` — the standalone widget renderer for OBS Browser Source

## Configuration

Edit `FACEIT_API_KEY` near the top of `src/widget-studio.jsx` to use your own key.
Get a Client-side key at https://developers.faceit.com.

## Publishing global templates

When admin creates a template, it lives in *that browser only* by default. To make
a template visible to every visitor:

1. In the admin panel template list, click the share icon next to your custom
   template. A snippet is copied to your clipboard.
2. Open `src/shared-templates.js` and paste the snippet inside `SHARED_TEMPLATES`.
3. If the template uses an MP4 background uploaded from your computer, upload that
   video to a CDN (S3, Cloudflare R2, Bunny) and replace the `mp4Url` value with
   the public HTTPS URL — uploaded blob URLs only exist in the browser that uploaded
   them and won't work for other visitors.
4. Commit and push. Vercel auto-redeploys in ~60s and every visitor sees the new
   template, marked with a `SHARED` badge.

For dynamic admin → all-users sync without redeploying, you'd need a backend
(Vercel KV, Supabase, Firebase). The current approach is intentional: zero
backend cost, full control over what ships globally.

## Production notes

- The API key is in the client bundle and visible to anyone. Faceit Data API keys
  are read-only against public profile data, so blast radius is limited, but for a
  real product you'd move calls to a serverless function.
- Per-browser custom templates and admin unlocks live in `localStorage` so they're
  scoped to the current device.
- The mock paywall (`Paywall` component) doesn't take real money — wire Stripe /
  NOWPayments / your crypto checkout into `mockUnlock()` before going live.
