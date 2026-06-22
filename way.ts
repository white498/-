import request from '@/utils/request'

//  获取推荐路线列表
export interface RouteItem {
  id: number
  title: string
  audience: string
  duration: string
  summary: string
  coverImage: string
}

export const getWayList = ():Promise<RouteItem[]> => {
  return request.get('/api/v1/routes/list')
}

// 获取路线详情及景点列表
// 景点项
export interface SpotItem {
  id: number
  name: string
  imageUrl?: string
  description: string
  story:string
  tags: string
  highlight: string
}
// 路线详情
export interface RouteDetail {
  routeInfo: {
    id: number
    title: string
    summary: string
  }
  spots: SpotItem[]
}

export const getWayDetail = (routeId: number): Promise<SpotItem[]> => {
  return request.get(`/api/v1/routes/${routeId}/spots`)
}

// 获取景点详情（智能讲解数据源）
// 景点详情
export interface SpotDetail {
  id: number
  name: string
  imageUrl: string
  description: string
  story: string
  highlight: string
  tags: string
}
export const getSpotDetail = (spotId: number): Promise<SpotDetail> => {
  return request.get(`/api/v1/routes/spots/${spotId}`)
}