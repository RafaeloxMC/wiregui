import React from "react";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	ArrowUpIcon,
	HardDriveIcon,
	HomeIcon,
	RefreshIcon,
} from "./Icons";

interface ToolbarProps {
	currentPath: string;
	canGoBack: boolean;
	canGoForward: boolean;
	onBack: () => void;
	onForward: () => void;
	onUp: () => void;
	onHome: () => void;
	onRefresh: () => void;
	onNavigateToPath: (path: string) => void;
}
export const Toolbar: React.FC<ToolbarProps> = ({
	currentPath,
	canGoBack,
	canGoForward,
	onBack,
	onForward,
	onUp,
	onHome,
	onRefresh,
	onNavigateToPath,
}) => {
	const pathParts = currentPath.split("/").filter(Boolean);

	return (
		<div
			className="flex items-center gap-3 px-6 py-4 border-b"
			style={{
				backgroundColor: "var(--color-surface)",
				borderColor: "var(--color-border)",
				backdropFilter: "blur(10px)",
				borderRadius:
					"0 0 var(--border-radius-lg) var(--border-radius-lg)",
				boxShadow: "var(--shadow-sm)",
			}}
		>
			<div className="flex items-center gap-1">
				<ToolbarButton
					onClick={onBack}
					disabled={!canGoBack}
					title="Go back"
					icon={<ArrowLeftIcon size={18} />}
				/>
				<ToolbarButton
					onClick={onForward}
					disabled={!canGoForward}
					title="Go forward"
					icon={<ArrowRightIcon size={18} />}
				/>
				<ToolbarButton
					onClick={onUp}
					title="Go up one level"
					icon={<ArrowUpIcon size={18} />}
				/>
			</div>

			<div
				className="w-px h-6 mx-2"
				style={{ backgroundColor: "var(--color-border)" }}
			/>

			<div className="flex items-center gap-1">
				<ToolbarButton
					onClick={onHome}
					title="Go to home directory"
					icon={<HomeIcon size={18} />}
				/>
				<ToolbarButton
					onClick={onRefresh}
					title="Refresh current directory"
					icon={<RefreshIcon size={18} />}
				/>
			</div>

			<div className="flex-1 min-w-0 mx-4">
				<div
					className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium overflow-x-auto"
					style={{
						backgroundColor: "var(--color-backgroundSecondary)",
						color: "var(--color-textSecondary)",
						border: "1px solid var(--color-border)",
					}}
				>
					<button
						onClick={() => onNavigateToPath("/")}
						className="flex-shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
					>
						<HardDriveIcon size={14} />
					</button>
					{pathParts.length === 0 ? (
						<span>/</span>
					) : (
						pathParts.map((part, index) => {
							const pathToIndex =
								"/" + pathParts.slice(0, index + 1).join("/");
							const isLast = index === pathParts.length - 1;

							return (
								<React.Fragment key={index}>
									<span className="opacity-40">/</span>
									{isLast ? (
										<span
											className="font-semibold px-1 py-0.5"
											style={{
												color: "var(--color-text)",
											}}
										>
											{part}
										</span>
									) : (
										<button
											onClick={() =>
												onNavigateToPath(pathToIndex)
											}
											className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer rounded px-1 py-0.5 hover:bg-gray-200/20"
											style={{
												color: "var(--color-textMuted)",
											}}
										>
											{part}
										</button>
									)}
								</React.Fragment>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
};

interface ToolbarButtonProps {
	onClick: () => void;
	disabled?: boolean;
	title: string;
	icon: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
	onClick,
	disabled,
	title,
	icon,
}) => {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			title={title}
			className="p-2.5 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
			style={{
				color: disabled
					? "var(--color-textMuted)"
					: "var(--color-text)",
				backgroundColor: "transparent",
			}}
			onMouseEnter={(e) => {
				if (!disabled) {
					e.currentTarget.style.backgroundColor =
						"var(--color-surfaceHover)";
					e.currentTarget.style.transform = "translateY(-1px)";
					e.currentTarget.style.boxShadow = "var(--shadow-md)";
				}
			}}
			onMouseLeave={(e) => {
				if (!disabled) {
					e.currentTarget.style.backgroundColor = "transparent";
					e.currentTarget.style.transform = "translateY(0)";
					e.currentTarget.style.boxShadow = "none";
				}
			}}
		>
			{icon}
		</button>
	);
};
