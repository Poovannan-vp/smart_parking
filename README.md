# Smart Parking System

Smart Parking is a role-based web application for monitoring company parking availability, recording gate vehicle activity, and managing buildings and users.

It is built with React, TypeScript, Vite, Tailwind CSS, Firebase Authentication, and Cloud Firestore.

## What the application does

- Shows real-time parking availability for every building on the public Home page.
- Lets Security staff update parking occupancy safely within their assigned building.
- Records daily vehicle gate entries and prevents the same vehicle from being logged twice on the same building/date.
- Tracks vehicle exits, corrections, and voids with an audit trail.
- Lets Admins manage buildings, parking capacity, application users, and daily reports.
- Gives Developers diagnostics, audit visibility, and role-testing shortcuts.
- Gives Employees a profile, favourite building, personal vehicle registration, and read-only live availability for all buildings.

## Roles and permissions

| Role | Main capabilities |
| --- | --- |
| Public visitor | View Home-page building availability and directions. |
| Employee | View every building, search availability, save a favourite building, register personal vehicles, and view parking guidance. |
| Security | Update occupancy for the assigned building; create, search, correct, void, and mark vehicle logs as exited. |
| Admin | Manage buildings, capacities, users, roles, assignments, password-reset emails, analytics, reports, CSV export, and audit history. |
| Developer | View diagnostics and recent audit activity, export diagnostics, and access other role portals for testing. Developer-wide access must be restricted before production. |

## Main workflows

### Parking availability

The Home page subscribes to a selected building in real time. It displays capacity, occupied spaces, available spaces, and Full/Almost Full indicators for each parking area.

Security occupancy changes use Firestore transactions. This prevents counts below zero, counts above capacity, and concurrent-update overwrites.

### Gate vehicle monitoring

Security creates a vehicle log with a vehicle number and configured parking area. The record is stored in the top-level `vehicleLogs` collection and is unique per building, vehicle number, and date.

Vehicle logs support these lifecycle states:

- `ACTIVE` — vehicle is currently recorded as inside.
- `EXITED` — Security recorded the vehicle exit.
- `VOID` — an incorrect entry was voided without deleting history.

Corrections, exits, and voids are written to `vehicleLogs/{logId}/audit` with the acting user and reason where required.

### Authentication and routing

All staff use the same **Staff Login** page. Firebase Email/Password Authentication signs in the user, then the app reads `users/{uid}` to determine the role and redirects to the appropriate dashboard.

Users must have a Firestore profile with a valid role and `active: true`.

## Project structure

```text
src/
  app/                  Routes and application providers
  config/               Firebase configuration
  features/             Role-specific screens and components
    admin/              Building, user, report, and analytics management
    auth/               Login, session state, and route guards
    developer/          Diagnostics and role testing
    employee/           Employee profile and availability dashboard
    home/               Public real-time availability page
    security/           Parking updates and vehicle log workflow
  services/             Firestore and Firebase operations
  shared/               Shared UI components and layouts
  scripts/              Firestore/user bootstrap scripts
```

## Local setup

### Prerequisites

- Node.js 22.12 or newer is recommended.
- A Firebase project with Cloud Firestore and Email/Password Authentication.

### Install and run

```powershell
npm install
npm run dev
```

Open the local URL shown by Vite, normally `http://localhost:5173`.

### Environment configuration

Copy `.env.example` to `.env` and provide the Vite Firebase values:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Never commit `.env`, service-account JSON files, passwords, or credentials. `.env` is intentionally ignored by Git.

## Firebase setup

1. Enable **Email/Password** under Firebase Authentication → Sign-in method.
2. Create an initial Admin Firebase Authentication account.
3. Create its matching `users/{uid}` Firestore profile, or use the bootstrap script below.
4. Publish the project Firestore rules from `firestore.rules`.

Example user profile:

```json
{
  "email": "admin@company.com",
  "employeeId": "ADM001",
  "firstName": "Admin",
  "lastName": "User",
  "role": "ADMIN",
  "buildingId": "",
  "active": true
}
```

