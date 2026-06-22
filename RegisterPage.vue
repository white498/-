<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { registerAPI } from '@/api/user'

const router = useRouter()
const registerform = ref<FormInstance | null>(null)

interface RegisterForm {
  name: string
  password: string
  phone?: string
  sex?: string
  idNumber?: string
}

const formModel = ref<RegisterForm>({
  name: '', password: '', phone: '', sex: '', idNumber: ''
})

const currentStep = ref(0)
const steps = ['账户信息', '个人资料', '完成注册']
const isAgreed = ref(false)

const rules: FormRules<RegisterForm> = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z](?=.*\d)[a-zA-Z0-9]{1,7}$/, message: '用户名2-8位，字母开头且包含数字', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { pattern: /^\S{6,10}$/, message: '密码长度6-10位', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  sex: [
    { pattern: /^(男|女)$/, message: '性别只能填写"男"或"女"', trigger: 'blur' }
  ],
  idNumber: [
    { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号格式', trigger: 'blur' }
  ]
}

const nextStep = async () => {
  if (currentStep.value === 0) {
    if (!isAgreed.value) {
      await ElMessageBox.alert('请先勾选用户平台使用协议', '提示', { confirmButtonText: '确定', type: 'warning' })
      return
    }
    const valid = await registerform.value?.validateField(['name', 'password'])
    if (valid) currentStep.value++
  } else if (currentStep.value === 1) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) currentStep.value--
}

const register = async (): Promise<void> => {
  localStorage.clear()
  if (!registerform.value) return
  try {
    await registerform.value.validate()
    await registerAPI(formModel.value)
    ElMessage.success('注册成功')
    router.push('/login')
  } catch (error: any) {
    console.error('注册错误:', error)
  }
}
</script>

