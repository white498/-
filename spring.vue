<template>
  <div class="spring-page">
    <div class="spring-wrap">
      <div ref="containerRef" class="spring-container"></div>
      <!-- <div class="voice-controls">
        <button
          class="voice-btn"
          @click="toggleRecording"
          :class="{ recording: isRecording }"
          :disabled="isProcessing"
        >
          {{ isRecording ? '🔴 停止录音' : '🎤 开始录音' }}
        </button>
        <div v-if="isProcessing" class="processing">
          <span class="spinner"></span>处理中...
        </div>
      </div>
      <div class="text-controls">
        <div class="text-input">
          <el-input
            v-model="inputText"
            placeholder="请输入文字..."
            @keyup.enter="TextRecording"
            clearable
          />
          <el-button type="primary" @click="TextRecording">发送</el-button>
        </div>
      </div> -->
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as PIXI from 'pixi.js-legacy'
import { Live2DModel, MotionPriority, MotionPreloadStrategy } from 'pixi-live2d-display/cubism4'
import { handleVoiceAsk } from '@/api/voice'
import { getTextAnswer, base64ToAudioUrl } from '@/api/text'

const containerRef = ref<HTMLDivElement | null>(null)

const isRecording = ref(false)
const isProcessing = ref(false)
const inputText = ref('')
const chatId = ref('')

let app: PIXI.Application | null = null
let model: Live2DModel | null = null
let animationId: number | null = null
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let currentAudio: HTMLAudioElement | null = null

// ================= 动作 =================
const playMotion = (g: string): void => {
  if (!model) return
  try {
    model.motion(g, undefined, MotionPriority.FORCE)
  } catch (e) {
    console.warn('播放动作失败:', e)
  }
}

// ================= 随机动作 =================
const randomMotion = () => {
  const list = ['haru_g_m01', 'haru_g_m02', 'haru_g_m03', 'haru_g_m04']
  const m = list[Math.floor(Math.random() * list.length)]
  playMotion(m)
}

// ================= 录音 =================
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
      await sendAudio(blob, 'webm')
      audioChunks = []
    }

    mediaRecorder.start()
    isRecording.value = true
    ElMessage.success('开始录音...')
  } catch (error) {
    console.error('录音失败:', error)
    ElMessage.error('无法访问麦克风，请检查权限')
  }
}

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
    isRecording.value = false
    ElMessage.info('录音结束，正在处理...')
  }
}

const toggleRecording = () => {
  if (isProcessing.value) return
  isRecording.value ? stopRecording() : startRecording()
}

// ================= 语音 =================
const sendAudio = async (blob: Blob, ext: string) => {
  isProcessing.value = true
  try {
    const res: any = await handleVoiceAsk(blob, ext, chatId.value)

    if (res.chatId) chatId.value = res.chatId

    randomMotion()

    if (res.audioBase64) {
      const audioUrl = base64ToAudioUrl(res.audioBase64)
      await playAudioFromUrl(audioUrl)
    }
  } catch (error) {
    console.error('语音处理失败:', error)
    ElMessage.error('语音处理失败')
  } finally {
    isProcessing.value = false
  }
}

