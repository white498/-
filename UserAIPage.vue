<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getTipsAPI } from '@/api/user'
import { getHistoryList, getHistoryContent, getHotQuestions } from '@/api/text'
import { useUserStore } from '@/stores/module/user'
import {
  ChatDotRound,
  ArrowDown,
  Plus,
  Lightning,
  Picture,
  Document,
  EditPen,
  VideoPlay,
  Switch,
  Grid,
  Microphone,
  Loading,
  VideoCamera
} from '@element-plus/icons-vue'

import { handleTextAsk } from '@/api/text'
import { handleVoiceAsk } from '@/api/voice'

const router = useRouter()
const userStore = useUserStore()
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
const chatBody = ref<HTMLElement>()
const inputVal = ref('')
const loading = ref(false)
const showToBottom = ref(false)
const isRecording = ref(false)
const chatId = ref('')
const chatHistory = ref<Array<{ id: string; title?: string }>>([])
// 音频播放相关
const currentPlayingMsg = ref<any>(null)
const currentAudio = ref<HTMLAudioElement | null>(null)
// 打字机相关
const isTyping = ref(false)

// 获取欢迎语
const messages = ref<Array<{ role: string; content: string; audioUrl?: string }>>([])

// 截断标题文本（最多显示20个字符）
const truncateTitle = (title: string, maxLength: number = 20) => {
  if (!title) return '新对话'
  if (title.length <= maxLength) return title
  return title.substring(0, maxLength) + '...'
}

const fetchTips = async (forceSet = false) => {
  try {
    const tips = await getTipsAPI()
    // 只在没有历史消息或强制设置时才显示欢迎语
    if (forceSet || (tips && messages.value.length === 0)) {
      messages.value = [{ role: 'ai', content: tips || '你好！我是你的智能旅游助手，有什么可以帮你？' }]
    } else if (!tips && messages.value.length === 0) {
      messages.value = [{ role: 'ai', content: '你好！我是你的智能旅游助手，有什么可以帮你？' }]
    }
  } catch (error) {
    console.error('获取欢迎语失败:', error)
    if (forceSet || messages.value.length === 0) {
      messages.value = [{ role: 'ai', content: '你好！我是你的智能旅游助手，有什么可以帮你？' }]
    }
  }
}

const activeChatId = ref<string>('')
const activeChatIndex = ref(-1)

// 获取历史聊天纪录
let isLoadingHistory = false

const getHistory = async () => {
  if (isLoadingHistory) return
  isLoadingHistory = true

  try {
    const res = await getHistoryList()
    // 后端返回格式: [{ chatId: "xxx", preview: "xxx" }]
    if (Array.isArray(res) && res.length > 0) {
      // 直接使用后端返回的数据，将 chatId 映射为 id，preview 映射为 title
      chatHistory.value = res.map(item => ({
        id: item.chatId,
        title: item.preview || '新对话'
      }))
    } else {
      chatHistory.value = []
    }
  } catch (error) {
    console.log(error)
    ElMessage.error('获取历史聊天记录失败')
    chatHistory.value = []
  } finally {
    isLoadingHistory = false
  }
}

// 获取具体对话内容（适配新的接口格式）
const getHistoryDetail = async (id: string, shouldScroll = true) => {
  try {
    loading.value = true
    const res = await getHistoryContent(id)

    if (Array.isArray(res) && res.length > 0) {
      messages.value = res.map(msg => ({
        role: msg.role,
        content: msg.content,
        audioUrl: msg.audioUrl || undefined
      }))
      chatId.value = id
      activeChatId.value = id
      const index = chatHistory.value.findIndex(chat => chat.id === id)
      if (index !== -1) {
        activeChatIndex.value = index
        const firstUserMsg = res.find(msg => msg.role === 'user')
        if (firstUserMsg && firstUserMsg.content && !chatHistory.value[index].title) {
          const newTitle = firstUserMsg.content.length > 20
            ? firstUserMsg.content.substring(0, 20) + '...'
            : firstUserMsg.content
          chatHistory.value[index].title = newTitle
        }
      }
      console.log('加载历史对话成功，包含音频:', messages.value.filter(m => m.audioUrl).length)
    } else {
      messages.value = [{ role: 'ai', content: '暂无内容' }]
    }
    if (shouldScroll) {
      await nextTick()
      scrollToBottom()
    }
  } catch (error) {
    console.log(error)
    ElMessage.error('获取历史对话内容失败')
    messages.value = [{ role: 'ai', content: '加载失败，请重试' }]
  } finally {
    loading.value = false
  }
}

