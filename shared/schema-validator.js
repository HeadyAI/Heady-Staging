function validate(requiredKeys, payload) {
  const missing = requiredKeys.filter(key => payload[key] === undefined);
  return {
    ok: missing.length === 0,
    missing
  };
}

module.exports = { validate };
