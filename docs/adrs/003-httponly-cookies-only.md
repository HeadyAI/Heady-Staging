# ADR-003: httpOnly Cookies — No localStorage for Tokens

## Status
Accepted

## Context
localStorage is vulnerable to XSS attacks. Any injected script can read all stored tokens. The Heady platform handles sensitive authentication tokens.

## Decision
- ALL session tokens use httpOnly Secure SameSite=Strict cookies
- Cookie name: __heady_session
- NO localStorage for ANY authentication data — EVER
- Firebase Auth tokens are relayed through server-side proxy
- CSRF protection via separate tokens in request headers

## Consequences
- XSS cannot steal session tokens
- Must use server-side session management
- CSRF tokens required for state-changing requests
- Cookie-based auth works across all Heady domains