Valid roles are `EMPLOYEE`, `SECURITY`, `ADMIN`, and `DEVELOPER`.

For a detailed initial-user setup, see [AUTH_SETUP.md](AUTH_SETUP.md).

### Bootstrap the initial administrator

With a local Firebase Admin service-account credential configured, run:

```powershell
npm run bootstrap:users
```

The script creates or updates the profile for `BOOTSTRAP_ADMIN_UID`. See `.env.example` for the required variables.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and create a production bundle. |
| `npm run lint` | Run ESLint. |
| `npm run preview` | Preview a production build locally. |
| `npm run seed` | Seed example building data. |
| `npm run bootstrap:users` | Create/update the initial Admin Auth user and profile. |

## Design system and shared components

The project follows a component-based design system located in `src/shared/components/`. All pages compose from these primitives to maintain visual consistency.

### Core components

| Component | Purpose |
| --- | --- |
| `Button` | Multi-variant button (`secondary`, `danger`). Renders `<button>` with consistent padding, radius, and hover states. |
| `Card` | Container surface with rounded corners, border, and shadow. Accepts a `className` prop for additional padding/layout. |
| `EmptyState` | Centered message with optional action button, used when a list is empty or a search has no results. |
| `Header` | Full-width top navigation bar with role-based links, mobile drawer, logo, and user menu. |
| `Input` | Labelled text input with id, placeholder, and controlled value. |
| `LoadingSpinner` | Animated spinner for inline loading indicators. |
| `LoadingState` | Full-section spinner with text, used during initial data fetches. |
| `Logo` | The "ParkSmart" branded logo SVG used in the header. |
| `PageContainer` | Max-width wrapper with horizontal padding for page content. |
| `PageHeader` | Title, subtitle, and optional `actions` slot used at the top of every page. |
| `StatusBadge` | Pill badge with variant colours (`success`, `danger`, `info`, `warning`). |
| `LoadMoreButton` | Paginated "Load more" trigger rendered as a list item with a chevron icon, located in `src/components/`. |

### Design tokens

- **Border radius**: `rounded-3xl` for cards and badges, `rounded-full` for buttons and pills.
- **Spacing**: Tailwind `space-y-*` and `gap-*` utilities; 8-unit vertical rhythm (`py-8`, `space-y-8`).
- **Colour palette**: Slate neutrals with semantic accents — emerald (success), rose (danger/error), sky/blue (info), amber (warning).
- **Typography**: System font stack via Tailwind defaults; `text-sm` for labels, `text-base`/`text-lg` for headings inside cards, `text-3xl` for metric numbers.

### Patterns

- **Load More pagination**: Used on `UsersPage` to show 4 items initially and load 4 more on click via `LoadMoreButton`.
- **Scroll-into-view on edit**: `BuildingsPage` and `EmployeeDashboardPage` use `useRef` + `scrollIntoView({ behavior: "smooth", block: "start" })` inside a `setTimeout` to smoothly reveal inline edit forms.
- **Confirmation dialogs**: Destructive actions (Delete user, void log) use `window.confirm()` before proceeding.
- **Inline alerts**: Success/error feedback rendered as coloured `<p>` banners inside `Card` components with `role="alert"` for errors.
- **useCallback + useEffect**: Data-loading functions that depend on reactive values (dates, IDs) are wrapped in `useCallback` and referenced in `useEffect` dependency arrays.

## Security notes

- Publish `firestore.rules` before sharing the system beyond development.
- The Developer role currently has broad testing access. Restrict it before production.
- Admin user creation is suitable for this internal MVP. For a production deployment, move privileged user provisioning to a Firebase Cloud Function or backend service.
- Update Node.js before deployment; the current Firebase Admin/Vite dependency versions require a newer Node release than Node 20.18.

## Validation status

The project production build and lint command complete successfully with zero errors and zero warnings.
