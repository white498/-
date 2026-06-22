<script lang="ts" setup>
import { getWayList, type RouteItem } from '@/api/way'
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/module/user'
import {
  ChatDotRound,
  User,
  Location,
  Clock,
  View,
  Collection,
  ArrowRight,
  Search,
  Compass,
  MapLocation,
  Picture,
  StarFilled
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
const wayList = ref<RouteItem[]>([])
const loading = ref(true)

// 获得旅游路线
const GetWayList = async () => {
  loading.value = true
  try {
    const res = await getWayList()
    wayList.value = res
  } catch (error) {
    console.log(error)
    ElMessage.error('获取旅游路线失败')
  } finally {
    loading.value = false
  }
}

// 获取路线详情及景点列表
const ToWayDetail = async (id: number) => {
  try {
    router.push(`/user/wayDetail/${id}`)
  } catch (error) {
    console.log(error);
    ElMessage.error('获取路线详情失败')
  }
}

const goToAiPage = () => {
  router.push('/userAI')
}

const goToUserPage = () => {
  router.push('/userInfo')
}

const goToWayList = () => {
  router.push('/userWay')
}

// 统计数据
const stats = {
  totalRoutes: computed(() => wayList.value.length || 3),
  totalVisitors: 15234,
  averageRating: 4.8
}

onMounted(() => {
  GetWayList()
})
</script>

<template>
  <!-- 顶部导航栏 -->
  <div class="top-nav">
    <div class="nav-left">
      <div class="logo-area">
        <div class="logo-icon">
          <img src="https://img.icons8.com/color/96/around-the-globe.png" alt="logo" />
        </div>
        <span class="logo-text">旅迹</span>
      </div>
    </div>
    <div class="nav-right">
      <div class="avatar-box" @click="goToUserPage">
        <img :src="userStore.user?.avatar || defaultAvatar" alt="用户头像" class="circle-avatar">
      </div>
    </div>
  </div>

  <!-- 英雄区 Hero Section - 全屏背景图 -->
  <div class="hero-section">
    <div class="hero-bg">
      <img src="https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80" alt="background" />
      <div class="hero-overlay"></div>
    </div>

    <div class="hero-content">
      <h1 class="hero-title">
        发现属于你的<br/>
        <span class="highlight-text">美好旅程</span>
      </h1>
      <p class="hero-subtitle">在繁忙的都市生活之余，开启一段心灵的旅程</p>

      <!-- 统计卡片 -->
      <div class="stats-bar">
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Compass /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.totalRoutes }}</div>
            <div class="stat-label">精选路线</div>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.totalVisitors.toLocaleString() }}</div>
            <div class="stat-label">服务旅客</div>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><StarFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.averageRating }}</div>
            <div class="stat-label">综合评分</div>
          </div>
        </div>
      </div>
        <!-- 推荐路线区 -->
  <div class="recommend-section">
    <div class="section-header">
      <div class="header-left">
        <div class="section-tag">
          <span class="tag-dot"></span>
          <span>精选旅行路线</span>
        </div>
        <h2 class="section-title">精选旅行路线</h2>
        <p class="section-desc">为你精选的高品质旅行攻略</p>
      </div>
    </div>

    <!-- 加载骨架屏 -->
    <div v-if="loading" class="way-grid">
      <div class="main-card skeleton">
        <div class="skeleton-image"></div>
      </div>
      <div class="side-cards">
        <div v-for="i in 2" :key="i" class="side-card skeleton">
          <div class="skeleton-image"></div>
        </div>
      </div>
    </div>

    <!-- 路线列表 -->
    <div v-else class="way-grid">
      <div
        class="main-card"
        v-if="wayList[0]"
        :style="{ '--bg-image': `url(${wayList[0].coverImage})` }"
        @click="ToWayDetail(wayList[0].id)"
      >
        <div class="card-overlay"></div>
        <div class="card-badge" v-if="wayList[0].isHot">
          <span class="hot-icon">🔥</span>
          <span>热门推荐</span>
        </div>
        <div class="card-content">
          <div class="content-left">
            <h3 class="card-title">{{ wayList[0].title }}</h3>
            <div class="card-tags">
              <span class="tag audience-tag">
                <el-icon size="12"><User /></el-icon>
                {{ wayList[0].audience }}
              </span>
              <span class="tag duration-tag">
                <el-icon size="12"><Clock /></el-icon>
                {{ wayList[0].duration }}
              </span>
            </div>
          </div>
          <div class="content-right">
            <span class="view-detail">查看更多</span>
            <el-icon size="16"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>

      <div class="side-cards">
        <div
          class="side-card"
          v-for="item in wayList.slice(1, 3)"
          :key="item.id"
          :style="{ '--bg-image': `url(${item.coverImage})` }"
          @click="ToWayDetail(item.id)"
        >
          <div class="card-overlay"></div>
          <div class="card-badge" v-if="item.isHot">
            <span class="hot-icon">🔥</span>
            <span>热门推荐</span>
          </div>
          <div class="card-content">
            <div class="content-left">
              <h3 class="card-title">{{ item.title }}</h3>
              <div class="card-tags">
                <span class="tag audience-tag">
                  <el-icon size="12"><User /></el-icon>
                  {{ item.audience }}
                </span>
                <span class="tag duration-tag">
                  <el-icon size="12"><Clock /></el-icon>
                  {{ item.duration }}
                </span>
              </div>
            </div>
            <div class="content-right">
              <span class="view-detail">查看更多</span>
              <el-icon size="16"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- AI助手悬浮按钮 -->
  <div class="ai-fab" @click="goToAiPage">
    <div class="ai-pulse"></div>
    <div class="ai-icon">
      <el-icon size="24"><ChatDotRound /></el-icon>
    </div>
    <div class="ai-tooltip">AI 旅行助手</div>
  </div>
    </div>
  </div>


