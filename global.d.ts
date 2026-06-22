declare module '@/utils/request' {
  const request: any
  export default request
}

declare module '@/api/Model.js' {
  export const getAudioAPI: (audioFile: File) => Promise<Blob>
}