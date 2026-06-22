<template>
  <div class="satisfaction-chart-container">
    <div class="chart-header">
      <div class="header-top">
        <h2>游客满意度分析看板</h2>
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="选择日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="fetchSatisfactionData"
        />
      </div>
      <div class="chart-stats">
        <div class="stat-card">
          <div class="stat-label">正面情绪</div>
          <div class="stat-value">{{ positiveCount }}</div>
          <div class="stat-trend">人次</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">负面情绪</div>
          <div class="stat-value">{{ negativeCount }}</div>
          <div class="stat-trend">人次</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">满意度</div>
          <div class="stat-value">{{ satisfactionRate }}</div>
          <div class="stat-trend">百分比</div>
        </div>
      </div>
    </div>
    
    <div ref="chartRef" class="satisfaction-chart"></div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getEmotionAnalysis } from '@/api/visitor'

const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null
const positiveCount = ref(0)
const negativeCount = ref(0)
const neutralCount = ref(0)
const satisfactionRate = ref('0%')
const loading = ref(true)
const selectedDate = ref<string>('')

// 获取满意度分析数据
const fetchSatisfactionData = async () => {
  try {
    loading.value = true
    const res = await getEmotionAnalysis(selectedDate.value || undefined)
    if (res) {
      // 处理后端返回的蛇形命名法字段
      positiveCount.value = res.positive_count || res.positiveCount || 0
      negativeCount.value = res.negative_count || res.negativeCount || 0
      neutralCount.value = res.neutral_count || res.neutralCount || 0
      satisfactionRate.value = res.satisfaction_rate || res.satisfactionRate || '0%'
      updateChart()
    }
  } catch (error) {
    console.error('获取满意度数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return

  chartInstance.setOption({
    title: { 
      text: '游客情感分析', 
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
      }
    },
    tooltip: { 
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: { 
      data: ['情感数量'], 
      bottom: 10,
      left: 'center',
      itemWidth: 25,
      itemHeight: 14,
      textStyle: {
        color: '#666'
      }
    },
    grid: {
      left: '8%',
      right: '5%',
      top: '15%',
      bottom: '12%',
      containLabel: true,
      backgroundColor: '#fafafa',
      borderWidth: 1,
      borderColor: '#eee'
    },
    xAxis: {
      type: 'category',
      data: ['正面情绪', '负面情绪', '中立情绪'],
      axisLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666'
      },
      axisLine: {
        lineStyle: {
          color: '#999'
        }
      },
      axisTick: {
        show: false
      }
    },
    yAxis: { 
      type: 'value', 
      name: '数量', 
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#e0e0e0'
        }
      },
      axisLabel: {
        fontSize: 12,
        color: '#666'
      },
      axisLine: {
        show: false
      },
      nameTextStyle: {
        fontSize: 12,
        color: '#666'
      }
    },
    series: [
      {
        name: '情感数量',
        type: 'bar',
        data: [positiveCount.value, negativeCount.value, neutralCount.value],
        barWidth: '35%',
        itemStyle: {
          color: function(params: any) {
            const colors = ['#667eea', '#f5576c', '#4facfe'];
            return colors[params.dataIndex];
          },
          borderRadius: [6, 6, 0, 0],
          label: { 
            show: true, 
            position: 'top',
            formatter: '{c}',
            fontSize: 12,
            fontWeight: 'bold',
            color: '#666'
          }
        },
        emphasis: {
          focus: 'series'
        }
      }
    ],
    toolbox: {
      feature: {
        saveAsImage: { title: '保存图片' },
        restore: { title: '重置' }
      },
      right: 20,
      top: 10
    },
    backgroundColor: '#ffffff'
  })
}

onMounted(() => {
  if (!chartRef.value) return
  
  // 自动获取今天的日期
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  selectedDate.value = `${year}-${month}-${day}`

  chartInstance = echarts.init(chartRef.value)
  fetchSatisfactionData()

  // 响应式调整
  const handleResize = () => chartInstance?.resize()
  window.addEventListener('resize', handleResize)

  // 组件销毁时移除监听
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    chartInstance?.dispose()
  })
})
</script>

<style lang="scss" scoped>
.satisfaction-chart-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 20px;
  
  .chart-header {
    margin-bottom: 20px;
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      
      h2 {
        text-align: left;
        color: #333;
        font-size: 20px;
        margin: 0;
        font-weight: 600;
      }
    }
    
    .chart-stats {
      display: flex;
      justify-content: space-around;
      gap: 20px;
      margin-bottom: 20px;
      
      .stat-card {
        flex: 1;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 15px 20px;
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
        
        &:nth-child(3) {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .stat-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .stat-trend {
          font-size: 12px;
          opacity: 0.8;
        }
      }
    }
  }
  
  .satisfaction-chart {
    width: 100%;
    height: 400px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .satisfaction-chart-container {
    margin: 10px;
    padding: 15px;
    
    .chart-header {
      .chart-stats {
        flex-direction: column;
        gap: 10px;
        
        .stat-card {
          padding: 10px 15px;
          
          .stat-value {
            font-size: 24px;
          }
        }
      }
    }
    
    .satisfaction-chart {
      height: 400px;
    }
  }
}
</style>