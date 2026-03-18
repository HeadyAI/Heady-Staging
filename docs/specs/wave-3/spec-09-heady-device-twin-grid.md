# Spec 09 — Heady Device Twin Grid

**Wave:** Third Wave  
**Domain:** headybuddy.org + headyme.com / AI Companion & Personal Cloud  
**Primary Repos:** headybuddy-core, headyme-core, heady-production, headymcp-core, latent-core-dev, heady-mobile, heady-desktop  
**Date:** 2026-03-17  
**Status:** Draft

---

## 1. Purpose

Heady Device Twin Grid is a real-time, privacy-preserving device synchronization and presence system that allows a user's HeadyBuddy instance and Heady personal data to be coherently synchronized across all of their devices — phone, laptop, desktop, tablet — with each device maintaining a "twin" state that reflects the user's current activity context, open conversations, active plugins, and memory state.

The "Grid" metaphor reflects the topology: each user's devices form a personal mesh grid where state flows between twins in real time. The result is a seamless cross-device experience: start a conversation on mobile, continue it on desktop, receive a Deployment Pulse alert on desktop, acknowledge it on mobile — all without manual sync steps or data loss.

**Why it matters:** The current headybuddy-core architecture is fundamentally single-session. Users who access Buddy from multiple devices get disconnected, inconsistent experiences — one device has the latest memory, another doesn't. Device Twin Grid makes multi-device the default, coherent experience.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|------------|
| G1 | Conversation continuity across devices — a message sent on mobile appears on desktop within 2 seconds | Cross-device sync latency (P95) |
| G2 | Memory state consistency — all devices reflect the same long-term memory state within 60 seconds of a write | Memory sync consistency check |
| G3 | Presence state is accurate across devices — "Buddy is active on Desktop" shown on mobile within 5 seconds | Presence state latency |
| G4 | Zero data loss during device handoff — no messages or memory entries are dropped during transitions | Data loss incidents = 0 (audited weekly) |
| G5 | Users can add a new device to their Grid in ≤ 3 minutes | New device onboarding time |

---

## 3. Non-Goals

- **Multi-user sync** — Device Twin Grid is a single-user multi-device system. Team/shared sessions are a future capability.
- **Full OS-level sync** (calendar, files, clipboard) — Grid syncs Heady-specific state only: conversations, memory, plugin configs, and presence.
- **Third-party device integration** — Grid operates within the Heady ecosystem; it does not sync with iCloud, Google Drive, or external services.
- **Heady Buddy Shell native app infrastructure** — Shell is defined in Spec 08; Grid layers cross-device sync on top of it.

---

## 4. User Stories

**As a user,** I want to start a conversation with Buddy on my phone during my commute and seamlessly continue it on my laptop when I arrive at my desk — without losing any context.

**As a user,** I want to see which of my devices Buddy is currently active on, so I know where my notifications are landing.

**As a power user,** I want to designate one device as my "primary" so that notifications default to that device unless I'm active somewhere else, with automatic presence-based routing.

**As a user adding a new device,** I want to scan a QR code or enter a short code on my existing device to add a new device to my Grid, and have it fully synced within minutes.

**As a privacy-conscious user,** I want Device Twin Grid to work end-to-end encrypted so that even Heady's servers cannot read the content of my synced data.

---

## 5. Requirements

### P0 — Must Have

- **Device Registry:** Per-user list of registered devices: device_id, name (e.g., "Eric's iPhone"), type (mobile/desktop/tablet), platform, registration_timestamp, last_active, public_key.
- **Twin State Schema:** Defines the synchronized state per device: active_conversation_id, last_message_timestamp, plugin_config_version, memory_sync_checkpoint, presence_status.
- **Real-Time Conversation Sync:** New messages sent from any device are broadcast to all other active devices in real time. Uses WebSocket connection per device through headymcp-core event stream.
- **Memory Sync:** After each long-term memory write (latent-core-dev), a sync event is broadcast to all Grid devices. Devices that were offline receive a differential sync on reconnect.
- **Presence Engine:** Tracks which device(s) are active (open app, recent interaction within 2 minutes). Active device status broadcast to all registered devices. Notification Router uses presence to route incoming alerts to the most active device.
- **Device Onboarding Flow:** Scan QR code or enter device code (displayed on existing device) to add new device. New device receives full current state sync on first connect.
- **End-to-End Encryption (E2EE):** All synced data is encrypted with user's device key pair before transmission. heady-production stores encrypted blobs; decryption keys never leave user devices.

