# Backup System Plan (spatie/laravel-backup)

Status: **implemented — all phases delivered, full quality gate green**
(`composer check`: Pint + PHPStan + Pest 415 tests; frontend build + types + lint).
Goal: application + database backups powered by `spatie/laravel-backup`, with an admin
settings tab to configure the schedule and a run-history log, following the house
Service–Repository architecture.

---

## 1. Research summary

### 1.1 Package choice

| Candidate | Verdict | Why |
| --- | --- | --- |
| **spatie/laravel-backup v10** | ✅ chosen | Industry standard, actively maintained, supports Laravel 13 / PHP 8.4. Zips files + DB dump to any configured filesystem disk, ships cleanup strategy, health monitoring, events, and notifications. Already house-adjacent: we use spatie/activitylog, health, media, permission. |
| Custom in-house backup | ❌ rejected | Reinventing DB dump + zip + rotation + multi-disk copy is exactly the "small need, large surface" anti-pattern; ecosystem package is battle-tested. |
| Other Laravel backup packages (laravel-backup-dropbox wrappers, etc.) | ❌ rejected | Thin wrappers or stale; none offer monitoring + cleanup strategies. |

Constraint: `spatie/laravel-backup` requires `ext-zip` and native DB dump binaries
(`pg_dump` for PostgreSQL). On Windows dev machines this needs `pg_dump` on PATH (Laragon
ships it; EnvKit/Linux prod has it). The plan includes an environment note + a graceful
failure path (run history row marked failed, notification sent).

### 1.2 Key API facts (verified from official v10 docs)

- Commands: `backup:run`, `backup:clean`, `backup:monitor`, `backup:list`.
- Config in `config/backup.php`: `backup.source` (files include/exclude, `databases`),
  `backup.destination.disks` (names from `config/filesystems.php`), `backup.password`
  (zip encryption via `BACKUP_ARCHIVE_PASSWORD` env), `cleanup.default_strategy`
  (keep-all/daily/weekly/monthly/yearly windows + max megabytes),
  `monitor_backups` (health checks: `MaximumAgeInDays`, `MaximumStorageInMegabytes`),
  `notifications` (mail/slack/… mapping of spatie notification classes).
- Events we can listen to:
  - `Spatie\Backup\Events\BackupWasSuccessful` (`$diskName`, `$backupName`)
  - `Spatie\Backup\Events\BackupHasFailed` (`$exception`, `$diskName`, `$backupName`)
  - `Spatie\Backup\Events\CleanupWasSuccessful` / `CleanupHasFailed`
  - `Spatie\Backup\Events\HealthyBackupWasFound` / `UnhealthyBackupWasFound`
- Scheduling is plain Laravel: `Schedule::command('backup:run')->daily()->at('01:30')` in
  `routes/console.php`. There is **no built-in DB-driven schedule** — this is the gap our
  settings layer fills (§3.2).
- Monitoring: `backup:monitor` runs health checks per configured destination and fires
  `HealthyBackupWasFound` / `UnhealthyBackupWasFound`.

### 1.3 The `$schedule_time` pattern (user question)

The pasted pattern (`$schedule_time = config('app.schedule_time')` feeding
`dailyAt($schedule_time)`) is from other projects (e.g. Akaunting) — it does **not** exist
in this repo; our `routes/console.php` uses hardcoded times (`audit:clean` at `03:30`, …).
Going one step further for backups: the schedule definition (enabled, frequency, time) is
stored in **DB settings** and evaluated at runtime by a lightweight tick command, so
admins change the schedule in the UI with zero code/config edits. The same pattern can
later be generalized to other scheduled jobs, but that is out of scope here.

### 1.4 House patterns this feature will mirror

- **Settings tab**: `SettingKey` enum case + `forGroup()` → `UpdateSettingsRequest` rules
  generated per group → `SettingController::edit/update` with
  `->defaults('group', ...)` routes in `routes/admin.php` → page
  `resources/js/pages/admin/settings/{group}.tsx` rendering `<SettingsForm group={...}>` →
  tab entry in `resources/js/layouts/admin/layout.tsx`.
- **Run history**: the Developer page's `CommandRun` pattern
  (`app\Models\CommandRun.php`, `CommandRunService`, `RunMaintenanceCommand` job,
  `command-runs.tsx` table, `usePoll` while a run is active) — closest analog for
  backup run history. Data Processing Center pattern (`DataProcessingJob`,
  `use-job-poll.ts`) informs the polling + notification UX.
