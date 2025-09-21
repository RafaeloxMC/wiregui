import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from "react";
import { Theme, applyTheme } from "../utils/theme";
import defaultDarkTheme from "../themes/default-dark.json";
import defaultLightTheme from "../themes/default-light.json";
import amoledDarkTheme from "../themes/amoled-dark.json";

interface ThemeContextType {
	currentTheme: Theme;
	availableThemes: Theme[];
	setTheme: (theme: Theme) => void;
	isDarkMode: boolean;
	toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};

interface ThemeProviderProps {
	children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	const [currentTheme, setCurrentTheme] = useState<Theme>(
		defaultDarkTheme as Theme
	);
	const [isDarkMode, setIsDarkMode] = useState(true);

	const availableThemes: Theme[] = [
		defaultLightTheme as Theme,
		defaultDarkTheme as Theme,
		amoledDarkTheme as Theme,
	];

	useEffect(() => {
		const savedTheme = localStorage.getItem("fileManagerTheme");
		const savedIsDark = localStorage.getItem("fileManagerIsDark");

		if (savedTheme) {
			try {
				const parsedTheme = JSON.parse(savedTheme);
				const foundTheme = availableThemes.find(
					(theme) => theme.name === parsedTheme.name
				);
				setCurrentTheme(foundTheme || parsedTheme);
			} catch (e) {
				console.error("Failed to parse saved theme:", e);
			}
		}

		if (savedIsDark !== null) {
			const isDark = savedIsDark === "true";
			setIsDarkMode(isDark);
		}
	}, []);

	useEffect(() => {
		applyTheme(currentTheme);
		localStorage.setItem("fileManagerTheme", JSON.stringify(currentTheme));
		localStorage.setItem("fileManagerIsDark", isDarkMode.toString());
	}, [currentTheme, isDarkMode]);

	const setTheme = (theme: Theme) => {
		setCurrentTheme(theme);
		setIsDarkMode(theme.name.toLowerCase().includes("dark"));
	};

	const toggleDarkMode = () => {
		const newIsDark = !isDarkMode;
		setIsDarkMode(newIsDark);
		setCurrentTheme(
			newIsDark
				? (defaultDarkTheme as Theme)
				: (defaultLightTheme as Theme)
		);
	};

	return (
		<ThemeContext.Provider
			value={{
				currentTheme,
				availableThemes,
				setTheme,
				isDarkMode,
				toggleDarkMode,
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
};
