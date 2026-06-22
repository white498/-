<template>
  <div class="spring-page">
    <div class="spring-wrap">
      <div ref="containerRef" class="spring-container"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, defineExpose } from 'vue'
import { ElMessage } from 'element-plus'
import * as PIXI from 'pixi.js-legacy'
import { Live2DModel, MotionPriority, MotionPreloadStrategy } from 'pixi-live2d-display/cubism4'

const containerRef = ref<HTMLDivElement | null>(null)

const isRecording = ref(false)
const isProcessing = ref(false)
const inputText = ref('')
const chatId = ref('')

// 控制说话状态
const isSpeaking = ref(false)

let app: PIXI.Application | null = null
let model: Live2DModel | null = null
let mouthAnimationId: number | null = null
let motionTimerId: number | null = null
let currentAudio: HTMLAudioElement | null = null

// 音频分析相关
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let audioSource: MediaElementAudioSourceNode | null = null

// 嘴型平滑过渡相关
let targetMouthOpen = 0
let currentMouthOpen = 0

// 动作循环相关
const speakingMotions = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06']
let currentMotionIndex = 0
let isAudioPlaying = false
let animationStartTime = 0

// 自动切换动作相关
// TapBody组有5个动作(m01-m05)，Speaking组有21个动作(m06-m26)
const tapBodyMotionsCount = 5
const speakingMotionsCount = 21
let currentIdleMotionIndex = 0
let autoMotionTimerId: number | null = null
const AUTO_MOTION_INTERVAL = 10000 // 每5秒切换一次动作

// ================= 动作 =================
const randomMotion = (): void => {
  if (!model || isSpeaking.value) return
  const motions = ['Idle', 'Tap', 'Flick', 'Shake']
  const randomMotion = motions[Math.floor(Math.random() * motions.length)]
  try {
    model.motion(randomMotion, undefined, MotionPriority.NORMAL)
  } catch (e) {
    console.warn('随机动作失败:', e)
  }
}

// ================= 自动切换动作 =================
const playAutoMotion = (): void => {
  if (!model || isSpeaking.value) return

  try {
    // 计算当前应该播放的动作
    // 前5个动作使用TapBody组，后21个动作使用Speaking组
    const totalMotions = tapBodyMotionsCount + speakingMotionsCount
    const motionIndex = currentIdleMotionIndex % totalMotions

    let groupName: string
    let motionIndexInGroup: number

    if (motionIndex < tapBodyMotionsCount) {
      // 使用TapBody组
      groupName = 'TapBody'
      motionIndexInGroup = motionIndex
    } else {
      // 使用Speaking组
      groupName = 'Speaking'
      motionIndexInGroup = motionIndex - tapBodyMotionsCount
    }

    console.log(`播放动作: ${groupName}[${motionIndexInGroup}]`)

    // 使用动作组名称和索引播放动作
    model.motion(groupName, motionIndexInGroup, MotionPriority.NORMAL)

    // 更新索引，指向下一个动作
    currentIdleMotionIndex++

    // 设置定时器，在指定时间后播放下一个动作
    autoMotionTimerId = window.setTimeout(() => {
      playAutoMotion()
    }, AUTO_MOTION_INTERVAL)
  } catch (e) {
    console.warn('自动切换动作失败:', e)
  }
}

// ================= 停止自动切换动作 =================
const stopAutoMotion = (): void => {
  if (autoMotionTimerId) {
    clearTimeout(autoMotionTimerId)
    autoMotionTimerId = null
  }
}

// ================= 正视前方 =================
const lookStraight = (): void => {
  if (!model) return
  try {
    // 设置头部角度为0，使模型正视前方
    model.internalModel.coreModel.setParameterValueById('ParamAngleX', 0)
    model.internalModel.coreModel.setParameterValueById('ParamAngleY', 0)
    model.internalModel.coreModel.setParameterValueById('ParamAngleZ', 0)

    // 设置身体角度为0，使身体也正视前方
    model.internalModel.coreModel.setParameterValueById('ParamBodyAngleX', 0)
    model.internalModel.coreModel.setParameterValueById('ParamBodyAngleY', 0)
    model.internalModel.coreModel.setParameterValueById('ParamBodyAngleZ', 0)

    // 设置眼球位置为0，使眼球正视前方
    model.internalModel.coreModel.setParameterValueById('ParamEyeBallX', 0)
    model.internalModel.coreModel.setParameterValueById('ParamEyeBallY', 0)
  } catch (e) {
    console.warn('设置正视前方失败:', e)
  }
}

