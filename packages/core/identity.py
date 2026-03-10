from __future__ import annotations

import base64
import binascii
from functools import lru_cache
from typing import List

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
ED25519_PREFIX = b"\xed\x01"


class DIDValidationError(Exception):
    """Raised when a DID cannot be parsed or verified."""


def _b58_decode(value: str) -> bytes:
    if not value:
        raise DIDValidationError("Empty base58 value")

    num = 0
    for char in value:
        try:
            num = num * 58 + BASE58_ALPHABET.index(char)
        except ValueError as exc:
            raise DIDValidationError(f"Invalid base58 character: {char}") from exc

    result = num.to_bytes((num.bit_length() + 7) // 8 or 1, byteorder="big")
    leading_zeroes = len(value) - len(value.lstrip("1"))
    return b"\x00" * leading_zeroes + result


@lru_cache(maxsize=32)
def _ed25519_key_from_did(did: str) -> Ed25519PublicKey:
    if not did.startswith("did:key:"):
        raise DIDValidationError("Only did:key identifiers are supported")

    encoded = did.split("did:key:", maxsplit=1)[1]
    if not encoded.startswith("z"):
        raise DIDValidationError("did:key must be multibase (prefix 'z')")

    multicodec_bytes = _b58_decode(encoded[1:])
    if not multicodec_bytes.startswith(ED25519_PREFIX):
        raise DIDValidationError("Unsupported key type; expected Ed25519")

    key_bytes = multicodec_bytes[len(ED25519_PREFIX) :]
    if len(key_bytes) != 32:
        raise DIDValidationError("Invalid Ed25519 key length")

    return Ed25519PublicKey.from_public_bytes(key_bytes)


def verify_did_signature(
    did: str,
    nonce: str,
    method: str,
    path: str,
    signature_b64: str,
) -> None:
    if not (nonce and signature_b64):
        raise DIDValidationError("Nonce and signature are required")

    try:
        signature = base64.b64decode(signature_b64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise DIDValidationError("Signature is not valid base64") from exc

    payload = f"{method.upper()}|{path}|{nonce}".encode("utf-8")
    public_key = _ed25519_key_from_did(did)

    try:
        public_key.verify(signature, payload)
    except InvalidSignature as exc:
        raise DIDValidationError("Signature verification failed") from exc


def resolve_allowed_dids(manifest: dict) -> List[str]:
    identity_cfg = (manifest or {}).get("identity", {})
    allowed_raw = identity_cfg.get("allowed_dids", [])
    if allowed_raw is None:
        allowed: List[str] = []
    elif isinstance(allowed_raw, (set, tuple)):
        allowed = sorted(str(item) for item in allowed_raw if item)
    elif isinstance(allowed_raw, list):
        allowed = allowed_raw
    else:
        allowed = []
    owner = (manifest or {}).get("owner_did")

    ordered = []
    if owner:
        ordered.append(owner)
    ordered.extend(allowed)

    seen = set()
    unique: List[str] = []
    for did in ordered:
        if did and did not in seen:
            seen.add(did)
            unique.append(did)
    return unique
