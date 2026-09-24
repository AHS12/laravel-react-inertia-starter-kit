# Starter Kit Cleanup Plan

**Goal:** Turn this codebase from the "Evoriq" product into a clean, reusable, product-agnostic
Laravel + Inertia/React starter kit. No product name, no Clockify domain â€” just the battle-tested
skeleton: auth, RBAC, users/roles, settings, notifications, media, async export/import center,
setup wizard, developer tools, queue reliability, and the full quality gate.

**Target name:** the repo name â€” **`larave-react-starter`** (display: "Laravel React Starter").
All product-specific naming defaults to this.

---

## Current state (audit summary)

The codebase is already ~90% generic. The Clockify domain was **planned but never built** â€” there
are no domain tables, routes, pages, or jobs. What exists is:

- 3 service classes (`app/Services/Clockify/`), 1 config file, 1 test, and their registrations
- 4 placeholder permission groups with no backing tables (`connection`, `workspace`, `sync`, `report`)
- Placeholder enum cases (`ApiErrorCode`, `NotificationType`)
- Clockify marketing copy on `welcome.tsx`, `dashboard.tsx`, `setup-checklist.tsx`
- The product name "Evoriq" hardcoded in ~20 runtime locations + docs

All 19 migrations, all routes, all models, and all seeders are already generic.

---

## Phase 0 â€” Naming decision

- [x] Decide the neutral display name (proposal: **Laravel React Starter**) and the composer
      package name (proposal: keep `laravel/react-starter-kit` or match the repo).
- [x] `config/app.php` already uses `env('APP_NAME', 'Laravel')` â€” keep as-is.
- [x] Set `.env.example`: `APP_NAME="Laravel React Starter"`.

## Phase 1 â€” Remove the Clockify domain

**Delete:**
- [x] `app/Services/Clockify/` (ClockifyClient, ClockifyPaginator, ClockifyRateLimiter)
- [x] `config/clockify.php`
- [x] `tests/Feature/Services/Clockify/ClockifyClientTest.php`
- [x] `CLOCKIFY_*` block in `.env` and `.env.example` (lines ~102â€“112)

**Edit:**
- [x] `app/Providers/AppServiceProvider.php` â€” remove `registerClockifyServices()` and its call
- [x] `app/Enums/ApiErrorCode.php` â€” remove the 3 `CLOCKIFY_*` cases (lines 56â€“58, 107â€“109, 156â€“171)
- [x] `app/Enums/NotificationType.php` â€” remove `CLOCKIFY_SYNC_COMPLETED` / `CLOCKIFY_SYNC_FAILED`
      and their label/map entries
- [x] `config/permission-registry.php` â€” remove the `connection`, `workspace`, `sync`, `report`
      groups (lines 44â€“84); re-run `php artisan permission:sync` after
- [x] **Permission audit (verified 2026-09-24):** all 25 remaining permissions are enforced â€”
      `user.*` (UserPolicy + DataProcessingJobPolicy), `role.*` (RolePolicy), `file.*`
      (UploadPolicy), `settings.*` (`can:` middleware in `routes/admin.php`), `developer.view`
      (EnsureDeveloperAccess + gates), `export.create`/`import.create`/`data-processing.*`
      (DataProcessingJobPolicy). The `connection`/`workspace`/`sync`/`report` groups (22
      permissions) have **no policy, route, or UI usage** â€” pure dead weight from the product era.
      After removal, re-grep to confirm no orphan references remain in policies, seeders or
      `resources/js` (`use-can.ts` consumers)
- [x] **Merge the `Export` and `Import` groups into one group:** move `export.create` and
      `import.create` from their standalone single-permission groups into the `data-processing`
      group in `config/permission-registry.php` (they only power the Data Processing Center).
      Keep the permission *names* unchanged â€” `DataProcessingJobPolicy` and the frontend
      `can('export.create')` checks reference them. Verify the roles UI
      (`components/role/permission-group.tsx`) renders them under the merged group and update
      `RoleSeeder`/tests if they assert group keys