- **Notifications on completion/failure**: in-app via `NotificationService::create(NotificationDTO)`
  with `NotificationType` entries (same as export/import finished) — not spatie's mail
  notifiable, which we disable in favor of our own channel.
- **Permissions**: registry group with view/manage tiers (`config/permission-registry.php`),
  `permission:sync`, `RoleSeeder` grants, `can:` route middleware.
- **Audit**: `AuditLogService::record()` from services — settings changes already audit
  automatically via `SettingService`; backup run/trigger events get their own `AuditEvent`s.
- **Queue**: long-running backup executes on the `heavy` channel via `QueueRegistry`,
  `#[FailOnTimeout]` + `failed()` handler like `ProcessExport`/`ProcessImport`.

---

## 2. Scope

### In scope
- `spatie/laravel-backup` (^10) installation + tuned `config/backup.php`, plus
  `league/flysystem-aws-s3-v3` so the existing `s3` disk is actually usable (it is
  declared in `config/filesystems.php` but the Flysystem adapter is not installed yet).
- **Remote object storage settings section** (new admin settings tab): configure
  S3-compatible credentials (AWS S3, Cloudflare R2, any S3-compatible endpoint) through
  the UI — persisted to the **`.env` file** via the wizard's `EnvironmentWriter` pattern
  — with a test-connection action. This is what makes off-site backup destinations
  possible (§3.3).
- Settings **group `backup`** (new settings tab): enable/disable, frequency, run time,
  destination disk, retention (keep days), max storage, health-check max age.
- DB-driven scheduling of `backup:run` / `backup:clean` / `backup:monitor` via a tick
  command (no code change needed when settings change).
- **Run history log**: `BackupRun` model tracking every backup/cleanup/monitor run —
  status, type, trigger (scheduled/manual), disk, filename, size, error, duration, actor.
- Settings → **Backup** tab UI: status/health card (latest run, disk usage, next scheduled
  run), settings form, run-history table with live polling while a run is active.
- Manual **"Run backup now"** action (queued on `heavy` channel, polled, audited).
- In-app notifications (super admins / permission holders) on backup success & failure,
  failure of cleanup, and unhealthy-backup findings.
- Permissions, policies, audit events, i18n (all 5 locales), Pest tests, docs
  (README, AGENTS.md, docs/).

### Out of scope (explicit)
- **Restore UI** — spatie/laravel-backup intentionally has no restore feature; restoring
  = download zip, unzip, re-import SQL. Documented in `docs/backups.md` as a manual runbook
  (a "Download" action on completed backup runs covers the admin need).
- Generalizing DB-driven scheduling to all existing scheduled commands.
- Multi-disk fan-out UI (config supports multiple destination disks via env; the UI
  exposes one primary disk setting).
- Storage-provider variety beyond S3-compatible (no FTP/SFTP/Google Drive settings UI —
  those remain config-file level; the settings section covers the S3 family, which
  includes AWS S3 and Cloudflare R2).

---

## 3. Design

### 3.1 Package + config

```sh
composer require spatie/laravel-backup  # ^10, caret constraint per house style
php artisan vendor:publish --provider="Spatie\Backup\BackupServiceProvider" --tag=backup-config
```

`config/backup.php` tuning:
- `backup.source.files.include` → `base_path()`; `exclude` → `vendor`, `node_modules`,
  `storage/framework`, `storage/app/backup-temp`, `storage/app/private/backups`
  (never back up the backup destination into itself), `.env` **kept included** (it's the
  point of a full backup) — flagged for review during implementation.
- `backup.source.databases` → `[env('DB_CONNECTION', 'pgsql')]` (falls back to `sqlite`
  for tests — supported by the package).
- `backup.destination.disks` → `[(array) env('BACKUP_DISK', 'local')]` — with a new
  dedicated `backups` local disk in `config/filesystems.php`
  (root `storage_path('app/private/backups')`, `serve: false`; download goes through a
  permission-gated controller, mirroring `exports.download`, never public URLs).
- `notifications` → all entries mapped to `[]` (empty channels): we intercept the
  **events** ourselves and route through the in-house `NotificationService` (§3.5).