// 获取热门问题
const getHotQuestion = async () => {
  try {
    const res = await getHotQuestions()
    console.log(res)
  } catch (error) {
    console.log(error)
    ElMessage.error('获取热门问题失败')
  }
}

const send = async () => {
  if (!inputVal.value.trim()) return

  const userQuestion = inputVal.value

  messages.value.push({ role: 'user', content: userQuestion })
  inputVal.value = ''
  loading.value = true
  isTyping.value = true

  try {
    const aiMsgIndex = messages.value.length
    messages.value.push({ role: 'ai', content: '' })

    let fullAnswer = ''

    const res = await handleTextAsk(userQuestion, chatId.value, (event, data) => {
      console.log('收到事件:', event, data)

      switch (event) {
        case 'text':
          if (data.token) {
            fullAnswer += data.token
            messages.value[aiMsgIndex].content = fullAnswer
            nextTick(() => scrollToBottom())
          }
          break
        case 'audio':
          // 收到音频数据时更新
          if (data.audioUrl) {
            // 清理旧的 blob URL
            if (messages.value[aiMsgIndex].audioUrl &&
                messages.value[aiMsgIndex].audioUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(messages.value[aiMsgIndex].audioUrl)
            }
            messages.value[aiMsgIndex].audioUrl = data.audioUrl
            console.log('音频已准备好，可以播放')
          }
          break
        case 'complete':
          console.log('流式完成')
          isTyping.value = false
          break
        case 'error':
          if (data.error) {
            ElMessage.error(data.error)
          }
          break
      }
    })

    if (res.chatId) {
      const isNewChat = !chatId.value
      chatId.value = res.chatId
      activeChatId.value = res.chatId

      if (isNewChat) {
        await getHistory()
        const newChatIndex = chatHistory.value.findIndex(chat => chat.id === res.chatId)
        if (newChatIndex !== -1) {
          const newTitle = userQuestion.length > 20 ? userQuestion.substring(0, 20) + '...' : userQuestion
          chatHistory.value[newChatIndex].title = newTitle
          activeChatIndex.value = newChatIndex
        } else {
          const newTitle = userQuestion.length > 20 ? userQuestion.substring(0, 20) + '...' : userQuestion
          chatHistory.value.unshift({
            id: res.chatId,
            title: newTitle
          })
          activeChatIndex.value = 0
        }
      }
    }

    // 更新最终的 AI 消息
    if (res.audioUrl && !messages.value[aiMsgIndex].audioUrl) {
      messages.value[aiMsgIndex].audioUrl = res.audioUrl
    }

  } catch (error: any) {
    console.error('发送失败:', error)
    ElMessage.error(error.message || '发送失败')
  } finally {
    loading.value = false
    isTyping.value = false
    await nextTick()
    scrollToBottom()
  }
}

const newChat = () => {
  // 清理所有 blob URL
  messages.value.forEach(msg => {
    if (msg.audioUrl && msg.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(msg.audioUrl)
    }
  })
  messages.value = []
  chatId.value = ''
  activeChatId.value = ''
  activeChatIndex.value = -1
  // 清除保存的当前对话ID
  localStorage.removeItem('currentChatId')
  // 新建对话时获取欢迎语
  fetchTips(true)
}

const switchChat = async (index: number) => {
  if (loading.value) return
  const selectedChat = chatHistory.value[index]
  if (selectedChat && selectedChat.id) {
    activeChatIndex.value = index
    activeChatId.value = selectedChat.id
    await getHistoryDetail(selectedChat.id)
  }
}

const scrollToBottom = () => {
  if (chatBody.value) {
    chatBody.value.scrollTop = chatBody.value.scrollHeight
  }
}

// 保存当前对话到localStorage
const saveCurrentChat = () => {
  if (chatId.value) {
    localStorage.setItem('currentChatId', chatId.value)
    console.log('保存当前对话ID:', chatId.value)
  }
}

