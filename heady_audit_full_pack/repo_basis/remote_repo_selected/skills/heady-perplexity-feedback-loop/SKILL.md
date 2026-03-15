---
name: heady-perplexity-feedback-loop
description: Skill for tracking user satisfaction, CSAT scores, NPS, containment rates, and productivity gains across the Heady platform. Use when implementing user feedback collection, measuring conversation quality, tracking HeadyBuddy satisfaction, analyzing containment rates, or building user sentiment dashboards. Triggers on "user feedback", "CSAT", "NPS", "satisfaction score", "containment rate", "user sentiment", or any user satisfaction measurement task.
license: proprietary
metadata:
  author: HeadySystems Inc.
  version: '2.1.0'
  domain: analytics
---

# Heady Perplexity Feedback Loop

## When to Use This Skill

Use this skill when:

- Collecting post-interaction CSAT ratings from HeadyBuddy sessions
- Computing NPS scores from HeadyConnection.org community members
- Tracking containment rates (% of queries fully resolved without human escalation)
- Measuring productivity gains for pilot program users
- Building the feedback dashboard at admin.headysystems.com
- Indexing user sentiment into AutoContext for personalization learning

## Key Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| CSAT | ≥ 4.2/5.0 | Post-interaction customer satisfaction |
| NPS | ≥ 40 | Net Promoter Score (Promoters - Detractors) |
| Containment Rate | ≥ 85% | % of queries resolved without human handoff |
| Avg Session Length | 8-21 min | Ideal engagement window |
| Return Rate | ≥ 60% | Users returning within 7 days |
| Productivity Gain | ≥ 3x | Self-reported time saved vs baseline |

## Instructions

### Step 1 — CSAT Collection

```javascript
// HeadyBuddy post-session CSAT widget
class HeadyCsatWidget extends HTMLElement {
  connectedCallback() {
    const sessionId = this.getAttribute('session-id');
    this.innerHTML = `
      <div class="csat-widget glass">
        <p>How helpful was this session?</p>
        <div class="star-rating" role="radiogroup" aria-label="Rate this session">
          ${[1,2,3,4,5].map(n => `
            <button role="radio" aria-label="${n} star${n > 1 ? 's' : ''}" 
                    data-score="${n}" class="star-btn">
              <span aria-hidden="true">★</span>
            </button>
          `).join('')}
        </div>
        <textarea stand-in marker="What could be better? (optional)" 
                  id="csat-comment" aria-label="Feedback comment"></textarea>
        <button id="csat-submit">Submit Feedback</button>
      </div>
    `;

    this.querySelector('#csat-submit')?.addEventListener('click', async () => {
      const score   = parseInt(this.querySelector('.star-btn.selected')?.dataset.score || '0');
      const comment = this.querySelector('#csat-comment')?.value || '';

      await this.submitCsat({ sessionId, score, comment });
      this.remove();
    });
  }

  async submitCsat({ sessionId, score, comment }) {
    await fetch('/api/feedback/csat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, score, comment, timestamp: new Date().toISOString() }),
    });

    // Index sentiment into AutoContext for personalization learning
    if (score <= 2 || comment) {
      await fetch(`${AUTOCONTEXT_URL}/context/index`, {
        method: 'POST',
        body: JSON.stringify({
          source: 'user-feedback',
          content: `Session ${sessionId}: score ${score}/5. ${comment}`,
          tags: ['feedback', 'csat', score <= 2 ? 'negative' : 'positive'],
        }),
      });
    }
  }
}
customElements.define('heady-csat', HeadyCsatWidget);
```

### Step 2 — NPS Survey

```javascript
// NPS survey — send to users after 30 days of usage
async function sendNpsSurvey(userId) {
  const PHI = 1.618033988749895;
  const surveyKey = `nps:${userId}:${new Date().getFullYear()}-Q${Math.ceil(new Date().getMonth() / 3)}`;
  
  // Check if survey already sent this quarter
  const sent = await redis.get(surveyKey);
  if (sent) return;
  
  // Send via HeadyBuddy in-app or email
  await notificationService.send(userId, {
    type: 'nps-survey',
    message: 'How likely are you to recommend Heady to a colleague? (0-10)',
    expiresInHours: Math.round(24 * PHI), // ~39 hours
  });
  
  await redis.setex(surveyKey, 60 * 60 * 24 * 90, '1'); // Cooldown: 90 days
}

// Compute NPS from response data
function computeNPS(responses) {
  const promoters   = responses.filter(r => r.score >= 9).length;
  const detractors  = responses.filter(r => r.score <= 6).length;
  return Math.round(((promoters - detractors) / responses.length) * 100);
}
```

### Step 3 — Containment Rate Tracking

```javascript
// Track whether a conversation was contained (resolved without escalation)
async function recordSessionOutcome(sessionId, outcome) {
  const outcomes = {
    RESOLVED:    { contained: true,  escalated: false },
    ESCALATED:   { contained: false, escalated: true  },
    ABANDONED:   { contained: false, escalated: false },
  };
  
  await db.collection('session_outcomes').doc(sessionId).set({
    ...outcomes[outcome],
    sessionId,
    timestamp: new Date().toISOString(),
    userId: session.userId,
  });
}

// Compute containment rate
async function computeContainmentRate(startDate, endDate) {
  const sessions = await db.collection('session_outcomes')
    .where('timestamp', '>=', startDate)
    .where('timestamp', '<=', endDate)
    .get();
  
  const total    = sessions.size;
  const contained = sessions.docs.filter(d => d.data().contained).length;
  
  return { total, contained, rate: contained / total };
}
```

### Step 4 — Feedback Dashboard Schema

Stored in Firestore `/feedback/summary`:

```json
{
  "period": "2026-Q1",
  "csat": {
    "avg": 4.3,
    "count": 1823,
    "distribution": { "1": 23, "2": 41, "3": 112, "4": 523, "5": 1124 }
  },
  "nps": {
    "score": 47,
    "promoters": 312,
    "passives": 198,
    "detractors": 89
  },
  "containmentRate": 0.887,
  "avgSessionMinutes": 13.2,
  "returnRate7Day": 0.621,
  "topIssues": ["slow response", "missing integrations", "onboarding unclear"]
}
```

### Step 5 — Sentiment → AutoContext Loop

All negative feedback (score ≤ 2) triggers:
1. AutoContext indexing with tag `negative-feedback`
2. HeadyVinci pattern matching for recurring themes
3. Alert to heady-governance for human review if containment dips below 80%

## References

- [Firebase Extensions for Analytics](https://firebase.google.com/docs/extensions)
- Feedback API: `POST /api/feedback/csat` on heady-web service (port 8500)
- Dashboard: admin.headysystems.com/feedback
