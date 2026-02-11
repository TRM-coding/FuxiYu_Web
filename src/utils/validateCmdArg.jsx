// 这个是防止命令注入的工具函数，主要用于验证用户输入的字符串是否安全，特别是那些会被传递给后端命令行工具（如docker run）的参数。它通过检查是否包含危险的字符或关键词来判断输入是否合法。
export function isUnsafeArg(value) {
  if (value == null) return false;
  if (typeof value !== 'string') return false;
  // reject metacharacters and newlines
  const meta = /[;&|`$<>\\\n]/;
  if (meta.test(value)) return true;
  // reject obvious dangerous keywords
  const dangerous = /\b(rm|shutdown|reboot|init|mkfs|dd|curl|wget|nc|ncat|perl|python|bash|sh)\b/i;
  if (dangerous.test(value)) return true;
  // if the value looks like an identifier (no spaces): accept if it matches either the
  // 名称（用户与容器）就严格匹配了。只让字母数字、下划线，禁止其他特殊字符（包括空格）以避免注入风险。
  if (/^\S+$/.test(value) && !(isValidName(value) || isValidImageName(value))) return true;
  return false;
}

// 这个针对用户名、容器名等单纯的标识符，允许字母数字、下划线和连字符，禁止其他特殊字符（包括空格）以避免注入风险
export function isValidName(value) {
  if (typeof value !== 'string') return false;
  return /^[A-Za-z0-9_]+$/.test(value);
}

// 这里是为了镜像名，允许字母数字、下划线、连字符、斜杠和冒号（用于tag），但不允许空格和其他特殊字符
// examples: nginx:latest, registry.example.com/myorg/myimage:tag
export function isValidImageName(value) {
  if (typeof value !== 'string') return false;
  return /^[A-Za-z0-9]+(?:[A-Za-z0-9._\-\/]*)(?::[A-Za-z0-9._\-]+)?$/.test(value);
}

export function anyUnsafe(...values) {
  for (const v of values) {
    if (isUnsafeArg(v)) return true;
  }
  return false;
}