<template>
  <div class="register-page">
    <!-- 背景图 -->
    <div class="bg-image"></div>
    
    <!-- 主卡片 -->
    <div class="main-card">
      <!-- 左侧品牌区 -->
      <div class="brand-panel">
        <div class="brand-header">
          <div class="logo">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 8v16l12 6 12-6V8L16 2z" fill="url(#brandGrad)" opacity="0.3"/>
              <path d="M16 2L4 8v16l12 6 12-6V8L16 2z" stroke="url(#brandGrad)" stroke-width="2" fill="none"/>
              <path d="M16 16L4 8M16 16l12-8M16 16v16" stroke="url(#brandGrad)" stroke-width="1.5"/>
              <circle cx="16" cy="16" r="4" fill="url(#brandGrad)"/>
              <defs>
                <linearGradient id="brandGrad" x1="4" y1="2" x2="28" y2="30">
                  <stop offset="0%" stop-color="#3b82f6"/>
                  <stop offset="100%" stop-color="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span class="brand-name">旅迹 AI</span>
        </div>
        
        <div class="brand-slogan">
          <h2>开启您的<br>智能旅游之旅</h2>
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
        <!-- 步骤指示器 -->
        <div class="step-indicator">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="step"
            :class="{ active: index === currentStep, completed: index < currentStep }"
          >
            <div class="step-dot">
              <svg v-if="index < currentStep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="step-label">{{ step }}</span>
            <div v-if="index < steps.length - 1" class="step-line">
              <div class="line-progress" :class="{ completed: index < currentStep }"></div>
            </div>
          </div>
        </div>
        
        <!-- 表单内容 -->
        <div class="form-content">
          <el-form
            ref="registerform"
            :rules="rules"
            :model="formModel"
            autocomplete="off"
          >
            <!-- 第一步 -->
            <div v-show="currentStep === 0" class="step-form">
              <div class="form-title">
                <h3>创建账户</h3>
                <p>请输入您的登录信息</p>
              </div>
              
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
                <div class="input-hint">用户名 2-8 位，字母开头且包含数字</div>
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
                <div class="input-hint">密码长度 6-10 位</div>
              </el-form-item>
              
              <div class="agreement">
                <el-checkbox v-model="isAgreed">
                  <span class="agreement-text">我已阅读并同意</span>
                  <a href="#" class="agreement-link">用户平台使用协议</a>
                </el-checkbox>
              </div>
            </div>
            
            <!-- 第二步 -->
            <div v-show="currentStep === 1" class="step-form">
              <div class="form-title">
                <h3>完善资料</h3>
                <p>帮助我们更好地为您服务</p>
              </div>
              
              <el-form-item prop="phone">
                <div class="input-wrapper">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <el-input
                    v-model="formModel.phone"
                    placeholder="电话号码"
                    size="large"
                    maxlength="11"
                  />
                </div>
              </el-form-item>
              
              <el-form-item prop="sex">
                <div class="radio-group">
                  <div 
                    class="radio-option"
                    :class="{ active: formModel.sex === '男' }"
                    @click="formModel.sex = '男'"
                  >
                    <span class="radio-emoji">👨</span>
                    <span class="radio-text">男</span>
                  </div>
                  <div 
                    class="radio-option"
                    :class="{ active: formModel.sex === '女' }"
                    @click="formModel.sex = '女'"
                  >
                    <span class="radio-emoji">👩</span>
                    <span class="radio-text">女</span>
                  </div>
                </div>
              </el-form-item>
              
              <el-form-item prop="idNumber">
                <div class="input-wrapper">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="16" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  <el-input
                    v-model="formModel.idNumber"
                    placeholder="身份证号"
                    size="large"
                    maxlength="18"
                  />
                </div>
              </el-form-item>
            </div>
            
            <!-- 第三步 -->
            <div v-show="currentStep === 2" class="step-form complete-step">
              <div class="complete-icon">🎉</div>
              <h3>准备就绪！</h3>
              <p>点击注册按钮完成账户创建</p>
              
              <div class="preview-info">
                <div class="preview-row">
                  <span class="label">用户名</span>
                  <span class="value">{{ formModel.name }}</span>
                </div>
                <div class="preview-row">
                  <span class="label">手机号</span>
                  <span class="value">{{ formModel.phone || '未填写' }}</span>
                </div>
              </div>
            </div>
          </el-form>
        </div>
        
        <!-- 底部按钮 -->
        <div class="form-footer">
          <button 
            v-if="currentStep > 0 && currentStep < 2"
            class="btn btn-secondary"
            @click="prevStep"
          >
            上一步
          </button>
          
          <button 
            v-if="currentStep < 2"
            class="btn btn-primary"
            @click="nextStep"
          >
            下一步
          </button>
          
          <button 
            v-if="currentStep === 2"
            class="btn btn-primary"
            @click="register"
          >
            完成注册
          </button>
        </div>
        
        <div class="login-link">
          已有账户？<router-link to="/login">立即登录</router-link>
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

.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

// 背景图
.bg-image {
  position: fixed;
  inset: 0;
  background-image: url('https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=1920&q=80');
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

// 主卡片
.main-card {
  position: relative;
  z-index: 1;
  display: flex;
  width: 1000px;
  min-height: 640px;
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

// 左侧品牌区
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
  padding: 40px 48px;
  background: #fff;
  display: flex;
  flex-direction: column;
}

// 步骤指示器
.step-indicator {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  margin-bottom: 40px;
  padding: 0 20px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
  
  .step-dot {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f3f4f6;
    border: 2px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: #9ca3af;
    transition: all 0.3s;
    margin-bottom: 8px;
    z-index: 2;
    
    svg {
      width: 16px;
      height: 16px;
    }
  }
  
  .step-label {
    font-size: 13px;
    color: #9ca3af;
    font-weight: 500;
    transition: all 0.3s;
  }
  
  .step-line {
    position: absolute;
    top: 18px;
    left: 50%;
    width: 100%;
    height: 2px;
    background: #e5e7eb;
    z-index: 1;
    
    .line-progress {
      height: 100%;
      width: 0;
      background: #3b82f6;
      transition: width 0.3s;
      
      &.completed {
        width: 100%;
      }
    }
  }
  
  &.active {
    .step-dot {
      background: #3b82f6;
      border-color: #3b82f6;
      color: #fff;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .step-label {
      color: #3b82f6;
      font-weight: 600;
    }
  }
  
  &.completed {
    .step-dot {
      background: #10b981;
      border-color: #10b981;
      color: #fff;
    }
    
    .step-label {
      color: #10b981;
    }
  }
}

// 表单内容
.form-content {
  flex: 1;
}

.step-form {
  .form-title {
    margin-bottom: 28px;
    
    h3 {
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 6px;
    }
    
    p {
      font-size: 14px;
      color: #9ca3af;
    }
  }
}

// 输入框
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
  margin-bottom: 16px;
  
  &.is-error {
    .input-wrapper {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  }
}

.input-hint {
  font-size: 12px;
  color: #d1d5db;
  margin-top: 6px;
  padding-left: 14px;
}

// 单选组
.radio-group {
  display: flex;
  gap: 16px;
  
  .radio-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: #fff;
    border: 1.5px solid #e5e7eb;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
      border-color: #3b82f6;
    }
    
    &.active {
      border-color: #3b82f6;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(6, 182, 212, 0.05));
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
    }
    
    .radio-emoji {
      font-size: 28px;
    }
    
    .radio-text {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }
  }
}

// 协议
.agreement {
  margin-top: 8px;
  
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

// 完成步骤
.complete-step {
  text-align: center;
  padding-top: 20px;
  
  .complete-icon {
    font-size: 56px;
    margin-bottom: 16px;
    animation: bounce 2s ease infinite;
  }
  
  h3 {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 8px;
  }
  
  p {
    font-size: 14px;
    color: #9ca3af;
    margin-bottom: 24px;
  }
  
  .preview-info {
    background: #f9fafb;
    border-radius: 12px;
    padding: 20px;
    text-align: left;
    
    .preview-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
      
      &:last-child {
        border-bottom: none;
      }
      
      .label {
        font-size: 14px;
        color: #6b7280;
      }
      
      .value {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
      }
    }
  }
}

// 底部按钮
.form-footer {
  margin-top: auto;
  padding-top: 24px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
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
  
  &.btn-secondary {
    background: #f3f4f6;
    color: #6b7280;
    margin-bottom: 12px;
    
    &:hover {
      background: #e5e7eb;
    }
  }
}

// 登录链接
.login-link {
  text-align: center;
  margin-top: 20px;
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

// 动画
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

// 响应式
@media (max-width: 900px) {
  .main-card {
    flex-direction: column;
    width: 100%;
    max-width: 480px;
  }
  
  .brand-panel {
    display: none;
  }
}

@media (max-width: 480px) {
  .register-page {
    padding: 12px;
  }
  
  .form-panel {
    padding: 32px 24px;
  }
  
  .step-indicator {
    padding: 0;
  }
}
</style>