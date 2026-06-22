<script lang="ts" setup>
import Spring from '@/components/spring.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="data-container">

    <!-- 左侧菜单 -->
    <aside class="sub-menu">
      <div class="sub-title">AI修改</div>

      <el-menu router :default-active="$route.path">
        <el-menu-item index="/home/ai">AI展示</el-menu-item>
        <el-menu-item index="/home/ai/voice">AI音色</el-menu-item>
      </el-menu>
    </aside>

    <!-- 显示虚拟人 -->
    <div class="live2d-area" v-if="route.path !== '/home/ai/voice'">
      <Spring />
    </div>

    <div class="data-content" :class="{ 'full-width': route.path === '/home/ai/voice' }">
      <router-view></router-view>
    </div>

  </div>
</template>

<style scoped>
.data-container {
  display: flex;
  height: 100%;
}

.sub-menu {
  width: 200px;
  background: #f5f7fa;
  padding: 10px;
}

.sub-title {
  font-size: 16px;
  font-weight: bold;
  padding: 10px;
  margin-bottom: 10px;
}

.live2d-area {
  width: 800px;
  display: flex;
  align-items: center;
  justify-content: center;

}

.data-content {
  flex: 1;
  padding: 20px;
  background: #fff;
  overflow: auto;
}

.data-content.full-width {
  flex: 1;
  max-width: none;
}
</style>
