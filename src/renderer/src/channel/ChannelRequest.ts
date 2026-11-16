import { requestAiTranslation } from './AiChannelRequest'

class ChannelRequest {
  static openaiTranslate = requestAiTranslation
}

/**
 * 代理模式 - api翻译
 *
 * @param type 翻译源类型
 * @param info 翻译源类型
 */
window.api['agentApiTranslate']((info) => {
  ChannelRequest[info.type.toLowerCase() + 'Translate'](info)
})
