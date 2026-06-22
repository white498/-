import request from "@/utils/request";

//管理员上传文档
export interface UploadKnowledge {
  success: boolean
  docId: string
  filename: string
  chunks: number
  charCount: number
  error?: string
}

export const uploadKnowLedge = (file: File): Promise<UploadKnowledge> => {
  const fd = new FormData()
  fd.append('file', file)

  return request.post('/api/knowledge/upload', fd, {
    headers: {
    'Content-Type': 'multipart/form-data'
    }
  })
}

//更新文档内容
export interface UpdateKnowledge {
  success: boolean
  chunks: number
  error?: string
}

export const updateKnowledge = (docId: string, file: File): Promise<UpdateKnowledge> => {
  console.log('========== updateKnowledge 接口调用 ==========')
  console.log('请求方式: PUT')
  console.log('接口路径:', `/api/knowledge/${docId}`)
  console.log('文档ID:', docId)
  console.log('文件名:', file.name)
  console.log('文件大小:', file.size)

  const fd = new FormData()
  fd.append('file', file)

  return request.put(`/api/knowledge/${docId}`, fd, {
    timeout: 60000, // 60秒超时
    onUploadProgress: (progressEvent: any) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      console.log('Upload progress:', percentCompleted, '%')
    }
  })
}

//删除文档
export interface DeleteKnowledge {
  success:boolean
}
export const deleteKnowledge = (docId: string): Promise<DeleteKnowledge> => {
  return request.delete(`/api/knowledge/${docId}`)
}
// 获取知识库文件列表

// 单个文件
export interface KnowledgeItem {
  id: string
  filename: string
  fileType: string
  fileSize: number
  chunkCount: number
  status: string
  createdAt: string
}

// 分页响应
export interface KnowledgeList {
  list: KnowledgeItem[]
  total: number
  page: number
  page_size: number
}

export interface KnowledgeListParams {
  page?: number
  page_size?: number
  filename?: string
  status?: string
}

export const getKnowledgeList = (
  params: KnowledgeListParams = {}
): Promise<KnowledgeList> => {
  return request.get('/api/knowledge/documents', { params })
}
