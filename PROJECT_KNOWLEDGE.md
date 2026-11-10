# my e-Wish — Project Knowledge for Future Contributors

This document is a handoff for future developers and coding agents. Read it
alongside [README.md](./README.md) for setup and [TODO.md](./TODO.md) for the
launch checklist. Keep this file current when project behavior or deployment
status changes.

## Project at a glance

**Product:** my e-Wish  
**Purpose:** A multi-user website for creating personalized, shareable wishes
and surprise pages for birthdays, anniversaries, weddings, achievements,
goals, special moments, and other occasions. Creators select a mood and layout,
customize content and imagery, and can protect a page with an access code.

**Stack:** Next.js App Router, React, TypeScript, MongoDB Atlas, Auth.js
(NextAuth Credentials), Cloudinary, SMTP/Nodemailer, Zod, and Vitest.

**Project root on the original development machine:**
`E:\MERN Apps\Birthday surprize massage`

The package is named `my-e-wish`. The selected public-facing name has not had
independent domain, social-handle, or trademark availability verification.

## Product capabilities

- Five distinct moods: Heartfelt, Playful, Elegant, Dreamy, and Encouraging.
- Nine occasion treatments and three separately composed recipient layouts:
  Letter, Postcard, and Keepsake.
- Creator accounts, verified email, password reset, a dashboard, and an
  owner-only profile and preview.
- Customizable recipient, sender, headline, message, accent color, and cover
  image; surprise blocks include a private note, quote, answer-checked
  question, and captioned memory photo.
- Public pages or code-protected pages. A private page's content is withheld
  until the access code is accepted; access uses a scoped, expiring HttpOnly
  cookie. Quiz answers are checked server-side.
- Sixty bundled message starters across Flirty, Happy, Good wishes, Wealth &
  prosperity, and Family. Suggestions are editable and are not saved unless
  the creator saves the page.
- Visitor name entry before published page content is revealed. Private pages
  require code entry first. Names are self-reported, not verified identities.
- Per-page visitor counts based on registered browser/page pairs, not
  guaranteed unique people or total page hits. Random browser token hashes and
  entered names are stored; raw IP addresses are not stored for these records.
- One visitor comment per registered browser/page. Comments appear with
  counts in owner views and trigger branded email notifications to the creator.
  A failed notification can be retried without creating a duplicate comment.
- Cloudinary stores image binaries; MongoDB stores app data and media
  references. Authenticated media delivery is checked against page/owner access.
- Multi-admin support console with TOTP MFA, one-time recovery codes,
  reason-required short-lived grants, owner notification, and audit history.
  There is no master access code or unlogged private-page bypass.
- Public Contact page with rate-limited SMTP messages; contact messages are
  emailed and not persisted in MongoDB.
- SEO metadata, social metadata, structured data, `robots.txt`, and
  `sitemap.xml`. Personal recipient pages and account/admin areas are excluded
  from indexing.
- Responsive layouts, reduced-motion support, and a no-login `/demo`.

## Key architecture and files

- `app/[slug]/page.tsx`: public recipient page route.
- `app/api/`: authentication, experience CRUD, uploads/media, public visitor
  interactions, email, MFA, and admin routes.
- `app/components/`: editor, dashboard, recipient templates, visitor forms,
  and surprise interactions.
- `app/experiences/[id]/preview/page.tsx`: owner-authorized preview and
  feedback data.
- `app/profile/page.tsx`: owner-only profile, visitor data, and comments.
- `lib/auth.ts`: authentication, role refresh, password and MFA checks.
- `lib/db.ts`: MongoDB connection and indexes.
- `lib/email-template.ts`: shared branded email templates.
- `lib/experience-schema.ts`: validation for experience data.
- `lib/experiences.ts`: storage operations and recipient-safe projections.
- `lib/page-access.ts`: scoped private-page cookie handling.
- `lib/rate-limit.ts`: shared MongoDB rate limits.
- `lib/themes.ts`: mood palette/style tokens.
- `app/globals.css`: global styling, responsive navigation, and reduced motion.
- `.env.example`: names of environment variables; placeholders only.
- `.gitignore`: excludes dotenv files except `.env.example`, dependencies,
  build outputs, and logs.

## Important implementation and security decisions

- All creator experience reads and mutations must remain scoped to the
  authenticated owner. Admin support access must remain MFA-protected,
  time-limited, reason-required, and auditable.
