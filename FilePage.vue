<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  Document,
  Delete,
  Upload,
  Search,
  RefreshRight,
  Files,
  Timer,
  WarningFilled,
  CircleCheckFilled,
  InfoFilled
} from '@element-plus/icons-vue'
import {
  getKnowledgeList,
  deleteKnowledge,
  updateKnowledge,
  uploadKnowLedge,
  type KnowledgeItem,
  type KnowledgeListParams
} from '@/api/knowledge'

const dataList = ref<KnowledgeItem[]>([])
const loading = ref(false)
const deleteLoading = ref(false)
const uploadLoading = ref(false)

const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const searchParams = ref<KnowledgeListParams>({
  page: 1,
  page_size: 10,
  filename: '',
  status: ''
})

const statusOptions = [
  { label: '草稿', value: 'draft', color: '#6366f1' },
  { label: '处理中', value: 'processing', color: '#f59e0b' },
  { label: '已完成', value: 'completed', color: '#10b981' },
  { label: '失败', value: 'failed', color: '#ef4444' }
]

const dialogVisible = ref(false)
const isEdit = ref(false)

const form = ref<Partial<KnowledgeItem>>({
  id: '',
  filename: '',
  fileType: '',
  fileSize: 0,
  chunkCount: 0,
  status: '',
  createdAt: ''
})

const uploadRef = ref<any>(null)
const updateUploadRef = ref<any>(null)
const currentEditRow = ref<KnowledgeItem | null>(null)
const updateLoading = ref(false)

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getKnowledgeList({
      ...searchParams.value,
      filename: searchParams.value.filename || undefined,
    })
    await nextTick()
    dataList.value = res.list || []
    total.value = typeof res.total === 'number' ? res.total :
                 typeof res.Total === 'number' ? res.Total :
                 typeof res.totalCount === 'number' ? res.totalCount :
                 (res.list?.length || 0)
    page.value = res.page || page.value
    pageSize.value = res.page_size || pageSize.value
  } catch (error) {
    console.error('获取列表失败:', error)
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchList()
}

const resetSearch = () => {
  searchParams.value = {
    page: 1,
    page_size: 10,
    filename: '',
    status: ''
  }
  handleSearch()
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  searchParams.value.page_size = val
  fetchList()
}

const handleCurrentChange = (val: number) => {
  page.value = val
  searchParams.value.page = val
  fetchList()
}

const openAddDialog = () => {
  isEdit.value = false
  form.value = {
    filename: '',
    fileType: '',
    fileSize: 0,
    chunkCount: 0,
    status: 'draft',
    createdAt: ''
  }
  dialogVisible.value = true
}

const handleEdit = (row: KnowledgeItem) => {
  currentEditRow.value = row
  nextTick(() => {
    if (updateUploadRef.value) {
      const input = updateUploadRef.value.$el.querySelector('input[type="file"]')
      if (input) {
        input.click()
      } else {
        ElMessage.error('无法找到文件选择器')
      }
    }
  })
}

const handleUpdateUpload = async (file: File) => {
  if (!currentEditRow.value) return
  updateLoading.value = true
  try {
    const result = await updateKnowledge(currentEditRow.value.id, file)
    if (result && result.success === true) {
      ElMessage.success({ message: '更新成功', duration: 3000 })
      setTimeout(() => fetchList(), 500)
    } else {
      ElMessage.error(result?.error || '更新失败')
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '更新失败')
  } finally {
    updateLoading.value = false
    currentEditRow.value = null
    if (updateUploadRef.value) updateUploadRef.value.clearFiles()
  }
}

