/**
 * 这是一个经典的请求 Hook，它的好处：
 * 1.loading 自动管理。
 * 2.防竞态：用户狂点股票 A、B、C，requestId 能保证最后渲染的一定是 C 的数据。
 * 3.使用 shallowRef，传给 ECharts 的数据没有 Proxy 代理，性能更好。
 */

import { ref, shallowRef, type Ref } from "vue";

export function useRequest<T, P extends any[] = any[]>(
  service: (...args: P) => Promise<T>,
  options: {
    manual?: boolean; // 是否手动触发请求：默认为 false，立即执行；true 表示手动触发请求
    initialData?: T; // 初始数据
    onSuccess?: (data: T) => void; // 成功回调，请求成功时执行
    onError?: (e: Error) => void; // 失败回调，请求失败时执行
  } = {},
) {
  // 定义状态变量
  const { manual = false, initialData, onSuccess, onError } = options;

  // shallowRef 避免复杂数据结构被 Vue 深度代理（影响 ECharts 性能）
  const data = shallowRef<T | undefined>(initialData);
  const loading = ref(false);
  const error = shallowRef<Error | null>(null);

  // 用来防抖/取消旧请求（防止用户快速切换股票时，旧数据覆盖新数据）
  let requestId = 0;

  async function run(...args: P): Promise<T | undefined> {
    const currentId = ++requestId;
    loading.value = true;
    error.value = null;

    try {
      const result = await service(...args);

      // 如果这不是最新的请求，直接丢弃结果
      if (currentId !== requestId) return;

      data.value = result;
      onSuccess?.(result);
      return result;
    } catch (e) {
      if (currentId !== requestId) return;
      const err = e instanceof Error ? e : new Error(String(e));
      error.value = err;
      onError?.(err);
    } finally {
      if (currentId === requestId) loading.value = false;
    }
  }

  if (!manual) {
    void run(...([] as unknown as P));
  }

  return { data, loading, error, run };
}
