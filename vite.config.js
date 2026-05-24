import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handleKpgRepeaterBookRequest } from './server/kpgRepeaterBook.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), kpgRepeaterBookApi()],
})

function kpgRepeaterBookApi() {
  return {
    name: 'rb2-kpg-repeaterbook-api',
    configureServer(server) {
      server.middlewares.use(handleKpgRepeaterBookRequest)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleKpgRepeaterBookRequest)
    },
  }
}
