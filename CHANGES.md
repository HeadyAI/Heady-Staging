# CHANGES

*   `src/routes/auth-routes.js`: Added `res.cookie` configuration to set `httpOnly` session tokens, updated `extractToken` to support parsing tokens from `req.cookies`.
*   `heady-manager.js`: Integrated `cookie-parser` middleware. Replaced `helmet` configuration with strict Content Security Policy directives. Replaced `console.log` statements with `logger.info`.
*   `quick-server.js`: Replaced `console.log` statements with `logger.info`.
*   `src/utils/logger.js`: Created a central Pino-based structured JSON logger.
*   `public/auth.html`: Removed `localStorage.setItem` for session tokens.
*   `public/onboarding.html`: Updated token retrieval and onboarding state to use `document.cookie` (since `httpOnly` tokens are handled by server, auth checks are adjusted) instead of `localStorage`.
*   `training/heady-task-manager.html`: Changed `localStorage` references to `sessionStorage`.
*   `oracle_service/src/oracle_server.py`: Replaced TODOs with functional HMAC-SHA256 verification and `httpx` requests.
*   `oracle_service/requirements.txt`: Added `httpx` dependency.
*   `training/hello-headystack.js`: Completed missing functions and removed TODO comments.
*   Codebase-wide: Ran a clean-up script to remove all unresolved `<<<<<<< HEAD` blocks resulting from merge conflicts, keeping the `HEAD` changes.
*   Created documentation artifacts: `GAPS_FOUND.md`, `IMPROVEMENTS.md`, `CHANGES.md`.