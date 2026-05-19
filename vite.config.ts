import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'

import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
	plugins: [react(), tailwindcss(), glsl(), cloudflare()],
	base: '/',
	server: {
		watch: {
			ignored: ['**/.generated/**'],
		},
		proxy: {
			'/api': 'http://localhost:8787',
			'/generated': 'http://localhost:8787',
		},
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('.', import.meta.url)),
		},
	},
})
