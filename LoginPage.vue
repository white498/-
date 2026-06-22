<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { LoginAPI, type LoginResponse } from '@/api/user'
import { useUserStore } from '@/stores/module/user'

const router = useRouter()
const userStore = useUserStore()
const loginform = ref<FormInstance | null>(null)

interface LoginForm {
  name: string
  password: string
}

const formModel = ref<LoginForm>({ name: '', password: '' })
const isAgreed = ref(false)

const rules: FormRules<LoginForm> = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 8, message: '用户名长度在2到8个字符之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { pattern: /^\S{6,10}$/, message: '密码长度在6到10个字符之间', trigger: 'blur' }
  ]
}

const login = async (): Promise<void> => {
  if (!isAgreed.value) {
    await ElMessageBox.alert('请先勾选用户平台使用协议', '提示', {
      confirmButtonText: '确定', type: 'warning'
    })
    return
  }
  if (!loginform.value) return
  try {
    await loginform.value.validate()
    const res = await LoginAPI({
      name: formModel.value.name,
      password: formModel.value.password
    })
    if (res?.token) {
      userStore.setToken(res.token)
      userStore.setUser(res.userInfo)
      ElMessage.success('登录成功')
      router.push(res.role === 'admin' ? '/home' : '/user')
    }
  } catch (error: any) {
    userStore.removeToken()
    const errorMsg = error?.message || error?.response?.data?.message || '登录失败，请稍后重试'
    ElMessage.error(errorMsg)
  }
}
</script>

<template>
  <div class="login-page">
    <div class="bg-image"></div>

    <div class="main-card">
      <!-- 左侧品牌区 -->
      <div class="brand-panel">
        <div class="brand-header">
          <div class="logo">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 8v16l12 6 12-6V8L16 2z" fill="url(#loginGrad)" opacity="0.3"/>
              <path d="M16 2L4 8v16l12 6 12-6V8L16 2z" stroke="url(#loginGrad)" stroke-width="2" fill="none"/>
              <path d="M16 16L4 8M16 16l12-8M16 16v16" stroke="url(#loginGrad)" stroke-width="1.5"/>
              <circle cx="16" cy="16" r="4" fill="url(#loginGrad)"/>
              <defs>
                <linearGradient id="loginGrad" x1="4" y1="2" x2="28" y2="30">
                  <stop offset="0%" stop-color="#3b82f6"/>
                  <stop offset="100%" stop-color="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span class="brand-name">旅迹 AI</span>
        </div>

        <div class="brand-slogan">
          <h2>发现旅途的美好</h2>
          <p>AI 助力探索世界，发现旅行的无限可能</p>
        </div>

        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div class="feature-text">
              <h4>智能推荐</h4>
              <p>AI 为您量身定制旅行路线</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v14a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
            </div>
            <div class="feature-text">
              <h4>语音交互</h4>
              <p>与数字人导游自然对话</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
            <div class="feature-text">
              <h4>沉浸体验</h4>
              <p>AR/VR 景区全景导览</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-icon orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <div class="feature-text">
              <h4>贴心服务</h4>
              <p>全程陪伴，旅行更安心</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单区 -->
      <div class="form-panel">
        <div class="form-header">
          <h3>欢迎回来</h3>
          <p>登录您的智能旅游账户</p>
        </div>

        <el-form
          ref="loginform"
          :rules="rules"
          :model="formModel"
          autocomplete="off"
        >
          <el-form-item prop="name">
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <el-input
                v-model="formModel.name"
                placeholder="用户名"
                size="large"
              />
            </div>
          </el-form-item>

          <el-form-item prop="password">
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <el-input
                v-model="formModel.password"
                type="password"
                show-password
                placeholder="密码"
                size="large"
              />
            </div>
          </el-form-item>

          <div class="agreement">
            <el-checkbox v-model="isAgreed">
              <span class="agreement-text">我已阅读并同意</span>
              <a href="#" class="agreement-link">用户平台使用协议</a>
            </el-checkbox>
          </div>

          <button type="button" class="btn btn-primary" @click="login">
            登 录
          </button>
        </el-form>

        <div class="divider">
          <span>或</span>
        </div>

        <div class="register-link">
          还没有账户？<router-link to="/register">立即注册</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.bg-image {
  position: fixed;
  inset: 0;
  background-image: url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80');
  background-size: cover;
  background-position: center;
  z-index: 0;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(147, 197, 253, 0.3) 0%,
      rgba(167, 243, 208, 0.2) 50%,
      rgba(255, 255, 255, 0.3) 100%
    );
  }
}

.main-card {
  position: relative;
  z-index: 1;
  display: flex;
  width: 1000px;
  min-height: 600px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  overflow: hidden;
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.5);
    opacity: 0.78;
}

// 左侧品牌区（与注册页完全一致）
.brand-panel {
  flex: 1;
  padding: 48px 40px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.1) 100%
  );
  display: flex;
  flex-direction: column;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 48px;

  .logo {
    width: 32px;
    height: 32px;

    svg {
      width: 100%;
      height: 100%;
    }
  }

  .brand-name {
    font-size: 20px;
    font-weight: 600;
    color: #3b82f6;
    letter-spacing: 1px;
  }
}

.brand-slogan {
  margin-bottom: 40px;

  h2 {
    font-size: 32px;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.4;
    margin-bottom: 12px;
  }

  p {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.6;
  }
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16px;

  .feature-icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.blue { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
    &.green { background: linear-gradient(135deg, #d1fae5, #a7f3d0); }
    &.purple { background: linear-gradient(135deg, #ede9fe, #ddd6fe); }
    &.orange { background: linear-gradient(135deg, #fef3c7, #fde68a); }

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .feature-text {
    h4 {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 2px;
    }

    p {
      font-size: 13px;
      color: #9ca3af;
    }
  }
}

// 右侧表单区
.form-panel {
  flex: 1;
  padding: 48px;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.form-header {
  margin-bottom: 32px;

  h3 {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 6px;
  }

  p {
    font-size: 14px;
    color: #9ca3af;
  }
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 4px 4px 14px;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover, &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .input-icon {
    width: 18px;
    height: 18px;
    color: #9ca3af;
    flex-shrink: 0;
  }

  :deep(.el-input__wrapper) {
    background: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;

    .el-input__inner {
      height: 44px;
      font-size: 15px;
      color: #1e293b;

      &::placeholder {
        color: #d1d5db;
      }
    }
  }

  :deep(.el-input__suffix) {
    padding-right: 10px;
  }
}

:deep(.el-form-item) {
  margin-bottom: 20px;

  &.is-error {
    .input-wrapper {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  }
}

.agreement {
  margin-bottom: 24px;

  :deep(.el-checkbox__label) {
    font-size: 13px;
    color: #6b7280;
  }

  .agreement-text {
    color: #6b7280;
  }

  .agreement-link {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}

.btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  &.btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
    color: #fff;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

.divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  gap: 16px;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }

  span {
    font-size: 13px;
    color: #d1d5db;
  }
}

.register-link {
  text-align: center;
  font-size: 14px;
  color: #9ca3af;

  a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 600;
    margin-left: 4px;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media (max-width: 900px) {
  .main-card {
    flex-direction: column;
    width: 100%;
    max-width: 480px;
    opacity: 0.8;
  }

  .brand-panel {
    display: none;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 12px;
  }

  .form-panel {
    padding: 32px 24px;
  }
}
</style>
