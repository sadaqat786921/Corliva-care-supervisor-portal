# AGENTS.md — CORLIVA Care Supervisor Portal

Read this before changing anything. This app is a finished, approved design. Do **not** redesign it, restyle it, swap the layout, add Tailwind, add a UI kit, or "modernise" it. Only make the change you are asked for, in the same style.

## What this is
CORLIVA is a home care platform. This repo is the **Care Supervisor** web portal. The signed-in person is **Michael Brooks**, Care Supervisor for **North Branch and South Branch** of the agency "Royality Home Care". It is a clickable React prototype with built-in demo data. It shares its design system with the Agency Admin portal (`sadaqat786921/Corliva-agency-admin-portal`) and the Care Coordinator portal (`sadaqat786921/Corliva-care-cordinator-portal`).

A Care Supervisor (from the BRD): reviews care plans, delivered services (finished visits), exceptions, incidents and the requirements given to them. They **can override blocking rules** with a written reason. They do **not** do intake, referrals, scheduling or family requests (Care Coordinator), HR records, pay rates, invoices, payroll, user management or agency settings.

## Stack
- React 19 + Vite + TypeScript. Only extra packages: `react-router-dom` and `lucide-react`. Plain web app at the top level of the repo: `index.html` (with `<div id="root">`) and entry `src/main.tsx`. No backend, no API calls, no `.env`.
- `HashRouter` (keep it — the app must work from any static host and in Figma Make)
- Icons: `lucide-react` only
- Styling: plain CSS in `src/styles.css` using CSS variables. **No Tailwind, no CSS reset libraries, no styled-components.**
- Font: Inter, from the font files in `src/fonts` (`src/fonts/inter.css`, imported in `src/main.tsx`). No Google Fonts link.
- Images live in `public/images/` and are referenced with relative paths like `./images/corliva-logo-white.svg`

## Design system (mirrors the Figma file "Corliva", page "03 · Foundations & Components")
- Page background: brand blue `--bg-page #105CBC`. The sidebar sits directly on the blue.
- Sidebar: width 236px, white text and icons, uppercase section labels (11px semibold), nav items 44px tall. The **active item is a white pill** (radius 37px) with dark text `#292D32`.
- Main content: a rounded light panel `--bg-panel #F8F6F6`, radius 24px, with a white header bar (radius 8px, border `#E5EAF1`, height 59px).
- Cards: white, 1px border `#E5EAF1`, radius 12px.
- Primary action colour `--action-primary #0E66D4`. Status colours: success `#18794A`, warning `#9A5B00`, danger `#C0322B`, each with a soft background.
- Status is always a **word plus a colour** (chips), never colour alone.
- Every token is in `:root` at the top of `src/styles.css`. Use the variables; don't hard-code new colours.

## Writing style
The client is non-technical and over 50. Use short, plain English: "Approve visit", "Send back to fix", "Make exception". No jargon.

## Rules that must keep working
- **Branch filter** (sidebar box and header chip): All branches / North / South. It filters every page (`s.inBranch`) and is saved.
- **Visit approvals** (`src/data/review.ts → serviceFlags`): a finished visit is compared with the plan. Things to look at: no check-out (stops approval until the times are corrected), started late, shorter than planned, much longer than planned, checked in away from the home, care plan tasks not done.
  - Approving a visit **with** something to look at needs a written reason. Visits with nothing to look at can be approved together (tick + "Approve selected").
  - "Send back to fix" needs a reason → tab "Sent back to fix". Correcting a sent-back visit puts it back in "To review".
  - "Correct times" always keeps the original times (shown as "Before correction") and needs a reason.
  - Approved visits are ready for billing and timesheets. Before Finance invoices them they can still be corrected (reason). **After invoicing** the record isn't changed — "Ask Finance for an adjustment" (new times + reason) is sent instead.
- **Care plans**: Coordinator writes and sends → Supervisor **Approves** (with "in use from" date, optional note) or **Asks for changes** (comment required). The old approved version stays in use until the new one is approved, then shows as "Replaced". Every version is kept; changes from the plan in use are highlighted. **Record review** on the plan in use: "Still right" (next review date + note) or "Needs changes" (note → waits for a new version from the coordinator).
- **Checks**: uploading doesn't mean checked. Client documents: Checked / Rejected (reason) / Not needed (reason); a checked document past its expiry shows Expired. Caregiver checks the Supervisor owns (skills checks, spot checks): Checked (with "check again by" date) / Rejected (reason) / Not needed (reason). HR checks everything else; caregiver readiness comes from HR.
- **Exceptions (overrides)**: when a caregiver is blocked (not ready, not trained), the Supervisor can "Assign anyway" or "Keep … anyway" with a written reason. **Nobody can be on two visits at once** — that block can't be overridden. The exception shows on the visit.
- **Incidents**: the Supervisor owns them. Reported → Start review → Under review → (add actions) Actions agreed → Action required → all actions ticked → Mark resolved (how it was resolved) → Close (closing note). Resolved can be reopened (reason). Change severity, private/visible, owner or target date — each needs a reason. Closed incidents can't be changed. Private incidents are visible to the Supervisor (approved role).
- Nothing is ever deleted. Every change is recorded in the record's history / "Changes" list.

