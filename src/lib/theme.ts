/**
 * Theme Configuration
 * 
 * This file defines the color theme for the FLI Fantasy Golf application.
 * Colors are defined as HSL values that map to CSS custom properties.
 * 
 * To update the theme:
 * 1. Modify the values in this file
 * 2. Update the corresponding CSS variables in src/app.css
 * 3. The changes will apply throughout the app
 */

export const theme = {
	colors: {
		// Brand Colors - Main theme colors
		brand: {
			deepBlue: {
				name: 'Deep Blue',
				hsl: '222.2 84% 4.9%',
				hex: '#0f172a',
				usage: 'Primary brand color, backgrounds, headers'
			},
			deepBlueLight: {
				name: 'Deep Blue Light',
				hsl: '217.2 91.2% 59.8%',
				hex: '#3b82f6',
				usage: 'Lighter variant for hover states, accents'
			},
			purple: {
				name: 'Purple',
				hsl: '271.5 81.3% 55.9%',
				hex: '#a855f7',
				usage: 'Primary actions, buttons, links'
			},
			purpleLight: {
				name: 'Purple Light',
				hsl: '270.7 91% 65.1%',
				hex: '#c084fc',
				usage: 'Lighter variant for hover states'
			},
			gold: {
				name: 'Gold',
				hsl: '45.4 93.4% 47.5%',
				hex: '#eab308',
				usage: 'Accents, highlights, success states'
			},
			goldLight: {
				name: 'Gold Light',
				hsl: '47.9 95.8% 53.1%',
				hex: '#fde047',
				usage: 'Lighter variant for hover states'
			}
		}
	},

	// Utility function to get CSS variable reference
	cssVar: (name: string) => `hsl(var(--${name}))`,

	// Utility function to update theme at runtime
	updateTheme: (updates: Record<string, string>) => {
		if (typeof document !== 'undefined') {
			const root = document.documentElement;
			Object.entries(updates).forEach(([key, value]) => {
				root.style.setProperty(`--${key}`, value);
			});
		}
	}
} as const;

/**
 * Example usage:
 * 
 * // In Svelte components:
 * import { theme } from '$lib/theme';
 * 
 * // Use in class names (via Tailwind):
 * <div class="bg-brand-deep-blue text-brand-gold">
 * 
 * // Update theme dynamically:
 * theme.updateTheme({
 *   'brand-purple': '280 90% 60%',
 *   'brand-gold': '50 95% 50%'
 * });
 */
