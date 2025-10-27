/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SHEETS_API_KEY: string
  readonly VITE_GOOGLE_SPREADSHEET_ID: string
  readonly VITE_GOOGLE_DRIVE_FOLDER_ID: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_N8N_WEBHOOK_URL: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENVIRONMENT: string
  readonly VITE_INTERNAL_USERNAME: string
  readonly VITE_INTERNAL_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
