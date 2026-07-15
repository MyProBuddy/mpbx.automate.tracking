# Changelog

## [Unreleased] — 2026-07-15

### Added
- **Overview page** (`/overview`) — dedicated page with stat cards (Total, Initial Sent, This Week, F1, F2, F3, Replies), client table with followup pills, and a Needs Attention section (Escalations + Invalid Emails)
- **Overview card in Hub** — fifth card on the Hub page linking to `/overview`
- **Persistent Google auth** — superadmin connects Google once; token is AES-256-GCM encrypted and stored in a private GitHub Gist via a Vercel serverless function (`api/token.js`); all browsers and incognito sessions automatically pull the token on load without needing to reconnect
- **`googleSyncing` state in AuthContext** — Connect Google button is hidden while the server token check is in flight, so it never flashes incorrectly on load

### Fixed
- **`api/token.js` crypto bug** — replaced broken Web Crypto (`globalThis.crypto.getRandomValues` was undefined in Vercel serverless scope) with Node.js built-in `crypto` module (`crypto.randomBytes`, `createCipheriv` AES-256-GCM)
- **`vercel.json` rewrite conflict** — catch-all rewrite `/(.*) → /index.html` was intercepting `GET /api/token`; updated to negative lookahead `/((?!api/).*)` so API routes are handled by serverless functions correctly
- **Follow-up distribution showing 0** — was filtering only replied rows; fixed to count all rows by followup stage from the `followup count` column
- **Replies count always 0** — `parseDate()` returned null for non-date reply values (TRUE/FALSE/N/A); fixed to check non-empty, non-N/A, non-FALSE values as replied
- **Follow-up timestamps in client detail** — switched from exact column name matching to fuzzy regex matching (`fIdx`) to handle variant column names across sheets
- **`googleConnected` not updating across components** — moved state to `AuthContext` so all pages share one reactive source instead of each initialising their own local `useState`
- **Dead API abuse removed** — removed a `useEffect` in Analytics that was scanning all sheets on every load to find alerts that were never displayed

### Changed
- **UI standardisation** — all page headings changed to consistent pattern: 11px uppercase label → 30px bold h1 → 13px subtitle; applied across Hub, Overview, Analytics, OutlookConfigurator
- **Design tokens centralised** — `AddData` and `CompanyIntel` now import shared `T` from `constants.js` instead of defining local copies
- **ProgressRow total** — changed denominator from `dashboard.replies` (could be 0) to `dashboard.contacted` for accurate percentage bars
- **Needs Attention** — removed Overdue Followups section; kept only Escalations and Invalid Emails
