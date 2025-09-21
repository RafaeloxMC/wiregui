import React, {
	useEffect,
	useRef,
	useState,
	useMemo,
	useCallback,
} from "react";
import { FileEntry } from "../types";
import { FolderIcon, FileIcon } from "./Icons";

const formatFileSize = (bytes: number): string => {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDate = (timestamp: string): string => {
	try {
		const date = new Date(parseInt(timestamp) * 1000);
		return (
			date.toLocaleDateString() +
			" " +
			date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
		);
	} catch {
		return "";
	}
};

interface FileListItemProps {
	entry: FileEntry;
	onDoubleClick: (entry: FileEntry) => void;
	onContextMenu: (entry: FileEntry, event: React.MouseEvent) => void;
	isSelected: boolean;
	onSelect: (entry: FileEntry) => void;
	showFullPath?: boolean;
}

export const FileListItem: React.FC<FileListItemProps> = React.memo(
	({
		entry,
		onDoubleClick,
		onContextMenu,
		isSelected,
		onSelect,
		showFullPath = false,
	}) => {
		const displayName = showFullPath ? entry.path : entry.name;
		const itemRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			if (itemRef.current) {
				if (isSelected) {
					itemRef.current.style.transform = "translateX(0)";
					itemRef.current.style.boxShadow = "none";
				}
			}
		}, [isSelected]);

		return (
			<div
				ref={itemRef}
				className="flex items-center gap-4 px-4 py-3 cursor-pointer select-none transition-all duration-200"
				style={{
					backgroundColor: isSelected
						? "var(--color-primary)"
						: "transparent",
					color: isSelected ? "white" : "var(--color-text)",
					borderRadius: "var(--border-radius-md)",
					marginBottom: "2px",
				}}
				data-entry-item="true"
				onDoubleClick={() => onDoubleClick(entry)}
				onContextMenu={(e) => onContextMenu(entry, e)}
				onClick={() => onSelect(entry)}
				onMouseEnter={(e) => {
					if (!isSelected) {
						e.currentTarget.style.backgroundColor =
							"var(--color-surfaceHover)";
						e.currentTarget.style.transform = "translateX(4px)";
						e.currentTarget.style.boxShadow = "var(--shadow-sm)";
					}
				}}
				onMouseLeave={(e) => {
					if (!isSelected) {
						e.currentTarget.style.backgroundColor = "transparent";
						e.currentTarget.style.transform = "translateX(0)";
						e.currentTarget.style.boxShadow = "none";
					}
				}}
			>
				<div className="flex-shrink-0">
					{entry.is_directory ? (
						<div
							className="p-2 rounded-lg"
							style={{
								backgroundColor: isSelected
									? "rgba(255,255,255,0.2)"
									: "var(--color-accent)",
								color: isSelected ? "white" : "white",
							}}
						>
							<FolderIcon size={20} />
						</div>
					) : (
						<div
							className="p-2 rounded-lg"
							style={{
								backgroundColor: isSelected
									? "rgba(255,255,255,0.2)"
									: "var(--color-surfaceElevated)",
								color: isSelected
									? "white"
									: "var(--color-textSecondary)",
							}}
						>
							<FileIcon size={20} />
						</div>
					)}
				</div>

				<div className="flex-1 min-w-0">
					<div
						className="font-medium truncate"
						style={{
							fontSize: "var(--font-size-sm)",
							fontWeight: "var(--font-weight-medium)",
						}}
					>
						{displayName}
					</div>
				</div>

				<div
					className="flex-shrink-0 w-20 text-right"
					style={{
						color: isSelected
							? "rgba(255,255,255,0.8)"
							: "var(--color-textSecondary)",
						fontSize: "var(--font-size-xs)",
					}}
				>
					{!entry.is_directory && entry.size
						? formatFileSize(entry.size)
						: ""}
				</div>

				<div
					className="flex-shrink-0 w-32 text-right"
					style={{
						color: isSelected
							? "rgba(255,255,255,0.8)"
							: "var(--color-textSecondary)",
						fontSize: "var(--font-size-xs)",
					}}
				>
					{entry.modified ? formatDate(entry.modified) : ""}
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.entry.path === nextProps.entry.path &&
			prevProps.isSelected === nextProps.isSelected &&
			prevProps.showFullPath === nextProps.showFullPath
		);
	}
);

