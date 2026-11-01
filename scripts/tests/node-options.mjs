// 各测试入口共用的运行环境；只为当前 Node 支持的选项补兼容设置。
export const WEBSTORAGE_FLAG = '--no-experimental-webstorage'

export function testEnvironment(env = process.env, flags = process.allowedNodeEnvironmentFlags) {
  const result = { ...env }
  const current = result.NODE_OPTIONS || ''
  if (flags?.has?.(WEBSTORAGE_FLAG) && !current.split(/\s+/).includes(WEBSTORAGE_FLAG)) {
    result.NODE_OPTIONS = `${current} ${WEBSTORAGE_FLAG}`.trim()
  }
  return result
}