</template>

<style scoped>
/* ========== 顶部导航 ========== */
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 48px;
  height: 64px;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 48px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.logo-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
}


.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}


.avatar-box {
  cursor: pointer;
  transition: all 0.3s ease;
}

.circle-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.avatar-box:hover .circle-avatar {
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.05);
}

/* ========== 英雄区 ========== */
.hero-section {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  border-top-left-radius: 5px;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.hero-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(20, 30, 50, 0.75) 0%,
    rgba(20, 30, 50, 0.4) 50%,
    rgba(20, 30, 50, 0.6) 100%
  );
  z-index: 2;
}

.hero-content {
  position: relative;
  z-index: 3;
  padding: 70px 48px 0;
  margin: 0 auto;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
  line-height: 1.3;
  letter-spacing: 2px;
}

.highlight-text {
  background: linear-gradient(135deg, #72c0f8, #ffffff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 1px 3px rgba(114, 192, 248, 0.25);
}

.hero-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 48px;
  letter-spacing: 1px;
}

/* 统计栏 - 复刻图一通透水光玻璃效果 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(1px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 22px 30px;
  width: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.22);
  opacity: 1;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(255, 255, 255, 0.15);
}

/* ========== 推荐路线区 ========== */
.recommend-section {
  padding: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  max-width: 1400px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #7ab8e8;
  font-weight: 500;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7ab8e8;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0;
}

.section-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 4px 0 0;
}

.view-all {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.view-all:hover {
  color: #ffd700;
  gap: 10px;
}

/* ========== 路线网格布局 ========== */
.way-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1400px;
}

.side-cards {
  display: contents;
}

/* ========== 卡片样式 ========== */
.main-card,
.side-card {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* 背景图片伪元素 */
.main-card::before,
.side-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: var(--bg-image);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: transform 0.6s ease;
  z-index: 0;
}

.main-card,
.side-card {
  height: 240px;
}

.main-card:hover,
.side-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

/* 悬停时背景图片放大 */
.main-card:hover::before,
.side-card:hover::before {
  transform: scale(1.1);
}

/* 背景遮罩层 */
.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.75) 0%,
    rgba(0, 0, 0, 0.3) 40%,
    rgba(0, 0, 0, 0.1) 70%,
    transparent 100%
  );
  z-index: 1;
}

.card-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.9), rgba(255, 193, 7, 0.9));
  color: #1a1a2e;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 3;
}

.hot-icon {
  font-size: 13px;
}

/* 内容区域 - 底部布局 */
.card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  z-index: 2;
}

.content-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.main-card .card-title,
.side-card .card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: white;
  line-height: 1.3;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 标签区域 */
.card-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.audience-tag {
  background: rgba(242, 204, 112, 0.25);
  color: #f2cc70;
}

.duration-tag {
  background: rgba(74, 144, 217, 0.25);
  color: #7ab8f5;
}

/* 右侧查看更多 */
.content-right {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.main-card:hover .content-right,
.side-card:hover .content-right {
  gap: 10px;
  background: rgba(242, 204, 112, 0.25);
  color: #f2cc70;
}

.view-detail {
  font-size: 14px;
}

/* ========== 骨架屏样式 ========== */
.skeleton .skeleton-image {
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.main-card.skeleton {
  background: rgba(255, 255, 255, 0.08);
}

.side-card.skeleton {
  background: rgba(255, 255, 255, 0.08);
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ========== AI助手悬浮按钮 ========== */
.ai-fab {
  position: fixed;
  bottom: 32px;
  right: 32px;
  cursor: pointer;
  z-index: 1000;
}

.ai-pulse {
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  background: linear-gradient(135deg, #4a90d9 0%, #667eea 100%);
  border-radius: 50%;
  opacity: 0.5;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.ai-icon {
  position: relative;
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #4a90d9 0%, #667eea 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 16px rgba(74, 144, 217, 0.4);
  transition: all 0.3s ease;
}

.ai-fab:hover .ai-icon {
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(74, 144, 217, 0.5);
}

.ai-tooltip {
  position: absolute;
  right: 66px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  pointer-events: none;
}

.ai-fab:hover .ai-tooltip {
  opacity: 1;
  visibility: visible;
  right: 70px;
}

/* ========== 响应式设计 ========== */
@media (max-width: 768px) {
  .top-nav {
    padding: 0 20px;
  }

  .nav-menus {
    display: none;
  }

  .hero-section {
    height: 400px;
  }

  .hero-content {
    padding: 100px 20px 0;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 14px;
  }

  .stats-bar {
    padding: 16px 20px;
  }

  .stat-card {
    padding: 0 12px;
  }

  .stat-number {
    font-size: 18px;
  }

  .recommend-section {
    padding: 32px 20px;
  }

  .section-title {
    font-size: 22px;
  }

  .way-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .main-card,
  .side-card {
    height: 180px;
  }

  .card-content {
    padding: 16px;
  }

  .main-card .card-title,
  .side-card .card-title {
    font-size: 16px;
  }

  .ai-icon {
    width: 44px;
    height: 44px;
  }
}
</style>