- Never return private page content or quiz answers before their server-side
  gate succeeds. Do not move access checks into client-only code.
- Hash passwords, page codes, verification/reset tokens, and recovery codes.
- Rate limit sensitive endpoints using the shared Mongo-backed rate limiter.
- Validate API inputs with existing Zod schemas and preserve same-origin
  mutation protections and request-size limits.
- Do not trust client-supplied roles, visitor identities, or arbitrary proxy
  headers. Admin allowlists apply during registration; changing an allowlist
  does not automatically change an already-created account's role.
- Do not store raw IP addresses for visitor analytics. Document visitor names
  as self-reported and define a retention/deletion policy before launch.
- Preserve the current deletion behavior that also cleans up associated
  visitor/comment data when an experience is deleted.
- Keep secrets out of source control, logs, screenshots, and chat. Never read
  or print `.env.local` values when debugging deployment.
- The `fdprocessedid` hydration mismatch was traced to an external browser
  extension injecting attributes. Hydration-warning suppression is narrowly
  limited to affected interactive controls; do not suppress warnings globally.
- Surprise quizzes must not introduce nested forms. An earlier nested-form
  error was fixed by using a non-form wrapper and handling submission safely.
- Admin role refresh from MongoDB and guarded login redirects were added to
  address incorrect normal-profile routing and login/dashboard redirect loops.

## Current known state (2026-11-11)

- The latest `npm test` run passed: **7 test files, 25 tests**.
- The latest `npm run build` passed with Next.js 16.4.6 and completed static
  generation. The app includes dynamic routes for auth, public pages, admin,
  experiences, uploads, and visitor feedback.
- TypeScript checks have passed in prior verification runs; rerun
  `npm run typecheck` after further changes.
- The workspace was not a Git repository at the time of this handoff. Git,
  GitHub CLI (`gh`), and Vercel CLI (`vercel`) were not installed/available.
- GitHub was signed out in the available browser. A Vercel new-project page was
  reachable, but no repository or project was created.
- No commit, push, GitHub repository, or Vercel deployment has been made.
- The user chose Vercel hosting, requested a **new private GitHub repository**,
  has no custom domain yet, and intends a public production deployment.
- `.env.local` exists locally and required MongoDB, SMTP, Cloudinary, and
  authentication configuration were detected as present. **Do not copy,
  display, or commit any of those secret values.**
- A successful build does not prove that production MongoDB, SMTP, Cloudinary,
  admin MFA, or visitor email flows work. Finish the staging and launch tasks
  in [TODO.md](./TODO.md) before considering the service production-ready.

## Local development and verification

Requires Node.js 20.9 or newer and npm.

