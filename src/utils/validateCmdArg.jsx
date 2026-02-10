// Simple client-side validator to detect suspicious inputs that may be used in shell commands
export function isUnsafeArg(value) {
  if (value == null) return false;
  if (typeof value !== 'string') return false;
  // reject metacharacters and newlines
  const meta = /[;&|`$<>\\\n]/;
  if (meta.test(value)) return true;
  // reject obvious dangerous keywords
  const dangerous = /\b(rm|shutdown|reboot|init|mkfs|dd|curl|wget|nc|ncat|perl|python|bash|sh)\b/i;
  if (dangerous.test(value)) return true;
  // username/container name constraints: only allow alnum, underscore, hyphen
  const namePattern = /^[A-Za-z0-9_\-]+$/;
  // if the value looks like an identifier (no spaces) but fails namePattern, mark unsafe
  if (/^\S+$/.test(value) && !namePattern.test(value)) return true;
  return false;
}

export function anyUnsafe(...values) {
  for (const v of values) {
    if (isUnsafeArg(v)) return true;
  }
  return false;
}
