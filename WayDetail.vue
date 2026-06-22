<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getWayDetail, type SpotItem } from '@/api/way'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Location, Clock, Star, View, Compass } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const spotList = ref<SpotItem[]>([])
const loading = ref(true)
const routeTitle = ref('')
const routeDesc = ref('')

const fetchData = async () => {
  const routeId = Number(route.params.id)
  if (!routeId) {
    ElMessage.error('路线ID无效')
    router.push('/user')
    return
  }
  loading.value = true
  try {
    const res = await getWayDetail(routeId)
    spotList.value = res
    // 如果有数据，提取路线标题
    if (res.length > 0) {
      routeTitle.value = res[0].routeName || '精选路线'
      routeDesc.value = res[0].routeDesc || '探索这条充满魅力的旅行路线'
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('获取景点失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/user')
}

const goToDetail = (id: number) => {
  router.push(`/user/spotDetail/${id}`)
}

onMounted(fetchData)
</script>

<template>
  <div class="way-detail-page">
    <!-- 顶部导航栏 -->
    <div class="top-nav">
      <div class="nav-left">
        <div class="logo-area">
          <div class="logo-icon">✈️</div>
          <span class="logo-text">旅迹</span>
        </div>

      </div>
      <div class="nav-right">
        <div class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </div>
      </div>
    </div>

    <!-- 英雄区 Hero Section -->
    <div class="hero-section">
      <div class="hero-bg">
        <img src="https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=80" alt="background" />
        <div class="hero-overlay"></div>
      </div>
      <div class="hero-content">
        <div class="breadcrumb">
          <span @click="goBack">首页</span>
          <el-icon><ArrowLeft /></el-icon>
          <span class="current">路线详情</span>
        </div>
        <h1 class="hero-title">{{ routeTitle || '精选路线' }}</h1>
        <p class="hero-subtitle">{{ routeDesc || '探索这条充满魅力的旅行路线' }}</p>

        <!-- 统计栏 -->
        <div class="stats-bar">
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><Compass /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ spotList.length }}</div>
              <div class="stat-label">景点数量</div>
            </div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ spotList.length * 2 }}h</div>
              <div class="stat-label">预计时长</div>
            </div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-card">
            <div class="stat-icon">
              <el-icon><Star /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">4.8</div>
              <div class="stat-label">综合评分</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 景点列表区 -->
    <div class="spots-section">
      <div class="section-header">
        <div class="header-left">
          <div class="section-tag">
            <span class="tag-dot"></span>
            <span>景点列表</span>
          </div>
          <h2 class="section-title">沿途景点</h2>
        </div>
      </div>

      <!-- 加载骨架屏 -->
      <div v-if="loading" class="spots-list">
        <div v-for="i in 3" :key="i" class="spot-card skeleton">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-tags"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
      </div>

      <!-- 景点列表 -->
      <div v-else-if="spotList.length" class="spots-list">
        <div
          class="spot-card"
          v-for="(spot, index) in spotList"
          :key="spot.id"
          @click="goToDetail(spot.id)"
        >
          <!-- 图片 -->
          <div class="spot-image">
            <img :src="spot.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'" :alt="spot.name" loading="lazy" />
            <div class="spot-order">
              <span class="order-num">{{ index + 1 }}</span>
              <span class="order-label">第{{ index + 1 }}站</span>
            </div>
            <div class="card-overlay">
              <div class="overlay-content">
                <el-icon size="20"><View /></el-icon>
                <span>查看详情</span>
              </div>
            </div>
          </div>

          <!-- 内容 -->
          <div class="spot-info">
            <div class="spot-header">
              <h3 class="spot-name">{{ spot.name }}</h3>
              <div class="spot-rating">
                <el-icon size="14" color="#f5a623"><Star /></el-icon>
                <span>4.{{ 5 + (index % 5) }}</span>
              </div>
            </div>

            <!-- 标签 -->
            <div class="tags">
              <span
                class="tag"
                v-for="tag in (spot.tags || '风景,文化').split(',')"
                :key="tag"
              >
                {{ tag.trim() }}
              </span>
            </div>

            <!-- 简介 -->
            <p class="desc">{{ spot.description || '暂无描述' }}</p>

            <!-- 亮点 -->
            <div class="highlight" v-if="spot.highlight">
              <el-icon size="14" color="#4a90d9"><Location /></el-icon>
              <span>{{ spot.highlight }}</span>
            </div>

            <!-- 底部信息 -->
            <div class="spot-footer">
              <div class="footer-left">
                <el-icon size="14"><Clock /></el-icon>
                <span>建议游玩 {{ 1 + (index % 3) }} 小时</span>
              </div>
              <div class="footer-right">
                <span>查看详情</span>
                <el-icon size="14"><ArrowLeft /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-container">
        <el-empty description="暂无景点数据" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ========== 页面基础 ========== */
