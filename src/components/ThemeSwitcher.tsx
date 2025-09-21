import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

interface ThemeSwitcherProps {
	isOpen: boolean;
	onClose: () => void;
	buttonRef: React.RefObject<HTMLButtonElement>;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
	isOpen,
	onClose,
	buttonRef,
}) => {
	const { currentTheme, availableThemes, setTheme } = useTheme();
	const menuRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState({ top: 0, left: 0 });

	useEffect(() => {
		if (isOpen && buttonRef.current && menuRef.current) {
			const buttonRect = buttonRef.current.getBoundingClientRect();
			const menuWidth = 256;
			const menuHeight = 200;
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;
			const padding = 8;

			let left = buttonRect.left;
			let top = buttonRect.bottom + padding;

			if (left + menuWidth > viewportWidth) {
				left = buttonRect.right - menuWidth;
			}

			if (top + menuHeight > viewportHeight) {
				top = buttonRect.top - menuHeight - padding;
			}

			if (left < padding) {
				left = padding;
			}

			if (top < padding) {
				top = buttonRect.bottom + padding;
			}

			setPosition({ top, left });
		}
	}, [isOpen, buttonRef]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node) &&
				buttonRef.current &&
				!buttonRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		const handleResize = () => {
			if (isOpen) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleEscape);
			window.addEventListener("resize", handleResize);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
			window.removeEventListener("resize", handleResize);
		};
	}, [isOpen, onClose, buttonRef]);

	if (!isOpen) return null;

	return (
		<div
			ref={menuRef}
			className="fixed z-50 min-w-64 py-2 rounded-lg shadow-lg"
			style={{
				top: position.top,
				left: position.left,
				backgroundColor: "var(--color-surface)",
				border: "1px solid var(--color-border)",
				boxShadow: "var(--shadow-lg)",
			}}
		>
			<div
				className="px-3 py-2 text-sm font-semibold border-b"
				style={{
					color: "var(--color-text)",
					borderColor: "var(--color-border)",
				}}
			>
				Choose Theme
			</div>

			<div className="py-1">
				{availableThemes.map((theme, index) => (
					<button
						key={index}
						onClick={() => {
							setTheme(theme);
							onClose();
						}}
						className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors"
						style={{
							color: "var(--color-text)",
							backgroundColor:
								currentTheme.name === theme.name
									? "var(--color-primary)"
									: "transparent",
						}}
						onMouseEnter={(e) => {
							if (currentTheme.name !== theme.name) {
								e.currentTarget.style.backgroundColor =
									"var(--color-surfaceHover)";
							}
						}}
						onMouseLeave={(e) => {
							if (currentTheme.name !== theme.name) {
								e.currentTarget.style.backgroundColor =
									"transparent";
							}
						}}
					>
						<div
							className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
							style={{
								borderColor:
									currentTheme.name === theme.name
										? "white"
										: "var(--color-border)",
								backgroundColor: theme.colors.primary,
							}}
						>
							{currentTheme.name === theme.name && (
								<div
									className="w-2 h-2 rounded-full"
									style={{ backgroundColor: "white" }}
								/>
							)}
						</div>

						<div className="flex-1">
							<div
								className="font-medium"
								style={{
									color:
										currentTheme.name === theme.name
											? "white"
											: "var(--color-text)",
								}}
							>
								{theme.name}
							</div>
							<div
								className="text-xs"
								style={{
									color:
										currentTheme.name === theme.name
											? "rgba(255,255,255,0.8)"
											: "var(--color-textMuted)",
								}}
							>
								{theme.name.includes("Dark")
									? "Dark theme"
									: "Light theme"}
							</div>
						</div>

						<div className="flex gap-1">
							<div
								className="w-3 h-3 rounded-full"
								style={{
									backgroundColor: theme.colors.primary,
								}}
							/>
							<div
								className="w-3 h-3 rounded-full"
								style={{ backgroundColor: theme.colors.accent }}
							/>
							<div
								className="w-3 h-3 rounded-full"
								style={{
									backgroundColor: theme.colors.success,
								}}
							/>
						</div>
					</button>
				))}
			</div>
		</div>
	);
};
