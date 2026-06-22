import request from '@/utils/request'

//tips建议修改
export interface WelcomeItem{
  code: number
  msg: string
  data: string
}

export const getWelcome = (tipsText:string):Promise<WelcomeItem> => {
  return request.post('/api/qa/tipsconfig', tipsText,
    {
      headers: {
        'Content-Type': 'text/plain'
      }
    }
  )
}

//获取所有tips
export interface TipsResponse{
  id: number
  config: string
  createTime: string
  status:number  //1是启用
}

export const GetTips = (): Promise<TipsResponse[]> => {
  return request.get('/api/qa/tips/list')
}

//启用tips
export const UseTips = (id: number) => {
  return request.put(`/api/qa/tipuse/${id}`)
}