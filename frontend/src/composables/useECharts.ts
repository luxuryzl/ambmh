/**
 * 这段代码是一个基于 ‌Vue 3 Composition API‌ 封装的 ‌ECharts Hook（组合式函数）‌。
 * 它的主要作用是：‌将 ECharts 图表的初始化、配置更新、窗口自适应（Resize）以及资源销毁逻辑封装成一个可复用的函数 useECharts，
 * 以便在 Vue 组件中更优雅、安全地管理图表实例。‌
 * 使用 shallowRef 存储图表实例是为了避免 Vue 对庞大的 ECharts 实例对象进行深层响应式代理，从而提升性能。
 */

//1. 导入依赖
import { onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from "vue";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";

// 2. 定义接口
export interface UseEChartsOptions {
  /** 是否自动 resize（窗口变化时） */
  autoResize?: boolean;
}

//3. 定义函数签名
export function useECharts(
  containerRef: Ref<HTMLDivElement | null>, //指向图表容器的 DOM 引用（由父组件通过 template ref 传入）
  option: Ref<EChartsOption | null>, //图表的配置项数据（响应式）
  opts: UseEChartsOptions = {}, //可选参数，配置选项对象，默认值为空对象
) {
  // 3.1 内部状态与配置解构
  const chart = shallowRef<echarts.ECharts | null>(null);
  const { autoResize = true } = opts; // 从 opts 中解构出 autoResize，如果未传递则默认为 true

  // 3.2 初始化方法
  function init() {
    // 获取容器 DOM 元素
    const el = containerRef.value;
    if (el === null) return;

    // 调用 ECharts 的 init 方法，将图表实例绑定到 DOM 元素上，并赋值给 chart.value
    chart.value = echarts.init(el);

    // 如果当前已经有配置项（option.value 存在），则立即设置图表配置
    // setOption 的第二个参数 true 表示 notMerge（不合并），即完全替换原有配置，确保初始状态正确
    if (option.value) {
      chart.value.setOption(option.value, true);
    }
    // 如果开启了自动 resize，则监听窗口的 resize 事件
    if (autoResize) {
      window.addEventListener("resize", handleResize);
    }
  }

  // 3.3 处理窗口大小变化
  function handleResize() {
    // 调用图表实例的 resize 方法，使图表适应新的容器尺寸
    // 使用可选链操作符 ?. 确保 chart.value 存在时才调用，防止报错
    chart.value?.resize();
  }

  // 3.4 销毁函数
  function dispose() {
    // 如果开启了自动 resize，移除窗口 resize 事件监听器，防止内存泄漏
    if (autoResize) {
      window.removeEventListener("resize", handleResize);
    }

    // 调用 ECharts 实例的 dispose 方法，释放图表占用的资源（DOM 事件、内存等）
    chart.value?.dispose();
    // 将 chart 引用重置为 null，标记实例已销毁
    chart.value = null;
  }

  // 3.5绑定生命周期钩子
  // 当组件挂载完成（DOM 已就绪）时，执行 init 函数初始化图表
  onMounted(init);
  // 当组件即将卸载时，执行 dispose 函数清理资源和事件监听
  onBeforeUnmount(dispose);

  // 3.6 监听配置项变化
  // option 变化时自动更新
  watch(option, (val) => {
    // 如果图表实例尚未初始化，或者新的配置项为空，则不执行任何操作
    if (!chart.value || !val) return;

    // 当配置项发生变化时，调用 setOption 更新图表
    // true 表示不合并配置，完全应用新配置
    chart.value.setOption(val, true);
  });

  // 返回一个对象，供调用者使用
  return {
    chart,
    resize: handleResize,
    dispose,
  };
}
