<template>
  <div class="live2d-page">
    <div class="live2d-wrap">
      <div ref="containerRef" class="live2d-container"></div>
      <div class="voice-controls">
        <button class="voice-btn" @click="toggleRecording" :class="{ recording: isRecording }" :disabled="isProcessing">
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
      </div>
    </div>

    <div class="controls-panel">
      <div class="control-group">
        <h4>动作</h4>
        <button @click="playMotion('tap_body')">点击身体</button>
        <button @click="playRandomMotion('tap_body')">随机动作</button>
      </div>
      <div class="control-group">
        <h4>表情</h4>
        <button @click="toggleExpression('angry')" :class="{ active: currentExpression === 'angry' }">😠 生气</button>
        <button @click="toggleExpression('blush')" :class="{ active: currentExpression === 'blush' }">😊 害羞</button>
        <button @click="toggleExpression('smile')" :class="{ active: currentExpression === 'smile' }">😄 微笑</button>
        <button @click="toggleExpression('cry')" :class="{ active: currentExpression === 'cry' }">😢 哭泣</button>
      </div>
      <div class="control-group">
        <h4>其他</h4>
        <button @click="toggleOutfit">👔 切换衣服</button>
        <button @click="resetModel">🔄 重置</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { live2dModel } from '@/stores/live2dStore'
import { ref, onMounted, onUnmounted } from 'vue'
import { Application } from '@pixi/app'
import { extensions } from '@pixi/extensions'
import { Ticker, TickerPlugin } from '@pixi/ticker'
import { Live2DModel, MotionPriority, MotionPreloadStrategy } from 'pixi-live2d-display/cubism4'
import { voiceAskAPI, VoiceAnswer } from '@/api/voice'
import { getTextAnswer, base64ToAudioUrl } from '@/api/text'

// 类型定义
interface ExpressionData {
  Parameters?: Array<{ Id: string; Value: number }>
}

interface HitArea {
  includes: (area: string) => boolean
}

const containerRef = ref<HTMLDivElement | null>(null)

const isRecording = ref<boolean>(false)
const isProcessing = ref<boolean>(false)
const currentExpression = ref<string | null>(null)
const inputText = ref<string>('')
const chatId = ref<string>('')

let app: Application | null = null
let model: Live2DModel | null = null
let animationId: number | null = null
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let currentAudio: HTMLAudioElement | null = null

const expressionCache: Record<string, ExpressionData | null> = {}

// 加载表情
const loadExpression = async (name: string): Promise<ExpressionData | null> => {
  if (expressionCache[name]) return expressionCache[name]
  try {
    // ✅ 修正：添加模板字符串的反引号
    const res = await fetch(`/ulvm2_0001/animation/${name}.exp3.json`)
    const data: ExpressionData = await res.json()
    expressionCache[name] = data
    return data
  } catch (e) {
    console.error(`加载表情 ${name} 失败:`, e)
    return null
  }
}

// 重置表情
const resetExpression = (): void => {
  if (!model) return
  const cm = model.internalModel.coreModel
  const params = [
    'ParamBrowLAngle', 'ParamBrowRAngle', 'ParamBrowLForm', 'ParamBrowRForm',
    'ParamEyeLOpen', 'ParamEyeROpen', 'ParamEyeLSmile', 'ParamEyeRSmile',
    'ParamMouthForm', 'ParamMouthOpenY', 'ParamCheek', 'ParamTear',
    'Param80', 'e2_ParamCheek', 'e2_Param4', 'Param520', 'e2_Param10'
  ]
  params.forEach(id => {
    try {
      cm.setParameterValueById(id, 0)
    } catch (e) {}
  })
  try {
    cm.setParameterValueById('ParamEyeLOpen', 1)
    cm.setParameterValueById('ParamEyeROpen', 1)
    cm.setParameterValueById('Param3', 1)
  } catch (e) {}
  currentExpression.value = null
}

// 应用表情
const applyExpression = async (name: string): Promise<void> => {
  if (!model) return
  const exp = await loadExpression(name)
  if (!exp?.Parameters) return
  const cm = model.internalModel.coreModel
  exp.Parameters.forEach(p => {
    try {
      cm.setParameterValueById(p.Id, p.Value)
    } catch (e) {}
  })
  currentExpression.value = name
}

