# Deploy Guide: Frontend (Vercel) + Backend (Render) + DB (MongoDB Atlas)

## 1) MongoDB Atlas

1. Create a cluster (M0 free tier is fine to start).
2. Create DB user (username/password).
3. Network Access:
   - For quickest setup, allow `0.0.0.0/0`.
   - Tighten later if needed.
4. Copy connection string and replace placeholders:
   - `mongodb+srv://<user>:<password>@<cluster-url>/arihaan-ppe?retryWrites=true&w=majority`

## 2) Backend on Render

This repo includes `render.yaml`, so you can use Blueprint deploy.

### Option A: Blueprint (recommended)

1. In Render: `New +` -> `Blueprint`.
2. Select this repository.
3. Render will detect `render.yaml` and create service.
4. Add required secret env vars in Render dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `OPENAI_API_KEY` (if using AI features)
   - `ASSET_STORAGE_PROVIDER` = `r2`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`
   - `R2_ENDPOINT` (optional if `R2_ACCOUNT_ID` is set)
   - `R2_PUBLIC_BASE_URL` (your Cloudflare CDN custom domain)
   - `R2_KEY_PREFIX` (optional, e.g. `uploads`)
5. Deploy.

### Option B: Manual Web Service

Use these settings:

- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/`

Env vars to set:

- `NODE_ENV=production`
- `MONGODB_URI=<atlas-uri>`
- `JWT_SECRET=<strong-random-secret>`
- `OPENAI_API_KEY=<key>` (optional if AI not needed)
- `OPENAI_MODEL=gpt-5`
- `AI_REQUIRE_SUCCESS=true`
- `AI_RETRY_ATTEMPTS=3`
- `HTTP_REQUEST_TIMEOUT_MS=3600000`
- `HTTP_HEADERS_TIMEOUT_MS=3610000`
- `HTTP_KEEP_ALIVE_TIMEOUT_MS=65000`
- `ASSET_STORAGE_PROVIDER=r2`
- `R2_ACCOUNT_ID=<cloudflare-account-id>`
- `R2_ACCESS_KEY_ID=<r2-access-key-id>`
- `R2_SECRET_ACCESS_KEY=<r2-secret-access-key>`
- `R2_BUCKET=<r2-bucket-name>`
- `R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com` (optional if account id is set)
- `R2_PUBLIC_BASE_URL=https://cdn.<your-domain>`
- `R2_KEY_PREFIX=uploads`

After deploy, note backend URL:

- Example: `https://arihaan-enterprises-backend.onrender.com`

## 3) Frontend on Vercel

`vercel.json` is added for SPA route fallback (`/products/:id` direct open works).

1. In Vercel: `Add New Project` -> import this repository.
2. Framework preset: `Create React App`.
3. Build command: `npm run build`
4. Output directory: `build`
5. Set environment variables in Vercel project:
   - `REACT_APP_API_URL=https://<your-render-domain>/api`
   - `REACT_APP_BACKEND_URL=https://<your-render-domain>`
   - `REACT_APP_ASSET_BASE_URL=https://cdn.<your-domain>` (optional fallback for any legacy `/uploads/*` references)
   - `SITEMAP_API_URL=https://<your-render-domain>/api`
   - `REACT_APP_SITE_URL=https://arihaanenterprises.in`
   - `REACT_APP_GOOGLE_SITE_VERIFICATION=<google-verification-token>` (optional)
   - `REACT_APP_BING_SITE_VERIFICATION=<bing-verification-token>` (optional)
   - `REACT_APP_AI_DRAFT_TIMEOUT_MS=420000`
   - `REACT_APP_AI_DRAFT_TIMEOUT_PDF_MS=600000`
6. Deploy.

Notes:

- `npm run build` now runs SEO automation:
  - prebuild: generates dynamic `public/sitemap.xml` from backend products
  - postbuild: prerenders public routes using `react-snap`

### Custom domains for this project

Use these in Vercel Project -> Settings -> Domains:

- `arihaanenterprises.in` (set as Primary)
- `www.arihaanenterprises.in` (redirect to Primary)
- `arihaansafety.com` (redirect to Primary)
- `www.arihaansafety.com` (redirect to Primary)

Recommendation:

- Keep one canonical domain for SEO: `https://arihaanenterprises.in`
- Keep the second domain only as redirect.

Where this is stored in app code:

- Primary canonical URL is set in `public/index.html`.
- API endpoints are controlled by Vercel env vars (`REACT_APP_API_URL`, `REACT_APP_BACKEND_URL`).

## 4) Post-Deploy Smoke Test

1. Open frontend home page.
2. Open products list and product detail directly via URL.
3. Check login and API-backed pages.
4. Submit contact form.
5. Test product image URLs (uploads).
6. Test AI draft generation (if enabled).
7. Open `https://arihaanenterprises.in/sitemap.xml` and verify product URLs are included.
8. Open page source for `/`, `/about`, and a product page and confirm unique title/description/canonical tags.

## 5) Search Console Launch Checklist

1. Open Google Search Console and add a **Domain property** for `arihaanenterprises.in`.
2. Complete DNS TXT verification in your domain DNS settings.
3. In Search Console -> Sitemaps, submit:
   - `https://arihaanenterprises.in/sitemap.xml`
4. Use URL Inspection for key pages and request indexing:
   - `/`
   - `/products`
   - top product detail pages
5. Monitor Indexing -> Pages and fix any blocked/noindex pages.
6. Repeat the same process in Bing Webmaster Tools (optional but recommended).

## 6) Important Production Note

Uploads can now be stored in Cloudflare R2 (recommended for production durability).

To migrate existing local media URLs (`/uploads/...`) in MongoDB products:

1. Make sure R2 env vars are set on backend.
2. Run dry-run first:
   - `cd server && npm run migrate:uploads:r2`
3. Run actual migration:
   - `cd server && npm run migrate:uploads:r2:apply`

After migration, product `images` and `datasheet` fields will use absolute CDN URLs.

## 7) Useful Commands (local validation)

From repo root:

- `npm run build`

From `server/`:

- `npm start`

---

If you want, next step can be cloud upload migration (Cloudinary) so product images are fully persistent in production.