.way-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
}

/* ========== 顶部导航 ========== */
.top-nav {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 48px;
  height: 64px;
  background: rgba(20, 30, 50, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
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
  font-size: 24px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
}

.nav-menus {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-menu-item {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px 0;
}

.nav-menu-item:hover {
  color: #fff;
}

.nav-right {
  display: flex;
  align-items: center;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* ========== 英雄区 ========== */
.hero-section {
  position: relative;
  width: 100%;
  height: 480px;
  overflow: hidden;
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
    rgba(20, 30, 50, 0.5) 50%,
    rgba(20, 30, 50, 0.7) 100%
  );
  z-index: 2;
}

.hero-content {
  position: relative;
  z-index: 3;
  padding: 60px 48px 0;
  max-width: 1200px;
  margin: 0 auto;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.breadcrumb span {
  cursor: pointer;
  transition: color 0.3s;
}

.breadcrumb span:hover {
  color: #fff;
}

.breadcrumb .current {
  color: rgba(255, 255, 255, 0.8);
  cursor: default;
}

.breadcrumb .el-icon {
  transform: rotate(180deg);
  font-size: 12px;
}

.hero-title {
  font-size: 42px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
  letter-spacing: 2px;
}

.hero-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 40px;
  max-width: 500px;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px 32px;
  width: fit-content;
  border: 1px solid rgba(255, 255, 255, 0.1);
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

/* ========== 景点列表区 ========== */
.spots-section {
  background: #f5f7fa;
  padding: 48px;
  min-height: 600px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
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
  color: #4a90d9;
  font-weight: 500;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4a90d9;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

/* ========== 景点列表 ========== */
.spots-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ========== 景点卡片 ========== */
.spot-card {
  display: flex;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: pointer;
}

.spot-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

/* 卡片图片 */
.spot-image {
  position: relative;
  width: 320px;
  height: 240px;
  flex-shrink: 0;
  overflow: hidden;
}

.spot-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.spot-card:hover .spot-image img {
  transform: scale(1.08);
}

.spot-order {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  padding: 6px 12px;
  border-radius: 20px;
  color: #fff;
  z-index: 2;
}

.order-num {
  font-size: 16px;
  font-weight: 700;
  color: #ffd700;
}

.order-label {
  font-size: 12px;
  opacity: 0.9;
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
}

.spot-card:hover .card-overlay {
  opacity: 1;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
}

/* 内容区域 */
.spot-info {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.spot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.spot-name {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.spot-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #f5a623;
  font-weight: 600;
}

/* 标签 */
.tags {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #f0f7ff;
  color: #4a90d9;
}

/* 简介 */
.desc {
  margin: 0 0 12px;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

/* 亮点 */
.highlight {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #f8f9fb;
  border-radius: 10px;
  font-size: 13px;
  color: #5a6c7d;
  margin-bottom: 14px;
}

/* 底部 */
.spot-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #4a90d9;
  transition: gap 0.3s ease;
}

.spot-card:hover .footer-right {
  gap: 8px;
}

/* ========== 骨架屏 ========== */
.skeleton .skeleton-image {
  width: 320px;
  height: 240px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

.skeleton-content {
  flex: 1;
  padding: 24px;
}

.skeleton-title {
  height: 24px;
  background: #e8e8e8;
  border-radius: 4px;
  margin-bottom: 12px;
  width: 50%;
}

.skeleton-tags {
  height: 28px;
  background: #e8e8e8;
  border-radius: 4px;
  margin-bottom: 14px;
  width: 40%;
}

.skeleton-text {
  height: 60px;
  background: #e8e8e8;
  border-radius: 4px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ========== 空状态 ========== */
.empty-container {
  height: 60vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .top-nav {
    padding: 0 20px;
  }

  .nav-menus {
    display: none;
  }

  .hero-section {
    height: 380px;
  }

  .hero-content {
    padding: 40px 20px 0;
  }

  .hero-title {
    font-size: 28px;
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

  .spots-section {
    padding: 32px 20px;
  }

  .spot-card {
    flex-direction: column;
  }

  .spot-image {
    width: 100%;
    height: 200px;
  }

  .skeleton .skeleton-image {
    width: 100%;
    height: 200px;
  }
}
</style>