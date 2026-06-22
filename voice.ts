import request from '@/utils/request'
import { useUserStore } from '@/stores/module/user'

/**
 * 语音问答响应事件类型
 */
export interface VoiceStreamEvent {
  event: string
  data: string
}

/**
 * 语音问答响应数据
 */
export interface VoiceStreamData {
  asr_result?: string
  answer_text?: string
  answer_audio?: string
  error?: string
  audioUrl?: string
  [key: string]: any
}

/**
 * 合并 Base64 音频片段
 */
const mergeBase64Audio = (chunks: string[]): string | null => {
  if (chunks.length === 0) return null
  
  // 直接拼接 Base64 字符串
  const combinedBase64 = chunks.join('')
  
  // 创建 data URL
  return `data:audio/mp3;base64,${combinedBase64}`
}

/**
 * 语音问答接口 (流式)
 */
export const voiceAskStreamAPI = async (
  audioBlob: Blob,
  fileExtension: string = 'webm',
  chatId?: string,
  onEvent?: (event: string, data: VoiceStreamData) => void
): Promise<{ question: string; answer: string; audioUrl: string; chatId?: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const userStore = useUserStore()
      const token = userStore.token
      
      const formData = new FormData()
      formData.append('audio', audioBlob, `recording.${fileExtension}`)

      if (chatId) {
        formData.append('chatId', chatId)
      }

      const response = await fetch('/api/voice/ask-stream', {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''
      let question = ''
      let answer = ''
      let audioBase64Chunks: string[] = []
      let currentEvent = ''
      let isCompleted = false
      const decoder = new TextDecoder('utf-8')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          
          if (trimmedLine === '') {
            currentEvent = ''
            continue
          }
          
          if (trimmedLine.startsWith('event:')) {
            currentEvent = trimmedLine.substring(6).trim()
            console.log('[Voice SSE] event:', currentEvent)
            continue
          }
          
          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.substring(5).trim()
            
            // 处理结束事件
            if (dataStr === 'DONE' || currentEvent === 'DONE' || currentEvent === 'complete') {
              if (!isCompleted) {
                isCompleted = true
                // 流结束，合并 Base64 音频
                let finalAudioUrl = ''
                if (audioBase64Chunks.length > 0) {
                  finalAudioUrl = mergeBase64Audio(audioBase64Chunks) || ''
                  console.log('[Voice] 音频合并完成，URL 长度:', finalAudioUrl.length)
                }
                // 通过回调传出音频 URL
                onEvent?.('complete', { audioUrl: finalAudioUrl })
                
                resolve({
                  question,
                  answer,
                  audioUrl: finalAudioUrl,
                  chatId
                })
              }
              return
            }
            
            // 根据事件类型处理数据
            if (currentEvent === 'asr_result') {
              question = dataStr
              onEvent?.(currentEvent, { asr_result: dataStr })
              console.log('[Voice] ASR结果:', dataStr)
            } 
            else if (currentEvent === 'text' || currentEvent === 'answer_text') {
              answer += dataStr
              onEvent?.('answer_text', { answer_text: dataStr })
              console.log('[Voice] 回答片段:', dataStr)
            }
            else if (currentEvent === 'audio' || currentEvent === 'answer_audio') {
              // 直接收集 Base64 字符串
              audioBase64Chunks.push(dataStr)
              console.log(`[Voice] 累积音频片段 ${audioBase64Chunks.length}, 当前片段长度: ${dataStr.length}`)
              onEvent?.('answer_audio', { answer_audio: dataStr })
            }
            else if (currentEvent === 'error') {
              console.error('[Voice] 语音流错误:', dataStr)
              onEvent?.(currentEvent, { error: dataStr })
              reject(new Error(dataStr))
              return
            }
            else {
              console.log('[Voice] 未处理的事件:', currentEvent, dataStr.substring(0, 100))
            }
          }
        }
      }

      // 流自然结束
      if (!isCompleted) {
        let finalAudioUrl = ''
        if (audioBase64Chunks.length > 0) {
          finalAudioUrl = mergeBase64Audio(audioBase64Chunks) || ''
          console.log('[Voice] 流结束，音频合并完成')
        }
        onEvent?.('complete', { audioUrl: finalAudioUrl })
        
        resolve({
          question,
          answer,
          audioUrl: finalAudioUrl,
          chatId
        })
      }
    } catch (error) {
      console.error('[Voice] 语音流请求错误:', error)
      reject(error)
    }
  })
}

/**
 * 将 Base64 音频转换为可播放的 URL
 */
export const base64ToAudioUrl = (base64: string, mimeType: string = 'audio/mp3'): string => {
  return `data:${mimeType};base64,${base64}`
}

/**
 * 处理语音问答完整流程 (流式)
 */
export const handleVoiceAsk = async (
  audioBlob: Blob,
  fileExtension: string = 'webm',
  chatId?: string,
  onEvent?: (event: string, data: VoiceStreamData) => void
): Promise<{
  question: string
  answer: string
  audioUrl: string
  chatId?: string
}> => {
  return voiceAskStreamAPI(audioBlob, fileExtension, chatId, onEvent)
}

// 音色列表接口
export interface VoiceItem {
  id: number,
  voiceName: string,
  description: string
}

export const getVoiceList = (): Promise<VoiceItem[]> => {
  return request.get('/api/voice/list')
}

// 修改音色接口
export interface ChangeVoiceParams {
  voice_code?: string
  voice_name?: string
  is_enabled?: 0 | 1
  description?: string
}

export const changeVoice = (id: number, params: ChangeVoiceParams) => {
  return request.put(`/api/voice/update/${id}`, params)
}