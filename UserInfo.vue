<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, ElLoading, type FormInstance, type FormRules } from 'element-plus'
import { Edit, Camera, User, Phone, UserFilled, Calendar, Timer, Upload } from '@element-plus/icons-vue'
import { updateUserInfo, getUserInfo, uploadImageAPI } from '@/api/user'
import { useUserStore } from '@/stores/module/user'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()

// 默认头像
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

// 用户数据
const userInfo = reactive({
  id: 1,
  name: '',
  phone: '',
  sex: '',
  idNumber: '',
  avatar: '',
  password: '',
  createTime: '',
  updateTime: '',
  isDeleted: 0
})

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const data = await getUserInfo()
    
    // 多重兜底：接口没返回头像时
    if (!data.avatar) {
      // 1. 用 Pinia Store
      if (userStore.user?.avatar && !userStore.user.avatar.startsWith('blob:')) {
        data.avatar = userStore.user.avatar
      }
      // 2. 用 localStorage（终极兜底）
      else {
        const savedAvatar = localStorage.getItem('user_avatar')
        if (savedAvatar && !savedAvatar.startsWith('blob:')) {
          data.avatar = savedAvatar
        }
      }
    }
    
    Object.assign(userInfo, data)
    userStore.setUser(data)
    
    // 保存有效头像到 localStorage
    if (data.avatar && !data.avatar.startsWith('blob:')) {
      localStorage.setItem('user_avatar', data.avatar)
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

onMounted(() => {
  fetchUserInfo()
})

// 弹窗控制
const editDialogVisible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const showPassword = ref(false)

// 头像上传弹窗
const avatarModalVisible = ref(false)
const tempAvatarUrl = ref('')
const tempAvatarFile = ref<File | null>(null)
const loading = ref(false)

// 编辑表单
const editForm = reactive({
  name: '',
  phone: '',
  sex: '',
  idNumber: '',
  avatar: '',
  password: '',
  confirmPassword: ''
})

// 保存原始值，用于对比是否修改
const originalForm = reactive({
  name: '',
  phone: '',
  sex: '',
  idNumber: '',
  avatar: ''
})

// 表单校验规则
const rules: FormRules = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  idNumber: [
    { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' }
  ],
  password: [
    { min: 6, max: 20, message: '密码长度 6-20 位', trigger: 'blur' }
  ],
  confirmPassword: [
    {
      validator: (rule: any, value: string, callback: any) => {
        if (value !== editForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 打开编辑弹窗
const openEditDialog = () => {
  editForm.name = userInfo.name
  editForm.phone = userInfo.phone
  editForm.sex = userInfo.sex
  editForm.idNumber = userInfo.idNumber
  editForm.avatar = userInfo.avatar

  // 保存原始值，用于对比是否修改
  Object.assign(originalForm, {
    name: userInfo.name,
    phone: userInfo.phone,
    sex: userInfo.sex,
    idNumber: userInfo.idNumber,
    avatar: userInfo.avatar
  })

  showPassword.value = false
  editForm.password = ''
  editForm.confirmPassword = ''
  editDialogVisible.value = true
}

// 保存
const handleSave = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    saving.value = true
    try {
      const params: any = {
        id: userInfo.id
      }

      // 只有值变化了才传
      if (editForm.name !== originalForm.name) {
        params.name = editForm.name
      }
      if (editForm.password) {
        params.password = editForm.password
      }
      if (editForm.phone !== originalForm.phone) {
        params.phone = editForm.phone
      }
      if (editForm.sex !== originalForm.sex) {
        params.sex = editForm.sex
      }
      if (editForm.idNumber !== originalForm.idNumber) {
        params.idNumber = editForm.idNumber
      }
      if (editForm.avatar !== originalForm.avatar && editForm.avatar && !editForm.avatar.startsWith('blob:')) {
        params.avatar = editForm.avatar
      }

      // 如果什么都没改（只有id），提示并返回
      if (Object.keys(params).length === 1) {
        ElMessage.info('没有修改任何内容')
        saving.value = false
        return
      }

      await updateUserInfo(params)

      // 更新本地数据
      const updatedInfo = {
        name: editForm.name,
        phone: editForm.phone,
        sex: editForm.sex,
        idNumber: editForm.idNumber,
        avatar: editForm.avatar,
        updateTime: new Date().toISOString()
      }
      Object.assign(userInfo, updatedInfo)
      userStore.setUser({ ...userStore.user, ...updatedInfo })

      if (updatedInfo.avatar && !updatedInfo.avatar.startsWith('blob:')) {
        localStorage.setItem('user_avatar', updatedInfo.avatar)
      }

      editDialogVisible.value = false
      ElMessage.success('个人信息更新成功')
    } catch (error: any) {
      console.error('更新失败:', error)
      ElMessage.error(error.message || '更新失败')
    } finally {
      saving.value = false
    }
  })
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
    ElMessage.error('只能上传 JPG/PNG 格式的图片')
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
      // 更新用户信息中的头像
      await updateUserInfo({ avatar: avatarUrl })

      userInfo.avatar = avatarUrl
      editForm.avatar = avatarUrl
      originalForm.avatar = avatarUrl
      avatarModalVisible.value = false

      userStore.setUser({
        ...userStore.user,
        avatar: avatarUrl
      })

      // 保存到 localStorage
      localStorage.setItem('user_avatar', avatarUrl)

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
  await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
  userStore.removeToken()
  userStore.setUser({})
  ElMessage.success('退出登录成功')
  router.push('/login')
}

// 工具函数
const maskPhone = (phone?: string) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const maskIdNumber = (id?: string) => {
  if (!id) return ''
  return id.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

const formatTime = (time?: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

const statusText = computed(() => {
  return userInfo.isDeleted ? '已禁用' : '正常'
})

const statusType = computed(() => {
  return userInfo.isDeleted ? 'disabled' : 'active'
})
</script>

<template>
  <div class="user-profile-page">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <el-icon size="28" color="#4a90d9"><User /></el-icon>
        </div>
        <div class="header-text">
          <h2>个人中心</h2>
          <p>管理您的账户信息与安全</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button class="edit-btn" @click="openEditDialog">
          <el-icon><Edit /></el-icon>
          <span>修改信息</span>
        </el-button>
        <el-button class="logout-btn" @click="handleLogout">
          <span>退出登录</span>
        </el-button>
      </div>
    </div>

    <!-- 用户信息卡片 - 国风背景 -->
    <div class="profile-hero">
      <div class="hero-bg">
        <img src="https://images.unsplash.com/photo-1518182170546-0766bc6f9213?w=1200&q=80" alt="bg" />
        <div class="hero-overlay"></div>
        <!-- 中国风装饰元素 -->
        <div class="chinese-pattern"></div>
      </div>
      <div class="hero-content">
        <div class="hero-left">
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
          <div class="hero-info">
            <h3 class="username">{{ userInfo.name || '游客' }}</h3>
            <div class="user-meta">
              <span class="meta-tag id-tag">ID: {{ userInfo.id }}</span>
              <span class="meta-tag status-tag" :class="statusType">
                <el-icon size="12"><UserFilled /></el-icon>
                {{ statusText }}
              </span>
            </div>
            <p class="welcome-text">欢迎回来，{{ userInfo.name || '游客' }}！感谢您使用我们的服务。</p>
          </div>
        </div>
        <!-- 右侧装饰植物 -->
        <div class="hero-decoration">
          <img src="https://img.icons8.com/3d-fluency/200/potted-plant.png" alt="plant" />
        </div>
      </div>
    </div>

    <!-- 基本信息卡片 -->
    <div class="info-card">
      <div class="card-header">
        <div class="card-icon">
          <el-icon size="24" color="#4a90d9"><User /></el-icon>
        </div>
        <div class="card-title-area">
          <h3>基本信息</h3>
          <p>您的账户基本信息概览</p>
        </div>
      </div>
      <div class="divider"></div>
      <div class="info-grid">
        <div class="info-item">
          <div class="item-icon phone-icon">
            <el-icon size="20"><Phone /></el-icon>
          </div>
          <div class="item-content">
            <span class="item-label">手机号</span>
            <span class="item-value">{{ maskPhone(userInfo.phone) || '未绑定' }}</span>
          </div>
        </div>
        <div class="info-item">
          <div class="item-icon gender-icon">
            <el-icon size="20"><UserFilled /></el-icon>
          </div>
          <div class="item-content">
            <span class="item-label">性别</span>
            <span class="item-value">{{ userInfo.sex || '未设置' }}</span>
          </div>
        </div>
        <div class="info-item">
          <div class="item-icon id-icon">
            <el-icon size="20"><User /></el-icon>
          </div>
          <div class="item-content">
            <span class="item-label">身份证号</span>
            <span class="item-value">{{ maskIdNumber(userInfo.idNumber) || '未绑定' }}</span>
          </div>
        </div>
        <div class="info-item">
          <div class="item-icon time-icon">
            <el-icon size="20"><Calendar /></el-icon>
          </div>
          <div class="item-content">
            <span class="item-label">创建时间</span>
            <span class="item-value">{{ formatTime(userInfo.createTime) }}</span>
          </div>
        </div>
        <div class="info-item full-width">
          <div class="item-icon update-icon">
            <el-icon size="20"><Timer /></el-icon>
          </div>
          <div class="item-content">
            <span class="item-label">更新时间</span>
            <span class="item-value">{{ formatTime(userInfo.updateTime) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <div class="page-footer">
      <p>❤️ 感谢您的信任与支持</p>
      <p>© 2026 · 个人中心</p>
    </div>

    <!-- 修改信息弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="修改个人信息"
      width="500px"
      destroy-on-close
      class="edit-dialog"
    >
      <el-form
        ref="formRef"
        :model="editForm"
        :rules="rules"
        label-width="100px"
        class="edit-form"
      >
        <el-form-item label="用户名" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入用户名" maxlength="20" show-word-limit />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="editForm.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>

        <el-form-item label="性别" prop="sex">
          <el-radio-group v-model="editForm.sex">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
            <el-radio label="保密">保密</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="身份证号" prop="idNumber">
          <el-input v-model="editForm.idNumber" placeholder="请输入身份证号" maxlength="18" />
        </el-form-item>

        <el-form-item label="修改密码">
          <el-switch v-model="showPassword" />
        </el-form-item>

        <template v-if="showPassword">
          <el-form-item label="新密码" prop="password">
            <el-input v-model="editForm.password" type="password" placeholder="请输入新密码" show-password />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="editForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave" :loading="saving">
            保存
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
      destroy-on-close
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

<style scoped lang="scss">
.user-profile-page {
  min-height: 100vh;
  background: #f8f9fb;
  padding: 24px 32px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ========== 顶部标题栏 ========== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e8f4fc 0%, #d4e9f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text {
  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #1a1a2e;
    letter-spacing: 1px;
  }
  p {
    margin: 4px 0 0;
    font-size: 13px;
    color: #8c8c9a;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.edit-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  border: 1px solid #d0d5e3;
  background: #fff;
  color: #4a5568;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;

  &:hover {
    border-color: #4a90d9;
    color: #4a90d9;
    background: #f0f7ff;
  }

  .el-icon {
    font-size: 16px;
  }
}

.logout-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #4a90d9 0%, #667eea 100%);
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(74, 144, 217, 0.3);
  }

  .el-icon {
    font-size: 16px;
  }
}

/* ========== 用户信息英雄区 - 国风背景 ========== */
.profile-hero {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(232, 244, 252, 0.92) 0%,
    rgba(212, 233, 247, 0.85) 40%,
    rgba(232, 244, 252, 0.75) 70%,
    rgba(245, 248, 251, 0.6) 100%
  );
  z-index: 1;
}

/* 中国风装饰纹理 */
.chinese-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  opacity: 0.08;
  background-image:
    radial-gradient(circle at 20% 80%, rgba(74, 144, 217, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(102, 126, 234, 0.2) 0%, transparent 40%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 36px 40px;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 4px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 16px rgba(74, 144, 217, 0.2);
  background: linear-gradient(135deg, #a8c6e0 0%, #7eb8e0 100%);
}

.avatar-wrapper:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(74, 144, 217, 0.25);
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
  background: rgba(74, 144, 217, 0.7);
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

.hero-info {
  .username {
    margin: 0 0 10px;
    font-size: 26px;
    font-weight: 700;
    color: #1a1a2e;
    letter-spacing: 1px;
  }

  .user-meta {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
  }

  .meta-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }

  .id-tag {
    background: rgba(255, 255, 255, 0.7);
    color: #5a6c7d;
    border: 1px solid rgba(208, 213, 227, 0.5);
  }

  .status-tag {
    &.active {
      background: rgba(82, 196, 26, 0.1);
      color: #52c41a;
    }
    &.disabled {
      background: rgba(255, 77, 79, 0.1);
      color: #ff4d4f;
    }
  }

  .welcome-text {
    margin: 0;
    font-size: 14px;
    color: #6b7b8d;
  }
}

.hero-decoration {
  img {
    width: 160px;
    height: 160px;
    object-fit: contain;
    opacity: 0.9;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  }
}

/* ========== 基本信息卡片 ========== */
.info-card {
  background: #fff;
  border-radius: 20px;
  padding: 28px 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e8f4fc 0%, #d4e9f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-title-area {
  h3 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
    color: #1a1a2e;
  }
  p {
    margin: 0;
    font-size: 13px;
    color: #8c8c9a;
  }
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #e8e8f0 20%, #e8e8f0 80%, transparent 100%);
  margin-bottom: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 14px;
  background: #fafbfc;
  transition: all 0.3s ease;

  &:hover {
    background: #f0f7ff;
    transform: translateX(4px);
  }

  &.full-width {
    grid-column: 1 / -1;
  }
}

.item-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.phone-icon {
    background: linear-gradient(135deg, #e8f4fc 0%, #d4e9f7 100%);
    color: #4a90d9;
  }
  &.gender-icon {
    background: linear-gradient(135deg, #e8f8e8 0%, #d4f5d4 100%);
    color: #52c41a;
  }
  &.id-icon {
    background: linear-gradient(135deg, #fff3e8 0%, #ffe4d4 100%);
    color: #fa8c16;
  }
  &.time-icon {
    background: linear-gradient(135deg, #f0e8ff 0%, #e4d4ff 100%);
    color: #722ed1;
  }
  &.update-icon {
    background: linear-gradient(135deg, #e8f4fc 0%, #d4e9f7 100%);
    color: #4a90d9;
  }
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .item-label {
    font-size: 13px;
    font-weight: 600;
    color: #1a1a2e;
  }

  .item-value {
    font-size: 13px;
    color: #8c8c9a;
  }
}

/* ========== 页脚 ========== */
.page-footer {
  text-align: center;
  padding: 24px 0;

  p {
    margin: 4px 0;
    font-size: 12px;
    color: #b0b0c0;

    &:first-child {
      color: #8c8c9a;
      font-size: 13px;
    }
  }
}

/* ========== 弹窗样式 ========== */
.edit-dialog {
  :deep(.el-dialog__header) {
    padding: 20px 24px;
    border-bottom: 1px solid #f0f0f0;

    .el-dialog__title {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
    }
  }

  :deep(.el-dialog__body) {
    padding: 24px;
  }
}

.avatar-dialog {
  :deep(.el-dialog__header) {
    padding: 20px 24px;
    border-bottom: 1px solid #f0f0f0;
    margin-right: 0;

    .el-dialog__title {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
    }
  }

  :deep(.el-dialog__body) {
    padding: 24px;
  }
}

.edit-form {
  .avatar-uploader {
    :deep(.el-upload) {
      display: block;
    }
  }
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
  border-color: #4a90d9;
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

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .user-profile-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .hero-content {
    flex-direction: column;
    gap: 20px;
    padding: 24px;
  }

  .hero-left {
    flex-direction: column;
    text-align: center;
  }

  .hero-decoration {
    img {
      width: 120px;
      height: 120px;
    }
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-item.full-width {
    grid-column: 1;
  }
}
</style>