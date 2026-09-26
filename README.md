# Laravel React Starter

A **production-ready Laravel + Inertia/React starter kit**: authentication
(Fortify, 2FA, passkeys), RBAC, user/role management, settings, notifications,
media, an async export/import Data Processing Center, a full audit trail, a
first-run setup wizard, developer tools and a full quality gate — wired
together with a strict Service–Repository architecture so product work can
start on day one. Ships with 5-language internationalization (English, Bangla,
French, German, Spanish) out of the box.

- Architecture & contributor conventions: [`AGENTS.md`](AGENTS.md)

---

## Highlights

- **Fortify authentication** — registration, email verification, password
  reset, two-factor authentication and passkeys.
- **RBAC** with Super Admin / Admin / Member system roles and a permission
  registry.
- **User & role management**, including email invitations.
- **Settings** — general, mail, appearance, per-user profile and security.
- **Notifications** — in-app notification center with per-user preferences.
- **Media & file uploads** via `spatie/laravel-medialibrary`.
- **Audit trail** — automatic "who did what" logging (model changes, auth
  events, RBAC, settings, domain events) browsable at `/audit-logs` with
  cursor pagination, per-channel retention settings, manual pruning and
  CSV/XLSX export.
- **Async exports & imports** — a Data Processing Center tracking queued jobs
  with live progress, artifact download and pruning.
- **Developer tooling** — Telescope, Pulse, Horizon and health checks.
- **Internationalization** — 5 locales with a server-driven dictionary,
  per-user language preference and `Intl` date/number formatting.
- **First-run browser installer** — configure the database and runtime drivers
  without touching `.env` by hand.

## Tech stack

| Layer     | Technology                                                       |
| --------- | ---------------------------------------------------------------- |
| Backend   | Laravel 13, PHP 8.3+ (Service–Repository architecture)           |
| Frontend  | Inertia 3 + React 19 + TypeScript, Tailwind CSS 4, shadcn/ui     |
| Database  | PostgreSQL (recommended), MySQL/MariaDB, or SQLite               |
| Cache/Queue | Redis when available, otherwise file/database drivers          |
| Auth      | Laravel Fortify                                                  |
| Exports   | maatwebsite/excel, queued jobs                                   |

---

## Requirements

- **PHP 8.3+** with the `pdo`, `mbstring`, `openssl`, `tokenizer`, `fileinfo`,
  `curl`, `xml` and `zip` extensions, plus the PDO driver for your database
  (`pdo_pgsql`, `pdo_mysql` or `pdo_sqlite`)
- **Composer 2**
- **Node.js** `^20.19.0 || >=22.12.0` and npm (Vite 8 requirement)
- A database: **PostgreSQL** (recommended), MySQL/MariaDB, or **SQLite** (no
  server required)
- **Redis** — optional. The app detects it and upgrades automatically; without it
  the database/file drivers are used.

---

## Quick start

### Option A — CLI setup

```sh
composer setup     # installs deps, creates .env, generates the key, configures
                   # drivers, migrates + seeds, installs npm deps and builds assets
composer run dev   # server + queue worker + Vite
```

Then open <http://localhost:8000>.

### Option B — Browser installer

If you prefer a guided setup (or just cloned the repo and served it), open
`/setup`. The wizard boots without a database or Redis and walks through:

1. **Welcome** — environment checks; generates the application key if needed.
2. **Database** — choose PostgreSQL, MySQL/MariaDB or SQLite, test the
   connection, optionally create the database, and save it to `.env`.
3. **Migrate** — runs migrations, seeds roles/permissions/settings and links
   storage.
4. **Drivers** — detects Redis and recommends it for sessions, cache and queue
   (falls back to database/file).
5. **Administrator** — creates the super admin (skipped if one exists).
6. **Finish** — completes setup and signs you in.

Both paths converge on the same code, so you can start with either.

### Local super admin (local/testing only)