// ================= 播放说话动作 =================
const playSpeakingMotion = (): void => {
  if (!model || !isSpeaking.value) return
  try {
    // 循环播放不同的说话动作，增加自然感
    const motionGroup = speakingMotions[currentMotionIndex % speakingMotions.length]
    currentMotionIndex++

    // 使用NORMAL优先级，允许其他动作穿插
    model.motion('Speaking', motionGroup, MotionPriority.NORMAL)

    // 动作结束后立即播放下一个，实现连续说话效果
    scheduleNextMotion()
  } catch (e) {
    console.warn('播放说话动作失败:', e)
  }
}

// ================= 调度下一个说话动作 =================
const scheduleNextMotion = (): void => {
  if (!isSpeaking.value) return

  // 动作之间间隔很短（300-800ms），实现连续说话效果
  const delay = 300 + Math.random() * 500

  motionTimerId = window.setTimeout(() => {
    if (isSpeaking.value && model) {
      playSpeakingMotion()
    }
  }, delay)
}

// ================= 补全音频URL =================
const completeAudioUrl = (url: string): string => {
  if (!url) return ''

  // 清理URL，去掉可能的反引号或多余空格
  let cleanUrl = url.trim().replace(/[`'"]/g, '')

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

// ================= 播放音频 =================
const playAudioFromUrl = async (audioUrl: string) => {
  const fullAudioUrl = completeAudioUrl(audioUrl)

  if (!model) {
    const audio = new Audio(fullAudioUrl)
    audio.crossOrigin = 'anonymous'
    await audio.play()
    return
  }

  // 停止当前播放的音频
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
  }

  // 清理之前的音频源连接
  if (audioSource) {
    audioSource.disconnect()
    audioSource = null
  }

  // 清理之前的动画和定时器
  if (mouthAnimationId) {
    cancelAnimationFrame(mouthAnimationId)
    mouthAnimationId = null
  }
  if (motionTimerId) {
    clearTimeout(motionTimerId)
    motionTimerId = null
  }

  // 重置嘴型参数
  targetMouthOpen = 0
  currentMouthOpen = 0
  isAudioPlaying = true
  animationStartTime = performance.now()

  // 暂停Idle动作，防止它覆盖我们的嘴型控制
  try {
    model.motion('Idle', undefined, MotionPriority.FORCE)
    // 通过播放一个空的/瞬时的动作来中断Idle
  } catch (e) {
    console.warn('暂停Idle动作失败:', e)
  }

  // 创建音频元素
  currentAudio = new Audio(fullAudioUrl)

  // 设置crossOrigin以便使用AudioContext分析（需要后端CORS支持）
  currentAudio.crossOrigin = 'anonymous'

  // 初始化AudioContext
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
  }

  // 如果AudioContext被挂起，恢复它
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  // 监听音频结束
  const audioEndPromise = new Promise<void>((resolve) => {
    currentAudio!.onended = () => {
      isAudioPlaying = false
      // 平滑关闭嘴型
      smoothCloseMouth()
      resolve()
    }

    currentAudio!.onerror = (e) => {
      console.error('音频播放错误:', e)
      isAudioPlaying = false
      smoothCloseMouth()
      resolve()
    }
  })

  // 先加载音频，确保可以正确获取时长
  await new Promise<void>((resolve) => {
    currentAudio!.onloadedmetadata = () => {
      console.log('音频加载完成，时长:', currentAudio!.duration)
      resolve()
    }
    currentAudio!.load()
  })

  // 创建音频源并连接到分析器
  audioSource = audioContext.createMediaElementSource(currentAudio)
  audioSource.connect(analyser!)
  analyser!.connect(audioContext.destination)

  // 开始播放
  await currentAudio.play()

  // 启动嘴型同步（使用真正的音频分析）
  startMouthSync()

  // 等待音频播放完成
  await audioEndPromise
}

// ================= 启动嘴型同步（使用真实音频分析） =================
const startMouthSync = () => {
  if (!model || !currentAudio || !analyser) {
    console.warn('startMouthSync: model, currentAudio or analyser is null')
    return
  }

  const cm = model.internalModel.coreModel

  // 创建频率数据数组
  const frequencyData = new Uint8Array(analyser.frequencyBinCount)

  // 定义最小和最大张嘴度
  const minMouthOpen = 0.25  // 提高最小张嘴度，确保持续张开
  const maxMouthOpen = 0.92  // 最大张开

  // 记录上一帧的音量，用于平滑
  let lastVolume = 0

  // 记录连续安静帧数
  let silentFrames = 0

  // 记录音频播放开始时间
  const startTime = Date.now()

  // 音频开始时立即张开嘴巴（避免启动延迟）
  cm.setParameterValueById('ParamMouthOpenY', 0.3)
  currentMouthOpen = 0.3

  const updateMouth = () => {
    // 检查是否需要停止
    if (!currentAudio || !isAudioPlaying) {
      return
    }

    // 检查音频是否已结束
    if (currentAudio.ended) {
      return
    }

    try {
      // 使用AnalyserNode获取实时音频频率数据
      analyser!.getByteFrequencyData(frequencyData)

      // 计算整体音量（使用更多频率数据，不只是低频）
      let sum = 0
      const sampleCount = Math.floor(frequencyData.length * 0.7) // 增加采样范围
      for (let i = 0; i < sampleCount; i++) {
        // 对人声频率范围给予更高权重
        const midFreqStart = Math.floor(sampleCount * 0.2)
        const midFreqEnd = Math.floor(sampleCount * 0.5)
        let weight = 1.0
        if (i >= midFreqStart && i <= midFreqEnd) {
          weight = 1.5 // 人声主要在这个范围
        } else if (i < midFreqStart) {
          weight = 0.8
        } else {
          weight = 0.6
        }
        sum += frequencyData[i] * weight
      }

      // 计算平均音量（0-255）
      let avgVolume = sum / sampleCount

      // 添加轻微的抖动，让安静时也有微动
      avgVolume = Math.max(avgVolume, 10 + Math.random() * 8)

      // 降低平滑因子，让响应更快
      const volumeSmoothFactor = 0.25
      avgVolume = lastVolume * (1 - volumeSmoothFactor) + avgVolume * volumeSmoothFactor
      lastVolume = avgVolume

      // 归一化到 0-1 范围
      let normalizedVolume = avgVolume / 255

      // 应用曲线调整，让小声也能有明显张嘴效果
      normalizedVolume = Math.pow(normalizedVolume, 0.3)

      // 检测是否处于说话状态
      const isSpeakingNow = normalizedVolume > 0.06

      if (isSpeakingNow) {
        silentFrames = 0
      } else {
        silentFrames++
      }

      // 设置音量阈值，低于阈值时保持基础张开度
      // 只有连续很多帧安静才会慢慢闭合
      if (normalizedVolume < 0.04) {
        // 连续安静超过60帧（约1秒）才开始降低张开度
        // 增加阈值，避免过早闭嘴
        if (silentFrames > 60) {
          // 非常缓慢地降低，保持说话状态更久
          const decayFactor = Math.max(0.5, 1 - (silentFrames - 60) / 120)
          normalizedVolume = 0.2 * decayFactor
        } else {
          // 短时间安静，保持说话状态的张开度
          normalizedVolume = 0.3
        }
      }

      // 音频刚开始播放时（前0.5秒），强制保持一定的张开度
      const elapsed = Date.now() - startTime
      if (elapsed < 500) {
        normalizedVolume = Math.max(normalizedVolume, 0.25 + (500 - elapsed) / 2000)
      }

      // 映射到嘴型张开范围
      let targetOpen = minMouthOpen + normalizedVolume * (maxMouthOpen - minMouthOpen)

      // 确保在范围内
      targetOpen = Math.min(maxMouthOpen, Math.max(0.15, targetOpen))

      // 降低平滑因子，让响应更快
      const smoothFactor = 0.25
      currentMouthOpen = currentMouthOpen * (1 - smoothFactor) + targetOpen * smoothFactor

      // 应用嘴型参数
      cm.setParameterValueById('ParamMouthOpenY', currentMouthOpen)

      // 强制设置参数多次，确保覆盖Idle动作的影响
      // Idle动作可能在我们设置后再次修改参数，所以我们多设置几次
      requestAnimationFrame(() => {
        if (model && isAudioPlaying) {
          try {
            model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', currentMouthOpen)
          } catch (e) {}
        }
      })

      // 再设置一次，确保在所有动作更新之后生效
      setTimeout(() => {
        if (model && isAudioPlaying) {
          try {
            model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', currentMouthOpen)
          } catch (e) {}
        }
      }, 0)

      // 智能眨眼：在说话过程中随机眨眼，让表情更自然
      // 眨眼概率随音量（嘴型开口度）增加而略微增加
      const blinkProbability = 0.003 + currentMouthOpen * 0.01
      if (Math.random() < blinkProbability) {
        // 快速眨眼（闭眼）
        cm.setParameterValueById('ParamEyeLOpen', 0)
        cm.setParameterValueById('ParamEyeROpen', 0)

        // 在 100-150ms 后恢复睁眼
        setTimeout(() => {
          if (model && isAudioPlaying) {
            try {
              cm.setParameterValueById('ParamEyeLOpen', 1)
              cm.setParameterValueById('ParamEyeROpen', 1)
            } catch (e) {}
          }
        }, 100 + Math.random() * 50)
      }

      // 添加轻微的头部晃动，让说话更生动（可选）
      if (Math.random() < 0.02 && currentMouthOpen > 0.3) {
        const headSway = (Math.sin(Date.now() / 1000 * 1.5) * 2)
        try {
          cm.setParameterValueById('ParamAngleX', headSway)
          setTimeout(() => {
            if (model && isAudioPlaying) {
              try {
                cm.setParameterValueById('ParamAngleX', 0)
              } catch (e) {}
            }
          }, 150)
        } catch (e) {}
      }

    } catch (e) {
      console.warn('更新嘴部动作失败:', e)
    }

    // 继续循环
    mouthAnimationId = requestAnimationFrame(updateMouth)
  }

  // 启动动画循环
  updateMouth()
}

// ================= 平滑关闭嘴型 =================
const smoothCloseMouth = () => {
  if (!model) return

  // 停止动作调度
  if (motionTimerId) {
    clearTimeout(motionTimerId)
    motionTimerId = null
  }

  // 关闭嘴型动画循环
  if (mouthAnimationId) {
    cancelAnimationFrame(mouthAnimationId)
    mouthAnimationId = null
  }

  // 平滑关闭嘴型（快速但平滑地减小张嘴度）
  const closeMouth = () => {
    if (!model) return

    if (currentMouthOpen > 0.01) {
      currentMouthOpen *= 0.7 // 快速减小
      try {
        model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', currentMouthOpen)
      } catch (e) {}
      mouthAnimationId = requestAnimationFrame(closeMouth)
    } else {
      currentMouthOpen = 0
      try {
        model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0)
      } catch (e) {}
      mouthAnimationId = null
    }
  }

  mouthAnimationId = requestAnimationFrame(closeMouth)
}

// ================= 强制关闭嘴型 =================
const forceCloseMouth = () => {
  if (!model) return
  try {
    if (mouthAnimationId) {
      cancelAnimationFrame(mouthAnimationId)
      mouthAnimationId = null
    }
    currentMouthOpen = 0
    model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0)
  } catch (e) {}
}

// ================= 处理语音朗读 =================
const handleSpeaking = async (audioUrl: string): Promise<HTMLAudioElement> => {
  // 设置说话状态
  isSpeaking.value = true

  // 正视前方
  lookStraight()

  // 重置动作索引
  currentMotionIndex = 0

  // 开始播放说话动作
  playSpeakingMotion()

  // 播放音频并同步嘴部动作
  await playAudioFromUrl(audioUrl)

  // 等待嘴型完全关闭
  await new Promise(resolve => setTimeout(resolve, 150))

  // 重置说话状态
  isSpeaking.value = false

  // 恢复正视前方
  lookStraight()

  // 返回音频元素，以便父组件可以监听结束事件
  return currentAudio!
}

// ================= 停止语音朗读 =================
const stopSpeaking = () => {
  // 停止音频
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio.src = ''
    currentAudio = null
  }

  // 断开音频源连接
  if (audioSource) {
    audioSource.disconnect()
    audioSource = null
  }

  // 停止嘴型动画
  if (mouthAnimationId) {
    cancelAnimationFrame(mouthAnimationId)
    mouthAnimationId = null
  }

  // 停止动作定时器
  if (motionTimerId) {
    clearTimeout(motionTimerId)
    motionTimerId = null
  }

  // 重置状态
  isAudioPlaying = false
  isSpeaking.value = false
  targetMouthOpen = 0
  currentMouthOpen = 0

  // 强制关闭嘴型
  forceCloseMouth()

  // 恢复正视前方
  lookStraight()
}

// ================= 初始化模型 =================
onMounted(async () => {
  if (!containerRef.value) return

  try {
    // 注册 Ticker
    Live2DModel.registerTicker(PIXI.Ticker)

    // 创建 Application，使用 WebGL 渲染
    app = new PIXI.Application({
      width: 800,
      height: 425,
      backgroundAlpha: 0,
      forceCanvas: false,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    containerRef.value.appendChild(app.view as HTMLCanvasElement)

    // 模型路径
    const modelPath = '/spring/haru_greeter_t05.model3.json'

    model = await Live2DModel.from(modelPath, {
      motionPreload: MotionPreloadStrategy.ALL
    })

    app.stage.addChild(model)

    // 调整位置和缩放
    model.x = 450
    model.y = 400
    model.scale.set(0.15)
    model.anchor.set(0.5, 0.5)

    // 隐藏特定部件
    try {
      model.internalModel.coreModel.setPartOpacityById('Part01ArmRB001', 0)
      model.internalModel.coreModel.setPartOpacityById('Part01ArmLB001', 0)
    } catch (e) {}

    // 点击事件
    model.on('pointertap', () => {
      if (!isSpeaking.value) {
        randomMotion()
      }
    })

    // 打印模型中所有可用的动作组
    const motionGroups = model.internalModel.motionManager.motionGroups
    console.log('模型动作组:', motionGroups)
    console.log('动作组键名:', Object.keys(motionGroups))

    // 打印每个动作组的详细信息
    Object.keys(motionGroups).forEach(groupName => {
      console.log(`动作组 ${groupName}:`, motionGroups[groupName])
    })

    // 启动自动切换动作
    playAutoMotion()

    console.log('Live2D 模型加载成功')
    ElMessage.success('模型加载成功')
  } catch (error) {
    console.error('Live2D 模型加载失败:', error)
    ElMessage.error('模型加载失败: ' + (error as Error).message)
  }
})

onUnmounted(() => {
  // 清理所有动画和定时器
  if (mouthAnimationId) cancelAnimationFrame(mouthAnimationId)
  if (motionTimerId) clearTimeout(motionTimerId)
  if (autoMotionTimerId) clearTimeout(autoMotionTimerId)

  // 停止音频
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  // 重置状态
  isSpeaking.value = false
  isAudioPlaying = false

  // 销毁模型和应用
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

// 暴露函数给父组件
defineExpose({
  handleSpeaking,
  stopSpeaking,
  lookStraight,
  playSpeakingMotion,
  forceCloseMouth
})
</script>

<style scoped>
.spring-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.spring-wrap {
  position: relative;
  display: inline-block;
}

.spring-container {
  width: 800px;
  height: 425px;
  background: transparent;
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