// 恢复上次的对话
const restoreLastChat = async () => {
  const lastChatId = localStorage.getItem('currentChatId')
  console.log('尝试恢复对话ID:', lastChatId)
  console.log('当前历史列表:', chatHistory.value.map(c => c.id))

  if (lastChatId && chatHistory.value.some(chat => chat.id === lastChatId)) {
    // 如果上次的对话ID存在于历史列表中，就加载它
    const index = chatHistory.value.findIndex(chat => chat.id === lastChatId)
    if (index !== -1) {
      activeChatIndex.value = index
      activeChatId.value = lastChatId
      await getHistoryDetail(lastChatId)
      console.log('恢复上次对话成功:', lastChatId)
      return true
    }
  }
  return false
}

onMounted(async () => {
  if (!chatBody.value) return

  chatBody.value.addEventListener('scroll', () => {
    const dom = chatBody.value!
    const isNearBottom = dom.scrollHeight - dom.scrollTop - dom.clientHeight < 100
    showToBottom.value = !isNearBottom
  })

  getHotQuestion()

  // 先加载历史记录
  await getHistory()

  // 历史记录加载完成后，尝试恢复上次的对话
  const restored = await restoreLastChat()

  if (!restored) {
    // 如果没有恢复任何对话，检查是否有历史对话
    if (chatHistory.value.length > 0) {
      // 有历史对话，加载最新的
      const latestChat = chatHistory.value[0]
      if (latestChat && latestChat.id) {
        activeChatIndex.value = 0
        activeChatId.value = latestChat.id
        messages.value = []
        await getHistoryDetail(latestChat.id)
        console.log('加载最新对话:', latestChat.id)
      }
    } else {
      // 没有历史记录，显示欢迎语
      await fetchTips(true)
    }
  }
})

// 监听chatId变化，保存到localStorage
watch(chatId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    localStorage.setItem('currentChatId', newId)
    console.log('watch保存对话ID:', newId)
  }
})

onUnmounted(() => {
  stopCurrentVoice()
  // 清理所有 blob URL
  messages.value.forEach(msg => {
    if (msg.audioUrl && msg.audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(msg.audioUrl)
    }
  })
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  // 保存当前对话
  saveCurrentChat()
})

const goUserPage = () => {
  router.push('/userInfo')
}

// 停止当前播放的语音
const stopCurrentVoice = () => {
  if (currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value.currentTime = 0
    currentAudio.value.onended = null
    currentAudio.value.onerror = null
    currentAudio.value.src = ''
    currentAudio.value.load()
  }
  currentAudio.value = null
  currentPlayingMsg.value = null
}

