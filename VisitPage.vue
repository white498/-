<script lang="ts" setup>
import { onMounted, ref, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getVisitCount } from '@/api/visitor'

const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null
const weeklyCount = ref(0)
const dailyCount = ref(0)
const loading = ref(true)

// 获取访问统计数据
const fetchVisitData = async () => {
  try {
    loading.value = true
    const res = await getVisitCount()
    if (res) {
      // 处理后端返回的蛇形命名法字段
      weeklyCount.value = res.weekly_count || res.weeklyCount || 0
      dailyCount.value = res.daily_count || res.dailyCount || 0
      updateChart()
    }
  } catch (error) {
    console.error('获取访问数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return

  chartInstance.setOption({
    title: {
      text: '游客访问趋势',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['访问量', '趋势线'],
      bottom: 0,
      left: 'center',
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLabel: {
        rotate: 0,
        fontSize: 12
      },
      axisLine: {
        lineStyle: {
          color: '#999'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '访问量 (人次)',
      nameLocation: 'middle',
      nameGap: 45,
      axisLabel: {
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#e0e0e0'
        }
      }
    },
    series: [
      {
        name: '访问量',
        type: 'bar',  // 柱状图
        data: [120, 200, 150, 80, 70, 110, 130],
        barWidth: '50%',
        itemStyle: {
          color: '#409EFF',
          borderRadius: [4, 4, 0, 0],
          label: {
            show: true,
            position: 'top',
            fontSize: 12,
            color: '#666'
          }
        }
      },
      {
        name: '趋势线',
        type: 'line',  // 折线图
        data: [120, 200, 150, 80, 70, 110, 130],
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          width: 3,
          color: '#E6A23C'
        },
        itemStyle: {
          color: '#E6A23C',
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 12,
          color: '#E6A23C'
        }
      }
    ]
  })
}

onMounted(() => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  fetchVisitData()

  // 响应式调整
  const handleResize = () => {
    chartInstance?.resize()
  }
  window.addEventListener('resize', handleResize)

  // 组件销毁时移除监听
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    chartInstance?.dispose()
  })
})
</script>

<template>
  <div class="card">
    <div class="stats-container">
      <div class="stat-card">
        <div class="stat-title">本周服务人次</div>
        <div class="stat-value">{{ weeklyCount }}</div>
        <div class="stat-desc">独立用户数</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">当日服务人次</div>
        <div class="stat-value">{{ dailyCount }}</div>
        <div class="stat-desc">独立用户数</div>
      </div>
    </div>
    <div ref="chartRef" class="chart"></div>
  </div>
</template>

<style lang="scss" scoped>
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 20px;
  
  .stats-container {
    display: flex;
    gap: 20px;
    margin-bottom: 30px;
    
    .stat-card {
      flex: 1;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      color: white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
      }
      
      &:nth-child(1) {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      
      &:nth-child(2) {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      
      .stat-title {
        font-size: 14px;
        opacity: 0.9;
        margin-bottom: 10px;
      }
      
      .stat-value {
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .stat-desc {
        font-size: 12px;
        opacity: 0.8;
      }
    }
  }
  
  .chart {
    width: 100%;
    height: 450px;
  }
}
</style>