<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import {
  User,
  Setting,
  Edit,
  Upload,
  Refresh,
  ChatLineRound,
  Check,
  Warning,
  ArrowRight
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/module/user'
import { getUserInfo, updateUserInfo, uploadImageAPI, type UpdateUserInfoParams } from '@/api/user'
import { getWelcome, GetTips, UseTips, type TipsResponse } from '@/api/tips'

const router = useRouter()
const userStore = useUserStore()

// 用户信息
const userInfo = reactive({
  name: '',
  password: '******',
  avatar: '',
  phone: '',
  sex: '',
  idNumber: ''
})

// 表单数据
const form = reactive({
  name: '',
  password: '******',
  phone: '',
  sex: '',
  idNumber: ''
})

// 修改信息弹窗
const editModalVisible = ref(false)
const editForm = reactive({
  name: '',
  password: '',
  phone: '',
  sex: '',
  idNumber: ''
})

// 头像上传弹窗
const avatarModalVisible = ref(false)
const tempAvatarUrl = ref('')
const tempAvatarFile = ref<File | null>(null)
const loading = ref(false)

// Tips相关数据
const tipsList = ref<TipsResponse[]>([])
const tipsLoading = ref(false)

// 获取所有tips
const fetchTipsList = async () => {
  tipsLoading.value = true
  try {
    const res = await GetTips()
    if (Array.isArray(res)) {
      tipsList.value = [...res]
    } else if (res && res.data && Array.isArray(res.data)) {
      tipsList.value = [...res.data]
    } else {
      tipsList.value = []
    }
  } catch (error) {
    console.error('获取tips列表失败:', error)
    ElMessage.error('获取建议列表失败')
  } finally {
    tipsLoading.value = false
  }
}

// 启用tips
const handleUseTip = async (id: number) => {
  try {
    await ElMessageBox.confirm(
      '确定要启用这条建议吗？启用后，用户将看到这条建议内容。',
      '启用建议',
      {
        confirmButtonText: '确定启用',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    const loadingInstance = ElLoading.service({
      fullscreen: true,
      text: '启用中...'
    })

    try {
      await UseTips(id)
      ElMessage.success('启用成功')
      await fetchTipsList()
    } finally {
      loadingInstance.close()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('启用失败:', error)
      ElMessage.error('启用失败，请稍后重试')
    }
  }
}

const fetchUserInfo = async () => {
  loading.value = true
  try {
    const data = await getUserInfo() || {}

    // 如果接口没返回头像，用store里的兜底
    if (!data.avatar && userStore.user?.avatar) {
      data.avatar = userStore.user.avatar
    }

    Object.assign(userInfo, {
      name: data.name || '',
      phone: data.phone || '',
      sex: data.sex || '',
      idNumber: data.idNumber || '',
      password: data.password ? '******' : '',
      avatar: data.avatar || ''
    })

    Object.assign(form, userInfo)

    // 同步到Pinia Store
    userStore.setUser(data)
  } catch (error) {
    ElMessage.error('获取用户信息失败')
  } finally {
    loading.value = false
  }
}

// 打开修改信息弹窗
const handleOpenEditModal = () => {
  editForm.name = form.name
  editForm.password = ''
  editForm.phone = form.phone
  editForm.sex = form.sex
  editForm.idNumber = form.idNumber
  editForm.avatar = userInfo.avatar
  editModalVisible.value = true
}

// 保存修改信息
const handleSaveEdit = async () => {
  if (!editForm.name) {
    ElMessage.error('请输入名称')
    return
  }

  loading.value = true
  try {
    const params: UpdateUserInfoParams = {
      name: editForm.name,
      phone: editForm.phone,
      sex: editForm.sex,
      idNumber: editForm.idNumber
    }

    if (editForm.password) {
      params.password = editForm.password
    }
    if (editForm.avatar && editForm.avatar !== userInfo.avatar) {
      params.avatar = editForm.avatar
    }

    await updateUserInfo(params)
    const { name, phone, sex, idNumber, password, avatar } = editForm
    form.name = name
    form.phone = phone
    form.sex = sex
    form.idNumber = idNumber
    form.password = password || '******'
    form.avatar = avatar || form.avatar
    userInfo.name = name
    userInfo.phone = phone
    userInfo.sex = sex
    userInfo.idNumber = idNumber
    userInfo.password = password || '******'
    if (avatar) userInfo.avatar = avatar

    userStore.setUser({
      ...userStore.user,
      name: name,
      avatar: avatar || userStore.user?.avatar
    })

    editModalVisible.value = false
    ElMessage.success(password ? '密码修改成功' : '修改成功')
  } catch (error) {
    console.error('修改用户信息失败:', error)
    ElMessage.error('修改用户信息失败')
  } finally {
    loading.value = false
  }
}

// 打开头像上传弹窗
const handleOpenAvatarModal = () => {
  tempAvatarUrl.value = userInfo.avatar
  tempAvatarFile.value = null
  avatarModalVisible.value = true
}

// 头像上传前校验
const handleBeforeUpload = (rawFile: File) => {
  if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png') {
    ElMessage.error('只能上传图片文件')
    return false
  } else if (rawFile.size / 1024 / 1024 > 5) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }

  tempAvatarFile.value = rawFile
  const reader = new FileReader()
  reader.onload = (e) => {
    tempAvatarUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(rawFile)

  return false
}

// 保存头像
const handleSaveAvatar = async () => {
  if (!tempAvatarUrl.value) {
    ElMessage.error('请上传头像')
    return
  }

  loading.value = true
  try {
    const formData = new FormData()
    formData.append('file', tempAvatarFile.value as File)
    const avatarUrl = await uploadImageAPI(formData)

    if (avatarUrl) {
      await updateUserInfo({ avatar: avatarUrl })

      userInfo.avatar = avatarUrl
      form.avatar = avatarUrl
      avatarModalVisible.value = false

      userStore.setUser({
        ...userStore.user,
        avatar: avatarUrl
      })

      ElMessage.success('头像更新成功')
    } else {
      ElMessage.error('上传失败')
    }
  } catch (error) {
    console.error('更新头像失败:', error)
    ElMessage.error('更新头像失败')
  } finally {
    loading.value = false
  }
}

// 退出登录
const handleLogout = async () => {
  await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
    confirmButtonText: '确定退出',
    cancelButtonText: '取消',
    type: 'warning'
  })

  userStore.removeToken()
  userStore.setUser({})

  ElMessage.success('已退出登录')
  router.push('/login')
}

