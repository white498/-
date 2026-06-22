import request from '@/utils/request'

//打分接口
export interface Rate{
  avgScore: number,  //景点最新平均分
  ratingCount: number,  //景点累计评分人数
  score:number  //用户当前打的分数
}

export interface RateResponse {
  code: number;
  message: string;
  data: Rate;
}

export interface RateParams{
  spotId: number,
  score: number
}

export const RateAPI = (params:RateParams):Promise<Rate> => {
  return request.post('/api/ratings',params)
}

//评价接口
export interface CommentParams{
  spotId: string,
  comment: string
  tags?: string
}

export interface Comment{
  // comment_id: string,  //评论ID
  // status:string //状态：pending（审核中）、approved（已通过）、rejected（已拒绝）
}

export interface CommentResponse {
  code: number;
  message: string;
  data: Comment;
}

export const CommentAPI = (params:CommentParams):Promise<Comment> => {
  return request.post('/api/comments',params)
}

//获取景点评分信息
export interface RateInfo{
  spotId: number,  //景点ID
  spotName: string,  //景点名称
  avgScore: number,  //景点最新平均分
  ratingCount: number,  //景点累计评分人数
  userScore: number //当前用户的评分（null表示未评分）
  userComment: string //当前用户的评论（null表示未评论）
}

export const RateInfoAPI = (spot_id:number):Promise<RateInfo> => {
  return request.get(`/api/ratings/spot/${spot_id}`)
}

//批量获取景点评分

// 单个景点的评分信息（响应中每个景点的结构）
export interface MoreRatingInfo {
  avgScore: number | string;
  ratingCount: number;// 评分总人数
  name: string;// 景点名称
  id: number// 当前用户评分
}

// 批量获取评分响应（对象格式，key为spot_id）
export interface MoreRatingResponse {
  code: number,
  message: null,
  data: MoreRatingInfo[]
}

export const MoreRatingAPI = (): Promise<MoreRatingInfo[]> => {
  return request.post('/api/ratings/batch');
}

//获取游客评价列表
export interface CommentListItem {
  userId: number;
  name: string;
  comment: string;
  tags: string;
  createdAt: string;
}

export interface CommentListParams{
  page?: number,
  page_size?: number
}

// 评价列表响应
export interface CommentListResponse {
  total: number;
  page: number;
  pageSize: number;
  comments: CommentListItem[];
}

export const CommentListAPI = (spot_id:number, params:CommentListParams): Promise<CommentListResponse> => {
  return request.get(`/api/comments/${spot_id}`, {params})
}


// 修改评分参数
export interface UpdateRatingParams {
  score?: number;           // 分数
  spotId:number
}

// 修改评分响应
export interface UpdateRatingResponse {
  code: number;
  message: string;
  data: {
    avgScore: number,
    ratingCount: number,
    score: number
  };
}

// 修改评分
export const UpdateRatingAPI = (params: UpdateRatingParams): Promise<{
  avgScore: number,
  ratingCount: number,
  score: number
}> => {
  return request.put('/api/ratings', params);
};


//获取所有评论标签
export interface Tag{
  id: number,
  tagName: string
}

export interface TagResponse {
  code: number;
  message: string;
  data: Tag[];
}

export const TagAPI = ():Promise<Tag[]> => {
  return request.get('/api/comments/tags/list')
}

//删除评论
export const CommentDeleteAPI = (spotId:number) => {
  return request.delete(`/api/comments/${spotId}`)
}

//修改评论
export interface CommentUpdateParams{
  spotId:number,
  comment: string,
  tags: string
}

export const CommentUpdateAPI = (params:CommentUpdateParams) => {
  return request.put('/api/comments',params)
}