- `monitor_backups` → one entry: disks `[BACKUP_DISK]`, health checks
  `MaximumAgeInDays => 1`, `MaximumStorageInMegabytes => env('BACKUP_MAX_MB', 5000)`.
- `cleanup.default_strategy` → defaults kept, values overridable via settings (§3.2).
- Database dump: ensure `dump.timeout` in `config/database.php` pgsql connection is raised
  (e.g. `900`), note `dump_binary_path` for Windows dev in `.env.example` comments.

### 3.2 Settings (the DB-driven schedule)

New enum cases in `App\Enums\SettingKey`, group `'backup'` (label "Backups"):

| Key | Type | Default | Rules / options |
| --- | --- | --- | --- |
| `backup_enabled` | boolean | `true` | — |
| `backup_frequency` | select | `daily` | `daily`, `weekly` (weekly → Sunday) |
| `backup_time` | select | `01:30` | `00:30`, `01:30`, `02:30`, `03:30`, `04:30`, `23:30` (avoids DST window; not 02:00–03:00) |
| `backup_disk` | select | `local` | disks that exist — `local`, plus `s3` only when remote storage is enabled & reachable (§3.3). When `s3` is chosen the tick command also verifies the remote disk before running, and a failed remote copy still leaves a healthy local copy (`continue_on_failure` semantics) |
| `backup_keep_days` | integer | `14` | `min:3, max:365` — feeds cleanup `keep_all_backups_for_days` |
| `backup_max_storage_mb` | integer | `5000` | `min:100` — feeds cleanup max-MB + monitor check |
| `backup_max_age_days` | integer | `1` | `min:1, max:30` — feeds `MaximumAgeInDays` health check |
| `backup_notify_on_failure` | boolean | `true` | failure-only in-app notifications |

`config/backup.php` is made settings-aware at the consumption points, not by rewriting
config at runtime:
- The **tick command** (below) reads `backup_enabled/frequency/time` itself.
- `backup:clean` and `backup:monitor` are invoked by the same tick with
  `--disable-notifications`; their config values are resolved by a small
  `App\Registry\BackupConfigRegistry` (mirror of `AuditLogName::retentionDays()` pattern:
  stored setting → enum default → config fallback) via a `backup.php`-side closure or by
  passing values as command options where supported. Final wiring decided during
  implementation against the actual v10 config surface (per house rule: verify against
  installed vendor source before coding).

**Tick command** `php artisan backup:schedule-tick` (registered
`Schedule::command('backup:schedule-tick')->everyFiveMinutes()->runInBackground()->withoutOverlapping()`):

1. Read settings. If `backup_enabled` is false → exit 0 (unless a health-only check is
   still wanted: monitoring still runs weekly).
2. Compute whether a backup is due: stored "last backup started at" (from latest
   successful/any `BackupRun`) vs `frequency` + `time`. `daily` → due when today ≥ time and
   no run today; `weekly` → due when calendar week ≥ time on Sunday and no run this week.
3. If due → dispatch `RunBackup` job (heavy channel) — the **same** job the manual
   "Run now" button uses (single execution path, idempotent, `#[FailOnTimeout]`,
   `failed()` handler).
4. Independently: if cleanup not run today → `backup:clean`; monitor runs
   `backup:monitor` once daily regardless of `backup_enabled` (a disabled schedule must
   still surface "backups are stale" health state).

Because everything is evaluated at runtime from the DB, changing schedule settings takes
effect on the next tick — **no scheduler restart**, which is the whole point over the
`config('app.schedule_time')` pattern.

### 3.3 Remote object storage settings (S3 / R2)

**Why here:** spatie/laravel-backup writes to any disk configured in Laravel's
`config/filesystems.php`, so once the `s3` disk has working credentials the backup
settings tab can offer it as a destination — including Cloudflare R2, which is
S3-compatible via a custom `endpoint` + `use_path_style_endpoint = true` (both keys
already exist in our `s3` disk config). No backup-specific integration is needed; the
storage section is generic infrastructure.

**Settings storage decision — `.env`, not the DB.** Credentials are environment/infrastructure
configuration (same tier as `DB_*`/`REDIS_*`), must be available to the framework before
any DB access on boot, and belong in `.env` like every other credential in this app. This
reuses the first-run wizard's proven pattern verbatim:

