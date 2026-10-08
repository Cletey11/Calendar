OUR LITTLE CALENDAR ❤️

This is the shared relationship-memory calendar for Caleb and Cassie.

FEATURES
- Cute responsive calendar UI
- The supplied couple photo at the top
- Click any day to add a memory
- Caleb entries are purple; Cassie entries are pink
- Text previews appear directly inside calendar days
- Multiple memories per day
- Edit/delete memories
- Shared Netlify Database (managed Postgres)
- Netlify Function API keeps database credentials off the browser
- Simple shared access code so the calendar is not openly writable

GITHUB + NETLIFY SETUP
1. Put this entire folder in a GitHub repository.
2. In Netlify, import that GitHub repository as a new project.
3. Make sure your Netlify plan supports Netlify Database.
4. Netlify will provision the managed Postgres database because @netlify/database is in package.json.
5. In Netlify, add an environment variable named CALENDAR_ACCESS_CODE. Pick a private code and give the same code to both people.
6. Deploy. Netlify applies the migration in netlify/database/migrations/.
7. Open the site and enter the shared code.

IMPORTANT
- Never put CALENDAR_ACCESS_CODE in GitHub or in frontend JavaScript.
- The database is accessed through the Netlify Function, not directly from the browser.
- Netlify Database is a managed Postgres service and may consume Netlify credits depending on your plan/usage.
