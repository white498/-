<script lang="ts" setup>
</script>

<template>
  <div class="data-container">

    <!-- 左侧二级菜单 -->
    <aside class="sub-menu">
      <!-- ✅ 标题加在这里 -->
      <div class="sub-title">数据分析</div>

      <el-menu router :default-active="$route.path">
        <el-menu-item index="/home/data/visit">访问统计</el-menu-item>
        <el-menu-item index="/home/data/satisfaction">满意度分析</el-menu-item>
      </el-menu>
    </aside>

    <!-- 右侧内容 -->
    <div class="data-content">
      <router-view></router-view>
    </div>

  </div>
</template>

<style scoped>
.data-container {
  display: flex;
}

/* 左侧菜单 */
.sub-menu {
  width: 200px;
  background: #f5f7fa;
  padding: 10px;
}

/* ✅ 标题样式（关键） */
.sub-title {
  font-size: 16px;
  font-weight: bold;
  padding: 10px;
  margin-bottom: 10px;
}

/* 右侧内容 */
.data-content {
  flex: 1;
  padding: 20px;
  background: #fff;
}
</style>