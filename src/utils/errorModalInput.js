/**
 * 把 API 包装器抛出的错误归一化为 showErrorModal 入参。
 *
 * 只搬运安全字段（message / error_reason / status / route），不把原始 body 整体带入弹窗；
 * 这样既不会因调用方只传 err.message 而丢掉 error_reason，也不会让凭据字段进入错误通道。
 */
export const toErrorModalInput = (input, fallbackMessage = '操作失败') => {
  if (input === null || input === undefined) return { message: fallbackMessage };
  if (typeof input === 'string') {
    const text = input.trim();
    return { message: text || fallbackMessage };
  }
  const source = input;
  const response = source.response && typeof source.response === 'object' ? source.response : null;
  const body = source.body && typeof source.body === 'object' && !Array.isArray(source.body)
    ? source.body
    : null;
  const reason = body?.error_reason || source.error_reason || body?.error || null;
  const bodyMessage = body && typeof body.message === 'string' ? body.message : null;
  const sourceMessage = typeof source.message === 'string' ? source.message : null;
  const statusValue = source.status ?? response?.status;
  const statusNumber = Number(statusValue);
  const route = source.route || response?.url || '';
  const result = { message: fallbackMessage };
  if (bodyMessage) {
    result.message = {
      message: bodyMessage,
      ...(reason ? { error_reason: String(reason) } : {}),
    };
  } else if (sourceMessage) {
    result.message = reason
      ? { message: sourceMessage, error_reason: String(reason) }
      : sourceMessage;
  } else if (reason) {
    result.message = { error_reason: String(reason) };
  }
  if (Number.isFinite(statusNumber) && statusNumber > 0) result.status = statusNumber;
  if (route) result.route = route;
  return result;
};

export default { toErrorModalInput };