## Structure
```
src/
  styles.css               design tokens + all component styles
  data/seed.ts             demo data (dates relative to today; today's check-ins follow the real clock)
  data/store.tsx           app state (saved in sessionStorage), branch filter, toasts, history, Reset demo data
  data/review.ts           finished-visit checks (serviceFlags), planned vs recorded minutes
  data/schedule.ts         caregiver checks (blocking vs warning), live visit state, visits needing a decision
  data/clients.ts          care plan helpers (plan in use / being worked on, review due)
  components/ui.tsx        Button, Field, Input, Select, Chip, Modal, Tabs, Toggle, StatTile, AlertBanner, EmptyState, ReasonDialog, ...
  components/Shell.tsx     sidebar (branch filter) + header (search, branch, date, alerts, profile menu)
  components/CheckActions.tsx  DocCheckModal, CgCheckModal (shared by Checks, Client and Caregiver screens)
  pages/                   one file per menu item + VisitDetail, CarePlanDetail, ClientDetail, CaregiverDetail, IncidentDetail, Auth
```

## Demo data
All data is sample data in `src/data/seed.ts`. Every change is saved in **sessionStorage**, so it survives a refresh in the same tab. **Reset demo data** is in the profile menu (top right) and at the bottom of Settings.

## Demo sign-in
Any email and any password → **Sign in** → security code **246810** → **Verify and sign in**. Opens **My work**.

## Detail screens (never side panels)
Every record opens on its **own full screen** with a back link to where you came from (`?from=`). Only small decisions (a reason, a confirmation, correct times, approve) use a pop-up.
- **Visit** `/visits/:id` (`VisitDetail.tsx`) — finished visits show **What the caregiver app recorded**: things to look at, planned vs recorded vs difference (and "Before correction"), checked in from, tasks done / not done, caregiver's note. Actions: Approve visit, Correct times, Send back to fix, Correct approved visit, Ask Finance for an adjustment. Upcoming visits show the caregiver, **Find a caregiver / Change caregiver** on the same screen (best matches first, blocked people with red reasons and "Assign anyway"), Keep … anyway, progress, care plan tasks, client details, visit details, changes.
- **Care plan** `/care-plans/:id` (`CarePlanDetail.tsx`) — status, what changed from the plan in use, the plan (changes highlighted), comments, about this version, client and assessment, all versions. Actions: Approve, Ask for changes, Record review.
- **Client** `/clients/:id` — tabs **Overview** (details, home assessment, upcoming visits, contacts, history — view only), **Care plan** (plan in use + all versions, click to open), **Documents** (check each one), **Visits** (upcoming/past with your check status). Buttons: See on schedule, Review care plan.
- **Caregiver** `/caregivers/:id` — numbers, tabs **Profile**, **Your checks** (record checks), **Visits**, **Clients**. Button: See on schedule.
- **Incident** `/incidents/:id` — progress tracker, what happened, what you found (edit), actions (add, tick off), outcome, notes, who handles it (change), severity and who can see it, details, visits that day.

## Menu
- **My work** (`/`) — greeting, 4 numbers (visits to review, care plans waiting, my open incidents, checks to do), **Needs you now** (new incidents, visits needing a decision, incidents past target, care plans to approve, finished visits with something to look at, overdue reviews, caregiver checks, documents), finished visits to review, today's visits by state, my incidents, care plan reviews coming up.
- **Visit approvals** (`/approvals`) — To review / Sent back to fix / Approved.
- **Care plans** (`/care-plans`) — Waiting for you / Reviews due / With the coordinator / Approved.
- **Checks** (`/checks`) — Client documents / Caregiver checks; Needs you / Running out in 30 days / All.
- **Clients**, **Schedule** (week board and list — coordinators plan visits; open one to change the caregiver or make an exception), **Today's visits** (live), **Caregivers** (view only + your checks), **Incidents** (report; open / resolved / closed), **Settings**.

## Other roles
- **HR Officer** — own portal: `sadaqat786921/Corliva-hr-officer-portal` (employment, requirements and checks, time off, ready to work; changes flag the caregiver's upcoming visits for the coordinator).
- **Director of Nursing** — built in its own portal: `sadaqat786921/Corliva-don-portal` (can do everything a Care Supervisor does, for the whole agency, plus clients' health, quality and risk, staff reviews and training).
- **Caregiver** — own portal: `sadaqat786921/corliva-caregiver-portal` (phone-friendly: their visits, check in and out, tasks, notes, sending the visit record, reporting a problem, sending documents to HR).
- **Finance Officer** — own portal: `sadaqat786921/corliva-finance-officer-portal` (bills approved visits, records payments, money owed, timesheets and payroll exports; applies adjustments asked for after invoicing).

## Run
```
npm install
npm run dev     # preview
npm run build   # must finish with no errors
```
