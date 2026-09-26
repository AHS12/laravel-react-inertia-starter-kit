# Security Policy

## Supported versions

Only the latest release of the `main` branch receives security fixes. Please
keep your deployment up to date.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub
issues, discussions, or pull requests.**

Instead, report them privately via
[GitHub security advisories](https://github.com/AHS12/laravel-react-inertia-starter-kit/security/advisories/new)
on this repository ("Report a vulnerability" button). Include as much of the
following as you can:

- The type of issue and its impact
- Step-by-step instructions or a proof of concept to reproduce it
- Affected version / commit
- Any suggested fixes (optional)

## What to expect

- Acknowledgement of your report
- An assessment and, when confirmed, a fix together with a patched release
- Public credit in the release notes if you wish

## Scope

This policy covers the application code in this repository. Vulnerabilities in
third-party dependencies should also be reported here; we will coordinate with
upstream where needed. Note that this is a starter kit — deployments are
expected to follow Laravel production hardening practices (secrets in `.env`,
`APP_DEBUG=false`, HTTPS, etc.).
