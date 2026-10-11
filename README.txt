OUR LITTLE CALENDAR — REBUILT CLOUDFLARE PAGES VERSION

Files:
- index.html: login screen and calendar layout
- styles.css: responsive styling
- app.js: Supabase Auth + memory CRUD (fill in two config values)
- couple-photo.jpeg: uploaded header photo
- SETUP-SQL.sql: tighter Supabase Row Level Security policies

IMPORTANT: Don't put real memories in the site until setup and tests are complete.

1) In Supabase SQL Editor, run SETUP-SQL.sql. This replaces the earlier broad policies and restricts each account to writing/editing/deleting only its own author label.
2) In Supabase Project Settings / API Keys (or the Connect dialog), copy the Project URL and publishable key. Never use a secret or service_role key in browser code.
3) Open app.js and replace:
   PASTE_YOUR_SUPABASE_PROJECT_URL_HERE
   PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE
   with your actual Project URL and publishable key. Keep the quotes.
4) Upload/replace the files in your GitHub Cletey11/Calendar repository at the repository root: index.html, styles.css, app.js, couple-photo.jpeg, and optionally SETUP-SQL.sql/README.txt. Ensure index.html is at the root, not inside a nested folder.
5) Commit to main and wait for Cloudflare Pages to redeploy.
6) Test login with each account, verify both can see entries, and verify each account can only edit/delete its own entries.

Supabase Auth note: since accounts were manually created in the dashboard, ensure they have valid passwords. This site uses email/password sign-in only; it does not expose a public sign-up form.