### P1 — Should Have

- **Primary Device Designation:** User can designate a primary device for notification routing when no presence signal is active.
- **Offline Queue:** When a device is offline, incoming messages and sync events are queued. On reconnect, device receives the full queue in order.
- **Device Removal:** User can remove a device from the Grid, which immediately revokes its sync credentials and wipes its local Grid state.
- **Selective Sync:** User can configure which data types sync to which devices (e.g., "sync conversations to all devices but only sync DevOps plugin state to desktop").
- **Conflict Resolution:** If two devices write conflicting state simultaneously (e.g., both submit a message at the same moment), the Grid applies last-write-wins with a conflict notification to the user.

### P2 — Future

- **Cross-device handoff gesture** — "Pick up on this device" button that transfers an active conversation from another device with one tap.
- **Grid health dashboard** — per-device sync status, last sync timestamps, queue depth.
- **Peer-to-peer Grid mode** — devices on the same local network sync directly without going through heady-production, for maximum privacy and speed.

---

## 6. User Experience

1. **Grid setup (first time):** Buddy Shell onboarding includes a "Set Up Your Grid" step. User sees a QR code for adding additional devices. Or, proceed with single device initially.
2. **Device list in Settings:** `Settings → Your Grid` shows registered devices as cards: name, platform icon, last active badge, primary indicator. Add / Remove device buttons.
3. **Add device flow:** On new device: tap "Join Grid" → enter code from existing device or scan QR → new device syncs in background → confirmation toast.
4. **Cross-device conversation:** Conversation thread shows a subtle device badge next to messages sent from a different device ("Sent from Desktop").
5. **Presence indicator:** In the Buddy Shell header, a small multi-device icon shows "Active on 2 devices" with a tooltip listing them.
6. **Notification routing:** Incoming alert (e.g., Grant deadline) appears on the most recently active device. If no device is active: routes to primary device.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│  Device A (Mobile)         Device B (Desktop)       │
│  HeadyBuddy Shell          HeadyBuddy Shell         │
│  Twin State Manager        Twin State Manager       │
└──────────┬─────────────────────────┬────────────────┘
           │ WebSocket               │ WebSocket
┌──────────▼─────────────────────────▼────────────────┐
│               headymcp-core                         │
│  Grid Sync Service:                                 │
│  - WebSocket hub (per-user room)                    │
│  - Event broadcast (conversation, memory, presence) │
│  - Offline queue (Redis)                            │
│  - E2EE envelope handler (encrypt/route/deliver)   │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                 heady-production                     │
│  device_registry (per user)                         │
│  grid_sync_log (append-only event log)              │
│  encrypted_twin_state_blobs (E2EE, opaque to server)│
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│               latent-core-dev                        │
│  User long-term memory (synced across devices        │
│  via memory sync events; decryption on-device)      │
└─────────────────────────────────────────────────────┘
```

---

## 8. Data Flows

**Message sent on Device A:**
```
User sends message on Device A (Mobile)
  → Message stored locally in Shell conversation state
  → Encrypted with user's device key pair
  → POST to headymcp-core Grid Sync Service
  → Grid Sync Service broadcasts encrypted message to all devices in user's Grid room
  → Device B (Desktop) receives broadcast
  → Device B decrypts with its local key copy
  → Device B displays message in conversation thread
  → grid_sync_log entry written (event type: message, sender_device: A, timestamp)
```

**Device B goes offline:**
```
Device B connection drops
  → Grid Sync Service detects disconnect
  → Subsequent events for Device B queued in Redis offline queue
  → Device B reconnects
  → Grid Sync Service delivers queued events in order
  → Device B processes differential sync (memory checkpoint + queued messages)
  → Device B fully current