// 切换表情
const toggleExpression = async (name: string): Promise<void> => {
  currentExpression.value === name ? resetExpression() : await applyExpression(name)
}

// 开始录音
const startRecording = async (): Promise<void> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
    })
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/wav'
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    audioChunks = []
    mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(audioChunks, { type: mimeType })
      await sendAudio(blob, mimeType.includes('webm') ? 'webm' : 'wav')
      audioChunks = []
    }
    mediaRecorder.start(100)
    isRecording.value = true
  } catch (err) {
    alert('无法访问麦克风')
  }
}

// 停止录音
const stopRecording = (): void => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
  }
}

// 切换录音
const toggleRecording = (): void => {
  isRecording.value ? stopRecording() : startRecording()
}

// 发送音频
const sendAudio = async (blob: Blob, ext: string): Promise<void> => {
  isProcessing.value = true
  try {
    const res: VoiceAnswer = await voiceAskAPI(blob, ext, chatId.value)
    if (!res.text.success) {
      alert('识别失败')
      return
    }
    if (res.chatId) {
      chatId.value = res.chatId
    }
    console.log('识别问题:', res.text.question)
    console.log('AI回答:', res.text.answer)
    const audioUrl = base64ToAudioUrl(res.audioBase64)
    await playAudioFromUrl(audioUrl)
  } catch (e: any) {
    alert('识别失败: ' + e.message)
  } finally {
    isProcessing.value = false
  }
}

// 播放音频
const playAudioFromUrl = async (audioUrl: string): Promise<void> => {
  if (!model) return
  if (!audioContext) {
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
  }
  if (audioContext.state === 'suspended') await audioContext.resume()
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  currentAudio = new Audio(audioUrl)
  await new Promise<void>((res, rej) => {
    currentAudio!.oncanplaythrough = () => res()
    currentAudio!.onerror = rej
    currentAudio!.load()
  })
  const src = audioContext.createMediaElementSource(currentAudio)
  src.connect(analyser!)
  analyser!.connect(audioContext.destination)
  currentAudio.onended = () => {
    if (animationId) cancelAnimationFrame(animationId)
    forceCloseMouth()
    currentAudio = null
  }
  await currentAudio.play()
  syncMouth()
}

// 强制闭嘴
const forceCloseMouth = (): void => {
  if (!model) return
  const cm = model.internalModel.coreModel
  try {
    cm.setParameterValueById('ParamMouthOpenY', 0)
    cm.update()
  } catch (e) {
    console.warn('闭嘴失败:', e)
  }
}

// 口型同步
const syncMouth = (): void => {
  if (!analyser || !model) return
  const dataArray = new Uint8Array(analyser.frequencyBinCount)
  const cm = model.internalModel.coreModel
  if (animationId) cancelAnimationFrame(animationId)
  let lastUpdate = 0
  let currentOpen = 0
  let targetOpen = 0
  let silenceFrames = 0
  let isSpeaking = false
  const OPEN_THRESH = 40
  const CLOSE_THRESH = 25
  const update = (timestamp: number): void => {
    if (timestamp - lastUpdate < 40) {
      animationId = requestAnimationFrame(update)
      return
    }
    lastUpdate = timestamp
    analyser!.getByteFrequencyData(dataArray)
    const low = dataArray.slice(0, 8)
    const mid = dataArray.slice(8, 16)
    const vol = low.reduce((a, b) => a + b, 0) / low.length * 0.7 + 
                mid.reduce((a, b) => a + b, 0) / mid.length * 0.3
    if (!isSpeaking && vol > OPEN_THRESH) {
      isSpeaking = true
      silenceFrames = 0
    } else if (isSpeaking && vol < CLOSE_THRESH) {
      silenceFrames++
      if (silenceFrames >= 2) isSpeaking = false
    } else if (isSpeaking) {
      silenceFrames = 0
    }
    targetOpen = isSpeaking ? 0.2 + Math.min((vol - CLOSE_THRESH) / 150, 1) * 0.8 : 0
    const speed = targetOpen > currentOpen ? 0.5 : 0.6
    currentOpen += (targetOpen - currentOpen) * speed
    if (currentOpen < 0.01) currentOpen = 0
    if (currentOpen > 0.99) currentOpen = 1
    try {
      cm.setParameterValueById('ParamMouthOpenY', currentOpen)
      if (currentOpen === 0) cm.update()
    } catch (e) {}
    if (currentAudio && !currentAudio.paused && !currentAudio.ended) {
      animationId = requestAnimationFrame(update)
    } else {
      forceCloseMouth()
    }
  }
  animationId = requestAnimationFrame(update)
}