const handleDelete = (row: KnowledgeItem) => {
  ElMessageBox.confirm(`确定删除文件 "${row.filename}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    deleteLoading.value = true
    try {
      await deleteKnowledge(row.id)
      ElMessage.success('删除成功')
      setTimeout(() => fetchList(), 300)
    } catch (error) {
      ElMessage.error('删除失败')
    } finally {
      deleteLoading.value = false
    }
  })
}

const handleUpload = async (file: File) => {
  uploadLoading.value = true
  try {
    await uploadKnowLedge(file)
    ElMessage.success('上传成功')
    setTimeout(() => fetchList(), 300)
  } catch (error) {
    ElMessage.error('上传失败')
  } finally {
    uploadLoading.value = false
  }
}

const viewDetail = (row: KnowledgeItem) => {
  ElMessage.info(`文件：${row.filename}，状态：${row.status}`)
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    draft: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return map[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    processing: '处理中',
    completed: '已完成',
    failed: '失败'
  }
  return map[status] || status
}

const getStatusIcon = (status: string) => {
  const map: Record<string, any> = {
    draft: InfoFilled,
    processing: Timer,
    completed: CircleCheckFilled,
    failed: WarningFilled
  }
  return map[status] || InfoFilled
}

onMounted(() => {
  fetchList()
})
</script>

<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <el-icon size="24"><Files /></el-icon>
        </div>
        <div class="header-text">
          <h2>景区文件管理</h2>
          <p>管理景区知识库文件，支持上传、更新与删除</p>
        </div>
      </div>
      <div class="header-actions">
        <el-upload
          ref="uploadRef"
          action="#"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="(file: any) => handleUpload(file.raw)"
        >
          <el-button type="primary" class="upload-btn" :loading="uploadLoading">
            <el-icon v-if="!uploadLoading"><Upload /></el-icon>
            <span>{{ uploadLoading ? '上传中...' : '上传文件' }}</span>
          </el-button>
        </el-upload>
      </div>
    </div>

    <!-- 搜索栏卡片 -->
    <div class="search-card">
      <div class="search-content">
        <div class="search-item">
          <el-icon class="search-icon"><Search /></el-icon>
          <el-input
            v-model="searchParams.filename"
            placeholder="请输入文件名搜索"
            clearable
            class="search-input"
            @keyup.enter="handleSearch"
          />
        </div>
        <el-select
          v-model="searchParams.status"
          placeholder="文件状态"
          clearable
          class="status-select"
        >
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
            <div class="status-option">
              <span class="status-dot" :style="{ background: item.color }"></span>
              <span>{{ item.label }}</span>
            </div>
          </el-option>
        </el-select>
        <el-button type="primary" class="search-btn" @click="handleSearch">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
        <el-button class="reset-btn" @click="resetSearch">
          <el-icon><RefreshRight /></el-icon>
          重置
        </el-button>
      </div>
    </div>

    <!-- 数据表格卡片 -->
    <div class="table-card">
      <el-table 
        :data="dataList" 
        v-loading="loading" 
        class="data-table"
        :header-cell-style="{ background: '#f8fafc', color: '#475569', fontWeight: 600 }"
      >
        <el-table-column label="文件名" min-width="260">
          <template #default="scope">
            <div class="file-cell">
              <div class="file-icon">
                <el-icon size="20"><Document /></el-icon>
              </div>
              <div class="file-info">
                <el-link type="primary" class="file-name" @click="viewDetail(scope.row)">
                  {{ scope.row.filename }}
                </el-link>
                <span class="file-time">{{ scope.row.createdAt }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="类型" width="100" align="center">
          <template #default="scope">
            <el-tag size="small" effect="plain" class="type-tag">
              {{ scope.row.fileType ? scope.row.fileType.toUpperCase() : '-' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="大小" width="120" align="center">
          <template #default="scope">
            <span class="size-text">{{ formatFileSize(scope.row.fileSize) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="分块数" width="100" align="center">
          <template #default="scope">
            <span class="chunk-text">{{ scope.row.chunkCount }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="130" align="center">
          <template #default="scope">
            <div class="status-cell">
              <el-icon size="14" :color="statusOptions.find(s => s.value === scope.row.status)?.color">
                <component :is="getStatusIcon(scope.row.status)" />
              </el-icon>
              <el-tag 
                :type="getStatusType(scope.row.status)" 
                size="small"
                effect="light"
                class="status-tag"
              >
                {{ getStatusLabel(scope.row.status) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="scope">
            <div class="action-cell">
              <el-button 
                size="small" 
                type="primary" 
                plain
                @click="handleEdit(scope.row)" 
                :loading="updateLoading"
                class="action-btn"
              >
                <el-icon><Upload /></el-icon>
                更新
              </el-button>
              <el-button 
                size="small" 
                type="danger" 
                plain
                @click="handleDelete(scope.row)" 
                :loading="deleteLoading"
                class="action-btn"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <el-empty v-if="!loading && dataList.length === 0" description="暂无文件数据">
        <template #image>
          <el-icon size="80" color="#e2e8f0"><Files /></el-icon>
        </template>
      </el-empty>

      <!-- 分页 -->
      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          class="custom-pagination"
        />
      </div>
    </div>

    <!-- 隐藏的更新上传组件 -->
    <el-upload
      ref="updateUploadRef"
      action="#"
      :auto-upload="false"
      :show-file-list="false"
      :on-change="(file: any) => handleUpdateUpload(file.raw)"
      style="display: none"
    >
      <el-button>更新文件</el-button>
    </el-upload>
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

.upload-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ========== 搜索卡片 ========== */
.search-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.search-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 240px;
  max-width: 320px;
}

.search-icon {
  color: #94a3b8;
  font-size: 18px;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #2563eb inset;
}

.status-select {
  width: 140px;
}

.status-select :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.search-btn {
  border-radius: 8px;
  font-weight: 500;
}

.reset-btn {
  border-radius: 8px;
  color: #64748b;
}

/* ========== 表格卡片 ========== */
.table-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.data-table {
  border-radius: 8px;
  overflow: hidden;
}

.data-table :deep(.el-table__header th) {
  background: #f8fafc !important;
  color: #475569;
  font-weight: 600;
  font-size: 13px;
  padding: 14px 0;
}

.data-table :deep(.el-table__row) {
  transition: all 0.2s;
}

.data-table :deep(.el-table__row:hover) {
  background: #f8fafc;
}

/* 文件单元格 */
.file-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.file-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  flex-shrink: 0;
}

.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
}

.file-time {
  font-size: 12px;
  color: #94a3b8;
}

/* 类型标签 */
.type-tag {
  border-radius: 6px;
  font-weight: 500;
}

/* 大小文字 */
.size-text {
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

.chunk-text {
  font-size: 13px;
  color: #64748b;
}

/* 状态单元格 */
.status-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.status-tag {
  border-radius: 6px;
  font-weight: 500;
}

/* 操作按钮 */
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

/* 分页 */
.pagination-wrapper {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
}

.custom-pagination :deep(.el-pagination__total) {
  color: #64748b;
  font-size: 13px;
}

.custom-pagination :deep(.el-pagination__sizes) {
  margin-right: 16px;
}

.custom-pagination :deep(.el-pager li) {
  border-radius: 6px;
  font-weight: 500;
}

.custom-pagination :deep(.el-pager li.is-active) {
  background: #2563eb;
  color: #fff;
}

/* 空状态 */
:deep(.el-empty__description) {
  color: #94a3b8;
  font-size: 14px;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .page-container {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .search-content {
    flex-direction: column;
    align-items: stretch;
  }

  .search-item {
    max-width: none;
  }
}
</style>