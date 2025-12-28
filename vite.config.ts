import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

// tauri.conf.jsonからバージョンを読み込む
const tauriConfig = JSON.parse(readFileSync('./src-tauri/tauri.conf.json', 'utf-8'))
const appVersion = tauriConfig.version

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  }
})
