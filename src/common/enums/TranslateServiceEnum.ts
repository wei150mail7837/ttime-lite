/**
 * 翻译服务枚举
 *
 * 精简版仅保留 OpenAI 兼容接口，其余在线渠道已移除
 */
class TranslateServiceEnum {
  /**
   * OpenAI翻译（兼容任意 OpenAI 格式接口，如 Ollama / vLLM / 中转）
   */
  static OPEN_AI = 'OpenAI'
}

export default TranslateServiceEnum
