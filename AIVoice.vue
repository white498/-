<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getVoiceList, changeVoice, type VoiceItem, type ChangeVoiceParams } from '@/api/voice'

// 音色列表
const voiceList = ref<VoiceItem[]>([])
// 当前选择的音色
const selectedVoice = ref<VoiceItem | null>(null)
// 加载状态
const loading = ref(false)
// 修改音色弹窗
const editDialogVisible = ref(false)
// 编辑表单
const editForm = ref<{
  voice_name: string
  description: string
  is_enabled: 0 | 1
}>({
  voice_name: '',
  description: '',
  is_enabled: 1
})

// 获取音色列表
const fetchVoiceList = async () => {
  loading.value = true
  try {
    const res = await getVoiceList()
    console.log('获取音色列表响应:', res) // 调试日志
    if (Array.isArray(res)) {
      voiceList.value = res
      // ✅ 从 localStorage 读取上次选择的音色
      const savedVoiceId = localStorage.getItem('selectedVoiceId')
      if (savedVoiceId) {
        const savedVoice = res.find(v => v.id === parseInt(savedVoiceId))
        if (savedVoice) {
          selectedVoice.value = savedVoice
        } else if (res.length > 0) {
          selectedVoice.value = res[0]
        }
      } else if (res.length > 0) {
        selectedVoice.value = res[0]
      }
    }
  } catch (error) {
    console.error('获取音色列表失败:', error)
    ElMessage.error('获取音色列表失败')
  } finally {
    loading.value = false
  }
}

// 选择音色
const handleVoiceSelect = async (voice: VoiceItem) => {
  selectedVoice.value = voice
  // ✅ 保存到 localStorage
  localStorage.setItem('selectedVoiceId', voice.id.toString())
  ElMessage.success(`已选择音色: ${voice.voiceName}`)

  // ✅ 如果需要后端同步当前使用的音色
  try {
    await changeVoice(voice.id, { is_enabled: 1 })
    console.log('音色切换已同步到后端')
  } catch (error) {
    console.error('同步音色到后端失败:', error)
  }
}

// 打开修改音色弹窗
const handleOpenEditDialog = (voice: VoiceItem) => {
  selectedVoice.value = voice
  editForm.value = {
    voice_name: voice.voiceName,
    description: voice.description,
    is_enabled: 1
  }
  editDialogVisible.value = true
}

// 保存修改
const handleSaveEdit = async () => {
  if (!selectedVoice.value) return

  loading.value = true
  try {
    // ✅ 确保参数格式正确
    const params: ChangeVoiceParams = {
      voice_name: editForm.value.voice_name,
      description: editForm.value.description,
      is_enabled: editForm.value.is_enabled
    }

    console.log('发送修改请求:', selectedVoice.value.id, params) // 调试日志

    // ✅ 调用 API
    const result = await changeVoice(selectedVoice.value.id, params)
    console.log('修改响应:', result) // 调试日志

    // ✅ 更新本地数据
    const updatedVoice = {
      ...selectedVoice.value,
      voiceName: editForm.value.voice_name,
      description: editForm.value.description,
      is_enabled: editForm.value.is_enabled
    }

    // 更新列表中的对应项
    const index = voiceList.value.findIndex(v => v.id === selectedVoice.value?.id)
    if (index !== -1) {
      voiceList.value[index] = updatedVoice
    }

    // 更新当前选中的音色
    selectedVoice.value = updatedVoice

    ElMessage.success('音色修改成功')
    editDialogVisible.value = false
  } catch (error: any) {
    console.error('修改音色失败:', error)
    ElMessage.error(error?.message || '修改音色失败')
  } finally {
    loading.value = false
  }
}

// 组件挂载时获取音色列表
onMounted(() => {
  fetchVoiceList()
})
</script>

