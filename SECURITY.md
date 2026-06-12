# Security Policy

## Reporting a Vulnerability

If you discover a security issue, please report it privately rather than opening a public issue.

- Use [GitHub Security Advisories](https://github.com/Rafail-Drakakis/Media-server/security/advisories/new) on this repository, or
- Email the maintainer directly.

Include steps to reproduce, affected versions, and impact if known.

## Secrets and Configuration

Never commit these files:

- `backend/.env` (contains `JWT_SECRET` and `MEDIA_ROOT`)
- `backend/data.db` (user accounts and library metadata)
- `node_modules/` or `frontend/dist/`

Copy `backend/.env.example` to `backend/.env` and set a long random `JWT_SECRET` before running the server.

## If Secrets Were Committed

If `.env` or `data.db` were ever pushed to a remote:

1. Rotate `JWT_SECRET` immediately (invalidates existing sessions).
2. Change all user passwords stored in the database.
3. Revoke any third-party API keys that appeared in history.
4. Rewrite git history to remove the files, then force-push.

Treat leaked credentials as compromised even after history cleanup.

## Deployment Notes

- Registration is limited to the first user unless `ALLOW_REGISTRATION=true`.
- Set `CORS_ORIGINS` to your frontend URL when exposing the server beyond localhost.
- Do not expose the Vite dev server (`npm run dev`) to the public internet.
