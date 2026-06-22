import request from '@/utils/request'

//获取今日游客满意度统计
export interface VisitorSatisfaction {
  positiveCount: number,
  negativeCount: number,
  neutralCount: number,
  satisfactionRate:string
}

export const getVisitorSatisfaction = (date?: string): Promise<VisitorSatisfaction> => {
  const requestBody = date ? { date } : {}
  
  return request.post('/api/date/emotion', requestBody, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
export const getEmotionAnalysis = getVisitorSatisfaction;

//获取用户反馈
export const getUserFeedback = ():Promise<string> => {
  return request.get('/api/ai/history/summary')
}

//得到本周/本日的服务人次
export interface ServiceCount{
  weeklyCount: number,
  dailyCount:number
}
export const getServiceCount = (): Promise<ServiceCount> => {
  return request.get('/api/date/count')
}
export const getVisitCount = getServiceCount // 别名，保持与组件调用一致

//热门问答接口文档
export interface HotAnswerResponse{
  code: number
  message: string
  data: string[]
}
export const getHotAnswer = ():Promise<string[]> => {
  return request.get('/api/date/hotwenda')
}
