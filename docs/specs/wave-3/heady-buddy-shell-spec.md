# Heady Buddy Shell
### Feature Specification — Third Wave
**Version:** 1.0  
**Date:** 2026-03-17  
**Owner:** headybuddy.org  
**Domain:** headybuddy.org, headyme.com, heady-ai.com  
**Skill Target:** heady-buddy-shell-productization

---

## 1. Purpose

Heady Buddy Shell is the native application wrapper and productization layer for HeadyBuddy — transforming what is currently a web-based AI companion into a first-class desktop (macOS, Windows, Linux) and mobile (iOS, Android) application. The Shell provides: a persistent native presence (system tray / dock), offline-capable operation, push notification delivery independent of a browser, device-level integrations (clipboard, file system, calendar, OS notifications), and an app-store-distributable package. It is the productization step that makes HeadyBuddy a daily-use companion rather than a website.

**Problem Statement:**  
HeadyBuddy's current web-only delivery means users must navigate to a browser tab to access their AI companion, losing the "always on" presence that defines the best desktop assistants. There is no native notification delivery, no system tray persistence, no clipboard or file system integration, and no app store distribution path. This severely limits HeadyBuddy's ability to serve as an ambient operating layer the way the Heady vision requires.

---

## 2. Goals

| # | Goal | Measurement |
|---|------|-------------|
| G1 | Deliver installable desktop apps for macOS, Windows, and Linux at launch | Published to OS-appropriate distribution channels |
| G2 | Deliver installable mobile apps for iOS and Android | Published to App Store and Google Play |
| G3 | Enable push notifications delivered to the device even when app is backgrounded | Push delivery success rate ≥ 99% for P0 notifications |
| G4 | Achieve daily active use: HeadyBuddy Shell opened at least once per day by target users | DAU / registered users ≥ 60% within 60 days |
| G5 | Reduce user-perceived latency vs. web by 20% via local caching | Response time p95 measured in-app vs. browser |

---

## 3. Non-Goals

- **Not a new AI model.** The Shell wraps HeadyBuddy's existing AI capability; it does not replace or modify the AI layer.
- **Not a standalone offline AI.** Full offline inference is out of scope; the Shell provides offline-capable UI and caching, not local LLM execution.
- **Not a calendar or email app.** The Shell reads calendar context; it does not replace the user's calendar or email client.
- **Not a browser replacement.** Web browsing inside the Shell is not a v1 capability.
- **Not a gaming or media player.** Rich media consumption features are out of scope.

---

## 4. User Stories

### Daily HeadyBuddy User
- As a daily HeadyBuddy user, I want HeadyBuddy to live in my system tray so that I can summon it with a keyboard shortcut without switching to a browser.
- As a daily HeadyBuddy user, I want to receive push notifications from HeadyBuddy (reminders, alerts, swarm completions) on my phone even when the app is not open so that I never miss important agent events.
- As a daily HeadyBuddy user, I want HeadyBuddy to see my clipboard so that I can paste text and immediately ask questions about it without manual copy-paste.

### Developer / Power User
- As a power user, I want to drag and drop files onto HeadyBuddy Shell to analyze or process them so that I do not need to navigate file pickers.
- As a power user, I want HeadyBuddy to appear as an OS-level assistant (like Spotlight on macOS) triggered by a global hotkey so that it is always one keystroke away.

### Nonprofit Program Director
- As a nonprofit program director, I want HeadyBuddy to surface grant deadline reminders as native OS notifications so that I do not miss submission windows even if I have not opened the app.

---

## 5. Requirements

### P0 — Must Have
- **Desktop Shell (macOS, Windows, Linux):** Native app built with Electron or Tauri wrapping the HeadyBuddy web app core. System tray icon with quick-open menu. Global hotkey to summon/dismiss.
- **Mobile Shell (iOS, Android):** React Native app wrapping HeadyBuddy web core with native navigation shell. Full offline UI availability (shows last session state when offline).
- **Push Notification Delivery:** Integration with APNs (iOS), FCM (Android), and OS notification APIs (desktop) via HeadyBuddy notification bridge. Deliver alerts from Heady ecosystem (grant deadlines, agent completions, deployment alerts).
- **Clipboard Integration (desktop):** Shell monitors clipboard on request (not continuously); user can trigger "Analyze clipboard" action.
- **File Drop (desktop):** Files dragged onto Shell window are uploaded and passed to HeadyBuddy as context.
- **Local Session Cache:** Last N conversations and key context items cached locally for instant load and offline review.
- **Auto-update:** Shell checks for updates on launch and applies them silently (desktop) or prompts (mobile).

