export interface Theme {
	name: string;
	colors: {
		primary: string;
		secondary: string;
		accent: string;
		background: string;
		surface: string;
		surfaceHover: string;
		text: string;
		textSecondary: string;
		textMuted: string;
		border: string;
		borderLight: string;
		error: string;
		warning: string;
		success: string;
		info: string;
	};
	spacing: {
		xs: string;
		sm: string;
		md: string;
		lg: string;
		xl: string;
		"2xl": string;
	};
	typography: {
		fontFamily: string;
		fontSize: {
			xs: string;
			sm: string;
			base: string;
			lg: string;
			xl: string;
			"2xl": string;
		};
		fontWeight: {
			normal: string;
			medium: string;
			semibold: string;
			bold: string;
		};
	};
	borderRadius: {
		sm: string;
		md: string;
		lg: string;
		xl: string;
	};
	shadows: {
		sm: string;
		md: string;
		lg: string;
		xl: string;
	};
}

export function applyTheme(theme: Theme): void {
	const root = document.documentElement;

	Object.entries(theme.colors).forEach(([key, value]) => {
		root.style.setProperty(`--color-${key}`, value);
	});

	Object.entries(theme.spacing).forEach(([key, value]) => {
		root.style.setProperty(`--spacing-${key}`, value);
	});

	root.style.setProperty("--font-family", theme.typography.fontFamily);
	Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
		root.style.setProperty(`--font-size-${key}`, value);
	});

	Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
		root.style.setProperty(`--font-weight-${key}`, value);
	});

	Object.entries(theme.borderRadius).forEach(([key, value]) => {
		root.style.setProperty(`--border-radius-${key}`, value);
	});

	Object.entries(theme.shadows).forEach(([key, value]) => {
		root.style.setProperty(`--shadow-${key}`, value);
	});
}
