import { ref } from 'vue'
import type { Live2DModel } from 'pixi-live2d-display/cubism4'
import type { Application } from '@pixi/app'

export const live2dModel = ref<Live2DModel | null>(null)
export const live2dApp = ref<Application | null>(null)