### P1 — Should Have
- **Global Hotkey Customization:** User-configurable keyboard shortcut for summon/dismiss.
- **Calendar Context Read (macOS / iOS):** With permission, read upcoming calendar events and surface them as context to HeadyBuddy (e.g., "You have a grant deadline meeting in 30 minutes").
- **Dark/Light Mode Sync:** Shell follows OS appearance preference.
- **Notification Preferences:** Per-notification-type controls (what gets pushed vs. suppressed).
- **Compact Mode:** Mini window mode (200px wide) showing last message + input bar for quick one-off interactions.

### P2 — Future Considerations
- Local LLM execution for fully offline operation.
- Screen capture / screenshot analysis triggered from Shell.
- App shortcuts panel: quick-launch cards for frequently used Heady services.
- Enterprise MDM deployment support.

---

## 6. User Experience

### Desktop Shell
- **System Tray:** HeadyBuddy icon in system tray; click to open / right-click for quick actions (New Chat, Mute Notifications, Quit).
- **Main Window:** HeadyBuddy web app rendered in a frameless window with a native-feeling title bar. Resizable, remembers size/position.
- **Global Hotkey:** Default `Cmd+Shift+H` (macOS) / `Ctrl+Shift+H` (Windows/Linux) to summon/dismiss.
- **File Drop Zone:** Drop indicator overlay appears when file is dragged over the window; dropped files immediately appear as attachment context in the chat.
- **Clipboard Button:** Persistent "📋 Analyze Clipboard" quick action in the input bar; no continuous clipboard monitoring.

### Mobile Shell (iOS / Android)
- **Home Screen:** Full-screen HeadyBuddy chat interface with native gesture navigation.
- **Notifications:** Rich push notifications with action buttons inline (e.g., "View Grant" / "Dismiss" on a deadline alert).
- **Offline State:** Shows a soft "offline" indicator; last session visible and readable; input disabled with clear message.
- **Widget (Phase 2):** Home screen widget showing last HeadyBuddy message.

### Notification Design
- **Title:** Source context (e.g., "Grant Deadline: XYZ Foundation")
- **Body:** Concise message (e.g., "Application due in 3 days — open draft?")
- **Actions:** 1–2 inline action buttons specific to notification type.

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Heady Buddy Shell                           │
│                                                                 │
│  ┌─────────────────────┐   ┌────────────────────────────────┐  │
│  │  Desktop Shell      │   │  Mobile Shell                  │  │
│  │  (Tauri / Electron) │   │  (React Native + WebView)      │  │
│  │                     │   │                                │  │
│  │  • System tray      │   │  • Native navigation           │  │
│  │  • Global hotkey    │   │  • Push notification receive   │  │
│  │  • File drop        │   │  • Offline cache               │  │
│  │  • Clipboard access │   │  • APNs / FCM registration     │  │
│  │  • Auto-update      │   │  • Auto-update (stores)        │  │
│  └──────────┬──────────┘   └──────────────┬─────────────────┘  │
│             │                             │                     │
│             └─────────────┬───────────────┘                     │
│                           ▼                                     │
│                  ┌──────────────────┐                           │
│                  │  HeadyBuddy Core │                           │
│                  │  (Web App / API) │                           │
│                  │  headybuddy.org  │                           │
│                  └──────────┬───────┘                           │
│                             │                                   │
│         ┌───────────────────┼──────────────────────────┐        │
│         ▼                   ▼                          ▼        │
│  ┌────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │  Push      │  │  Local Cache       │  │  Heady Ecosystem │  │
│  │  Service   │  │  (SQLite / device) │  │  API Bridge      │  │
│  │  APNs/FCM  │  │  Conversations,    │  │  Notifications   │  │
│  │  OS notif  │  │  context, prefs    │  │  from all Heady  │  │
│  └────────────┘  └────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Stack:**
- Desktop: Tauri (preferred for performance) or Electron; wraps headybuddy.org web core via WebView
- Mobile: React Native with embedded WebView for chat UI; native modules for push/file/calendar
- Push Service: Firebase Cloud Messaging (FCM) for Android; APNs for iOS; Electron Notification API for desktop
- Local Cache: SQLite (mobile via expo-sqlite; desktop via better-sqlite3)
- Push Sender: HeadyBuddy notification bridge sends to Firebase/APNs server-side
- Build/Distribution: GitHub Actions → macOS/Windows/Linux packages → GitHub Releases; App Store / Google Play

