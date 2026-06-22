import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/module/user'
import Login from '@/views/LoginPage.vue'
import Register from '@/views/RegisterPage.vue'
import Home from '@/views/Home/HomePage.vue'
import User from '@/views/User/UserPage.vue'
import UserAI from '@/views/User/UserAIPage.vue'
import UserInfo from '@/views/User/UserInfo.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: Login, meta: { title: '登录' } },
    { path: '/register', component: Register, meta: { title: '注册' } },
    {
      path: '/home',
      component: Home,
      redirect: '/home/file',
      meta: {
        title: '景区后台',
        // 在这里定义所有侧边栏菜单
        menu: [
          { name: '文件管理', path: '/home/file' },
          {
            name: '数据分析',
            path: '/home/data',
            children: [
              { name: '访问数据', path: '/home/data/visit' },
              { name: '满意度数据', path: '/home/data/satisfaction' }
            ]
          },
          { name: '问答管理', path: '/home/manage' },
          { name: 'AI管理', path: '/home/ai' },
          { name: '设置', path: '/home/setting' }
        ]
      },
      children: [
        {
          path: 'file',
          component: () => import('@/views/Home/FilePage.vue'),
          meta: { title: '文件管理' }
        },
        {
          path: 'data',
          component: () => import('@/views/Data/DataPage.vue'),
          redirect: '/home/data/visit',
          meta: { title: '数据分析' },
          children: [
            {
              path: 'visit',
              component: () => import('@/views/Data/VisitPage.vue'),
              meta: { title: '访问数据' }
            },
            {
              path: 'satisfaction',
              component: () => import('@/views/Data/SatisfactionPage.vue'),
              meta: { title: '满意度数据' }
            }
          ]
        },
        {
          path: 'manage',
          component: () => import('@/views/Home/QAPage.vue'),
          meta: { title: '问答管理' }
        },
        {
          path: 'ai',
          component: () => import('@/views/AI/AIPage.vue'),
          meta: { title: 'AI管理' },
          children: [
            {
              path: 'voice',
              component: () => import('@/views/AI/AIVoice.vue'),
              meta: { title: '音色管理' }
            }
          ]
        },
        {
          path: 'setting',
          component: () => import('@/views/Home/SettingPage.vue'),
          meta: { title: '设置' }
        }
      ]
    },
    { path: '/user', component: User, meta: { title: '用户中心' } },
    { path: '/userAI', component: UserAI, meta: { title: 'AI助手' } },
    { path: '/userInfo', component: UserInfo, meta: { title: '个人信息' } },
    { path: '/user/wayDetail/:id', component: () => import('@/views/User/WayDetail.vue'), meta: { title: '路线详情' } },
    {
      path: '/user/spotDetail/:id',
      component: () => import('@/views/User/SpotDetail.vue'),
      meta: { title: '景点详情' }
    }
  ],
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (!userStore.token && to.path !== '/login' && to.path !== '/register') {
    return '/login'
  }
})

export default router