```powershell
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

The project scripts are defined in `package.json`. Run the narrowest relevant
tests after a code change, and run typecheck/build before deployment. Avoid
running typecheck at the same time as a build if the build is regenerating
`.next/types`; a transient type error can result. Re-run typecheck after the
build finishes.

## Manual deployment: private GitHub repository + Vercel

Deployment has not been performed. The following is the agreed next path; do
not paste credentials or secret environment-variable values into chat.

### 1. Prepare Git and GitHub

1. Install **Git for Windows** from the official Git website. Restart VS Code
   after installation so its terminal can find `git`.
2. Sign in to your GitHub account in your browser.
3. On GitHub, create a **new private repository** (for example
   `my-e-wish`). Since this workspace already has files, do not initialize the
   remote repository with a README, license, or `.gitignore`.
4. Open a PowerShell terminal in the project root and initialize the local
   repository:

   ```powershell
   Set-Location 'E:\MERN Apps\Birthday surprize massage'
   git init -b main
   git add -A
   git status --short
   git diff --cached --name-only
   ```

5. Before committing, inspect the staged filenames. Confirm `.env.local`,
   `.env`, credentials, database exports, and other private files are absent.
   The existing `.gitignore` ignores `.env` and `.env.*` while allowing
   `.env.example`. If an actual secret file appears as staged, stop and unstage
   it before continuing; never push it.
6. Commit and connect the remote URL shown by GitHub (replace the example URL
   with the URL for the private repository you created):

   ```powershell
   git commit -m "Initial my e-Wish application"
   git remote add origin https://github.com/YOUR-USERNAME/my-e-wish.git
   git push -u origin main
   ```

   GitHub may open a browser sign-in flow for Git Credential Manager. Do not
   put a password or personal access token in the command or source files.

### 2. Import and deploy on Vercel

1. Sign in to Vercel and choose **Add New → Project**.
2. Connect GitHub if prompted, select the private `my-e-wish` repository, and
   import it. Keep the project root at the repository root; the framework
   should be detected as Next.js.
3. Before deploying, add the production environment variables below in Vercel's
   project settings. Enter values directly in Vercel's secure settings UI;
   never add them to source code or commit them.
4. Deploy and wait for the Vercel build to complete. Confirm the deployment URL
   loads over HTTPS and inspect the deployment/runtime logs for errors without
   exposing secret values.
5. If Vercel provides a `*.vercel.app` URL, use that as the initial canonical
   URL until a custom domain is configured. Update `NEXTAUTH_URL` and `SITE_URL`
   to the exact HTTPS origin, then redeploy.

### 3. Production environment variables

Use `.env.example` as the authoritative list of names. Set production values
in Vercel, not in Git:

- `MONGODB_URI` and `MONGODB_DB`: Atlas connection and database. Add the
  deployment's network access as required by Atlas, use a least-privilege
  database user, and configure backups.
- `AUTH_SECRET`: a strong, unique production secret. Do not reuse a public or
  development value.
- `NEXTAUTH_URL`: exact public HTTPS site origin.
- `SITE_URL`: exact canonical public HTTPS site origin, normally the same
  origin as `NEXTAUTH_URL`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and
  `EMAIL_FROM`: production mail provider. Port 465 normally uses
  `SMTP_SECURE=true`; port 587 normally uses `false`.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and
  `CLOUDINARY_API_SECRET`: production Cloudinary account.
- `CONTACT_RECIPIENT_EMAIL`: optional destination for contact messages.
- `SUPPORT_ADMIN_EMAILS` and `SUPER_ADMIN_EMAILS`: optional comma-separated
  admin allowlists. Set the intended admin address before that user registers.

Limit production secrets to the Production environment. If Preview deployments
need environment variables, use isolated staging services/data and separate
credentials rather than production data. After changing environment variables,
redeploy so the deployment receives them.

### 4. First-deploy smoke tests and launch

1. Configure the admin allowlist, register the intended admin, verify the
   email, enroll MFA at `/admin/setup-mfa`, and save recovery codes securely.
2. Test registration, verification, login/logout, password reset, create/edit/
   delete, image upload, public sharing, private unlock, quiz checking, visitor
   name capture, comment submission, creator email notifications/retry, and
   Contact email.
3. Check owner-only preview/profile data and test that one account cannot read
   or modify another account's experiences or media.
4. Verify Atlas backups/restoration, email deliverability, Cloudinary
   permissions, monitoring, rollback, and secret rotation.
5. Before public launch, settle privacy policy/terms, retention, data export,
   account deletion, and visitor/comment cleanup. Review [TODO.md](./TODO.md)
   and complete every launch-critical item.
6. When a custom domain is added, configure it in Vercel, set `NEXTAUTH_URL`
   and `SITE_URL` to that HTTPS origin, redeploy, and verify canonical URLs and
   the sitemap.

## Known gaps and next priorities

- Complete GitHub and Vercel setup and deployment using the manual steps above.
- Complete staging validation of all external providers and the complete
  privacy/operations checklist in `TODO.md`.
- Define and implement retention, account deletion, and data-export behavior
  for visitor data and account data before public launch.
- Revisit environment separation, monitoring/alerts, Atlas restore tests,
  Cloudinary cleanup, and deployment rollback procedures.
- Add automated end-to-end browser coverage and run an independent security
  review against the final production configuration.
- Verify domain, social handle, and legal/trademark availability for the
  product name before investing in public branding.

## Working guidance for future coding agents

1. Read this file, `README.md`, and the relevant sections of `TODO.md` before
   changing behavior.
2. Inspect the existing patterns and tests before adding abstractions or
   dependencies. Preserve owner checks, server-side authorization, validation,
   rate limits, privacy expectations, and accessible/reduced-motion behavior.
3. Treat user content, visitor names, and account data as private. Never
   include `.env.local` values in output or commit them.
4. Make small, related changes; update relevant docs; run targeted tests,
   `npm run typecheck`, and `npm run build` when practical.
5. Do not claim production deployment or integration tests succeeded unless
   they were actually performed against the configured production-like
   services.
