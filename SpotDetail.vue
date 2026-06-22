<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSpotDetail } from '@/api/way'
import type { SpotDetail } from '@/api/way'
import {
  RateInfoAPI,
  RateAPI,
  CommentListAPI,
  CommentAPI,
  TagAPI,
  UpdateRatingAPI,
  CommentDeleteAPI,
  CommentUpdateAPI,
  type RateInfo,
  type CommentListItem,
  type CommentListParams,
  type Tag,
  type RateParams,
  type UpdateRatingParams
} from '@/api/rate'
import { useUserStore } from '@/stores/module/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  StarFilled,
  ChatLineRound,
  Delete,
  Edit,
  Location,
  Clock,
  Sunny,
  User,
  Share,
  Collection,
  MapLocation,
  Picture,
  VideoPlay,
  CaretTop,
  CaretBottom,
  MagicStick,
  Guide,
  Compass,
  Ticket
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const spotDetail = ref<SpotDetail | null>(null)
const loading = ref(true)
const spotId = ref('')
const currentUserId = ref<number | null>(null)

// ========== 评分相关 ==========
const rateInfo = ref<RateInfo | null>(null)
const userScore = ref(0)
const userComment = ref('')
const hasRated = ref(false)

// ========== 评论列表相关 ==========
const commentList = ref<CommentListItem[]>([])
const commentTotal = ref(0)
const commentPage = ref(1)
const commentPageSize = ref(10)
const commentLoading = ref(false)

// ========== 评论标签 ==========
const tagList = ref<Tag[]>([])
const selectedTags = ref<string[]>([])

// ========== 弹窗控制 ==========
const rateDialogVisible = ref(false)
const commentDialogVisible = ref(false)
const isEditRate = ref(false)
const rateSubmitLoading = ref(false)
const commentSubmitLoading = ref(false)

// ========== 新增：景区主题交互状态 ==========
const activeTab = ref('overview')
const isScenicImageLoaded = ref(false)
const showAiTip = ref(true)
const expandedCommentId = ref<string | null>(null)
const imageGallery = ref<string[]>([])
const currentImageIndex = ref(0)
const showImageViewer = ref(false)
const isFavorite = ref(false)
const showScrollTop = ref(false)

// 模拟景区数据
const scenicMeta = ref({
  bestSeason: '春秋两季',
  openTime: '08:00 - 18:00',
  suggestedDuration: '2-3小时',
  crowdLevel: 'comfortable',
  weather: { temp: 24, condition: '晴', icon: 'sunny' },
  distance: '距您 12.5km',
  ticketPrice: '80/人',
  aiScore: 92,
  features: ['5A景区', '世界遗产', '拍照圣地', '亲子推荐'],
  visitRoute: [
    { time: '08:30', spot: '景区入口', type: 'start' },
    { time: '09:00', spot: '古塔观景台', type: 'view' },
    { time: '10:30', spot: '湖心亭', type: 'rest' },
    { time: '11:30', spot: '博物馆', type: 'culture' },
    { time: '13:00', spot: '山顶云海', type: 'peak' },
    { time: '14:30', spot: '出口', type: 'end' }
  ]
})

// ========== 获取景点详情 ==========
const fetchSpotDetail = async () => {
  const id = Number(route.params.id)
  if (!id) {
    ElMessage.error('景点ID无效')
    router.push('/user')
    return
  }
  spotId.value = String(id)

  loading.value = true
  try {
    const res = await getSpotDetail(id)
    spotDetail.value = res
    imageGallery.value = [res.imageUrl, res.imageUrl + '?v=2', res.imageUrl + '?v=3', res.imageUrl + '?v=4'].filter(Boolean)
    await Promise.all([
      fetchRateInfo(),
      fetchCommentList(),
      fetchTags(),
      fetchCurrentUserInfo()
    ])
  } catch (error) {
    console.error('获取景点详情失败:', error)
    ElMessage.error('获取景点详情失败')
  } finally {
    loading.value = false
    setTimeout(() => isScenicImageLoaded.value = true, 300)
  }
}

// ========== 获取评分信息 ==========
const fetchRateInfo = async () => {
  if (!spotId.value) return
  try {
    const res = await RateInfoAPI(Number(spotId.value))
    rateInfo.value = res
    userScore.value = res.userScore || 0
    userComment.value = res.userComment || ''
    hasRated.value = !!res.userScore
  } catch (error) {
    console.error('获取评分信息失败:', error)
  }
}

// ========== 获取评论列表 ==========
const fetchCommentList = async () => {
  if (!spotId.value) return
  commentLoading.value = true
  try {
    const params: CommentListParams = {
      page: commentPage.value,
      page_size: commentPageSize.value
    }
    const res = await CommentListAPI(Number(spotId.value), params)
    commentList.value = res.comments || []
    commentTotal.value = res.total || 0
  } catch (error) {
    console.error('获取评论列表失败:', error)
    ElMessage.error('获取评论列表失败')
  } finally {
    commentLoading.value = false
  }
}