// 补全音频URL
const completeAudioUrl = (url: string): string => {
  if (!url) return ''

  // 清理URL，去掉可能的反引号或多余空格
  const cleanUrl = url.trim().replace(/[`'"]/g, '')

  // 如果URL已经是完整的，直接返回
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl
  }

  // 如果URL以 /audio/ 开头，补充完整的服务器地址
  if (cleanUrl.startsWith('/audio/')) {
    return window.location.origin + cleanUrl
  }

  // 如果URL以 :8080 开头，说明缺少协议和主机名
  if (cleanUrl.startsWith(':8080/')) {
    return window.location.protocol + '//' + window.location.hostname + cleanUrl
  }

  return cleanUrl
}

// 播放语音
const playVoice = async (msg: any) => {
  // 如果正在播放当前消息，则停止播放
  if (currentPlayingMsg.value === msg) {
    stopCurrentVoice()
    return
  }

  stopCurrentVoice()

  // 检查是否有音频URL
  if (!msg.audioUrl) {
    ElMessage.warning('暂无可播放的音频')
    return
  }

  // 补全音频URL
  const fullAudioUrl = completeAudioUrl(msg.audioUrl)
  console.log('完整音频URL:', fullAudioUrl)

  if (!fullAudioUrl) {
    ElMessage.warning('音频URL无效')
    return
  }

  // 标记当前播放的消息
  currentPlayingMsg.value = msg

  try {
    const audio = new Audio(fullAudioUrl)
    currentAudio.value = audio

    audio.onended = () => {
      stopCurrentVoice()
    }

    audio.onerror = () => {
      stopCurrentVoice()
    }

    await audio.play()
  } catch (error: any) {
    console.error('播放音频失败:', error)
    // 检查是否是网络连接问题
    if (error.message && error.message.includes('ERR_CONNECTION_REFUSED')) {
      ElMessage.warning('音频服务暂时不可用，请检查后端服务是否启动')
    } else if (error.message && error.message.includes('NotSupportedError')) {
      ElMessage.warning('浏览器不支持该音频格式')
    } else {
      // 其他错误静默处理，不显示提示框
    }
    stopCurrentVoice()
  }
}

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []

const toggleRecording = async () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      audioChunks = []
      await sendAudio(blob)
    }

    mediaRecorder.start()
    isRecording.value = true
    ElMessage.success('开始录音...')
  } catch (error) {
    ElMessage.error('无法访问麦克风，请检查权限设置')
    console.error('录音错误:', error)
  }
}

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    isRecording.value = false
    ElMessage.success('录音结束，正在处理...')
  }
}

const sendAudio = async (blob: Blob) => {
  loading.value = true
  const userMsgIndex = messages.value.length
  messages.value.push({ role: 'user', content: '🎤 语音消息' })

  try {
    // 创建 AI 消息对象用于流式更新
    const aiMsgIndex = messages.value.length
    messages.value.push({ role: 'ai', content: '' })

    let finalAnswer = ''
    let finalAudioUrl: string | null = null

    const res = await handleVoiceAsk(blob, 'webm', chatId.value, (event, data) => {
      console.log('语音事件收到:', event, data)

      if (event === 'asr_result') {
        // 更新用户消息为识别的文本
        if (data.asr_result) {
          messages.value[userMsgIndex].content = data.asr_result
        }
      }
      else if (event === 'answer_text') {
        // 流式更新 AI 回答
        if (data.answer_text) {
          finalAnswer += data.answer_text
          messages.value[aiMsgIndex].content = finalAnswer
          nextTick(() => scrollToBottom())
        }
      }
      else if (event === 'complete') {
        // 流结束时接收音频 URL
        if (data.audioUrl) {
          finalAudioUrl = data.audioUrl
          console.log('收到音频 URL:', finalAudioUrl?.substring(0, 100))
        }
      }
      else if (event === 'error') {
        if (data.error) {
          ElMessage.error(data.error)
        }
      }
    })

    if (res.chatId) {
      const isNewChat = !chatId.value
      chatId.value = res.chatId

      if (isNewChat) {
        await getHistory()
      }
    }

    // 使用回调中的音频 URL
    const audioUrl = finalAudioUrl || res.audioUrl

    // 更新最终的 AI 消息
    messages.value[aiMsgIndex] = {
      role: 'ai',
      content: res.answer || finalAnswer,
      audioUrl: audioUrl
    }

    if (audioUrl) {
      console.log('语音问答完成，音频已准备好')
    }
  } catch (error: any) {
    console.error('语音发送失败:', error)
    ElMessage.error(error.message || '语音处理失败')
    messages.value.splice(userMsgIndex, messages.value.length - userMsgIndex)
  } finally {
    loading.value = false
    await nextTick()
    scrollToBottom()
  }
}
</script>

<template>
  <!-- template 部分保持不变 -->
  <div class="ai-chat-page">
    <!-- 左侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <el-button type="primary" block @click="newChat">新对话</el-button>
      </div>

      <div class="history-list">
        <div class="history-title">历史对话</div>
        <div
          class="history-item"
          :class="{ active: activeChatIndex === index }"
          v-for="(chat, index) in chatHistory"
          :key="chat.id"
          @click="switchChat(index)"
        >
          <el-icon><ChatDotRound /></el-icon>
          <span class="chat-name" :title="chat.title">{{ truncateTitle(chat.title, 20) }}</span>
        </div>
      </div>

      <!-- 左下角圆形头像 -->
      <div class="sidebar-bottom">
        <div class="user-avatar" @click="goUserPage">
          <img :src="userStore.user?.avatar || defaultAvatar" alt="头像" />
        </div>
        <span class="name">{{ userStore.user?.name || '游客账号' }}</span>
      </div>
    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-wrap">
      <div class="chat-header">
        <h2>智能旅游助手</h2>
      </div>

      <div class="chat-body" ref="chatBody">
        <div
          class="msg-item"
          :class="msg.role === 'user' ? 'user' : 'ai'"
          v-for="(msg, i) in messages"
          :key="i"
        >
          <div class="avatar" v-if="msg.role === 'ai'">🤖</div>
          <div class="msg-content">
            <div class="msg-box" :class="{ typing: isTyping && i === messages.length - 1 && msg.role === 'ai' }">
              {{ msg.content }}
            </div>
            <div
              v-if="msg.role === 'ai' && msg.audioUrl"
              class="voice-play"
              :class="{ playing: currentPlayingMsg === msg }"
              @click="playVoice(msg)"
            >
              <el-icon><VideoPlay /></el-icon>
              <span>{{ currentPlayingMsg === msg ? '播放中...' : '语音朗读' }}</span>
            </div>
          </div>
          <div class="avatar user-avatar" v-if="msg.role === 'user'">
            <img :src="userStore.user?.avatar || defaultAvatar" alt="用户头像" />
          </div>
        </div>
      </div>

      <!-- 跳到最底部箭头 -->
      <div class="to-bottom" @click="scrollToBottom" v-show="showToBottom">
        <el-icon><ArrowDown /></el-icon>
      </div>

      <!-- 底部区域 -->
      <div class="bottom-area">
        <div class="input-container">
          <div class="input-card">
            <el-input
              v-model="inputVal"
              type="textarea"
              :rows="3"
              placeholder="发消息..."
              resize="none"
              @keydown.enter.prevent="send"
              :disabled="loading"
            />

            <!-- 底部工具栏 -->
            <div class="toolbar">
              <div class="toolbar-right">
                <el-button
                  type="primary"
                  circle
                  @click="toggleRecording"
                  :class="{ recording: isRecording }"
                  :disabled="loading"
                >
                  <el-icon v-if="!isRecording"><Microphone /></el-icon>
                  <el-icon v-else><Loading /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 样式保持不变 */
.ai-chat-page {
  display: flex;
  width: 100%;
  height: 100vh;
  background: #f5f6f7;
}

.sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.sidebar-header {
  margin-bottom: 16px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
}

.history-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.2s;
  overflow: hidden;
}

.history-item:hover {
  background: #f5f5f5;
}

.history-item.active {
  background: #e8f3ff;
  color: #1677ff;
}

.chat-name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.sidebar-bottom {
  padding-top: 16px;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
}

.name {
  font-size: 14px;
  color: #333;
}

.chat-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.chat-header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.chat-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.chat-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #f5f6f7;
}

.msg-item {
  display: flex;
  margin-bottom: 20px;
}

.msg-item.user {
  flex-direction: row-reverse;
}

.msg-item.user .avatar {
  margin-right: 0;
  margin-left: 12px;
}

.msg-item.user .msg-content {
  align-items: flex-end;
}

.msg-item.user .msg-box {
  background: #1677ff;
  color: #fff;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e6f4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar.user-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.msg-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg-box {
  max-width: 70%;
  background: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  line-height: 1.6;
  color: #333;
  word-break: break-word;
}

.msg-box.typing {
  border-right: 2px solid #1677ff;
  animation: blink 0.7s step-end infinite;
}

@keyframes blink {
  0%, 100% { border-color: transparent; }
  50% { border-color: #1677ff; }
}

.voice-play {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #667eea;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
  width: fit-content;
}

.voice-play:hover {
  background-color: rgba(102, 126, 234, 0.1);
}

.voice-play .el-icon {
  font-size: 14px;
}

.voice-play.playing {
  background-color: rgba(102, 126, 234, 0.15);
  color: #1677ff;
  animation: pulse-text 1.5s infinite;
}

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.to-bottom {
  position: absolute;
  bottom: 200px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 99;
  transition: all 0.3s;
}

.to-bottom:hover {
  transform: translateX(-50%) translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.bottom-area {
  position: relative;
  padding: 0 24px 24px;
  background: #f5f6f7;
  display: flex;
  justify-content: center;
}

.input-container {
  width: 100%;
  max-width: 800px;
  display: flex;
  justify-content: center;
}

.input-card {
  width: 100%;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 16px;
  border: 1px solid #e8e8e8;
}

.input-card :deep(.el-textarea__inner) {
  border: none;
  resize: none;
  padding: 0;
  font-size: 15px;
  color: #333;
  background: transparent;
  box-shadow: none;
}

.input-card :deep(.el-textarea__inner::placeholder) {
  color: #999;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.toolbar-right {
  display: flex;
}

.toolbar-right .el-button {
  width: 36px;
  height: 36px;
  background: #1677ff;
  border-color: #1677ff;
}

.toolbar-right .el-button:hover:not(:disabled) {
  background: #4096ff;
  border-color: #4096ff;
}

.toolbar-right .el-button.recording {
  background: linear-gradient(135deg, #ff6b8b 0%, #ff7a9c 100%);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 107, 139, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(255, 107, 139, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 107, 139, 0); }
}
</style>
