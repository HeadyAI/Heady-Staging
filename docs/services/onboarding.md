# Onboarding Service

**Port:** 3365 | **Pool:** Warm | **Domain:** onboarding.headysystems.com

## Overview
Guides new users through the Heady platform setup with interactive, step-by-step onboarding flows. Tracks progress and adapts based on user type.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/onboarding/start` | Start onboarding flow |
| `GET` | `/onboarding/step/:id` | Get step details |
| `POST` | `/onboarding/complete/:id` | Mark step complete |
| `GET` | `/onboarding/progress` | Get progress summary |
| `GET` | `/health` | Health check |

## Onboarding Plans
| Plan | Steps | Target |
|------|-------|--------|
| `developer` | 8 (fib(6)) | API developers |
| `enterprise` | 13 (fib(7)) | Enterprise admins |
| `companion` | 5 (fib(5)) | HeadyBuddy users |
| `community` | 5 (fib(5)) | HeadyConnection members |

## UI
Serves onboarding UI at `/ui/` — static HTML with Sacred Geometry styling.