// 修改欢迎语
const changeWelcome = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的欢迎语', '修改欢迎语', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S/,
      inputErrorMessage: '请输入新的欢迎语',
      inputValidator: (val) => {
        if (val.length > 100) {
          return '欢迎语不能超过100个字符'
        }
        return true
      }
    })

    if (!value) return

    const loading = ElLoading.service({
      fullscreen: true,
      text: '修改中...'
    })

    try {
      await getWelcome(value)
      ElMessage.success('修改成功')
    } finally {
      loading.close()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('修改失败，请稍后重试')
    }
  }
}

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN')
}

// 获取状态文本
const getStatusText = (status: number) => {
  return status === 0 ? '未启用' : '已启用'
}

// 获取状态类型
const getStatusType = (status: number) => {
  return status === 0 ? 'info' : 'success'
}

// 获取状态样式
const getStatusStyle = (status: number) => {
  return status === 0
    ? { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }
    : { background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe' }
}

// 刷新建议列表
const handleRefresh = () => {
  fetchTipsList()
}

onMounted(() => {
  fetchUserInfo()
  fetchTipsList()
})
</script>

<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <el-icon size="24"><Setting /></el-icon>
        </div>
        <div class="header-text">
          <h2>系统设置</h2>
          <p>管理管理员账户信息与系统建议配置</p>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <!-- 左侧：用户信息卡片 -->
      <div class="user-card">
        <div class="user-header">
          <div class="user-avatar-section">
            <div class="avatar-wrapper" @click="handleOpenAvatarModal">
              <img v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar-img" alt="头像" />
              <div v-else class="avatar-placeholder">
                <el-icon size="32"><User /></el-icon>
              </div>
              <div class="avatar-overlay">
                <el-icon size="20"><Upload /></el-icon>
                <span>更换头像</span>
              </div>
            </div>
            <div class="user-title">
              <h3>{{ userInfo.name || '管理员' }}</h3>
              <el-tag size="small" type="success" effect="light">管理员</el-tag>
            </div>
          </div>
        </div>

        <div class="info-list">
          <div class="info-row">
            <div class="info-icon">
              <el-icon size="18"><User /></el-icon>
            </div>
            <div class="info-content">
              <span class="info-label">用户名</span>
              <span class="info-value">{{ userInfo.name || '-' }}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon password">
              <el-icon size="18"><Setting /></el-icon>
            </div>
            <div class="info-content">
              <span class="info-label">密码</span>
              <span class="info-value password">{{ userInfo.password }}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon phone">
              <el-icon size="18"><ChatLineRound /></el-icon>
            </div>
            <div class="info-content">
              <span class="info-label">电话</span>
              <span class="info-value">{{ userInfo.phone || '未设置' }}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon gender">
              <el-icon size="18"><User /></el-icon>
            </div>
            <div class="info-content">
              <span class="info-label">性别</span>
              <span class="info-value">{{ userInfo.sex || '未设置' }}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-icon id">
              <el-icon size="18"><Edit /></el-icon>
            </div>
            <div class="info-content">
              <span class="info-label">身份证号</span>
              <span class="info-value">{{ userInfo.idNumber || '未设置' }}</span>
            </div>
          </div>
        </div>

        <div class="user-actions">
          <el-button type="primary" class="action-btn" @click="handleOpenEditModal">
            <el-icon><Edit /></el-icon>
            修改信息
          </el-button>
          <el-button type="danger" plain class="action-btn" @click="handleLogout">
            退出登录
          </el-button>
        </div>
      </div>

      <!-- 右侧：建议管理 -->
      <div class="tips-card">
        <div class="card-header">
          <div class="card-title">
            <el-icon size="20"><ChatLineRound /></el-icon>
            <span>建议管理</span>
          </div>
          <div class="card-actions">
            <el-button type="primary" link @click="changeWelcome">
              <el-icon><Edit /></el-icon>
              欢迎语
            </el-button>
            <el-button type="primary" link @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>

        <div class="tips-list" v-loading="tipsLoading">
          <div
            v-for="item in tipsList"
            :key="item.id"
            class="tip-item"
            :class="{ 'tip-active': item.status === 1 }"
          >
            <div class="tip-status">
              <div class="status-indicator" :class="{ active: item.status === 1 }"></div>
            </div>
            <div class="tip-body">
              <p class="tip-text">{{ item.config }}</p>
              <div class="tip-meta">
                <span class="tip-time">
                  <el-icon size="12"><Clock /></el-icon>
                  {{ formatTime(item.createTime) }}
                </span>
                <span class="tip-badge" :style="getStatusStyle(item.status)">
                  <el-icon size="12">
                    <Check v-if="item.status === 1" />
                    <Warning v-else />
                  </el-icon>
                  {{ getStatusText(item.status) }}
                </span>
              </div>
            </div>
            <div class="tip-action">
              <el-button
                type="primary"
                size="small"
                :disabled="item.status === 1"
                @click="handleUseTip(item.id)"
                class="enable-btn"
              >
                <el-icon><Check /></el-icon>
                启用
              </el-button>
            </div>
          </div>

          <el-empty v-if="!tipsLoading && tipsList.length === 0" description="暂无建议">
            <template #image>
              <el-icon size="80" color="#e2e8f0"><ChatLineRound /></el-icon>
            </template>
          </el-empty>
        </div>
      </div>
    </div>

    <!-- 修改信息弹窗 -->
    <el-dialog
      v-model="editModalVisible"
      title="修改管理员信息"
      width="450px"
      class="edit-dialog"
      destroy-on-close
    >
      <el-form :model="editForm" label-width="80px" class="edit-form">
        <el-form-item label="姓名">
          <el-input v-model="editForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="editForm.password"
            type="password"
            show-password
            placeholder="留空则不修改"
          />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="editForm.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="性别">
          <el-select v-model="editForm.sex" placeholder="请选择" style="width: 100%">
            <el-option label="男" value="男" />
            <el-option label="女" value="女" />
            <el-option label="保密" value="保密" />
          </el-select>
        </el-form-item>
        <el-form-item label="身份证号">
          <el-input v-model="editForm.idNumber" placeholder="请输入身份证号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editModalVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveEdit" :loading="loading">
            保存修改
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 头像上传弹窗 -->
    <el-dialog
      v-model="avatarModalVisible"
      title="更换头像"
      width="400px"
      class="avatar-dialog"
    >
      <el-upload
        class="avatar-uploader"
        action="#"
        :show-file-list="false"
        :before-upload="handleBeforeUpload"
      >
        <div class="upload-area">
          <img v-if="tempAvatarUrl" :src="tempAvatarUrl" class="preview-img" alt="预览" />
          <div v-else class="upload-placeholder">
            <el-icon size="40" color="#94a3b8"><Upload /></el-icon>
            <p>点击上传头像</p>
            <span>支持 JPG、PNG 格式，最大 5MB</span>
          </div>
        </div>
      </el-upload>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="avatarModalVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveAvatar" :loading="loading">
            确认更换
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

/* ========== 内容网格 ========== */
.content-grid {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
}

/* ========== 用户卡片 ========== */
.user-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  height: fit-content;
}