- `App\Services\Setup\EnvironmentWriter` — dependency-free in-place `.env` writer
  (updates existing keys preserving comments/ordering, appends missing ones, correct
  dotenv quoting). Already handles secret-safe formatting.
- `App\Services\Setup\DriverConfigurator::write()` as the flow template:
  `EnvironmentWriter::set([...])` → `Artisan::call('config:clear')` → manual
  `config([...])` reload for the current request.

New service `App\Services\Storage\StorageConfigurator` (setup-adjacent infrastructure,
deliberately outside the module Service–Repository layers — same carve-out as the Setup
services):

- `current(): array` — form defaults read from `EnvironmentWriter::read()`
  (`AWS_ACCESS_KEY_ID`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`, `AWS_ENDPOINT`,
  `AWS_USE_PATH_STYLE_ENDPOINT`); the secret is **never** read back for display.
- `write(StorageConfigDTO $dto): void` — writes
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`,
  `AWS_ENDPOINT`, `AWS_USE_PATH_STYLE_ENDPOINT` (and `AWS_URL` when custom). Then
  `config:clear` **plus `Artisan::call('queue:restart')`** — critical house detail:
  backup jobs run on `heavy`-channel workers, and a long-running worker keeps the old
  config in memory until restarted. Finally reloads the runtime `filesystems.disks.s3.*`
  config in-process.
- `test(): array{ok: bool, message: string}` — connectivity probe: `Storage::disk('s3')`
  write + read + delete a probe file (`backups-probe.txt`), reporting a human-friendly
  error message on failure (wrong credentials, bucket missing, endpoint unreachable).
  Never logs or returns the secret.

**New settings tab "Remote storage"** (`admin/settings/storage`, group label
"Remote storage" in the admin layout tab list):

| Field | Type | Notes |
| --- | --- | --- |
| Enabled | boolean | Whether the remote disk is offered as a backup destination |
| Provider | select (display only) | `Amazon S3` / `Cloudflare R2` / `Custom S3-compatible` — presets that prefill region `auto`, path-style `true` (R2) or region `us-east-1`, path-style `false` (S3); purely a client-side convenience, only the env keys persist |
| Access key ID | text | `AWS_ACCESS_KEY_ID` |
| Secret access key | password | `AWS_SECRET_ACCESS_KEY` — blank = keep existing (house `isSecret` field UX) |
| Region | text | `AWS_DEFAULT_REGION` (R2: `auto`) |
| Bucket | text | `AWS_BUCKET` |
| Endpoint | text | `AWS_ENDPOINT` (R2: `https://<account>.r2.cloudflarestorage.com`; empty for real S3) |
| Path-style endpoint | boolean | `AWS_USE_PATH_STYLE_ENDPOINT` (true for R2) |

- Controller `App\Http\Controllers\Setting\StorageSettingController` (mirrors
  `MailSettingController`'s settings-tab + extra-action shape): `edit` (page), `update`
  (validates via dedicated `UpdateStorageRequest` — `nullable` secret, sensible string
  rules, Zod schema kept in sync client-side), `test` (POST, returns probe result,
  flashes toast).
- Permissions: gated by the existing system-level `settings.view` / `settings.update`
  (credentials are settings-tier infrastructure; no new permission group — consolidated
  RBAC surface per house preference). The **Backup** tab's `backup_disk` select only
  offers `s3` when storage is enabled and the probe succeeds.
- `.env.example` gains commented placeholder keys for the `AWS_*` set (dependency-free
  defaults, consistent with the wizard-first design; README env table updated in Phase 5).
- Security rules: secrets never returned to the client, never logged, never audited with
  values (audit records `STORAGE_UPDATED` as a named `AuditEvent` — keys changed only,
  no values, via `AuditLogService::record()` from the service); failure of the `.env`
  write (unwritable file) surfaces as a validation-style error toast, not a 500.

### 3.4 Run history — `BackupRun` model

`app\Models\BackupRun.php` + `create_backup_runs_table` migration (consolidated, fresh
table so one migration):

- `job_id` (queue job id, nullable), `type` (enum `backup_type`: `backup` | `cleanup` |
  `monitor`), `status` (reuse shape of `CommandRunStatus`: pending/running/completed/failed),
  `trigger` (`scheduled` | `manual`), `user_id` nullable (manual runs), `disk`,
  `file_name`, `file_size` (bytes, nullable for cleanup/monitor), `exit_code` nullable,
  `error_message` text nullable, `output` text nullable, `started_at`, `completed_at`,
  audit columns `created_by`/`updated_by`. Indexes `['type','status']`,
  `['status','completed_at']`.
- Enum `App\Enums\BackupRunType` + reuse/appropriate status enum; `label()` wrapped in `__()`.
- Service `App\Services\Backup\BackupService` (owns business logic; repository
  `BackupRunRepositoryInterface` + implementation, bound in `RepositoryServiceProvider`):
  `dispatchManual(User)`, `recordScheduledStart()`, `markCompleted(...)`,
  `markFailed(...)`, `latest()`, `stats()` (total size on disk, last success age,
  healthy/unhealthy), `paginate(FilterDTO)`.
- **Event listeners** (`app\Listeners\Backup\*`, registered in
  `EventServiceProvider`): spatie events → update the in-flight `BackupRun` row
  (correlated by a run id held in the job / a cache key for scheduled runs):
  `BackupWasSuccessful` → completed (size via `Backup` collection), `BackupHasFailed` →
  failed + exception message, `Cleanup*` and `HealthyBackupWasFound` /
  `UnhealthyBackupWasFound` → monitor-type rows. In queued context the actor is resolved
  explicitly (job owner) — never `auth()` (house rule).

### 3.5 Notifications + audit

- `NotificationType` additions: `BACKUP_COMPLETED`, `BACKUP_FAILED`, `BACKUP_UNHEALTHY`
  (mirror `EXPORT_COMPLETED/FAILED` shape). On `BACKUP_FAILED`/`BACKUP_UNHEALTHY`
  (and success only if desired later), `BackupService` targets users holding
  `backup.manage` (fallback: super admins), in-app only, queued after transaction commit.
- New `AuditEvent` cases: `BACKUP_RUN` (started, with `trigger: scheduled|manual`), plus
  settings changes are already audited by `SettingService`. Recorded via
  `AuditLogService::record()` from `BackupService`/jobs — never from listeners/controllers
  directly. Channel: `AuditLogName::DOMAIN` (or a dedicated `backup` channel if parity
  with retention settings is desired — decide during implementation; default DOMAIN).

### 3.6 Permissions & routes

`config/permission-registry.php` — new group (consolidated view/manage tiers per house
preference):

```php
'backup' => [
    'permissions' => [
        ['name' => 'backup.view',   'group' => 'backup', 'description' => 'View backups & run history', 'is_system' => true],
        ['name' => 'backup.manage', 'group' => 'backup', 'description' => 'Run backups & manage backup settings', 'is_system' => true],
    ],
],
```

- `RoleSeeder`: Super Admin (all, via bypass) + Admin get both; Member gets none.
- Routes (`routes/admin.php`, settings prefix so the tab lives with settings):
  - `GET  admin/settings/backup` → `BackupController@index` — `can:backup.view`
  - `PATCH admin/settings/backup` → `update` — `can:backup.manage` (adds `backup` to
    `UpdateSettingsRequest` group rules automatically via `SettingKey::forGroup`)
  - `POST admin/settings/backup/run` → `run` — `can:backup.manage`
  - `GET  admin/backup-runs/{backupRun}/download` → `download` — `can:backup.view` +
    policy check (`BackupRunPolicy`), streamed from the `backups` disk.
- `App\Policies\BackupRunPolicy` (view own-triggered vs `backup.view` all rows —
  realistically `backup.view` gates the whole page; policy kept minimal).
- Sidebar: Backup entry inside Administration → Settings nav (admin layout tab list),
  gated `can('backup.view')`.

### 3.7 Frontend — Settings → Backup tab

`resources/js/pages/admin/settings/backup.tsx` (auto-wired `[AppLayout, AdminLayout]`),
composing:

1. **Status card** — last backup (status badge, when, size, disk), next scheduled run
   (computed from settings server-side), disk usage vs `backup_max_storage_mb`,
   health state (healthy/unhealthy from latest monitor run). Polling identical to the
   Developer page: `usePoll(2500, { only: ['runs','status'] }, { autoStart: false })`
   started while any run is active.
2. **Settings card** — `<SettingsForm group="backup" action={update.form()}>` — comes free
   from the shared `SettingField`/`SettingsForm` machinery (boolean checkboxes, selects,
   number inputs, translations at the render seam).
3. **Run history card** — `BackupRun` table (type, status badge, trigger, size, duration,
   actor, time, error on expand) with debounced search + status filter via
   `useDataTableFilters`, per-page selector in the toolbar (house convention), dimmed
   rows while reloading, `JobDetailSheet`-style row sheet for output/error details, and
   a Download action on completed backup rows. "Run backup now" button in
   `<PageHeader actions>` with `ConfirmDialog`, disabled while a run is active —
   same UX as `maintenance-actions.tsx`.

Types: `resources/js/types/backup-run.ts` (`BackupRun`, `BackupStatus`), resource
`app\Http\Resources\Backup\BackupRunResource`. All strings through `t()`, keys added to
all five `lang/app/*.json` (bn follows the transliteration rule: ব্যাকআপ, ডাউনলোড…).

---

## 4. Phased implementation

Feasibility note: every phase is a self-contained, reviewable chunk; the only genuinely
fiddly parts are the settings→tick schedule math (pure unit-testable logic) and
correlating spatie events back to `BackupRun` rows (one cache-key/run-id mechanism).
Everything else (settings tab, table UI, notifications, permissions) reuses existing house
machinery. The spatie package provides backup/zip/dump/rotation for free.

- **Phase 1 — Foundation (package + config + scheduling)**
  Install packages (`spatie/laravel-backup`, `league/flysystem-aws-s3-v3`),
  `config/backup.php` + `backups` disk, `SettingKey` backup group + `settings:sync`,
  `backup:schedule-tick` command + due-logic service, `RunBackup` job (heavy channel),
  `backup:clean`/`backup:monitor` wiring, environment/docs notes (`pg_dump`). Unit tests
  for due-logic; smoke-test `backup:run` locally.
- **Phase 2 — Remote object storage settings (backend)**
  `StorageConfigurator` service + `StorageConfigDTO` + `UpdateStorageRequest`,
  `StorageSettingController` (`edit`/`update`/`test` routes), audit `STORAGE_UPDATED`
  event, `.env.example` `AWS_*` placeholders. Unit tests (writer interactions),
  feature tests (update persists `.env` keys — assertion on `EnvironmentWriter::read()`,
  secret never in response), test-connection probe (mocked `Storage`).
- **Phase 3 — Run history + notifications + audit**
  `BackupRun` model/migration/enum/repository/service, event listeners, manual dispatch
  endpoint + job path, `NotificationType` cases + targeting, `AuditEvent` cases,
  permissions registry + sync + RoleSeeder. Unit tests (service with mocked repository),
  feature tests (controller run endpoint, listener state transitions).
- **Phase 4 — Settings tab UI**
  `backup.tsx` page (status card + settings form + run-history table), resource, routes,
  download endpoint, polling, types, i18n extraction for all 5 locales, `npm run build`
  (Wayfinder), `composer check` green.
- **Phase 5 — Remote storage tab UI + docs & conventions**
  `storage.tsx` settings page (provider preset select, secret field UX, test-connection
  button with toast), admin layout tab entry, i18n; then `docs/backups.md` (user guide +
  restore runbook + R2 setup example), README feature section + scheduled-work notes,
  AGENTS.md §7 additions (backup subsection + workflow line), `.env.example` keys
  (`BACKUP_DISK`, `BACKUP_ARCHIVE_PASSWORD`, `BACKUP_MAX_MB`), doc-surface sweep (grep
  for feature mentions), final `composer check`.

## 5. Verification checklist (per phase & final)

- `php artisan test` — new unit + feature tests (1 service = 1 unit test,
  1 controller = 1 feature test; `RefreshDatabase` + seeded RBAC).
- `npm run types:check`, `npm run check:fix`, `npm run build`.
- `composer check` full gate before declaring done.
- Manual: run backup from UI, verify `BackupRun` row + status polling + notification +
  audit entry + zip on the `backups` disk; change schedule settings and observe tick
  behavior; confirm failure path (e.g. missing `pg_dump`) marks run failed with message.
- Manual: save remote storage credentials, run test connection, set `backup_disk = s3`,
  run a backup, verify the zip lands in the bucket (R2 path-style endpoint included).