interface FileListProps {
	entries: FileEntry[];
	onEntryDoubleClick: (entry: FileEntry) => void;
	onEntryContextMenu: (entry: FileEntry, event: React.MouseEvent) => void;
	onEmptySpaceContextMenu?: (event: React.MouseEvent) => void;
	selectedEntries: FileEntry[];
	onSelectionChange: (entries: FileEntry[]) => void;
	showFullPaths?: boolean;
}

export const FileList: React.FC<FileListProps> = ({
	entries,
	onEntryDoubleClick,
	onEntryContextMenu,
	onEmptySpaceContextMenu,
	selectedEntries,
	onSelectionChange,
	showFullPaths = false,
}) => {
	const [sortMode, setSortMode] = useState("name");

	const isSelected = useCallback(
		(entry: FileEntry) => {
			return selectedEntries.some(
				(selected) => selected.path === entry.path
			);
		},
		[selectedEntries]
	);

	const handleSelect = useCallback(
		(entry: FileEntry) => {
			onSelectionChange([entry]);
		},
		[onSelectionChange]
	);

	const sortedEntries = useMemo(() => {
		return [...entries].sort((a, b) => {
			switch (sortMode) {
				case "name":
					return a.name.localeCompare(b.name);
				case "size":
					return (a.size || 0) - (b.size || 0);
				case "modified":
					return (
						parseInt(a.modified || "0") -
						parseInt(b.modified || "0")
					);
				default:
					return a.name.localeCompare(b.name);
			}
		});
	}, [entries, sortMode]);

	return (
		<div
			className="flex-1 flex flex-col"
			style={{
				height: "100%",
				minHeight: 0,
				borderRadius: "var(--border-radius-lg)",
				overflow: "hidden",
			}}
		>
			<div
				className="flex items-center gap-4 px-4 py-3 text-sm font-semibold border-b flex-shrink-0"
				style={{
					backgroundColor: "var(--color-surfaceElevated)",
					color: "var(--color-textSecondary)",
					borderColor: "var(--color-border)",
					fontSize: "var(--font-size-xs)",
					fontWeight: "var(--font-weight-semibold)",
					textTransform: "uppercase",
					letterSpacing: "0.05em",
				}}
			>
				<div className="flex-shrink-0 w-12"></div>
				<div className="flex-1" onClick={() => setSortMode("name")}>
					<span
						className="hover:cursor-pointer"
						onClick={() => setSortMode("name")}
					>
						Name
					</span>
				</div>
				<div className="flex-shrink-0 w-20 text-right">
					<span
						className="hover:cursor-pointer"
						onClick={() => setSortMode("size")}
					>
						Size
					</span>
				</div>
				<div className="flex-shrink-0 w-32 text-right">
					<span
						className="hover:cursor-pointer"
						onClick={() => setSortMode("modified")}
					>
						Modified
					</span>
				</div>
			</div>

			<div
				className="p-3 flex-1 overflow-y-auto"
				style={{
					overflowX: "hidden",
					backgroundColor: "var(--color-surface)",
				}}
				onContextMenu={(e) => {
					const target = e.target as HTMLElement;
					const isClickingOnEntry =
						target.closest("[data-entry-item]");

					if (!isClickingOnEntry) {
						e.preventDefault();
						onEmptySpaceContextMenu?.(e);
					}
				}}
			>
				{sortedEntries.map((entry) => (
					<FileListItem
						key={entry.path}
						entry={entry}
						onDoubleClick={onEntryDoubleClick}
						onContextMenu={onEntryContextMenu}
						isSelected={isSelected(entry)}
						onSelect={handleSelect}
						showFullPath={showFullPaths}
					/>
				))}

				{entries.length === 0 && (
					<div
						className="text-center py-12 text-sm empty-space"
						style={{ color: "var(--color-textMuted)" }}
					>
						This folder is empty
					</div>
				)}
			</div>
		</div>
	);
};
