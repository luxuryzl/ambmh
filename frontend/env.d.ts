/// <reference types="vite/client" />

//为 import.meta.env 提供类型提示和校验
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// TypeScript 就能识别这个变量，并提供自动补全mport.meta.env.VITE_API_BASE_URL

//让 TypeScript 识别 .vue 文件，
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 官方模板默认推荐并配置了 Vue - Official (Volar) 扩展。在 Volar 的最新版本中，.vue 文件的类型支持已经内置，不再必须手动写 declare module '*.vue'
// 这个声明仍然是兜底保障
