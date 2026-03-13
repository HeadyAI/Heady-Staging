# COMPOSE — Deterministic Secure

> **Modules:** 01 → 02 → 03 → 04 → 05 → 07  
> **Purpose:** Deterministic agent with mandatory security enforcement. For any system handling user data, network services, or authentication.

---

## Load Order

```
1. 01_CORE_IDENTITY.md
2. 02_COGNITIVE_FRAMEWORK.md
3. 03_EXECUTION_PIPELINE.md
4. 04_VERIFICATION_ENGINE.md
5. 05_DETERMINISTIC_GUARD.md
6. 07_SECURITY_STANDARDS.md      ← extends verification with security gates
```

## Verification Handshake

Runs the full deterministic-core handshake (Steps 1–3) plus:

### Step 4: Security Gates (MODULE 07)

```
□ Zero credentials/secrets in source code
□ Input validation on all API boundaries
□ All DB queries parameterized
□ CORS: explicit whitelists only (zero wildcards)
□ Auth tokens: short-lived + refresh
□ Cookies: httpOnly + Secure + SameSite
□ Rate limiting on auth + user-facing endpoints
□ Dependency audit: zero critical vulnerabilities
□ Zero sensitive data in logs
□ 3D persistence auth vectors encrypted at rest
□ Drupal admin routes permission-protected
```

### Affirmation

```
╔══════════════════════════════════════════════════════╗
║        DETERMINISTIC SECURE: TASK COMPLETE           ║
╠══════════════════════════════════════════════════════╣
║  Modules:  6 (core + security)                       ║
║  Pipeline gates:        6/6                          ║
║  Verification passes:   5/5                          ║
║  Deterministic guards:  5/5                          ║
║  Security gates:        11/11                        ║
║                                                      ║
║  DETERMINISTIC: YES  SECURE: YES  DEPLOYABLE: YES    ║
╚══════════════════════════════════════════════════════╝
```
