/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_PORT: string
  readonly VITE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  isTauri?: boolean
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
