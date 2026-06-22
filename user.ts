import { defineStore } from 'pinia'
import { ref } from 'vue'
import {getUserInfo} from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const token = ref('')

  const setToken = (newToken: string) => {
    token.value = newToken
  }

  const removeToken = () => {
    token.value = ''
  }

  const user=ref({
    avatar: '',
    name: ''
  })

  const setAvatar = (avatar: string) => {
    user.value = { ...user.value, avatar }
  }

  const getUser = async () => {
    try {
      const res=await getUserInfo()
      user.value=res
      console.log('获取用户信息成功')
    } catch (error) {
      console.log('获取用户信息失败')
      throw error
    }
  }
  const setUser=(obj:any)=>(user.value=obj)

  return {
    token,
    setToken,
    removeToken,
    user,
    getUser,
    setUser,
    setAvatar
}
}, {
  persist:true
}
)