.user-header {
  padding: 32px 24px 24px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-bottom: 1px solid #e0f2fe;
}

.user-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.avatar-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 4px solid #fff;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.15);
  transition: all 0.3s;
}

.avatar-wrapper:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.25);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(37, 99, 235, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.3s;
  gap: 4px;
}

.avatar-overlay span {
  font-size: 12px;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.user-title {
  text-align: center;
}

.user-title h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

/* ========== 信息列表 ========== */
.info-list {
  padding: 16px 20px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.3s;
}

.info-row:hover {
  background: #f8fafc;
  margin: 0 -20px;
  padding: 14px 20px;
}

.info-row:last-child {
  border-bottom: none;
}

.info-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2563eb;
  flex-shrink: 0;
}

.info-icon.password {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #f59e0b;
}

.info-icon.phone {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #10b981;
}

.info-icon.gender {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
  color: #ec4899;
}

.info-icon.id {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  color: #6366f1;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.info-label {
  font-size: 12px;
  color: #94a3b8;
}

.info-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
}

.info-value.password {
  color: #64748b;
  letter-spacing: 2px;
}

/* ========== 用户操作按钮 ========== */
.user-actions {
  padding: 20px;
  display: flex;
  gap: 12px;
  border-top: 1px solid #f1f5f9;
}