// ========== 获取评论标签 ==========
const fetchTags = async () => {
  try {
    const res = await TagAPI()
    tagList.value = res || []
  } catch (error) {
    console.error('获取标签失败:', error)
  }
}

// ========== 获取当前用户信息 ==========
const fetchCurrentUserInfo = async () => {
  try {
    await userStore.getUser()
    const userData = userStore.user as any
    currentUserId.value = userData?.id || null
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

// ========== 打开评分弹窗 ==========
const openRateDialog = (edit = false) => {
  isEditRate.value = edit
  if (edit && rateInfo.value) {
    userScore.value = rateInfo.value.userScore || 0
  } else {
    userScore.value = 0
  }
  rateDialogVisible.value = true
}

const handleSubmitRate = async () => {
  if (userScore.value === 0) {
    ElMessage.warning('请选择评分')
    return
  }
  rateSubmitLoading.value = true
  try {
    if (isEditRate.value && hasRated.value) {
      const params: UpdateRatingParams = {
        score: userScore.value,
        spotId: Number(spotId.value)
      }
      const res = await UpdateRatingAPI(params)
      ElMessage.success('评分修改成功')
      if (res) {
        rateInfo.value = {
          ...rateInfo.value,
          avgScore: res.avgScore,
          ratingCount: res.ratingCount,
          userScore: res.score
        } as RateInfo
      }
    } else {
      const params: RateParams = {
        spotId: Number(spotId.value),
        score: userScore.value
      }
      await RateAPI(params)
      ElMessage.success('评分成功')
    }
    rateDialogVisible.value = false
    hasRated.value = true
    await fetchRateInfo()
  } catch (error) {
    console.error('评分提交错误:', error)
    ElMessage.error(isEditRate.value ? '修改评分失败' : '评分失败')
  } finally {
    rateSubmitLoading.value = false
  }
}

// ========== 打开评论弹窗 ==========
const isEditComment = computed(() => !!rateInfo.value?.userComment)

const openCommentDialog = () => {
  if (rateInfo.value?.userComment) {
    userComment.value = rateInfo.value.userComment
    if (rateInfo.value.userTags) {
      selectedTags.value = rateInfo.value.userTags.split(',').filter(tag => tag.trim())
    } else {
      selectedTags.value = []
    }
  } else {
    userComment.value = ''
    selectedTags.value = []
  }
  commentDialogVisible.value = true
}

// ========== 提交评论 ==========
const handleSubmitComment = async () => {
  if (!userComment.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  commentSubmitLoading.value = true
  try {
    const params: any = {
      spotId: Number(spotId.value),
      comment: userComment.value.trim()
    }
    if (selectedTags.value.length > 0) {
      params.tags = selectedTags.value.join(',')
    }

    if (rateInfo.value?.userComment) {
      await CommentUpdateAPI(params)
      ElMessage.success('评论修改成功')
    } else {
      await CommentAPI(params)
      ElMessage.success('评论发表成功')
    }
    commentDialogVisible.value = false
    selectedTags.value = []
    await fetchCommentList()
    await fetchRateInfo()
  } catch (error: any) {
    ElMessage.error(rateInfo.value?.userComment ? '修改评论失败' : '发表评论失败')
    console.error('评论提交错误:', error)
  } finally {
    commentSubmitLoading.value = false
  }
}

// ========== 删除评论 ==========
const handleDeleteComment = async (comment?: CommentListItem) => {
  try {
    await ElMessageBox.confirm('确定删除您的评论吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await CommentDeleteAPI(Number(spotId.value))
    ElMessage.success('删除评论成功')
    userComment.value = ''
    commentDialogVisible.value = false
    await fetchCommentList()
    await fetchRateInfo()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除评论失败')
    }
  }
}

// ========== 评论分页变化 ==========
const handleCommentPageChange = (val: number) => {
  commentPage.value = val
  fetchCommentList()
}

const handleCommentSizeChange = (val: number) => {
  commentPageSize.value = val
  commentPage.value = 1
  fetchCommentList()
}

// ========== 返回上一页 ==========
const goBack = () => {
  router.back()
}

// ========== 格式化日期 ==========
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ========== 新增交互方法 ==========
const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
  ElMessage.success(isFavorite.value ? '已收藏该景点' : '已取消收藏')
}

const toggleCommentExpand = (comment: CommentListItem) => {
  const id = comment.userId + comment.createdAt
  expandedCommentId.value = expandedCommentId.value === id ? null : id
}

const openImageViewer = (index: number) => {
  currentImageIndex.value = index
  showImageViewer.value = true
}

const getCrowdLevelText = (level: string) => {
  const map: Record<string, { text: string; color: string }> = {
    comfortable: { text: '舒适', color: '#22c55e' },
    moderate: { text: '适中', color: '#f59e0b' },
    crowded: { text: '拥挤', color: '#ef4444' }
  }
  return map[level] || { text: '未知', color: '#999' }
}

const getRouteTypeIcon = (type: string) => {
  const map: Record<string, string> = {
    start: '起点',
    view: '观景',
    rest: '休憩',
    culture: '文化',
    peak: '高峰',
    end: '终点'
  }
  return map[type] || type
}

const getRouteTypeColor = (type: string) => {
  const map: Record<string, string> = {
    start: '#3b82f6',
    view: '#8b5cf6',
    rest: '#10b981',
    culture: '#f59e0b',
    peak: '#ef4444',
    end: '#6b7280'
  }
  return map[type] || '#999'
}

const handleScroll = () => {
  showScrollTop.value = window.scrollY > 300
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(activeTab, (val) => {
  if (val === 'reviews') {
    setTimeout(() => {
      const el = document.querySelector('.comment-section')
      el?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }
})

onMounted(() => {
  fetchSpotDetail()
  window.addEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="spot-detail-page">
    <!-- 沉浸式顶部大图 -->
    <div class="hero-section" :class="{ loaded: isScenicImageLoaded }">
      <div class="hero-image-wrapper">
        <img :src="spotDetail?.imageUrl" :alt="spotDetail?.name" class="hero-image">
        <div class="hero-gradient"></div>
      </div>

      <div class="floating-nav">
        <el-button class="nav-back" text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <div class="nav-actions">
          <el-button class="nav-btn" text @click="toggleFavorite">
            <el-icon :class="{ favorite: isFavorite }"><Collection /></el-icon>
          </el-button>
          <el-button class="nav-btn" text>
            <el-icon><Share /></el-icon>
          </el-button>
        </div>
      </div>

      <div class="hero-info">
        <div class="hero-tags">
          <span v-for="feature in scenicMeta.features" :key="feature" class="feature-badge">
            {{ feature }}
          </span>
        </div>
        <h1 class="hero-title">{{ spotDetail?.name }}</h1>
        <div class="hero-meta">
          <span class="meta-item"><el-icon><Location /></el-icon>{{ scenicMeta.distance }}</span>
          <span class="meta-item"><el-icon><Clock /></el-icon>{{ scenicMeta.openTime }}</span>
          <span class="meta-item"><el-icon><Sunny /></el-icon>{{ scenicMeta.weather.temp }}C {{ scenicMeta.weather.condition }}</span>
        </div>
      </div>

      <transition name="slide-down">
        <div v-if="showAiTip" class="ai-tip-bar">
          <el-icon class="ai-icon"><MagicStick /></el-icon>
          <span class="ai-text"><strong>AI 智能建议：</strong>当前时段人流舒适，建议游览时长 {{ scenicMeta.suggestedDuration }}，最佳拍照点在古塔观景台</span>
          <el-icon class="ai-close" @click="showAiTip = false"><CaretTop /></el-icon>
        </div>
      </transition>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>

    <!-- 主内容区 -->
    <div v-else-if="spotDetail" class="main-content">
      <!-- 快捷信息栏 -->
      <div class="quick-info-bar">
        <div class="info-item">
          <div class="info-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <el-icon><Ticket /></el-icon>
          </div>
          <div class="info-text"><span class="info-label">门票</span><span class="info-value">{{ scenicMeta.ticketPrice }}</span></div>
        </div>
        <div class="info-item">
          <div class="info-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="info-text"><span class="info-label">建议时长</span><span class="info-value">{{ scenicMeta.suggestedDuration }}</span></div>
        </div>
        <div class="info-item">
          <div class="info-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
            <el-icon><Compass /></el-icon>
          </div>
          <div class="info-text"><span class="info-label">最佳季节</span><span class="info-value">{{ scenicMeta.bestSeason }}</span></div>
        </div>
        <div class="info-item">
          <div class="info-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
            <el-icon><User /></el-icon>
          </div>
          <div class="info-text"><span class="info-label">实时人流</span><span class="info-value" :style="{ color: getCrowdLevelText(scenicMeta.crowdLevel).color }">{{ getCrowdLevelText(scenicMeta.crowdLevel).text }}</span></div>
        </div>
      </div>

      <div class="content-grid">
        <!-- 左侧主内容 -->
        <div class="left-column">
          <div class="tab-nav">
            <button v-for="tab in [
              { key: 'overview', label: '概览', icon: MapLocation },
              { key: 'story', label: '故事', icon: VideoPlay },
              { key: 'highlight', label: '亮点', icon: StarFilled },
              { key: 'reviews', label: '评价', icon: ChatLineRound }
            ]" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
              <el-icon><component :is="tab.icon" /></el-icon>
              {{ tab.label }}
            </button>
          </div>

          <!-- 概览 -->
          <div v-show="activeTab === 'overview'" class="tab-content">
            <div class="rating-card" v-if="rateInfo">
              <div class="rating-main">
                <div class="rating-score-display">
                  <span class="big-score">{{ rateInfo.avgScore?.toFixed(1) || '0.0' }}</span>
                  <div class="score-detail">
                    <el-rate :model-value="rateInfo.avgScore" disabled :colors="['#99A9BF', '#F7BA2A', '#FF9900']" size="large" />
                    <span class="rating-count-text"><el-icon><ChatLineRound /></el-icon>{{ rateInfo.ratingCount }} 人评分</span>
                  </div>
                </div>
                <div class="rating-action-area">
                  <el-button v-if="!hasRated" type="primary" size="large" class="rate-btn" @click="openRateDialog(false)">
                    <el-icon><StarFilled /></el-icon>我要评分
                  </el-button>
                  <div v-else class="my-rating">
                    <div class="my-rating-stars"><span class="my-label">我的评分</span><el-rate :model-value="userScore" disabled /></div>
                    <el-button type="primary" text @click="openRateDialog(true)"><el-icon><Edit /></el-icon>修改</el-button>
                  </div>
                </div>
              </div>
              <div v-if="rateInfo?.userComment" class="my-comment-preview">
                <div class="preview-header"><span class="preview-label">我的评价</span><el-button type="danger" text size="small" @click="handleDeleteComment"><el-icon><Delete /></el-icon>删除</el-button></div>
                <p class="preview-text">{{ rateInfo.userComment }}</p>
                <div class="preview-tags" v-if="rateInfo.userTags">
                  <el-tag v-for="tag in rateInfo.userTags.split(',')" :key="tag" size="small" type="info" effect="plain" round>{{ tag }}</el-tag>
                </div>
              </div>
            </div>

            <div class="content-section">
              <div class="section-header"><el-icon><Guide /></el-icon><h3>景点介绍</h3></div>
              <div class="section-body"><p>{{ spotDetail.description }}</p></div>
            </div>

            <div class="content-section">
              <div class="section-header"><el-icon><Picture /></el-icon><h3>精彩瞬间</h3></div>
              <div class="gallery-grid">
                <div v-for="(img, idx) in imageGallery" :key="idx" class="gallery-item" :class="{ large: idx === 0 }" @click="openImageViewer(idx)">
                  <img :src="img" :alt="spotDetail.name">
                  <div class="gallery-overlay"><el-icon><VideoPlay /></el-icon></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 故事 -->
          <div v-show="activeTab === 'story'" class="tab-content">
            <div class="content-section story-section">
              <div class="section-header"><el-icon><VideoPlay /></el-icon><h3>景点故事</h3></div>
              <div class="section-body story-body">
                <div class="story-timeline">
                  <div class="timeline-line"></div>
                  <div class="story-paragraph" v-for="n in 3" :key="n">
                    <div class="timeline-dot"></div>
                    <p>{{ spotDetail.story }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 亮点 -->
          <div v-show="activeTab === 'highlight'" class="tab-content">
            <div class="content-section">
              <div class="section-header"><el-icon><StarFilled /></el-icon><h3>景点亮点</h3></div>
              <div class="section-body">
                <div class="highlight-cards">
                  <div class="highlight-card" v-for="n in 3" :key="n">
                    <div class="highlight-icon"><el-icon><Location /></el-icon></div>
                    <p>{{ spotDetail.highlight }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 评价 -->
          <div v-show="activeTab === 'reviews'" class="tab-content">
            <div class="comment-section">
              <div class="comment-toolbar">
                <div class="toolbar-left">
                  <h3><el-icon><ChatLineRound /></el-icon>游客评价<span class="count-badge">{{ commentTotal }}</span></h3>
                </div>
                <el-button type="primary" class="write-btn" @click="openCommentDialog">
                  <el-icon><Edit /></el-icon>{{ rateInfo?.userComment ? '修改评价' : '写评价' }}
                </el-button>
              </div>
              <div class="comment-list" v-loading="commentLoading">
                <el-empty v-if="commentList.length === 0" description="暂无评论，快来抢沙发吧" />
                <div v-for="comment in commentList" :key="comment.userId + comment.createdAt" class="comment-card" :class="{ expanded: expandedCommentId === comment.userId + comment.createdAt }">
                  <div class="comment-header-row">
                    <div class="comment-user-info">
                      <el-avatar :size="44" :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`" />
                      <div class="user-meta"><span class="user-name">{{ comment.name }}</span><span class="comment-date">{{ formatDate(comment.createdAt) }}</span></div>
                    </div>
                    <el-button v-if="currentUserId === comment.userId" type="danger" text size="small" @click="handleDeleteComment(comment)"><el-icon><Delete /></el-icon></el-button>
                  </div>
                  <p class="comment-content">{{ comment.comment }}</p>
                  <div class="comment-tags-row" v-if="comment.tags && comment.tags.length > 0">
                    <el-tag v-for="tag in comment.tags.split(',')" :key="tag" size="small" type="info" effect="plain" round>{{ tag }}</el-tag>
                  </div>
                  <div class="comment-footer-row">
                    <span class="expand-hint" @click="toggleCommentExpand(comment)">
                      {{ expandedCommentId === comment.userId + comment.createdAt ? '收起' : '展开' }}
                      <el-icon><CaretTop v-if="expandedCommentId === comment.userId + comment.createdAt" /><CaretBottom v-else /></el-icon>
                    </span>
                  </div>
                </div>
              </div>
              <div class="comment-pagination" v-if="commentTotal > 0">
                <el-pagination v-model:current-page="commentPage" v-model:page-size="commentPageSize" :page-sizes="[10, 20, 50]" :total="commentTotal" layout="total, sizes, prev, pager, next, jumper" @size-change="handleCommentSizeChange" @current-change="handleCommentPageChange" />
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧边栏 -->
        <div class="right-sidebar">
          <div class="sidebar-card ai-card">
            <div class="ai-card-header"><el-icon><MagicStick /></el-icon><span>AI 综合评分</span></div>
            <div class="ai-score-circle">
              <svg viewBox="0 0 120 120" class="score-svg">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" stroke-width="8"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="url(#scoreGradient)" stroke-width="8" stroke-dasharray="283" :stroke-dashoffset="283 - (283 * scenicMeta.aiScore / 100)" stroke-linecap="round" transform="rotate(-90 60 60)"/>
                <defs><linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs>
              </svg>
              <div class="score-number-overlay"><span class="score-big">{{ scenicMeta.aiScore }}</span><span class="score-unit">分</span></div>
            </div>
            <p class="ai-score-desc">基于游客评价、环境质量、设施完善度综合计算</p>
          </div>

          <div class="sidebar-card route-card">
            <div class="route-header"><el-icon><MapLocation /></el-icon><span>推荐游览路线</span></div>
            <div class="route-timeline">
              <div v-for="(route, idx) in scenicMeta.visitRoute" :key="idx" class="route-node">
                <div class="route-time">{{ route.time }}</div>
                <div class="route-dot" :style="{ background: getRouteTypeColor(route.type) }"></div>
                <div class="route-info"><span class="route-name">{{ route.spot }}</span><span class="route-type" :style="{ color: getRouteTypeColor(route.type) }">{{ getRouteTypeIcon(route.type) }}</span></div>
              </div>
            </div>
            <el-button type="primary" class="route-btn" plain><el-icon><Guide /></el-icon>导航到景区</el-button>
          </div>

          <div class="sidebar-card related-card">
            <div class="related-header"><el-icon><Compass /></el-icon><span>周边推荐</span></div>
            <div class="related-list">
              <div class="related-item" v-for="n in 3" :key="n">
                <div class="related-thumb"></div>
                <div class="related-info"><span class="related-name">附近景点 {{ n }}</span><span class="related-distance">{{ (n * 2.5).toFixed(1) }} km</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 无数据 -->
    <div v-else class="empty-container"><el-empty description="暂无景点详情" /><el-button type="primary" @click="goBack">返回</el-button></div>

    <!-- 评分弹窗 -->
    <el-dialog v-model="rateDialogVisible" :title="isEditRate ? '修改评分' : '我要评分'" width="420px" :close-on-click-modal="false" class="scenic-dialog">
      <div class="rate-dialog-body">
        <p class="rate-hint">请点击星星进行评分</p>
        <el-rate v-model="userScore" :max="5" :colors="['#99A9BF', '#F7BA2A', '#FF9900']" show-text :texts="['极差', '失望', '一般', '满意', '惊喜']" size="large" />
        <p class="rate-result" v-if="userScore > 0">您选择了 <strong>{{ userScore }}</strong> 星 - {{ ['极差', '失望', '一般', '满意', '惊喜'][userScore - 1] }}</p>
      </div>
      <template #footer>
        <el-button @click="rateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitRate" :loading="rateSubmitLoading" :disabled="userScore === 0">{{ isEditRate ? '修改' : '提交' }}</el-button>
      </template>
    </el-dialog>

    <!-- 评论弹窗 -->
    <el-dialog v-model="commentDialogVisible" :title="isEditComment ? '修改评价' : '写评价'" width="520px" :close-on-click-modal="false" class="scenic-dialog">
      <div class="comment-dialog-body">
        <div class="comment-input-area">
          <el-avatar :size="40" :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId || 0}`" />
          <el-input v-model="userComment" type="textarea" :rows="4" placeholder="分享您的游览体验，帮助更多游客做出选择..." maxlength="500" show-word-limit resize="none" />
        </div>
        <div class="tag-select-area" v-if="tagList.length > 0">
          <p class="tag-title">选择标签（可选）：</p>
          <div class="tag-cloud">
            <el-check-tag v-for="tag in tagList" :key="tag.id" :checked="selectedTags.includes(tag.tagName)" @change="(checked: boolean) => { if (checked) { selectedTags.push(tag.tagName) } else { selectedTags = selectedTags.filter(t => t !== tag.tagName) } }" class="scenic-tag">{{ tag.tagName }}</el-check-tag>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="commentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitComment" :loading="commentSubmitLoading" :disabled="!userComment.trim()">{{ isEditComment ? '修改' : '发表' }}</el-button>
      </template>
    </el-dialog>

    <!-- 图片查看器 -->
    <el-dialog v-model="showImageViewer" width="80%" :show-close="true" class="image-viewer-dialog">
      <img :src="imageGallery[currentImageIndex]" class="viewer-image" :alt="spotDetail?.name">
    </el-dialog>

    <!-- 返回顶部 -->
    <transition name="fade">
      <el-button v-if="showScrollTop" class="scroll-top-btn" circle @click="scrollToTop"><el-icon><CaretTop /></el-icon></el-button>
    </transition>
  </div>
</template>

<style scoped>
.spot-detail-page {
  --primary: #3b82f6;
  --primary-light: #eff6ff;
  --accent: #f59e0b;
  --success: #22c55e;
  --danger: #ef4444;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  min-height: 100vh;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* Hero */
.hero-section { position: relative; height: 520px; overflow: hidden; transition: all 0.6s ease; }
.hero-image-wrapper { position: absolute; inset: 0; }
.hero-image { width: 100%; height: 100%; object-fit: cover; transform: scale(1.1); transition: transform 8s ease; }
.hero-section.loaded .hero-image { transform: scale(1); }
.hero-gradient { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.85) 100%); }

.floating-nav { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; z-index: 10; }
.nav-back, .nav-btn { color: white !important; background: rgba(255,255,255,0.15) !important; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2) !important; border-radius: 50% !important; width: 40px; height: 40px; padding: 0 !important; transition: all 0.3s ease; }
.nav-back:hover, .nav-btn:hover { background: rgba(255,255,255,0.3) !important; transform: translateY(-2px); }
.nav-btn .el-icon.favorite { color: #fbbf24; }
.nav-actions { display: flex; gap: 12px; }

.hero-info { position: absolute; bottom: 60px; left: 0; right: 0; padding: 0 40px; z-index: 5; }
.hero-tags { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.feature-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); color: white; border: 1px solid rgba(255,255,255,0.3); }
.hero-title { font-size: 42px; font-weight: 800; color: white; margin: 0 0 16px; text-shadow: 0 2px 10px rgba(0,0,0,0.3); letter-spacing: -0.5px; }
.hero-meta { display: flex; gap: 24px; flex-wrap: wrap; }
.meta-item { display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.85); font-size: 14px; }
.meta-item .el-icon { font-size: 16px; }

/* AI Tip */
.ai-tip-bar { position: absolute; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; padding: 12px 40px; background: linear-gradient(90deg, #1e3a5f 0%, #2563eb 100%); color: white; font-size: 13px; z-index: 6; }
.ai-icon { color: #fbbf24; font-size: 18px; animation: pulse 2s infinite; }
.ai-text { flex: 1; }
.ai-text strong { color: #fbbf24; }
.ai-close { cursor: pointer; opacity: 0.7; transition: opacity 0.2s; }
.ai-close:hover { opacity: 1; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.3s ease; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-100%); opacity: 0; }

/* Quick Info Bar */
.quick-info-bar { max-width: 1200px; margin: -30px auto 0; padding: 0 24px; display: flex; gap: 16px; position: relative; z-index: 10; flex-wrap: wrap; }
.info-item { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); transition: transform 0.3s ease, box-shadow 0.3s ease; }
.info-item:hover { transform: translateY(-4px); box-shadow: var(--shadow-xl); }
.info-icon { width: 48px; height: 48px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; flex-shrink: 0; }
.info-text { display: flex; flex-direction: column; gap: 4px; }
.info-label { font-size: 12px; color: var(--text-muted); }
.info-value { font-size: 16px; font-weight: 700; color: var(--text-primary); }

/* Main Content */
.main-content { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
.content-grid { display: grid; grid-template-columns: 1fr 340px; gap: 32px; margin-top: 32px; }

/* Tab Nav */
.tab-nav { display: flex; gap: 8px; margin-bottom: 24px; padding: 6px; background: white; border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); }
.tab-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border: none; background: transparent; color: var(--text-secondary); font-size: 14px; font-weight: 600; border-radius: var(--radius-lg); cursor: pointer; transition: all 0.3s ease; }
.tab-btn:hover { color: var(--primary); background: var(--primary-light); }
.tab-btn.active { color: white; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
.tab-btn .el-icon { font-size: 16px; }

/* Tab Content */
.tab-content { animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Rating Card */
.rating-card { background: white; border-radius: var(--radius-xl); padding: 28px; box-shadow: var(--shadow); margin-bottom: 24px; }
.rating-main { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
.rating-score-display { display: flex; align-items: center; gap: 20px; }
.big-score { font-size: 64px; font-weight: 800; line-height: 1; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.score-detail { display: flex; flex-direction: column; gap: 8px; }
.rating-count-text { font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
.rating-action-area { display: flex; align-items: center; }
.rate-btn { padding: 12px 28px !important; font-size: 15px !important; border-radius: var(--radius-lg) !important; }
.my-rating { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.my-rating-stars { display: flex; align-items: center; gap: 8px; }
.my-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

.my-comment-preview { margin-top: 20px; padding-top: 20px; border-top: 1px dashed #e5e7eb; }
.preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.preview-label { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.preview-text { margin: 0 0 12px; font-size: 14px; color: var(--text-secondary); line-height: 1.7; background: #f9fafb; padding: 16px; border-radius: var(--radius); border-left: 3px solid var(--primary); }
.preview-tags { display: flex; gap: 8px; flex-wrap: wrap; }

/* Content Section */
.content-section { background: white; border-radius: var(--radius-xl); padding: 28px; box-shadow: var(--shadow); margin-bottom: 24px; }
.section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.section-header .el-icon { font-size: 20px; color: var(--primary); }
.section-header h3 { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-primary); }
.section-body p { margin: 0; font-size: 15px; color: var(--text-secondary); line-height: 1.8; text-align: justify; }

/* Gallery */
.gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: 200px 120px; gap: 12px; }
.gallery-item { position: relative; border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: transform 0.3s ease; }
.gallery-item:hover { transform: scale(1.02); }
.gallery-item.large { grid-column: span 2; grid-row: span 2; }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.gallery-item:hover img { transform: scale(1.1); }
.gallery-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; }
.gallery-item:hover .gallery-overlay { opacity: 1; }
.gallery-overlay .el-icon { font-size: 32px; color: white; }

/* Story Timeline */
.story-timeline { position: relative; padding-left: 24px; }
.timeline-line { position: absolute; left: 6px; top: 8px; bottom: 8px; width: 2px; background: linear-gradient(to bottom, #3b82f6, #8b5cf6); border-radius: 1px; }
.story-paragraph { position: relative; margin-bottom: 24px; }
.story-paragraph:last-child { margin-bottom: 0; }
.timeline-dot { position: absolute; left: -22px; top: 8px; width: 12px; height: 12px; border-radius: 50%; background: white; border: 3px solid #3b82f6; }

/* Highlight Cards */
.highlight-cards { display: grid; gap: 16px; }
.highlight-card { display: flex; gap: 16px; padding: 20px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: var(--radius); border-left: 4px solid #3b82f6; transition: transform 0.3s ease; }
.highlight-card:hover { transform: translateX(8px); }
.highlight-icon { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #6366f1); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
.highlight-card p { margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.6; }

/* Comment Section */
.comment-section { background: white; border-radius: var(--radius-xl); padding: 28px; box-shadow: var(--shadow); }
.comment-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.toolbar-left h3 { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px; }
.count-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; padding: 0 10px; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; font-size: 13px; font-weight: 600; border-radius: 14px; }
.write-btn { padding: 10px 24px !important; border-radius: var(--radius-lg) !important; }

.comment-card { padding: 20px; background: #f9fafb; border-radius: var(--radius-lg); margin-bottom: 16px; transition: all 0.3s ease; border: 1px solid transparent; }
.comment-card:hover { background: white; border-color: #e5e7eb; box-shadow: var(--shadow); transform: translateY(-2px); }
.comment-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.comment-user-info { display: flex; align-items: center; gap: 12px; }
.user-meta { display: flex; flex-direction: column; gap: 2px; }
.user-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.comment-date { font-size: 12px; color: var(--text-muted); }
.comment-content { margin: 0 0 12px; font-size: 14px; color: var(--text-secondary); line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; transition: all 0.3s ease; }
.comment-card.expanded .comment-content { -webkit-line-clamp: unset; }
.comment-tags-row { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.comment-footer-row { display: flex; justify-content: flex-end; }
.expand-hint { font-size: 13px; color: var(--primary); cursor: pointer; display: flex; align-items: center; gap: 4px; transition: color 0.2s; }
.expand-hint:hover { color: #2563eb; }
.comment-pagination { margin-top: 24px; display: flex; justify-content: center; }

/* Right Sidebar */
.right-sidebar { display: flex; flex-direction: column; gap: 24px; }
.sidebar-card { background: white; border-radius: var(--radius-xl); padding: 24px; box-shadow: var(--shadow); transition: transform 0.3s ease, box-shadow 0.3s ease; }
.sidebar-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }

.ai-card-header { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
.ai-card-header .el-icon { color: #8b5cf6; font-size: 20px; }
.ai-score-circle { position: relative; width: 140px; height: 140px; margin: 0 auto 16px; }
.score-svg { width: 100%; height: 100%; }
.score-number-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.score-big { font-size: 42px; font-weight: 800; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; }
.score-unit { font-size: 14px; color: var(--text-muted); }
.ai-score-desc { text-align: center; font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.6; }

.route-header { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
.route-header .el-icon { color: var(--success); font-size: 20px; }
.route-timeline { position: relative; padding-left: 16px; margin-bottom: 20px; }
.route-timeline::before { content: ''; position: absolute; left: 5px; top: 8px; bottom: 8px; width: 2px; background: linear-gradient(to bottom, #e5e7eb, #d1d5db); }
.route-node { position: relative; display: flex; align-items: center; gap: 12px; padding: 10px 0; }
.route-time { font-size: 12px; color: var(--text-muted); width: 48px; flex-shrink: 0; }
.route-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px currentColor; flex-shrink: 0; }
.route-info { display: flex; flex-direction: column; gap: 2px; }
.route-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.route-type { font-size: 11px; font-weight: 500; }
.route-btn { width: 100%; padding: 12px !important; border-radius: var(--radius) !important; }

.related-header { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; }
.related-header .el-icon { color: #f59e0b; font-size: 20px; }
.related-list { display: flex; flex-direction: column; gap: 12px; }
.related-item { display: flex; gap: 12px; align-items: center; padding: 8px; border-radius: var(--radius); transition: background 0.2s; cursor: pointer; }
.related-item:hover { background: #f9fafb; }
.related-thumb { width: 60px; height: 60px; border-radius: var(--radius-sm); background: linear-gradient(135deg, #e0e7ff, #c7d2fe); flex-shrink: 0; }
.related-info { display: flex; flex-direction: column; gap: 4px; }
.related-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.related-distance { font-size: 12px; color: var(--text-muted); }

/* Dialog */
:deep(.scenic-dialog) { border-radius: var(--radius-xl) !important; }
:deep(.scenic-dialog .el-dialog__header) { padding: 24px 24px 0; margin-right: 0; }
:deep(.scenic-dialog .el-dialog__title) { font-weight: 700; font-size: 18px; }
:deep(.scenic-dialog .el-dialog__body) { padding: 20px 24px; }
:deep(.scenic-dialog .el-dialog__footer) { padding: 0 24px 24px; }

.rate-dialog-body { display: flex; flex-direction: column; align-items: center; padding: 20px 0; }
.rate-hint { font-size: 14px; color: var(--text-muted); margin: 0 0 20px; }
.rate-result { margin: 16px 0 0; font-size: 15px; color: var(--text-secondary); }
.rate-result strong { color: #f59e0b; font-size: 20px; }

.comment-dialog-body { display: flex; flex-direction: column; gap: 20px; }
.comment-input-area { display: flex; gap: 12px; }
.comment-input-area .el-textarea { flex: 1; }
:deep(.comment-input-area .el-textarea__inner) { border-radius: var(--radius); padding: 16px; font-size: 14px; }
.tag-select-area { display: flex; flex-direction: column; gap: 12px; }
.tag-title { font-size: 14px; color: var(--text-secondary); margin: 0; font-weight: 500; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.scenic-tag { padding: 6px 14px; border-radius: 20px; font-size: 13px; transition: all 0.2s ease; }
.scenic-tag:hover { transform: scale(1.05); }

:deep(.image-viewer-dialog .el-dialog__body) { padding: 0; }
.viewer-image { width: 100%; max-height: 80vh; object-fit: contain; border-radius: var(--radius); }

/* Scroll Top */
.scroll-top-btn { position: fixed; bottom: 32px; right: 32px; width: 48px; height: 48px; background: white !important; box-shadow: var(--shadow-lg); z-index: 100; transition: all 0.3s ease; }
.scroll-top-btn:hover { transform: translateY(-4px); box-shadow: var(--shadow-xl); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }

/* Loading & Empty */
.loading-container { max-width: 1000px; margin: 0 auto; padding: 40px; }
.empty-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; gap: 24px; }

/* Responsive */
@media (max-width: 1024px) {
  .content-grid { grid-template-columns: 1fr; }
  .right-sidebar { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
}
@media (max-width: 768px) {
  .hero-section { height: 380px; }
  .hero-title { font-size: 28px; }
  .hero-info { padding: 0 20px; bottom: 50px; }
  .quick-info-bar { margin-top: -20px; padding: 0 16px; }
  .info-item { min-width: 100%; }
  .main-content { padding: 20px 16px; }
  .tab-nav { overflow-x: auto; }
  .tab-btn { white-space: nowrap; flex: none; padding: 10px 16px; }
  .gallery-grid { grid-template-columns: repeat(2, 1fr); grid-template-rows: 150px 100px; }
  .gallery-item.large { grid-column: span 2; grid-row: span 1; }
  .rating-main { flex-direction: column; align-items: flex-start; }
  .big-score { font-size: 48px; }
  .right-sidebar { grid-template-columns: 1fr; }
  .comment-toolbar { flex-direction: column; align-items: flex-start; }
  .ai-score-circle { width: 120px; height: 120px; }
  .score-big { font-size: 36px; }
}
</style>