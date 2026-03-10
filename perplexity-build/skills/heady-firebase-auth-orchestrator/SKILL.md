---
name: heady-firebase-auth-orchestrator
title: Heady Firebase Auth Orchestrator
description: Skill for managing Firebase auth across multi-site deployments
triggers: firebase, auth, authentication, cross-site, OAuth
version: 1.0.0
author: HeadySystems Inc.
---

# Heady Firebase Auth Orchestrator

Skill for managing Firebase auth across multi-site deployments

## Purpose
Orchestrate Firebase Authentication across all 9 Heady domains with cross-site token relay and vector memory user indexing.

## Architecture
- Central auth domain: auth.headysystems.com
- Firebase project: gen-lang-client-0920560496
- Providers: Google OAuth, Email/Password, Anonymous
- Token relay: hidden iframe + postMessage to all 9 domains
- Storage: httpOnly Secure SameSite=Strict cookies
- User indexing: HeadyAutoContext indexes user profile on sign-in

## Cross-Site Flow
1. User clicks "Sign In" on any Heady domain
2. Redirect to auth.headysystems.com/login?redirect=ORIGINATING_URL
3. Firebase Auth handles provider selection
4. On success, mint custom Firebase token server-side
5. Relay token to all 9 domains via hidden relay iframes + postMessage
6. Each domain stores token as secure cookie
7. HeadyAutoContext indexes user context into vector memory
8. User redirected back to originating URL

## Security Requirements
- Validate redirect URLs against server-side allowlist
- Use state/nonce params in all OAuth flows
- Short JWT expiry (15-60 min) + refresh tokens
- Revocation blacklist in Firestore for logout
- Rate-limit anonymous sign-ins
- Firestore rules: `allow read,write: if request.auth.uid == resource.data.uid`


---
*© 2026 HeadySystems Inc. — 51+ Provisional Patents — Sacred Geometry v4.0*