When seeded via `migrate --seed` in the `local` or `testing` environment:

```
Email:    superadmin@example.test
Password: 123456
```

> Never seed demo data in production. The installer creates its own super admin.

---

## Local development

Services (nginx, PHP-FPM, PostgreSQL, Redis, mailpit) can be managed with
**EnvKit**:

```sh
envkit start
envkit status
```

`composer run dev` starts three processes:

| Process | Command                                                    |
| ------- | ---------------------------------------------------------- |
| server  | `php artisan serve`                                        |
| queue   | `php artisan queue:listen --queue=critical,default,heavy`  |
| vite    | `npm run dev`                                              |

Outgoing mail is captured by **mailpit** at <http://127.0.0.1:8025>.

---

## Configuration

Copy `.env.example` to `.env` (done for you by `composer setup`). The most
relevant variables:

```dotenv
APP_URL=http://localhost:8000

# Database (pgsql | mysql | mariadb | sqlite)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=laravel_react_starter
DB_USERNAME=postgres
DB_PASSWORD=

# Runtime drivers — safe defaults that work without Redis.
# Run `php artisan app:configure-drivers` to switch to Redis when reachable.
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=database

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### Drivers & Redis

`.env.example` ships dependency-free defaults (`file`/`file`/`database`) so a
fresh checkout always boots — including the `/setup` wizard — before the
database or Redis is configured. To upgrade to Redis once it is running:

```sh
php artisan app:configure-drivers
```

The command pings Redis and, when reachable, sets `SESSION_DRIVER`,
`CACHE_STORE` and `QUEUE_CONNECTION` to `redis`; otherwise it falls back to
`database`. You can override each driver explicitly:

```sh
php artisan app:configure-drivers --session=redis --cache=redis --queue=redis
```

---

## Queues & scheduler

Long-running work (exports and imports) runs through
the queue on the `critical`, `default` and `heavy` channels.

```sh
composer run dev                       # includes a queue listener on all channels
composer run queue                     # or: php artisan queue:work --queue=critical,default,heavy
php artisan queue:work --queue=critical,default,heavy   # run a queue worker explicitly
php artisan schedule:work              # run the scheduler locally
```

Scheduled work (`routes/console.php`): audit log retention pruning, completed
data-processing cleanup, health checks and Pulse metrics.

**Horizon** monitors queues in production but requires `ext-pcntl`/`ext-posix`
and therefore runs on **Linux only**. On Windows use `php artisan queue:work`.

---

## Internationalization

The app ships with 5 locales: **English (`en`), Bangla (`bn`), French (`fr`),
German (`de`) and Spanish (`es`)**, served through an in-house i18n layer.

- **Switching language** — the globe icon in the header dropdown or
  **Settings → General → Language** (same control, same behavior). Switching
  persists the preference server-side and reloads the page so the dictionary,
  `<html lang>` and `Intl` formatting all refresh.
- **Resolution order** — the locale middleware applies the user's stored
  preference → session locale (guests) → the global default setting
  (Administration → Settings) → `en`.
- **Dictionaries** — `lang/app/{locale}.json`, one file per locale. The active
  dictionary is delivered to the frontend as a shared Inertia prop; missing
  keys fall back to the English text.
- **Adding strings** — wrap every user-visible string in `t('English source')`;
  the English text renders before a translation exists. Add the new key to all
  five dictionaries — `tests/Unit/TranslationParityTest.php` fails the build if
  any locale is missing one.
- **Dates & numbers** are formatted with the `Intl` APIs using the active
  locale (`appLocale()` from `resources/js/lib/locale.ts`).

See [`AGENTS.md`](AGENTS.md) §8.11 for the full translation-friendly code rules
and the `add-translation` skill for extracting strings.

---

## Common commands

### Application

| Command | Purpose |
| ------- | ------- |
| `composer setup` | Full non-interactive install (deps, env, key, drivers, migrate + seed, assets) |
| `composer run dev` | Start server, queue worker and Vite |
| `composer run queue` | Start a queue worker for all channels |
| `php artisan queue:work --queue=critical,default,heavy` | Run a queue worker for all channels |
| `php artisan schedule:work` | Run the scheduler locally |
| `php artisan app:configure-drivers` | Detect Redis and configure session/cache/queue |
| `php artisan migrate --seed` | Migrate and seed RBAC + settings |
| `php artisan storage:link` | Link `public/storage` for uploaded media |
| `php artisan setup:reset` | Re-open the `/setup` wizard (development only) |
| `php artisan setup:reset --fresh` | Same, but delete all users first |
| `php artisan permission:sync` | Sync permissions from the registry |
| `php artisan settings:sync` | Sync missing settings from their defaults |

### Quality gate

Run the full gate before considering any change complete:

```sh
composer check       # frontend format + lint, TypeScript, Pint, PHPStan, Pest
composer check:fix   # auto-fix formatting and lint
```

Individual steps:

| Command | Runs |
| ------- | ---- |
| `composer lint` / `composer lint:check` | Pint (fix / check) |
| `composer types:check` | PHPStan / Larastan |
| `php artisan test` | Pest (unit + feature) |
| `npm run check` | Frontend format + lint (`vp check`) |
| `npm run types:check` | TypeScript compiler |
| `npm run build` | Production asset build |
| `composer security` | Composer + npm security audits |

### Git hooks

```sh
composer hooks   # installs .githooks (Pint + frontend check on commit, full check on push)
```

---

## Project structure

```text
app/
  DTOs/               Typed inputs crossing the service boundary
  Enums/              Fixed value sets
  Http/
    Controllers/      Thin HTTP layer
    Requests/         FormRequest validation
    Resources/        Response / prop shaping
  Jobs/               Queued work
  Models/             Eloquent models
  Repositories/       All database access (+ Contracts interfaces)
  Services/           Business logic and transactions
    Setup/            First-run installer services
  Registry/           Permission, queue and maintenance registries
