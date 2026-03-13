# MODULE 08 — QUALITY STANDARDS

> **ID:** `QUALITY_STANDARDS` | **Deps:** `CORE_IDENTITY`, `VERIFICATION_ENGINE`  
> **Required by:** All compositions (recommended)  
> **Deterministic role:** Quality checks are binary — code either meets the standard or it doesn't. This eliminates subjective "good enough" judgments that introduce non-determinism.

---

## Code Quality

**Naming:** Names describe *what* and *why*, not *how*. `userAuthToken` not `tok`. `retryDelayMs` not `d`. Functions with "and" in the name should be split — `validateAndSaveUser` is two functions in a trench coat.

**Functions:** One function does one thing at one level of abstraction. If it needs scrolling to understand, it's doing too much. Side effects are explicit and isolated — `calculateTotal` should not also send an email.

**Comments:** Explain *why*, never *what*. The code says what. Acceptable comments: non-obvious business rules, performance decisions with measurements, workarounds for external bugs (with issue links), regulatory requirements. Drupal hook implementations should document what event they respond to and why.

**Error handling:** Every error path is an explicit design decision. Typed errors carry machine-readable codes, human-readable messages, HTTP status, and structured details. "Something went wrong" is never acceptable. Error boundaries exist at every layer transition: Drupal controllers catch and translate service exceptions into proper HTTP responses. Heady cross-site execution surfaces external service errors through the 3D persistence event stream, never as raw stack traces.

**No magic numbers.** Every constant has a named variable with documented derivation. Use the mathematical constant families from MODULE 06 (Fibonacci, golden ratio, powers of 2) or empirically measured values.

## Testing

**What to test:** Critical paths (happy path through every major feature), error paths (invalid input, missing auth, network failures), edge cases (empty, null, Unicode, boundary values, concurrency), and integration points (every boundary where two systems meet — Drupal↔Heady, Heady↔3D persistence, Heady↔external services).

**Drupal-specific testing:** Use PHPUnit kernel tests for service layer logic, functional tests for routing and rendering, and JavaScript testing for Drupal behaviors. Test Twig template output for all five component states (empty, loading, error, populated, edge). Test `drush config:import` produces correct site state from a clean install.

**Testing properties:** Deterministic (same result every run), isolated (unit tests have zero I/O), readable (failing test tells you what broke and where to look), maintainable (test behavior not implementation — refactoring shouldn't break tests unless behavior changed).

**Quality verification extension** added to MODULE 04 Pass 3:

```
□ Zero flaky tests (same result on 3 consecutive runs)
□ Zero order-dependent tests (pass in shuffled order)
□ Zero timing-dependent assertions (no sleep in tests)
□ Every test has a descriptive name (not test1, testA)
□ Every assertion has a failure message
□ No test modifies shared state without cleanup
□ Drupal kernel/functional tests cover entity CRUD and access
□ Twig templates tested for all five component states
```

## Documentation

Documentation exists to make the system operable by someone who didn't build it.

**Required:** README (clone → configure → run in 5 minutes), architecture overview with diagram, configuration reference (every env var, default, valid range), API reference (every endpoint, method, schema, errors, auth), Drupal site-building guide (content types, views, permissions), 3D persistence schema reference (vector addressing, payload schemas), runbook (deploy, rollback, debug common failures, scale).

**Anti-patterns:** Docs describing aspiration not reality. Docs not updated since initial commit. Docs duplicating what code says. No docs at all.

**Quality verification extension** added to MODULE 04 Pass 5:

```
□ README produces working system from clean environment
□ All env vars in code present in config reference
□ All API endpoints in code present in API reference
□ Architecture diagram matches actual topology
□ Drupal config export matches site-building docs
□ 3D persistence docs match actual vector schemas
□ Runbook covers deploy, rollback, common failures
```

**Affirmation:** `QUALITY: VERIFIED — naming clean, tests deterministic, docs current, 0 magic numbers`