// 播放动作
const playMotion = (g: string): void => {
  model?.motion(g, undefined, MotionPriority.FORCE)
}

const playRandomMotion = (g: string): void => {
  model?.motion(g)
}

// 切换衣服
const toggleOutfit = (): void => {
  if (!model) return
  const cm = model.internalModel.coreModel
  const i1 = cm.getPartIndex('PARTS_01')
  const i2 = cm.getPartIndex('PARTS_02')
  if (i1 !== -1 && i2 !== -1) {
    const on = cm.getPartOpacity(i1) > 0.5
    cm.setPartOpacity(i1, on ? 0 : 1)
    cm.setPartOpacity(i2, on ? 1 : 0)
  }
}

// 重置模型
const resetModel = (): void => {
  if (!model) return
  model.motion('idle', undefined, MotionPriority.IDLE)
  resetExpression()
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  forceCloseMouth()
}

// 文字交互
const TextRecording = async (): Promise<void> => {
  if (!inputText.value.trim()) {
    alert('请输入文字')
    return
  }
  try {
    const res = await getTextAnswer(inputText.value, chatId.value)
    if (!res.text.success) {
      alert('回答失败')
      return
    }
    console.log('问题:', res.text.question)
    console.log('回答:', res.text.answer)
    if (res.audioBase64) {
      const audioUrl = base64ToAudioUrl(res.audioBase64)
      await playAudioFromUrl(audioUrl)
    }
    inputText.value = ''
  } catch (e: any) {
    alert('回答失败: ' + e.message)
  }
}

// 生命周期
onMounted(async () => {
  if (!containerRef.value) return
  extensions.add(TickerPlugin)
  Live2DModel.registerTicker(Ticker)
  app = new Application({ width: 800, height: 800, backgroundAlpha: 0, antialias: true })
  containerRef.value.appendChild(app.view as HTMLCanvasElement)
  try {
    model = await Live2DModel.from('/ulvm2_0001/ulvm2_0001.model3.json', {
      motionPreload: MotionPreloadStrategy.IDLE
    })
    live2dModel.value = model
    app.stage.addChild(model)
    model.x = 400
    model.y = 400
    model.scale.set(0.17)
    model.anchor.set(0.5, 0.5)
    model.on('hit', (areas: HitArea) => {
      if (areas.includes('body')) {
        model!.motion('tap_body', undefined, MotionPriority.NORMAL)
      }
      if (areas.includes('head')) {
        toggleExpression('smile')
      }
    })
  } catch (e) {
    console.error('模型加载失败:', e)
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
  if (app) {
    app.destroy(true, { children: true, texture: true })
    app = null
    model = null
  }
})
</script>

<style scoped>
.live2d-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.live2d-wrap {
  position: relative;
  display: inline-block;
}

.live2d-container {
  width: 800px;
  height: 800px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
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

.text-input {
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-radius: 50px;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.text-input :deep(.el-input__wrapper) {
  border-radius: 25px;
  background: white;
}

.voice-btn {
  padding: 16px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  white-space: nowrap;
}

.voice-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.voice-btn.recording {
  background: linear-gradient(135deg, #f56565 0%, #ed64a6 100%);
  animation: pulse 1.5s infinite;
}

.voice-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.controls-panel {
  display: flex;
  gap: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-group h4 {
  margin: 0 0 5px 0;
  color: #666;
  font-size: 14px;
  text-transform: uppercase;
}

.control-group button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.control-group button:hover {
  background: #f5f5f5;
  border-color: #667eea;
}

.control-group button.active {
  background: #4caf50;
  color: white;
  border-color: #45a049;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>