- [x] `app/Http/Controllers/Dashboard/DashboardController.php` â€” replace Clockify placeholder
      stats/setup-checklist with neutral starter content

## Phase 2 â€” Rebrand "Evoriq" â†’ neutral name

âš ï¸ **Gotcha:** `SettingsServiceProvider` overrides `app.name` from the DB-backed `system_name`
setting â€” changing `.env` alone is not enough. The `SettingKey::SYSTEM_NAME` default must change.

**Backend:**
- [x] `app/Enums/SettingKey.php:101` â€” default `'Evoriq'` â†’ neutral name
- [x] `app/Services/Setup/SetupService.php:194,197` â€” fallback `config('app.name', 'Evoriq')` â†’ `'Laravel'`
- [x] `app/Services/Setup/DatabaseConfigurator.php:46` â€” default DB name `'evoriq'` â†’ `laravel_react_starter` (or similar)
- [x] `app/Http/Controllers/Setup/SetupController.php:168` â€” "Welcome to Evoriq!" â†’ generic
- [x] `app/Mail/TestMail.php:22,32` â€” generic subject/body
- [x] `database/seeders/UserSeeder.php:18` â€” `superadmin@evoriq.test` â†’ `superadmin@example.test`

**Env:**
- [x] `.env` / `.env.example` â€” `APP_NAME`, `DB_DATABASE`, `MAIL_FROM_ADDRESS="hello@evoriq.test"`

**Frontend** (replace hardcoded `'Evoriq'` fallbacks with the shared `name` prop or `'Laravel'`,
and neutralize Clockify copy):
- [x] `resources/js/pages/welcome.tsx` â€” **rewrite as a neutral starter landing page**
      (largest block of product copy: lines 71, 82, 130, 143)
- [x] `resources/js/pages/dashboard.tsx` â€” remove "Connect Clockifyâ€¦" CTA (lines 77â€“81)
- [x] `resources/js/components/dashboard/setup-checklist.tsx:34`
- [x] `resources/js/layouts/auth/auth-split-layout.tsx` â€” name fallback (line 21) + hero copy (lines 10, 41)
- [x] `resources/js/pages/errors/error.tsx` â€” fallback name (line 73) + maintenance copy (line 61)
- [x] `resources/js/pages/setup/index.tsx` â€” sidebar brand, Â© line, Clockify pitch (lines 152â€“165)
- [x] `resources/js/pages/admin/settings/appearance.tsx:31`
- [x] `resources/js/components/notification/notification-preference-form.tsx:91`
- [x] `resources/js/components/setup/database-step.tsx:94`

**Cosmetic PHPDoc/comments:**
- [x] `app/Exports/Contracts/Exportable.php:9`, `app/Imports/Contracts/Importable.php:13`,
      `config/setanjo.php:58`

## Phase 3 â€” Tests & seeders in lockstep

The seeded credential is used in 7 files â€” rename all together or tests fail:
- [x] `database/seeders/UserSeeder.php`, `tests/Pest.php:81`,
      `tests/Feature/RbacTest.php:21,29`, `tests/Feature/Developer/DeveloperPageTest.php:36`
- [x] `tests/Feature/Developer/SettingsTest.php:13` â€” asserts `SYSTEM_NAME === 'Evoriq'`
- [x] `tests/Feature/Setup/SetupInstallerTest.php` â€” `APP_NAME=Evoriq`, `'database' => 'evoriq'` fixtures
- [x] `tests/Unit/SetupServiceUnitTest.php`, `EnvironmentWriterUnitTest.php`,
      `DriverConfiguratorUnitTest.php`, `DatabaseConfiguratorUnitTest.php` â€” `evoriq_env_` temp
      prefixes and `APP_NAME=Evoriq` assertions

## Phase 4 â€” Docs & agent config

