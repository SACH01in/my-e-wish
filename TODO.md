# my e-Wish implementation and launch checklist

The application features below are implemented. The final external-service and
operational checks remain deployment-specific; complete them before public
launch.

## Implemented foundation and product

- [x] Build the responsive Next.js landing page, creator pages, recipient
  pages, dashboard, login, registration, and password reset.
- [x] Add multiple reusable surprise blocks: note, quote, question game, and
  captioned memory photo.
- [x] Add three separately composed recipient templates, mood-specific visual
  treatments, and dedicated art/copy for each occasion.
- [x] Add a private, owner-authorized dashboard preview for published pages
  and unpublished drafts.
- [x] Add a name-first wish creation step and a local set of 60 original
  message suggestions in five categories.
- [x] Add an owner-only profile with page totals and per-page visitor names.
- [x] Add one rate-limited visitor comment per page/browser, per-page dashboard
  review counts, profile display beside visitor names, and creator email
  notifications with retry support after transient mail failures.
- [x] Replace the profile text link with an initial avatar and hover/focus
  tooltip.
- [x] Require a visitor-entered name before revealing published-page content;
  require private-page code entry first and disclose that names are
  self-reported.
- [x] Keep visitor analytics page-scoped with random token hashes, owner-only
  profile queries, rate-limited name registration, and no raw-IP storage.
- [x] Persist creator experiences in MongoDB and share them via random slugs.
- [x] Add ownership-filtered read/update/delete operations and server-side Zod
  validation.
- [x] Hash account passwords, page codes, verification tokens, reset tokens,
  and recovery codes.
- [x] Add email verification, password reset, session version checks, and
  admin TOTP enrollment with one-time recovery codes.
- [x] Store Cloudinary images as authenticated assets and gate image delivery
  by owner/page access.
- [x] Add private page codes, scoped HttpOnly access cookies, attempts limits,
  and server-side quiz checking.
- [x] Add a multi-admin support console with MFA, reason-required 15-minute
  grants, owner notification, and audit events.
- [x] Add same-origin mutation checks, JSON body limits, and baseline security
  headers.
- [x] Add a public Contact page with creator details and a rate-limited SMTP
  message form that validates input, sets Reply-To, and does not persist messages.
- [x] Apply shared MongoDB rate limits to authentication, verification, page
  mutations, uploads, private interactions, MFA, and admin support grants.
- [x] Validate proxy IP headers for rate-limit keys and avoid trusting
  `X-Forwarded-Host` alone for mutation-origin checks.
- [x] Add schema/privacy tests and verify the production build and type-check.
- [x] Add canonical metadata, social previews metadata, structured data,
  robots.txt, sitemap.xml, and indexing controls for private/personal pages.

## Required before launch

- [ ] Configure real MongoDB Atlas, SMTP email, Cloudinary, production host, and
  canonical HTTPS domain settings; test every integration in staging.
- [ ] Set `SITE_URL` to the final public HTTPS origin and submit the sitemap in
  Google Search Console and Bing Webmaster Tools after launch.
- [ ] Create at least one allowlisted super-admin account, verify its email,
  enroll MFA, and safely save its recovery codes.
- [ ] Run end-to-end flows in a production-like environment: sign-up and
  verification, login/MFA, create/edit/delete, creator-name prefill, select a
  wish suggestion, upload, publish/share, visitor-name capture, profile stats,
  private unlock followed by visitor-name capture, review submission and
  creator email delivery/retry, dashboard review-count links to owner profile,
  quiz answer checking,
  password reset, contact email delivery, and admin support access.
- [ ] Verify that customer A cannot read, change, delete, or retrieve customer
  B's page/media by changing URL IDs.
- [ ] Test code rotation revokes previous private page access.
- [ ] Configure and test Atlas backups, restore procedures, Cloudinary cleanup,
  monitoring/alerts, and deployment rollback.
- [ ] Set privacy policy, terms, visitor-name retention, data export and
  account deletion behavior; visitor names and per-page token hashes are
  persisted in MongoDB and currently have no automatic expiry.
- [ ] Add automated end-to-end browser tests and run an independent security
  review against the final production configuration.
- [ ] Confirm admin lifecycle: allowlist updates do not automatically change
  existing roles; document a secure role revoke/disable process.

The app code is now server-backed, but it is **not publicly launch-ready** until
the provider settings and launch checks above have been completed.
