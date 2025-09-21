import React, { useState, useRef, useEffect } from "react";
import { FileEntry } from "../types";
import { CopyIcon, EditIcon, TrashIcon, PlusIcon } from "./Icons";
import { FileSystemAPI } from "../services/fileSystem";

interface ContextMenuProps {
	x: number;
	y: number;
	entry: FileEntry | null;
	currentDirectory: string;
	onClose: () => void;
	onRefresh: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
	x,
	y,
	entry,
	currentDirectory,
	onClose,
	onRefresh,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);
	const [isCreatingFile, setIsCreatingFile] = useState(false);
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [newName, setNewName] = useState("");

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [onClose]);

	const handleCreateFile = async () => {
		if (!newName.trim()) return;

		const targetDir = entry?.is_directory
			? entry.path
			: entry
			? entry.path.split("/").slice(0, -1).join("/") || "/"
			: currentDirectory;
		const filePath = `${targetDir}/${newName.trim()}`;

		try {
			await FileSystemAPI.createFile(filePath).then(() => onRefresh());
			onClose();
		} catch (error) {
			console.error("Failed to create file:", error);
		}

		setIsCreatingFile(false);
		setNewName("");
	};

	const handleCreateFolder = async () => {
		if (!newName.trim()) return;

		const targetDir = entry?.is_directory
			? entry.path
			: entry
			? entry.path.split("/").slice(0, -1).join("/") || "/"
			: currentDirectory;
		const folderPath = `${targetDir}/${newName.trim()}`;

		try {
			await FileSystemAPI.createDirectory(folderPath).then(() =>
				onRefresh()
			);
			onClose();
		} catch (error) {
			console.error("Failed to create folder:", error);
		}

		setIsCreatingFolder(false);
		setNewName("");
	};

	const handleRename = async () => {
		if (!newName.trim() || !entry) return;

		try {
			await FileSystemAPI.renameItem(entry.path, newName.trim()).then(
				() => onRefresh()
			);
			onClose();
		} catch (error) {
			console.error("Failed to rename item:", error);
		}

		setIsRenaming(false);
		setNewName("");
	};

	const handleDelete = async () => {
		if (!entry) return;

		const confirmed = window.confirm(
			`Are you sure you want to delete "${entry.name}"?`
		);
		if (!confirmed) return;

		try {
			await FileSystemAPI.deleteItem(entry.path).then(() => onRefresh());
			onClose();
		} catch (error) {
			console.error("Failed to delete item:", error);
		}
	};

	const startRename = () => {
		if (entry) {
			setNewName(entry.name);
			setIsRenaming(true);
		}
	};

	const startCreateFile = () => {
		setNewName("");
		setIsCreatingFile(true);
	};

	const startCreateFolder = () => {
		setNewName("");
		setIsCreatingFolder(true);
	};

	if (isCreatingFile || isCreatingFolder || isRenaming) {
		return (
			<div
				ref={menuRef}
				className="fixed z-50 min-w-48 rounded-md shadow-lg"
				style={{
					left: x,
					top: y,
					backgroundColor: "var(--color-surface)",
					border: "1px solid var(--color-border)",
					boxShadow: "var(--shadow-lg)",
				}}
			>
				<div className="p-3">
					<div
						className="text-sm font-medium mb-2"
						style={{ color: "var(--color-text)" }}
					>
						{isRenaming
							? "Rename"
							: isCreatingFile
							? "New File"
							: "New Folder"}
					</div>
					<input
						type="text"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								if (isRenaming) handleRename();
								else if (isCreatingFile) handleCreateFile();
								else if (isCreatingFolder) handleCreateFolder();
							} else if (e.key === "Escape") {
								setIsRenaming(false);
								setIsCreatingFile(false);
								setIsCreatingFolder(false);
								setNewName("");
							}
						}}
						className="w-full px-2 py-1 text-sm rounded border"
						style={{
							backgroundColor: "var(--color-background)",
							borderColor: "var(--color-border)",
							color: "var(--color-text)",
						}}
						placeholder={
							isCreatingFile
								? "filename.txt"
								: isCreatingFolder
								? "folder name"
								: ""
						}
						autoFocus
					/>
					<div className="flex gap-2 mt-2">
						<button
							onClick={() => {
								if (isRenaming) handleRename();
								else if (isCreatingFile) handleCreateFile();
								else if (isCreatingFolder) handleCreateFolder();
							}}
							className="px-2 py-1 text-xs rounded"
							style={{
								backgroundColor: "var(--color-primary)",
								color: "white",
							}}
						>
							{isRenaming ? "Rename" : "Create"}
						</button>
						<button
							onClick={() => {
								setIsRenaming(false);
								setIsCreatingFile(false);
								setIsCreatingFolder(false);
								setNewName("");
							}}
							className="px-2 py-1 text-xs rounded"
							style={{
								backgroundColor: "var(--color-secondary)",
								color: "white",
							}}
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			ref={menuRef}
			className="fixed z-50 min-w-48 py-1 rounded-md shadow-lg"
			style={{
				left: x,
				top: y,
				backgroundColor: "var(--color-surface)",
				border: "1px solid var(--color-border)",
				boxShadow: "var(--shadow-lg)",
			}}
		>
			<MenuItem
				icon={<PlusIcon size={16} />}
				label={entry?.is_directory ? "New Subfile" : "New File"}
				onClick={startCreateFile}
			/>
			<MenuItem
				icon={<PlusIcon size={16} />}
				label={entry?.is_directory ? "New Subdirectory" : "New Folder"}
				onClick={startCreateFolder}
			/>

			{entry && (
				<>
					<div
						className="h-px mx-2 my-1"
						style={{ backgroundColor: "var(--color-border)" }}
					/>

					<MenuItem
						icon={<EditIcon size={16} />}
						label="Rename"
						onClick={startRename}
					/>

					<MenuItem
						icon={<CopyIcon size={16} />}
						label="Copy"
						onClick={() => {
							console.log("Copy:", entry.path);
							onClose();
						}}
					/>

					<div
						className="h-px mx-2 my-1"
						style={{ backgroundColor: "var(--color-border)" }}
					/>

					<MenuItem
						icon={<TrashIcon size={16} />}
						label="Delete"
						onClick={handleDelete}
						dangerous
					/>
				</>
			)}
		</div>
	);
};

interface MenuItemProps {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	dangerous?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
	icon,
	label,
	onClick,
	dangerous = false,
}) => {
	return (
		<button
			className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors"
			style={{
				color: dangerous ? "var(--color-error)" : "var(--color-text)",
				backgroundColor: "transparent",
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.backgroundColor =
					"var(--color-surfaceHover)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.backgroundColor = "transparent";
			}}
			onClick={onClick}
		>
			<span
				style={{
					color: dangerous
						? "var(--color-error)"
						: "var(--color-textSecondary)",
				}}
			>
				{icon}
			</span>
			{label}
		</button>
	);
};