<template>
  <div class="voice-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>音色管理</h2>
      <p class="subtitle">选择或管理AI助手的语音音色</p>
    </div>

    <!-- 当前选择高亮展示 -->
    <div class="current-selection" v-if="selectedVoice">
      <el-card class="current-voice-card">
        <div class="current-voice-header">
          <div class="badge">当前使用</div>
          <h3>当前选择</h3>
        </div>
        <div class="current-voice-info">
          <div class="current-voice-icon">🔊</div>
          <div class="current-voice-detail">
            <div class="current-voice-name">{{ selectedVoice.voiceName }}</div>
            <div class="current-voice-description">{{ selectedVoice.description }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 音色列表 -->
    <div class="section-title">
      <h3>可用音色</h3>
      <span class="count">共 {{ voiceList.length }} 种音色</span>
    </div>
    <div class="voice-list">
      <el-card
        v-for="voice in voiceList"
        :key="voice.id"
        class="voice-card"
        :class="{ selected: selectedVoice?.id === voice.id }"
      >
        <div class="voice-card-header">
          <div class="voice-icon">🎙️</div>
          <div class="voice-info">
            <h3 class="voice-name">{{ voice.voiceName }}</h3>
            <p class="voice-description">{{ voice.description }}</p>
          </div>
          <div v-if="selectedVoice?.id === voice.id" class="selected-mark">✓</div>
        </div>
        <div class="voice-actions">
          <el-button
            type="primary"
            size="small"
            @click="handleVoiceSelect(voice)"
            :disabled="selectedVoice?.id === voice.id"
            :class="{ disabled: selectedVoice?.id === voice.id }"
          >
            {{ selectedVoice?.id === voice.id ? '已选择' : '选择' }}
          </el-button>
          <el-button
            type="default"
            size="small"
            @click="handleOpenEditDialog(voice)"
          >
            修改
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 修改音色弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="修改音色"
      width="450px"
    >
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="音色名称">
          <el-input v-model="editForm.voice_name" placeholder="请输入音色名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            placeholder="请输入音色描述"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="editForm.is_enabled">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveEdit" :loading="loading">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.voice-container {
  --primary: #409EFF;
  --primary-light: #e6f3ff;
  --primary-dark: #1890ff;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --border-color: #e5e7eb;
  --bg-hover: #f9fafb;

  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  .page-header {
    margin-bottom: 32px;

    h2 {
      color: var(--text-primary);
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 14px;
      margin: 0;
    }
  }

  .current-selection {
    margin-bottom: 32px;

    .current-voice-card {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      border: none;
      border-radius: 16px;
      padding: 24px;

      .current-voice-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;

        .badge {
          background: rgba(255, 255, 255, 0.25);
          color: white;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
        }

        h3 {
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          font-weight: 500;
          margin: 0;
        }
      }

      .current-voice-info {
        display: flex;
        align-items: center;
        gap: 16px;

        .current-voice-icon {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }

        .current-voice-detail {
          .current-voice-name {
            font-size: 20px;
            font-weight: 600;
            color: white;
            margin-bottom: 4px;
          }

          .current-voice-description {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
          }
        }
      }
    }
  }

  .section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;

    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .count {
      font-size: 14px;
      color: var(--text-muted);
    }
  }

  .voice-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;

    .voice-card {
      border-radius: 12px;
      border: 2px solid var(--border-color);
      transition: all 0.3s ease;
      overflow: hidden;

      &:hover {
        border-color: var(--primary);
        box-shadow: 0 8px 25px rgba(64, 150, 255, 0.15);
      }

      &.selected {
        border-color: var(--primary);
        background: linear-gradient(135deg, var(--primary-light) 0%, #d6e4ff 100%);
      }

      .voice-card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;

        .voice-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--primary-light) 0%, #b3d7ff 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .voice-info {
          flex: 1;
          min-width: 0;

          .voice-name {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 4px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .voice-description {
            font-size: 13px;
            color: var(--text-secondary);
            margin: 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.4;
          }
        }

        .selected-mark {
          width: 24px;
          height: 24px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
        }
      }

      .voice-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        padding: 12px 16px;
        border-top: 1px solid var(--border-color);

        .el-button {
          padding: 6px 14px;
          font-size: 13px;

          &.disabled {
            background: var(--bg-hover);
            border-color: var(--border-color);
            color: var(--text-muted);
            cursor: default;
          }
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}
</style>