- [x] **`README.md`** â€” full rewrite: what the starter kit ships (auth, RBAC, settings,
      notifications, media, data-processing center, setup wizard, developer tools, quality gate),
      quickstart (`composer setup`, `composer run dev`), credentials, stack table
- [x] **`TDR.md`** â€” delete entirely; it is the Evoriq product spec and not needed for a starter
      (the architecture/conventions knowledge it carried is already documented in `AGENTS.md`
      and the `docs/*.md` plans)
- [x] `AGENTS.md` â€” rewrite: remove product framing, Clockify references, `superadmin@evoriq.test`,
      DB name; keep the conventions/rules (they are the starter kit's documentation)
- [x] `docs/` â€” keep the 5 generic plans (`FRC_STARTER_PORT_PLAN`, `DATA_PROCESSING_CENTER_PLAN`,
      `NOTIFICATION_SYSTEM_PLAN`, `JOB_RELIABILITY_PLAN`, `UI_BUILD_PLAN`) and scrub Evoriq/
      Clockify mentions from each
- [x] `.agents/skills/*/SKILL.md` â€” remove "Evoriq's" wording from the 5 skill descriptions
      (Clockify references live in `clockify-sync-feature` â€” either delete that skill or rewrite
      it as a generic "external API sync" skill)
- [x] `todo.md` â€” skim and delete/reset (product work tracker)

## Phase 5 â€” Branding assets (optional polish)

- [x] `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png` and the inline SVG in
      `resources/js/components/app-logo-icon.tsx` â€” replace the hexagon mark with a neutral
      placeholder, or leave and note in README ("bring your own logo")
- [x] No branded blade views exist (`resources/views/app.blade.php` is already generic) âœ…

## Phase 6 â€” Reusability polish

- [x] `.env.example` â€” final pass: dependency-free defaults intact, no product values
- [x] `composer.json` â€” description/keywords updated for a starter kit
- [x] `SettingSeeder` + `settings:sync` â€” confirm fresh installs seed the neutral name
- [x] Verify `php artisan setup:reset` onboarding flow works with the new defaults
- [x] Add a short "What's included" section to the README (feature checklist for downstream users)

## Phase 7 â€” Verification (final gate)

- [x] `grep -ri "evoriq\|clockify"` across the repo (excluding `vendor/`, `node_modules/`,
      `package-lock.json`) â†’ expect zero hits
- [x] `composer check` â€” Pint, PHPStan, Pest, frontend check, TypeScript: all green
- [x] Fresh-install smoke test: delete local DB â†’ `composer setup` â†’ wizard â†’ login with the
      renamed super admin â†’ dashboard, settings, export a user
- [x] Commit in logical phases (Clockify removal / rebrand / docs) so each step is revertable

---

## Execution order & risk notes

1. **Phases 1â€“3 are one coherent change set** (domain removal + rebrand + tests) â€” do them
   together and run `composer check` before committing.
2. **Renaming the seeded super admin email** touches the seeder and 4 test files â€” always in
   lockstep (Phase 3).
3. **The DB-persisted `system_name`** wins over `APP_NAME` at runtime â€” for the existing local
   install, update the setting row or re-run the setup wizard after rebranding.
4. **`TDR.md` is tracked and modified** (`M TDR.md`, `A app/Enums/ExportEntity.php` in git status)
   â€” commit or stash current work before starting cleanup.

---

## Status

**Completed 2026-09-24.** All phases executed. Notes:

- Display name: **Laravel React Starter**; DB default laravel_react_starter; super admin superadmin@example.test / 123456 (all renamed in lockstep across seeder + tests).
- The Clockify sync skill was deleted (.agents/skills/clockify-sync-feature), TDR.md and 	odo.md deleted.
- The local .env still points at the pre-existing local database (evoriq) and EnvKit hostname (evoriq.test) — update those manually when convenient, they are gitignored.
- The DB-backed system_name setting was updated to the new name via Settings::set().
- composer.json package name kept as laravel/react-starter-kit; description/keywords updated.
