<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: services/aloha/README.md                                                    ║
<!-- ║  LAYER: root                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# Aloha Service

Express Router microservice for the Aloha Protocol system - an always-on protocol framework that manages system stability, de-optimization, and web baseline requirements.

## Endpoints

### Status & Protocol Endpoints

- **GET /status** - Get Aloha protocol system status
  - Returns: mode, activeSince, protocols, stabilityDiagnosticMode, crash counts, de-opt checks

- **GET /protocol** - Get Aloha protocol configuration
  - Returns: Full Aloha protocol definition from config

- **GET /de-optimization** - Get de-optimization protocol configuration
  - Returns: De-optimization protocol rules and guidelines

- **GET /stability** - Get stability-first protocol configuration
  - Returns: Stability-first protocol requirements

- **GET /priorities** - Get Aloha priorities and no-assist rules
  - Returns: Priority list and areas where assistance is disabled

- **GET /checklist** - Get de-optimization checklist and code rules
  - Returns: Checklist items and code generation rules

- **GET /web-baseline** - Get non-negotiable web baseline requirements
  - Returns: Web baseline requirements (non_negotiable flag set to true)

### Report Endpoints

- **POST /crash-report** - Record a crash or system failure
  - Body: `{ description, context, severity }`
  - Returns: reportId and confirmation

- **POST /de-opt-check** - Record a de-optimization check
  - Body: `{ suggestion, context }`
  - Returns: checkNumber and confirmation

### Layer Management Endpoints

- **GET /layer** - Get current system layer information
  - Returns: current layer, available layers

- **POST /layer/switch** - Switch to a different system layer
  - Body: `{ layer }` - one of: `aloha_first`, `de_optimization_first`, `stability_first`
  - Returns: previousLayer, currentLayer, activeSince

## Dependencies

Initialize the service with:

```javascript
const { router, init, alohaState } = require('./services/aloha');

init({
  alohaProtocol: loadYamlConfig('aloha-protocol.yaml'),
  deOptProtocol: loadYamlConfig('de-optimization-protocol.yaml'),
  stabilityFirst: loadYamlConfig('stability-first.yaml'),
});

app.use('/api/aloha', router);
```

## State Management

The service maintains `alohaState` which tracks:
- Current mode (aloha_first, de_optimization_first, stability_first)
- Protocol list and activation timestamp
- Stability diagnostic mode flag
- Crash report history
- De-optimization check counter

## Protocol Layers

1. **Aloha First** - Default mode with balanced approach
2. **De-Optimization First** - Emphasizes simplicity over speed
3. **Stability First** - Prioritizes system stability above all
