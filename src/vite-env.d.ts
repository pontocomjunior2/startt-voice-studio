/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly SUPABASE_SERVICE_ROLE_KEY: string
  readonly VITE_DOWNLOAD_PROXY_URL: string
  readonly VITE_API_URL: string
  readonly VITE_ADMIN_SECRET: string
  readonly GEMINI_API_KEY: string
  readonly GEMINI_MODEL: string
  readonly MP_ACCESS_TOKEN: string
  readonly MP_NOTIFICATION_URL: string
  readonly MAX_UPLOAD_SIZE_MB: string
  readonly NODE_OPTIONS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
