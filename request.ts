import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/module/user'

const baseURL: string = ''

const instance: AxiosInstance = axios.create({
  baseURL,
  timeout: 70000
})

/**
 * 是否为不需要携带 token 的接口
 */
const isAuthUrl = (url?: string): boolean => {
  if (!url) return false
  return (
    url.endsWith('/login') ||
    url.endsWith('/register') ||
    url.endsWith('/admins/login')
  )
}

// ==================== 请求拦截器 ====================
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const userStore = useUserStore()

    const isAuthRequest = isAuthUrl(config.url)

    console.log('请求URL:', config.url)
    console.log('是否为认证请求:', isAuthRequest)

    // ✅ 非登录/注册才加 token
    if (!isAuthRequest && userStore.token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `${userStore.token}`
      console.log('携带token:', userStore.token)
    }

    // ✅ 处理 FormData（避免 content-type 错误）
    if (config.data instanceof FormData) {
      delete config.headers?.['Content-Type']
    }

    return config
  },
  (error: AxiosError): Promise<AxiosError> => {
    console.log('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// ==================== 响应拦截器 ====================
instance.interceptors.response.use(
  (res: AxiosResponse): any => {
    console.log('响应拦截器收到响应:', res)

    // blob 直接返回
    if (res.config.responseType === 'blob') {
      return res.data
    }

    const data = res.data

    // 标准格式
    if (data && (data.code === 200 || data.code === '200' || data.code === 1)) {
      return data.data
    }

    // 直接返回业务数据
    if (data && !data.code && (data.text || data.audioBase64 || data.answer)) {
      return data
    }

    // success结构
    if (data && !data.code && typeof data.success === 'boolean') {
      return data
    }

    // 数组
    if (Array.isArray(data)) {
      return data
    }

    // 失败
    ElMessage.error(data?.message || '服务异常')
    return Promise.reject(data)
  },
  (error: AxiosError): Promise<AxiosError> => {
    console.log('响应拦截器错误:', error)

    const userStore = useUserStore()
    const status = error.response?.status
    const url = error.config?.url

    console.log('状态码:', status)
    console.log('接口:', url)

    if (status === 401) {
      // 清空登录状态
      userStore.removeToken()

      const isAuthRequest = isAuthUrl(url)

      if (!isAuthRequest) {
        ElMessage.error('登录已过期，请重新登录')

        //推荐打开（自动跳登录）
        // window.location.href = '/login'
      } else {
        const msg = (error.response?.data as any)?.message || '账号或密码错误'
        ElMessage.error(msg)
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后重试')
    } else {
      ElMessage.error(error.message || '服务异常')
    }

    return Promise.reject(error)
  }
)

// ==================== 封装方法 ====================
const request = {
  get: <T = any>(url: string, config?: any): Promise<T> =>
    instance.get(url, config),

  post: <T = any>(url: string, data?: any, config?: any): Promise<T> =>
    instance.post(url, data, config),

  put: <T = any>(url: string, data?: any, config?: any): Promise<T> =>
    instance.put(url, data, config),

  delete: <T = any>(url: string, config?: any): Promise<T> =>
    instance.delete(url, config),
}

export default request
export { baseURL }
