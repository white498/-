<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  ChatDotRound,
  Delete,
  View,
  UserFilled,
  Clock,
  TrendCharts,
  ChatLineRound,
  Close
} from '@element-plus/icons-vue'
import { getChatHistoryList, getChatHistoryDetail, getHotQuestions } from '@/api/text'

const dataList = ref<string[]>([])
const chatDetail = ref<any[]>([])
const hotQuestions = ref<string[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('对话详情')
const loading = ref(false)
const currentChatId = ref('')

const fetchChatHistoryList = async () => {
  loading.value = true
  try {
    const res = await getChatHistoryList()
    if (res && res.code === 200 && res.data) {
      dataList.value = res.data
    } else if (Array.isArray(res)) {
      dataList.value = res
    }
  } catch (error) {
    console.error('获取对话列表失败:', error)
    ElMessage.error('获取对话列表失败')
  } finally {
    loading.value = false
  }
}

const fetchChatHistoryDetail = async (chatId: string) => {
  loading.value = true
  try {
    const res = await getChatHistoryDetail(chatId)
    if (res && res.code === 200 && res.data) {
      chatDetail.value = res.data
      currentChatId.value = chatId
      dialogTitle.value = `对话详情`
      dialogVisible.value = true
    } else if (Array.isArray(res)) {
      chatDetail.value = res
      currentChatId.value = chatId
      dialogTitle.value = `对话详情`
      dialogVisible.value = true
    }
  } catch (error) {
    console.error('获取对话详情失败:', error)
    ElMessage.error('获取对话详情失败')
  } finally {
    loading.value = false
  }
}

const fetchHotQuestions = async () => {
  try {
    const res = await getHotQuestions()
    if (res && res.code === 200 && res.data) {
      hotQuestions.value = res.data
    } else if (Array.isArray(res)) {
      hotQuestions.value = res
    }
  } catch (error) {
    console.error('获取热门问答失败:', error)
  }
}

const handleDelete = (chatId: string) => {
  ElMessageBox.confirm('确定删除该对话吗？删除后将无法恢复', '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  }).then(() => {
    const index = dataList.value.indexOf(chatId)
    if (index > -1) {
      dataList.value.splice(index, 1)
    }
    ElMessage.success('删除成功')
  })
}

const getMessageType = (role: string) => {
  return role === 'user' ? 'user' : 'ai'
}

const getMessageIcon = (role: string) => {
  return role === 'user' ? UserFilled : ChatLineRound
}

const getMessageColor = (role: string) => {
  return role === 'user' ? '#2563eb' : '#10b981'
}

onMounted(() => {
  fetchChatHistoryList()
  fetchHotQuestions()
})
</script>

<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <el-icon size="24"><ChatDotRound /></el-icon>
        </div>
        <div class="header-text">
          <h2>对话记录管理</h2>
          <p>查看用户对话历史与热门问答分析</p>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-num">{{ dataList.length }}</span>
          <span class="stat-label">总对话数</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-num">{{ hotQuestions.length }}</span>
          <span class="stat-label">热门问题</span>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <!-- 左侧：对话列表 -->
      <div class="list-card">
        <div class="card-header">
          <div class="card-title">
            <el-icon size="18"><ChatDotRound /></el-icon>
            <span>对话列表</span>
          </div>
          <el-tag size="small" type="info" effect="plain">{{ dataList.length }} 条记录</el-tag>
        </div>

        <el-table 
          :data="dataList.map(chatId => ({ chatId }))" 
          v-loading="loading"
          class="chat-table"
          :header-cell-style="{ background: '#f8fafc', color: '#475569', fontWeight: 600 }"
        >
          <el-table-column label="对话ID" min-width="200">
            <template #default="scope">
              <div class="chat-id-cell">
                <div class="chat-avatar">
                  <el-icon size="16"><ChatDotRound /></el-icon>
                </div>
                <span class="chat-id-text">{{ scope.row.chatId }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="160" fixed="right" align="center">
            <template #default="scope">
              <div class="action-cell">
                <el-button 
                  size="small" 
                  type="primary" 
                  plain
                  @click="fetchChatHistoryDetail(scope.row.chatId)"
                  class="action-btn"
                >
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
                <el-button 
                  size="small" 
                  type="danger" 
                  plain
                  @click="handleDelete(scope.row.chatId)"
                  class="action-btn"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!loading && dataList.length === 0" description="暂无对话记录">
          <template #image>
            <el-icon size="80" color="#e2e8f0"><ChatDotRound /></el-icon>
          </template>
        </el-empty>
      </div>

      <!-- 右侧：热门问答 -->
      <div class="hot-card">
        <div class="card-header">
          <div class="card-title">
            <el-icon size="18" color="#f59e0b"><TrendCharts /></el-icon>
            <span>热门问答</span>
          </div>
          <el-tag size="small" type="warning" effect="light">TOP {{ hotQuestions.length }}</el-tag>
        </div>

        <div class="hot-list" v-loading="loading">
          <div 
            v-for="(question, index) in hotQuestions" 
            :key="index"
            class="hot-item"
            :class="{ 'hot-top': index < 3 }"
          >
            <div class="hot-rank">
              <span class="rank-num" :class="{ 'rank-top': index < 3 }">{{ index + 1 }}</span>
            </div>
            <div class="hot-content">
              <p class="hot-text">{{ question }}</p>
            </div>
            <div class="hot-badge" v-if="index < 3">
              <el-tag size="small" :type="index === 0 ? 'danger' : index === 1 ? 'warning' : 'success'" effect="light">
                {{ index === 0 ? '🔥 最热' : index === 1 ? '🔥 热门' : '🔥 活跃' }}
              </el-tag>
            </div>
          </div>

          <el-empty v-if="!loading && hotQuestions.length === 0" description="暂无热门问答">
            <template #image>
              <el-icon size="60" color="#e2e8f0"><TrendCharts /></el-icon>
            </template>
          </el-empty>
        </div>
      </div>
    </div>

    <!-- 对话详情弹窗 -->
    <el-dialog 
      v-model="dialogVisible" 
      :title="dialogTitle" 
      width="700px"
      class="chat-dialog"
      destroy-on-close
    >
      <div class="dialog-header">
        <div class="dialog-chat-id">
          <el-icon size="16"><ChatDotRound /></el-icon>
          <span>{{ currentChatId }}</span>
        </div>
        <el-tag size="small" type="info">{{ chatDetail.length }} 条消息</el-tag>
      </div>

      <div class="chat-timeline">
        <div 
          v-for="(message, index) in chatDetail" 
          :key="index"
          class="message-item"
          :class="getMessageType(message.role)"
        >
          <div class="message-avatar" :style="{ background: getMessageColor(message.role) + '15' }">
            <el-icon size="18" :color="getMessageColor(message.role)">
              <component :is="getMessageIcon(message.role)" />
            </el-icon>
          </div>
          <div class="message-body">
            <div class="message-header">
              <span class="message-role" :style="{ color: getMessageColor(message.role) }">
                {{ message.role === 'user' ? '用户' : 'AI助手' }}
              </span>
              <span class="message-time" v-if="message.timestamp">
                <el-icon size="12"><Clock /></el-icon>
                {{ message.timestamp }}
              </span>
            </div>
            <div class="message-content">{{ message.content }}</div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false" class="close-btn">
            <el-icon><Close /></el-icon>
            关闭
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
}