database/
  migrations/         Schema
  seeders/            RBAC + settings seeders
resources/js/
  pages/              Inertia pages
  components/         Feature UI + shadcn/ui primitives
  routes/ actions/    Wayfinder-generated helpers (do not edit)
routes/               web, settings, exports, files, users, roles, audit, admin, setup
tests/                Pest unit + feature tests
```

Backend follows a strict **Service–Repository** pattern: controllers are thin,
services own business logic and transactions, repositories own every query, and
DTOs are the typed currency between layers. See [`AGENTS.md`](AGENTS.md) §6–7
for the full contract.

---

## Testing

```sh
php artisan test                       # everything
php artisan test --filter=Setup        # one area
php artisan test --testsuite=Unit      # unit only
```

Tests use Pest with `RefreshDatabase` against an in-memory SQLite database
(`phpunit.xml`). The suite seeds RBAC and settings in every feature test.

---

## Troubleshooting

- **`/setup` redirects or errors before the wizard renders** — confirm
  `SESSION_DRIVER` is `file` (or Redis is running). Safe defaults live in
  `.env.example`.
- **Setup completed but you need it again** — `php artisan setup:reset`
  (keeps users) or `--fresh` (deletes users). Development only; use `--force` in
  production.
- **Config changes not applying** — `php artisan config:clear` (the installer
  does this automatically).
- **Media URLs 404** — run `php artisan storage:link`.
- **Queue jobs not processed** — make sure a worker is running
  (`composer run dev` or `composer run queue`).
- **Horizon won't start on Windows** — it is Linux-only; use
  `php artisan queue:work`.

---

## Branding

The bundled logo (`public/favicon.svg`, `resources/js/components/app-logo-icon.tsx`)
is a neutral placeholder — replace it with your own mark and set the application
name via `APP_NAME` (or Administration → Settings → Appearance after install).

---

## License

MIT. See [`composer.json`](composer.json).
