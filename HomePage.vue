<script lang="ts" setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/module/user'
import { 
  MapLocation, 
  User, 
  Setting, 
  Document, 
  ChatDotRound,
  ArrowDown
} from '@element-plus/icons-vue'

const route = useRoute()
const userStore = useUserStore()

interface MenuItem {
  name: string
  path: string
  icon?: string
}

const subTitle = computed(() => {
  if (route.meta && route.meta.title) {
    return route.meta.title
  }
  if (route.matched && route.matched.length > 0) {
    for (let i = route.matched.length - 1; i >= 0; i--) {
      const matchedRoute = route.matched[i]
      if (matchedRoute.meta && matchedRoute.meta.title) {
        return matchedRoute.meta.title
      }
    }
  }
  return '景区后台'
})

const subMenu = computed<MenuItem[]>(() => {
  const menu = route.meta.menu
  if (Array.isArray(menu)) {
    return menu as MenuItem[]
  }
  return []
})

const username = computed(() => {
  return userStore.user?.name || '游客'
})

const avatar = computed(() => {
  return userStore.user?.avatar || ''
})

// 获取菜单图标
const getMenuIcon = (name: string) => {
  const iconMap: Record<string, any> = {
    '景点': MapLocation,
    '用户': User,
    '设置': Setting,
    '订单': Document,
    '反馈': ChatDotRound,
  }
  return iconMap[name] || Document
}
</script>

<template>
  <div class="home-container">
    <!-- 左侧主导航 -->
    <aside class="sidebar">
      <div class="logo-area">
        <div class="logo-icon">
          <el-icon size="28"><MapLocation /></el-icon>
        </div>
        <div class="logo-text">
          <span class="logo-title">景区后台</span>
          <span class="logo-sub">管理系统</span>
        </div>
      </div>

      <div class="menu-wrapper">
        <el-menu 
          router 
          :default-active="$route.path" 
          class="menu"
          background-color="transparent"
          text-color="#b8c5d6"
          active-text-color="#fff"
        >
          <el-menu-item
            v-for="item in subMenu"
            :key="item.path"
            :index="item.path"
            class="menu-item"
          >
            <el-icon class="menu-icon">
              <component :is="getMenuIcon(item.name)" />
            </el-icon>
            <span class="menu-name">{{ item.name }}</span>
          </el-menu-item>
        </el-menu>
      </div>

      <div class="sidebar-footer">
        <div class="footer-line"></div>
        <p class="footer-text">© 2026 景区管理</p>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main">
      <!-- 顶部 -->
      <div class="header">
        <div class="header-left">
          <div class="breadcrumb">
            <el-icon size="16" color="#909399"><Document /></el-icon>
            <span class="breadcrumb-text">{{ subTitle }}</span>
          </div>
        </div>

        <div class="header-right">

            <div class="user-info">
              <el-avatar 
                :size="32" 
                :src="avatar" 
                class="user-avatar"
              >
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="user-name">{{ username }}</span>
            </div>

        </div>
      </div>

      <!-- 内容 -->
      <div class="content-wrapper">
        <div class="content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  height: 100vh;
  background: #f0f2f5;
}

/* ========== 左侧边栏 ========== */
.sidebar {
  width: 220px;
  background: linear-gradient(180deg, #0d1b2a 0%, #1b2838 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.08);
  z-index: 100;
}

.logo-area {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff 0%, #1677ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.logo-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}

.logo-sub {
  font-size: 11px;
  color: #8b9dc3;
  font-weight: 400;
}

.menu-wrapper {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.menu-wrapper::-webkit-scrollbar {
  width: 4px;
}

.menu-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.menu {
  border: none;
  background: transparent !important;
}

.menu-item {
  height: 48px;
  line-height: 48px;
  padding: 0 16px !important;
  margin-bottom: 4px;
  border-radius: 8px;
  color: #b8c5d6 !important;
  transition: all 0.3s ease;
}

.menu-item:hover {
  background: rgba(64, 158, 255, 0.1) !important;
  color: #fff !important;
}

.menu-item.is-active {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.15) 0%, rgba(64, 158, 255, 0.05) 100%) !important;
  color: #fff !important;
  border-right: 3px solid #409eff;
}

.menu-icon {
  margin-right: 10px;
  font-size: 18px;
}

.menu-name {
  font-size: 14px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 16px;
  text-align: center;
}

.footer-line {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
  margin-bottom: 12px;
}

.footer-text {
  font-size: 11px;
  color: #5a6e8a;
  margin: 0;
}

/* ========== 主内容区 ========== */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ========== 顶部导航栏 ========== */
.header {
  height: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  z-index: 50;
}

.header-left {
  display: flex;
  align-items: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb-text {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: #f5f7fa;
}

.notice-badge :deep(.el-badge__content) {
  border: none;
  font-size: 10px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
}

.user-dropdown {
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all 0.3s;
}

.user-info:hover {
  background: #f5f7fa;
}

.user-avatar {
  border: 2px solid #e8f4fc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
}

/* ========== 内容区 ========== */
.content-wrapper {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.content-wrapper::-webkit-scrollbar {
  width: 6px;
}

.content-wrapper::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.content {
  background: #fff;
  border-radius: 12px;
  min-height: calc(100vh - 104px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

/* ========== 路由过渡动画 ========== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ========== 下拉菜单样式 ========== */
:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
}

:deep(.el-dropdown-menu__item .el-icon) {
  font-size: 16px;
  color: #606266;
}
</style>