# JWT Key Rotation Strategy

This document describes a recommended strategy for rotating JSON Web Token (JWT) signing keys used by the MCP gateway. Regular key rotation limits the damage that can occur if a private key is compromised and helps ensure that long‑lived tokens cannot be abused.

## Goals

* **Confidentiality:** Prevent unauthorized parties from generating valid gateway tokens.
* **Continuity:** Ensure new keys are introduced without downtime and old keys remain valid until expired.
* **Observability:** Provide audit logs for key generation, distribution, and revocation.
* **Automation:** Automate the rotation process to minimise human error.

## Rotation Schedule

| Frequency | Rationale | Action |
|---------|-----------|--------|
| **Every 30 days** | Monthly rotation balances security with operational overhead. Frequent rotations reduce the window of exposure if a key is compromised. | Generate a new RSA key pair. Add the new public key to the JWKS endpoint. Mark the previous key as deprecated but continue to accept it for the token lifetime (e.g., 7 days). Remove keys older than two rotations. |
| **Emergency rotation** | In the event of key compromise or suspicion of compromise. | Immediately generate a new key pair, revoke the compromised key in the JWKS. Force clients to refresh tokens and invalidate all tokens issued with the old key. |

The environment variable `MCP_GATEWAY_JWT_ROTATION_DAYS` may be used by the gateway service to control the rotation cadence. The default value is `30`. When the gateway starts, it will check the age of the current signing key and automatically generate a new one when the age exceeds the threshold.

## Implementation Guidelines

1. **Key Generation and Storage:**
   * Generate keys using a cryptographically secure random number generator (`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096`).
   * Store private keys in a secure secrets manager (e.g., Vault) or Kubernetes Secret. Limit access to the minimal number of services.
   * Expose public keys via the JWKS endpoint `/auth/keys`.

2. **Token Issuance:**
   * The MCP gateway should sign new tokens using the most recently generated private key.
   * Include the `kid` (key ID) in the JWT header so verifiers can select the correct public key from the JWKS.

3. **Grace Period:**
   * Maintain a grace period (e.g., 7 days) during which both the new and previous keys are accepted. This allows clients to continue using previously issued tokens until they expire.

4. **Monitoring and Alerts:**
   * Log key generation events, including timestamps, key IDs, and operator identity.
   * Monitor failed token verifications and raise alerts if they spike after a rotation, indicating clients are still using deprecated keys.

5. **Disaster Recovery:**
   * Retain backups of the last few keys in encrypted storage. In case of an accidental deletion, the gateway can restore previous keys to maintain service continuity.

By following this strategy and automating the rotation workflow, the MCP gateway maintains strong cryptographic hygiene while providing seamless token validation for clients.