.action-btn {
  flex: 1;
  height: 40px;
  border-radius: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* ========== 建议卡片 ========== */
.tips-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

.card-actions {
  display: flex;
  gap: 8px;
}

.card-actions .el-button {
  font-weight: 500;
}

/* ========== 建议列表 ========== */
.tips-list {
  flex: 1;
  padding: 16px 20px;
  max-height: calc(100vh - 240px);
  overflow-y: auto;
}

.tips-list::-webkit-scrollbar {
  width: 4px;
}

.tips-list::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 2px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 10px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  transition: all 0.3s;
}

.tip-item:hover {
  background: #f1f5f9;
  transform: translateX(4px);
  border-color: #e2e8f0;
}

.tip-active {
  background: linear-gradient(90deg, #eff6ff 0%, #f0f9ff 100%);
  border-color: #bfdbfe;
}

.tip-active:hover {
  background: linear-gradient(90deg, #dbeafe 0%, #eff6ff 100%);
}

.tip-status {
  flex-shrink: 0;
  padding-top: 4px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #cbd5e1;
  transition: all 0.3s;
}

.status-indicator.active {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.tip-body {
  flex: 1;
  min-width: 0;
}

.tip-text {
  margin: 0 0 10px;
  font-size: 14px;
  color: #334155;
  line-height: 1.6;
  word-break: break-word;
}

.tip-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tip-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.tip-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.tip-action {
  flex-shrink: 0;
}

.enable-btn {
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ========== 弹窗样式 ========== */
.edit-dialog :deep(.el-dialog__header),
.avatar-dialog :deep(.el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  margin-right: 0;
}

.edit-dialog :deep(.el-dialog__title),
.avatar-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.edit-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.edit-form .el-form-item {
  margin-bottom: 20px;
}

.edit-form :deep(.el-input__wrapper) {
  border-radius: 8px;
}

/* 头像上传区域 */
.avatar-uploader :deep(.el-upload) {
  display: block;
}

.upload-area {
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #2563eb;
  background: #f8fafc;
}

.preview-img {
  width: 100%;
  height: 220px;
  object-fit: cover;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 220px;
  gap: 12px;
}

.upload-placeholder p {
  margin: 0;
  font-size: 16px;
  color: #475569;
  font-weight: 500;
}

.upload-placeholder span {
  font-size: 12px;
  color: #94a3b8;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
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

  .user-card {
    max-width: 500px;
    margin: 0 auto;
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

  .tips-list {
    max-height: 500px;
  }
}
</style>