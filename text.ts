// 文本问答接口
import request from "@/utils/request"
import { useUserStore } from "@/stores/module/user"

export interface TextAnswer {
  text: {
    success: boolean
    question: string
    answer: string
  }
  audioBase64: string
  voice: string
  chatId?: string
}

/**
 * 文本问答响应事件类型
 */
export interface TextStreamEvent {
  event: string
  data: string
}

/**
 * 文本问答响应数据
 */
export interface TextStreamData {
  token?: string // AI 生成的每个文字片段
  complete?: any // 完整回答对象
  audioUrl?: string // 音频 URL
  audioData?: Uint8Array // 音频二进制数据
  [key: string]: any
}

/**
 * 文本问答接口 (流式)
 */
export const getTextAnswerStream = async (
  question: string,
  chatId?: string,
  onEvent?: (event: string, data: TextStreamData) => void
): Promise<{ question: string; answer: string; chatId?: string }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const userStore = useUserStore()
      const token = userStore.token

      const response = await fetch('/api/qa/ask-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ question, chatId })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''
      let answer = ''
      let finalChatId = chatId
      let currentEvent = ''
      const decoder = new TextDecoder('utf-8')

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()

          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim()
            console.log('SSE event type:', currentEvent)
          }
          else if (line.startsWith('data:')) {
            const dataStr = line.substring(5).trim()

            if (dataStr === 'DONE') {
              console.log('Stream completed')
              onEvent?.('complete', { complete: { chatId: finalChatId } })
              resolve({
                question,
                answer,
                chatId: finalChatId
              })
              return
            }

            // 根据事件类型处理数据
            if (currentEvent === 'text' || currentEvent === 'token') {
              // 文字片段
              answer += dataStr
              console.log('Received text chunk:', dataStr)
              onEvent?.('text', { token: dataStr })
            }
            else if (currentEvent === 'audio') {
              // 音频数据 - 将字符串转换为二进制数据
              try {
                // 方法1: 如果数据是 Base64 编码
                if (dataStr.match(/^[A-Za-z0-9+/=]+$/)) {
                  const binaryString = atob(dataStr)
                  const bytes = new Uint8Array(binaryString.length)
                  for (let j = 0; j < binaryString.length; j++) {
                    bytes[j] = binaryString.charCodeAt(j)
                  }
                  onEvent?.('audio', { audioData: bytes })
                }
                // 方法2: 直接作为二进制字符串处理
                else {
                  const bytes = new Uint8Array(dataStr.length)
                  for (let j = 0; j < dataStr.length; j++) {
                    bytes[j] = dataStr.charCodeAt(j) & 0xff
                  }
                  onEvent?.('audio', { audioData: bytes })
                }
                console.log('Received audio data, length:', dataStr.length)
              } catch (e) {
                console.error('解析音频数据失败:', e)
              }
            }
            else if (currentEvent === 'error') {
              console.error('Error event:', dataStr)
              onEvent?.('error', { error: dataStr })
            }
            else if (currentEvent === '' || !currentEvent) {
              // 如果没有 event 行，直接作为 text 处理
              if (dataStr && dataStr !== 'connected' && dataStr !== 'DONE') {
                answer += dataStr
                onEvent?.('text', { token: dataStr })
              }
            }
          }
          else if (line === '') {
            // 空行表示一个事件结束
            currentEvent = ''
          }
        }
      }

      // 如果正常结束但没有 DONE 事件
      if (answer) {
        resolve({
          question,
          answer,
          chatId: finalChatId
        })
      } else {
        reject(new Error('No data received'))
      }
    } catch (error) {
      console.error('Stream error:', error)
      reject(error)
    }
  })
}

/**
 * 文本问答接口（非流式）
 */
export const getTextAnswer = (question: string, chatId?: string): Promise<TextAnswer> => {
  return request.post('/api/qa/ask', { question, chatId })
}

/**
 * Base64 转音频 URL
 */
export const base64ToAudioUrl = (base64: string, mimeType: string = 'audio/mp3'): string => {
  return `data:${mimeType};base64,${base64}`
}

/**
 * 合并音频片段并创建 Blob URL
 */
export const mergeAudioChunks = (chunks: Uint8Array[]): string | null => {
  if (chunks.length === 0) return null

  // 计算总长度
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const combined = new Uint8Array(totalLength)

  // 合并所有片段
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }

  // 创建 Blob URL
  const audioBlob = new Blob([combined], { type: 'audio/mp3' })
  return URL.createObjectURL(audioBlob)
}

/**
 * 处理文本问答（统一入口）
 */
export const handleTextAsk = async (
  question: string,
  chatId?: string,
  onEvent?: (event: string, data: TextStreamData) => void
): Promise<{
  question: string
  answer: string
  success: boolean
  audioUrl: string | null
  chatId?: string
}> => {
  if (onEvent) {
    // 使用流式接口
    let audioChunks: Uint8Array[] = []
    let finalAudioUrl: string | null = null

    const res = await getTextAnswerStream(question, chatId, (event, data) => {
      console.log('Stream event:', event, data)

      if (event === 'text' && data.token) {
        // 透传文字事件
        onEvent('text', { token: data.token })
      }
      else if (event === 'audio' && data.audioData) {
        // 累积音频片段
        audioChunks.push(data.audioData)
        console.log('累积音频片段，当前数量:', audioChunks.length)
      }
      else if (event === 'complete') {
        // 流结束时，合并音频并创建 URL
        if (audioChunks.length > 0) {
          finalAudioUrl = mergeAudioChunks(audioChunks)
          if (finalAudioUrl) {
            console.log('音频合并完成，URL:', finalAudioUrl)
            onEvent('audio', { audioUrl: finalAudioUrl })
          }
        }
        onEvent('complete', data)
      }
      else if (event === 'error') {
        onEvent('error', data)
      }
    })

    return {
      question: res.question,
      answer: res.answer,
      success: true,
      audioUrl: finalAudioUrl,
      chatId: res.chatId
    }
  } else {
    // 使用非流式接口
    const res = await getTextAnswer(question, chatId)

    return {
      question: res.text.question,
      answer: res.text.answer,
      success: res.text.success,
      audioUrl: res.audioBase64 ? base64ToAudioUrl(res.audioBase64) : null,
      chatId: res.chatId || chatId
    }
  }
}

// 获取当前用户的所有历史对话会话列表(带标题)
export interface HistoryTitleList{
  chatId: string,
  preview: string
}
export const getHistoryList=():Promise<HistoryTitleList[]>=>{
return request.get('/api/ai/history/sessions')
}

// 获取具体对话内容
export interface HistoryContent {
  role: string,
  content: string
  audioUrl?: string
}

export const getHistoryContent = (chatId: string): Promise<HistoryContent[]> => {
  return request.get(`/api/ai/history/${chatId}`)
}

// 别名，保持与组件调用一致
export const getChatHistoryList = getHistoryList
export const getChatHistoryDetail = getHistoryContent

// 获取热门问答
export const getHotQuestions = (): Promise<string[]> => {
  return request.get('/api/date/hotwenda')
}