/* ========== 页面头部 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.header-text h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.header-text p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  background: #fff;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: #2563eb;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #e2e8f0;
}

/* ========== 内容网格 ========== */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
}

/* ========== 卡片通用 ========== */
.list-card,
.hot-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

/* ========== 对话表格 ========== */
.chat-table {
  padding: 0 24px 20px;
}

.chat-table :deep(.el-table__header th) {
  background: #f8fafc !important;
  color: #475569;
  font-weight: 600;
  font-size: 13px;
  padding: 14px 0;
}

.chat-id-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
}

.chat-id-text {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
  font-family: monospace;
}

/* ========== 热门问答 ========== */
.hot-list {
  padding: 16px 20px;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.hot-list::-webkit-scrollbar {
  width: 4px;
}

.hot-list::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 2px;
}

.hot-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.3s;
  background: #f8fafc;
}

.hot-item:hover {
  background: #f1f5f9;
  transform: translateX(4px);
}

.hot-top {
  background: linear-gradient(90deg, #fef3c7 0%, #fffbeb 100%);
  border: 1px solid #fde68a;
}

.hot-top:hover {
  background: linear-gradient(90deg, #fde68a 0%, #fef3c7 100%);
}

.hot-rank {
  flex-shrink: 0;
}

.rank-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.rank-top {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.hot-content {
  flex: 1;
  min-width: 0;
}

.hot-text {
  margin: 0;
  font-size: 14px;
  color: #334155;
  line-height: 1.5;
  word-break: break-word;
}

.hot-badge {
  flex-shrink: 0;
}

/* ========== 操作按钮 ========== */
.action-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
}

/* ========== 对话详情弹窗 ========== */
.chat-dialog :deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  margin-right: 0;
}

.chat-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.chat-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.dialog-chat-id {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
}

.chat-timeline {
  padding: 20px 24px;
  max-height: 500px;
  overflow-y: auto;
}

.chat-timeline::-webkit-scrollbar {
  width: 6px;
}

.chat-timeline::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 3px;
}

.message-item {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-item.user .message-body {
  align-items: flex-end;
}

.message-item.user .message-content {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: calc(100% - 60px);
}

.message-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.message-role {
  font-size: 13px;
  font-weight: 600;
}

.message-time {
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 4px;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  background: #f8fafc;
  color: #334155;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  border: 1px solid #f1f5f9;
}

.dialog-footer {
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
}

.close-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
}

/* ========== 空状态 ========== */
:deep(.el-empty__description) {
  color: #94a3b8;
  font-size: 14px;
}

/* ========== 响应式 ========== */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .hot-card {
    order: -1;
  }

  .hot-list {
    max-height: 400px;
  }
}

@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-stats {
    width: 100%;
    justify-content: space-around;
  }
}
</style>