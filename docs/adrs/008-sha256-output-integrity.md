# ADR-008: SHA-256 Output Integrity Hashing

## Status
Accepted

## Context
AI-generated outputs need integrity verification to detect tampering, ensure reproducibility, and enable audit trails.

## Decision
- All significant outputs are hashed with SHA-256
- Temperature = 0, seed = 42 for deterministic outputs
- Hashes stored alongside outputs in all logs
- Integrity verification available at all API endpoints

## Consequences
- Every output is verifiable
- Deterministic outputs enable reproducibility testing
- Audit trail has cryptographic integrity
- Storage overhead: 64 bytes per hash (minimal)
