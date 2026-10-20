<!-- 
 这段代码是一个基于 ‌Vue 3‌ 和 ‌Element Plus‌ 封装的‌基础图表组件（BaseChart）‌。
 它的核心作用是：‌将 ECharts 图表的渲染逻辑与加载状态（Loading）UI 分离，提供一个带有“加载中”遮罩层的通用图表容器。
 它通过调用之前定义的 useECharts Hook 来管理图表的生命周期和自适应，同时利用 v-if 控制加载动画的显示。
-->

<template>
  <div class="base-chart">
    <div ref="containerRef" class="chart" :style="{ height }" />
    <div v-if="loading" class="loading-mask">
      <el-icon class="is-loading"><Loading /></el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Ref } from "vue";
import type { EChartsOption } from "echarts";
import { Loading } from "@element-plus/icons-vue";
import { useECharts } from "@/composables/useECharts";

// 定义组件接收的属性参数（Props）
const props = withDefaults(
  defineProps<{
    option: EChartsOption | null; // 必填：图表配置项
    height?: string; // 选填：图表高度，默认 '400px'
    loading?: boolean; // 选填：是否显示加载状态，默认 false
  }>(),
  {
    height: "400px",
    loading: false,
  },
);

// 创建 DOM 引用，初始值为 null
// 这个 ref 会被模板中的 ref="containerRef" 自动赋值
const containerRef = ref<HTMLDivElement | null>(null);

// 【关键步骤】将 props.option 转换为响应式的 Ref
// useECharts 要求第二个参数是 Ref<EChartsOption | null>
// 因为 props 是只读的且不是 Ref 类型（它是 reactive 对象的一部分），
// 所以这里用 computed 包装一下，使其成为一个只读的 Ref，满足类型要求
const optionRef = computed(() => props.option) as Ref<EChartsOption | null>;

// 调用组合式函数
// 传入容器引用和配置项引用
// 注意：这里没有接收返回值，因为组件内部不需要手动调用 resize 或 dispose，
// useECharts 内部已经通过 onMounted/onBeforeUnmount 自动处理了生命周期
useECharts(containerRef, optionRef);
</script>

<style scoped>
.base-chart {
  position: relative;
  width: 100%;
}
.chart {
  width: 100%;
}
.loading-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  font-size: 24px;
  color: var(--el-color-primary);
}
</style>
