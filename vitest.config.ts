import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./tests/setup/test-setup.ts'],
		include: ['tests/**/*.test.ts'],
		testTimeout: 10000,
		hookTimeout: 10000,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'tests/',
				'dist/',
				'**/*.test.ts',
				'**/*.mock.ts',
				'scripts/',
				'templates/',
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 75,
				statements: 80,
			},
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	// 使用测试专用的 tsconfig
	tsconfig: './tsconfig.test.json',
});
