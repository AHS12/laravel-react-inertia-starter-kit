# Contributing

Thanks for your interest in contributing! This document explains how to set up
the project locally and get a pull request merged.

## Code of conduct

By participating you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior via
the contact channel listed there.

## Getting started

1. **Fork and clone** the repository:

   ```sh
   git clone https://github.com/<your-username>/laravel-react-inertia-starter-kit.git
   cd laravel-react-inertia-starter-kit
   ```

2. **Install and boot** (see [docs/installation.md](docs/installation.md) for
   the full guide, including local environment tools):

   ```sh
   composer setup     # deps, .env, key, drivers, migrate + seed, npm install + build
   composer run dev   # server + queue worker + Vite
   ```

3. **Verify the quality gate passes** before you change anything, so you know
   your baseline is green:

   ```sh
   composer check
   ```

## Architecture and conventions

This project follows a strict **Service–Repository** architecture:

- Controllers are thin — validate with a `FormRequest`, call one service
  method, return a response.
- Services own business logic and transactions; repositories own every query.
- DTOs cross the service boundary; repositories receive plain arrays.
- Frontend is server-driven via Inertia: typed props from controllers, pages
  receive data through props, navigation uses Wayfinder helpers.

Read [`AGENTS.md`](AGENTS.md) for the full, authoritative contract — it is the
primary source of truth for architecture and conventions. When in doubt, look
at how an existing module (e.g. Users or Roles) does it and follow that.

## Workflow

1. Create a branch from `main` (or `dev` if your change targets it):

   ```sh
   git checkout -b feat/my-feature
   ```

2. Make your changes. Keep them focused — one feature or fix per PR.

3. **Add tests** for every new behavior. The project uses a strict 1:1 mapping:
   1 service = 1 unit test, 1 controller = 1 feature test (Pest). See
   [docs/testing.md](docs/testing.md).

4. **Run the full quality gate**:

   ```sh
   composer check       # frontend format + lint, TypeScript, Pint, PHPStan, Pest
   composer check:fix   # auto-fix formatting and lint issues
   ```

   Git hooks are available (`composer hooks`): the pre-commit hook runs Pint
   and the frontend check on dirty files, the pre-push hook runs the full gate.

5. **Translations**: every user-visible string must be translatable. New keys
   must be added to **all five** locale dictionaries in `lang/app/`
   (`en`, `bn`, `fr`, `de`, `es`) — `TranslationParityTest` fails the build if
   any are missing. See [docs/translations.md](docs/translations.md).

6. Commit and push, then open a pull request against the repository. Use the
   PR template and describe *what* and *why*.

## Commit messages

Use clear, imperative subjects, ideally following Conventional Commits:

```text
feat: add export filtering by date range
fix: prevent duplicate invitation emails
docs: expand testing guide
```

## Reporting bugs and suggesting features

Please use the [issue templates](.github/ISSUE_TEMPLATE). For security
vulnerabilities, do **not** open a public issue — follow
[SECURITY.md](SECURITY.md) instead.

## Licensing

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
