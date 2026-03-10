# Scheduler Service

**Port:** 3363 | **Pool:** Warm | **Domain:** scheduler.headysystems.com

## Overview
Cron-style task scheduling with φ-derived intervals. Manages recurring jobs, one-time delayed tasks, and pipeline triggers.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/schedules` | Create schedule |
| `GET` | `/schedules` | List schedules |
| `DELETE` | `/schedules/:id` | Delete schedule |
| `GET` | `/health` | Health check |

## Schedule Types
| Type | Example | Timing |
|------|---------|--------|
| Cron | `0 */3 * * *` | Standard cron syntax |
| Interval | `phi_7` | φ-derived intervals |
| One-time | `2026-03-15T09:00:00Z` | ISO 8601 timestamp |

## φ-Derived Intervals
| Name | Value | Use |
|------|-------|-----|
| `phi_3` | 4 236ms | Fast polling |
| `phi_5` | 11 090ms | Standard interval |
| `phi_7` | 29 034ms | Medium interval |
| `phi_8` | 46 979ms | Slow cleanup |
