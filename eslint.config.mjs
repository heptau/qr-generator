import js from '@eslint/js';
import globals from 'globals';

export default [
	{ ignores: ['package-lock.json'] },
	js.configs.recommended,
	{
		files: ['**/*.js'],
		languageOptions: {
			globals: {
				...globals.browser,
				QRCode: 'readonly',
			},
		},
		rules: {
			'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
			'no-undef': 'error',
		},
	},
	{
		files: ['sw.js'],
		languageOptions: {
			globals: {
				...globals.serviceworker,
			},
		},
	},
];