```

**Memory write sync:**
```
Agent/Buddy writes to latent-core-dev (long-term memory)
  → memory_sync_event published to Grid Sync Service
  → Broadcast to all active devices: {event: "memory_updated", checkpoint_id}
  → Each device updates its memory_sync_checkpoint
  → Next recall operation on any device reflects updated memory
```

**Presence update:**
```
User interacts with Buddy on Device A
  → Shell sends presence_ping every 30 seconds while active
  → Grid Sync Service updates device_presence: {device_id: A, status: active, last_seen: now}
  → Presence broadcast to all other devices in Grid room
  → Notification Router checks presence before routing incoming alerts
```

---

## 9. Security & Privacy

- **E2EE:** All twin state and conversation content is encrypted client-side with the user's key pair before leaving the device. heady-production stores only encrypted blobs — server is zero-knowledge with respect to content.
- Device keys are generated on-device and stored in the platform's secure keystore (iOS Keychain, Android Keystore, macOS Keychain, system credential manager on Windows/Linux). Keys never transmitted in plaintext.
- Device registration requires authentication with the user's Heady account + a time-limited device code or QR scan — no unilateral device addition.
- Device removal immediately broadcasts a key revocation to the Grid; the removed device can no longer decrypt new events.
- grid_sync_log stores only event metadata (type, device ID, timestamp) — never content. This allows anomaly detection without content access.
- Offline queue in Redis is also stored as encrypted blobs.

---

## 10. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| headybuddy-core — session and conversation management | Internal | Extend with Grid awareness |
| headyme-core — personal cloud hub | Internal | Add Grid management panel |
| headymcp-core — Grid Sync Service (WebSocket hub) | Internal | New service module |
| heady-production — Postgres (new tables) + Redis | Internal | Migration + Redis provision |
| latent-core-dev — memory sync events | Internal | Extend with sync checkpoint support |
| heady-mobile — Twin State Manager (React Native) | Internal | New module in existing repo |
| heady-desktop — Twin State Manager (Tauri/Electron) | Internal | New module in existing repo |
| HeadyBuddy Shell (Spec 08) — Shell app foundation | Internal | Spec 08 Phase 1+ |

---

## 11. Phased Rollout

### Phase 1 — Two-Device Sync (Weeks 1–6)
- Device Registry schema
- Grid Sync Service (WebSocket hub, 2-device MVP)
- Real-time conversation sync (no E2EE in Phase 1 — TLS only)
- Presence engine
- Device onboarding QR flow

### Phase 2 — E2EE + Offline (Weeks 7–12)
- End-to-end encryption (client-side key pair)
- Offline queue (Redis)
- Memory sync events
- Device removal + key revocation
- Full n-device Grid support

### Phase 3 — Intelligence + Polish (Weeks 13–18)
- Notification routing by presence
- Selective sync configuration
- Primary device designation
- Grid management UI in headyme.com
- Conflict resolution with user notification

---

## 12. Success Metrics

| Metric | Baseline | Target (Phase 2 completion) |
|--------|---------|------------------------------|
| Cross-device sync latency (P95) | N/A (no sync) | ≤ 2 seconds |
| Memory sync consistency | N/A | Within 60 seconds |
| Presence state latency | N/A | ≤ 5 seconds |
| Data loss incidents/week | N/A | 0 |
| New device onboarding time | N/A | ≤ 3 minutes |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|---------|-------|-----------|
| Should E2EE be implemented in Phase 1 or Phase 2? Pushing to Phase 2 accelerates delivery but ships a window without full E2EE. | Eric | Yes — product decision |
| What is the maximum expected Grid size per user (number of devices)? | Engineering | No — affects WebSocket room scaling design |
| Should headyme.com be the primary Grid management surface, or is it in the Shell app? | Eric | No — recommend Shell primary, headyme.com secondary |
| Is Redis already provisioned in the Heady infrastructure, or does it need to be added? | Engineering | Yes — affects Phase 1 offline queue |
