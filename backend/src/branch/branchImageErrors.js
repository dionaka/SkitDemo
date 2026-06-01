/** 将火山方舟图生图错误翻译为简短提示 */
function explainImageApiError(message) {
  const msg = String(message || '');
  const lower = msg.toLowerCase();

  if (lower.includes('do not have access') || lower.includes('accessdenied')) {
    return '图生图 API 鉴权失败：请检查 Seedream 接入点 ep- 与 API Key 是否匹配且已开通。';
  }

  if (lower.includes('custom endpoint id')) {
    return '请使用 ep- 开头的推理接入点 ID，不要填 doubao-seedream- 模型名。';
  }

  return msg;
}

module.exports = { explainImageApiError };