// ================= 补全音频URL =================
const completeAudioUrl = (url: string): string => {
  if (!url) return ''

  // 清理URL，去掉可能的反引号或多余空格
  const cleanUrl = url.trim().replace(/[`'"]/g, '')

  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl
  }

  if (cleanUrl.startsWith('/audio/')) {
    return window.location.origin + cleanUrl
  }

  if (cleanUrl.startsWith(':8080/')) {
    return window.location.protocol + '//' + window.location.hostname + cleanUrl
  }

  return cleanUrl
}

// ================= 播放 =================
const playAudioFromUrl = async (audioUrl: string) => {
  const fullAudioUrl = completeAudioUrl(audioUrl)

  if (!model) {
    const audio = new Audio(fullAudioUrl)
    await audio.play()
    return
  }

  if (!audioContext) {
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  if (animationId) cancelAnimationFrame(animationId)

  currentAudio = new Audio(fullAudioUrl)

  const src = audioContext.createMediaElementSource(currentAudio)
  src.connect(analyser!)
  analyser!.connect(audioContext.destination)

  currentAudio.onended = () => {
    forceCloseMouth()
  }

  await currentAudio.play()
  syncMouth()
}

// ================= 嘴部同步 =================
const forceCloseMouth = () => {
  if (!model) return
  try {
    model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0)
  } catch (e) {}
}

const syncMouth = () => {
  if (!analyser || !model) return

  const data = new Uint8Array(analyser.frequencyBinCount)
  const cm = model.internalModel.coreModel

  const update = () => {
    if (!currentAudio || currentAudio.paused || currentAudio.ended) {
      forceCloseMouth()
      return
    }
    analyser!.getByteFrequencyData(data)
    const vol = data.reduce((a, b) => a + b, 0) / data.length
    const open = Math.min(vol / 100, 1)
    cm.setParameterValueById('ParamMouthOpenY', open)
    animationId = requestAnimationFrame(update)
  }

  update()
}

// ================= 文本问答 =================
const TextRecording = async () => {
  if (!inputText.value.trim()) return

  isProcessing.value = true
  try {
    const res: any = await getTextAnswer(inputText.value, chatId.value)

    if (res.chatId) chatId.value = res.chatId

    randomMotion()

    if (res.audioBase64) {
      const audioUrl = base64ToAudioUrl(res.audioBase64)
      await playAudioFromUrl(audioUrl)
    }

    inputText.value = ''
  } catch (error) {
    console.error('文本处理失败:', error)
    ElMessage.error('文本处理失败')
  } finally {
    isProcessing.value = false
  }
}

// ================= 初始化模型 =================
onMounted(async () => {
  if (!containerRef.value) return

  try {
    // ✅ 注册 Ticker（必须在创建模型前注册）
    Live2DModel.registerTicker(PIXI.Ticker)

    // ✅ 创建 Application，使用 WebGL 渲染（Live2D 必需）
    app = new PIXI.Application({
      width: 800,
      height: 800,
      backgroundAlpha: 0,
      // ❌ 删除 forceCanvas: true
      // 或者显式设置为 false
      forceCanvas: false,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    containerRef.value.appendChild(app.view as HTMLCanvasElement)

    // ✅ 模型路径 - 使用根目录下的模型文件
    const modelPath = '/spring/haru_greeter_t05.model3.json'

    model = await Live2DModel.from(modelPath, {
      motionPreload: MotionPreloadStrategy.IDLE
    })

    app.stage.addChild(model)

    // ✅ 调整位置和缩放（根据你的模型调整）
    model.x = 400
    model.y = 400  // 改为居中，原来是 550 可能偏下
    model.scale.set(0.2)  // 适当放大，0.2 可能太小
    model.anchor.set(0.5, 0.5)  // 确保锚点在中心

    // ✅ 启用交互
    model.eventMode = 'static'  // PixiJS v7+ 用法
    // 如果是 PixiJS v6，使用：model.interactive = true

    try {
      model.internalModel.coreModel.setPartOpacityById('Part01ArmRB001', 0)
      model.internalModel.coreModel.setPartOpacityById('Part01ArmLB001', 0)
    } catch (e) {}

    model.on('pointertap', () => {
      randomMotion()
    })

    console.log('Live2D 模型加载成功')
    ElMessage.success('模型加载成功')
  } catch (error) {
    console.error('Live2D 模型加载失败:', error)
    ElMessage.error('模型加载失败: ' + (error as Error).message)
  }
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
  // ✅ 先销毁模型，再销毁 app
  if (model) {
    app?.stage?.removeChild(model)
    model.destroy()
    model = null
  }
  if (app) {
    app.destroy(true, { children: true, texture: true, baseTexture: true })
    app = null
  }
})
</script>

<style scoped>
.spring-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.spring-wrap {
  position: relative;
  display: inline-block;
  margin-left:25rem;
}

.spring-container {
  width: 800px;
  height: 800px;
  border-radius: 12px;
  overflow: hidden;
}

.voice-controls {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.text-controls {
  position: absolute;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
}


.processing {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  backdrop-filter: blur(10px);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
