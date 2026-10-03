# Colour Kozhi Kunji Salon — site

Static site + Vercel serverless function + Supabase.

## 1. Supabase
1. Create a project at supabase.com.
2. SQL Editor → paste & run `supabase.sql`.
3. Authentication → Users → **Add user** (your email + password, tick *Auto confirm*).
4. SQL Editor → run (with your email):
   `insert into profiles (id, role) select id, 'super_admin' from auth.users where email = 'YOUR_EMAIL';`
5. Project Settings → API: copy **URL**, **anon key**, **service_role key**.

## 2. Config
Edit `config.js` → paste URL + anon key.

## 3. Vercel
1. Push this folder to GitHub → Import in Vercel (Framework: *Other*, no build command).
2. Environment Variables:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (**secret — never put it in config.js**)
3. Deploy. Admin is at `/admin` (small "admin" link in the footer).

## Using the admin
- **Content**: owner photo, hero captions, stickers, marquee words, Instagram / YouTube / Facebook links.
- **Gallery**: bulk upload images, caption, reorder, delete. Uploaded files are stored persistently in the Supabase Storage `gallery` bucket under `assets/`.
- **Videos**: paste Instagram post/reel links (public posts) and YouTube links.
- **Locations**: one tab + map per branch. Address can be a place name, "lat,lng", or Google's embed iframe code.
- **Users** (super admin only): create admins/super admins, change roles, delete.

Before Supabase is connected the site shows placeholder content so you can preview it.

Static site images, including the chick mascot, live in the local `assets/` folder. Admin uploads go to Supabase Storage because deployed Vercel files are read-only and should not be used as persistent upload storage.
