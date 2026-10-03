# Colour Kozhi Kunji Salon — site

Static site + Vercel serverless function + Supabase.

## 1. Supabase
1. Create a project at supabase.com.
2. Production deploys apply the tracked files in `supabase/migrations/` automatically. For a manual setup, SQL Editor → paste & run `supabase.sql`.
3. Authentication → Users → **Add user** (your email + password, tick *Auto confirm*).
4. SQL Editor → run (replace the email with the account you created):
   `insert into profiles (id, role) select id, 'super_admin' from auth.users where email = 'YOUR_EMAIL' on conflict (id) do update set role = excluded.role;`
5. Project Settings → API: copy **URL**, **anon key**, **service_role key**.

## 2. Config
Edit `config.js` → set `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the project URL and public anon/publishable key. This static site reads these values from `config.js`, not Vercel environment variables.

## 3. Vercel
1. Push this folder to GitHub → Import in Vercel (Framework: *Other*). `vercel.json` runs migrations during production builds and serves the project root as static output.
2. Environment Variables:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (**secret — never put it in config.js**)
   - `SUPABASE_DB_URL` = Supabase Postgres connection string (**secret; production only**). `POSTGRES_URL` or `POSTGRES_PRISMA_URL` can be used instead.
3. Deploy. Admin is at `/admin` (small "admin" link in the footer). Sign in with the email and password from step 3 after assigning that account the `super_admin` role in step 4.

Preview deployments skip database migrations. Keep the database URL out of `config.js`; the migration runner uses it only during the server-side Vercel build.

## Using the admin
- **Content**: owner photo, owner name and story, hero captions, stickers, marquee words, Instagram / YouTube / Facebook links. The owner profile section uses the same uploaded owner photo.
- **Gallery**: bulk upload images, caption, reorder, delete. Uploaded files are stored persistently in the Supabase Storage `gallery` bucket under `assets/`.
- **Videos**: paste Instagram post/reel links (public posts) and YouTube links.
- **Locations**: one tab + map per branch. Address can be a place name, "lat,lng", or Google's embed iframe code.
- **Users** (super admin only): create admins/super admins, change roles, delete.

Before Supabase is connected the site shows placeholder content so you can preview it.

Static site images, including the chick mascot, live in the local `assets/` folder. Admin uploads go to Supabase Storage because deployed Vercel files are read-only and should not be used as persistent upload storage.