---

## 8. Data Flows

### Push Notification Flow
1. Heady ecosystem service (e.g., Grant Constellation) emits a notification event to Pub/Sub.
2. HeadyBuddy notification bridge picks up event; formats per notification type.
3. Bridge calls FCM API (Android) or APNs (iOS) or OS notification API (desktop) with device token.
4. Push delivered to user device; Shell renders native OS notification.
5. User taps notification → Shell opens to relevant context.

### Clipboard Analysis Flow
1. User clicks "Analyze Clipboard" button in Shell.
2. Shell reads clipboard text via OS API (one-time read, not polling).
3. Clipboard content appended to current chat input.
4. Standard HeadyBuddy inference flow proceeds.

### File Drop Flow
1. User drags file onto Shell window.
2. Shell reads file via OS file access API.
3. File uploaded to HeadyBuddy backend (multipart POST); attachment URL returned.
4. Attachment displayed in chat as context; HeadyBuddy processes file contents.

### Auto-Update Flow (Desktop)
1. On Shell launch, updater checks release endpoint for latest version.
2. If newer version available, download in background.
3. On next launch, apply update transparently (Tauri updater protocol).

---

## 9. Security & Privacy

| Concern | Mitigation |
|---------|------------|
| Clipboard access | One-time read only on explicit user action; no passive clipboard monitoring |
| File system access | Shell requests OS-level file access permission; user must explicitly drag or select files |
| Push notification tokens | Device tokens stored server-side in encrypted column; never logged; rotated on re-registration |
| Local cache encryption | SQLite database encrypted using device keychain (iOS Secure Enclave / Android Keystore) |
| Calendar access (opt-in) | Requires explicit OS permission grant; read-only; user can revoke at any time |
| Code signing | macOS app signed with Developer ID + notarized; Windows app signed with EV certificate |
| Auto-update integrity | Updates verified via SHA-256 hash + signature before applying |

---

## 10. Dependencies

| Dependency | Type | Risk |
|------------|------|------|
| HeadyBuddy web core (headybuddy.org) | Internal | High — Shell wraps this; must be stable |
| HeadyBuddy notification bridge | Internal | High — push notifications require bridge |
| Firebase Cloud Messaging (FCM) | External | Low — stable Google service |
| Apple Push Notification service (APNs) | External | Low — stable; requires Apple Developer Program |
| Tauri (desktop framework) | OSS | Medium — relatively new; active project; fallback to Electron |
| React Native | OSS | Low — stable, mature |
| App Store / Google Play | External | Medium — review processes can delay launch |
| Heady Swarm Covenant | Internal | Low — Shell is a client; not a governed agent |

---

## 11. Phased Rollout

### Phase 1 — Desktop MVP (Weeks 1–6)
- macOS desktop Shell with system tray, global hotkey, and web core embedding.
- Local session cache for instant load.
- Push notifications (OS-level; desktop only).
- Auto-update.

### Phase 2 — Mobile MVP (Weeks 7–12)
- iOS and Android React Native Shell.
- Push notifications via APNs + FCM.
- Offline state display.
- App Store and Google Play submission.

### Phase 3 — Integrations (Weeks 13–18)
- Clipboard integration (desktop).
- File drop (desktop).
- Calendar context read (macOS / iOS, opt-in).
- Windows + Linux desktop packages.
- Notification preferences panel.

### Phase 4 — Enhancement (Post-launch)
- Compact mode.
- Home screen widget (mobile).
- Enterprise MDM support.
- Local LLM exploration.

---

## 12. Success Metrics

| Metric | Target | Window |
|--------|--------|--------|
| Desktop app downloads | 100+ within 30 days of launch | 30 days |
| Mobile app installs | 50+ within 30 days | 30 days |
| Push notification delivery rate | ≥ 99% | Ongoing |
| Daily active use | ≥ 60% of registered users open app daily | 60 days |
| App store rating | ≥ 4.2 stars | 90 days |

---

## 13. Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Tauri vs. Electron: which framework is preferred given Rust skill set? | Platform / Eric | Yes (Phase 1) |
| Is an Apple Developer Program account active for code signing? | Eric | Yes (Phase 1 macOS) |
| Should the mobile app use a separate bundle ID from headybuddy.org, or the same brand? | Eric | Yes (Phase 2 store submission) |
| What notification categories should be supported at launch? | Eric | Yes (Phase 1) |
