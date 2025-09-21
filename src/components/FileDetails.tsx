import React from "react";
import { FileEntry } from "../types";
import { FolderIcon, FileIcon } from "./Icons";

interface FileDetailsProps {
	selectedEntry: FileEntry | null;
}

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
			" at " +
			date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			})
		);
	} catch {
		return "Unknown";
	}
};

const getFileExtension = (filename: string): string => {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot === -1 || lastDot === 0) return "";
	return filename.slice(lastDot + 1).toUpperCase();
};

export const FileDetails: React.FC<FileDetailsProps> = ({ selectedEntry }) => {
	if (!selectedEntry) {
		return (
			<div
				className="px-6 py-4 border-t"
				style={{
					backgroundColor: "var(--color-surface)",
					borderColor: "var(--color-border)",
					minHeight: "120px",
				}}
			>
				<div
					className="flex items-center justify-center h-full"
					style={{
						color: "var(--color-textMuted)",
						fontSize: "var(--font-size-sm)",
					}}
				>
					Select a file or folder to view details
				</div>
			</div>
		);
	}

	const extension = getFileExtension(selectedEntry.name);

	return (
		<div
			className="px-6 py-4 border-t"
			style={{
				backgroundColor: "var(--color-surface)",
				borderColor: "var(--color-border)",
				minHeight: "120px",
			}}
		>
			<div className="flex items-start gap-4">
				<div className="flex-shrink-0">
					{selectedEntry.is_directory ? (
						<div
							className="p-3 rounded-xl"
							style={{
								backgroundColor: "var(--color-accent)",
								color: "white",
							}}
						>
							<FolderIcon size={24} />
						</div>
					) : (
						<div
							className="p-3 rounded-xl"
							style={{
								backgroundColor: "var(--color-primary)",
								color: "white",
							}}
						>
							<FileIcon size={24} />
						</div>
					)}
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1 min-w-0">
							<h3
								className="font-semibold truncate mb-1"
								style={{
									color: "var(--color-text)",
									fontSize: "var(--font-size-base)",
									fontWeight: "var(--font-weight-semibold)",
								}}
							>
								{selectedEntry.name}
							</h3>

							<div
								className="text-sm mb-2"
								style={{ color: "var(--color-textSecondary)" }}
							>
								{selectedEntry.is_directory
									? "Folder"
									: extension
									? `${extension} File`
									: "File"}
							</div>

							<div
								className="text-xs font-mono truncate"
								style={{
									color: "var(--color-textMuted)",
									backgroundColor:
										"var(--color-backgroundSecondary)",
									padding: "4px 8px",
									borderRadius: "var(--border-radius-sm)",
								}}
							>
								{selectedEntry.path}
							</div>
						</div>

						<div className="flex-shrink-0">
							<div className="grid grid-cols-1 gap-2 text-right">
								{selectedEntry.is_directory &&
								selectedEntry.item_count !== undefined ? (
									<div>
										<div
											className="text-xs font-medium"
											style={{
												color: "var(--color-textSecondary)",
											}}
										>
											Items
										</div>
										<div
											className="text-sm font-semibold"
											style={{
												color: "var(--color-text)",
											}}
										>
											{selectedEntry.item_count}{" "}
											{selectedEntry.item_count === 1
												? "item"
												: "items"}
										</div>
									</div>
								) : !selectedEntry.is_directory &&
								  selectedEntry.size ? (
									<div>
										<div
											className="text-xs font-medium"
											style={{
												color: "var(--color-textSecondary)",
											}}
										>
											Size
										</div>
										<div
											className="text-sm font-semibold"
											style={{
												color: "var(--color-text)",
											}}
										>
											{formatFileSize(selectedEntry.size)}
										</div>
									</div>
								) : null}

								{selectedEntry.modified && (
									<div>
										<div
											className="text-xs font-medium"
											style={{
												color: "var(--color-textSecondary)",
											}}
										>
											Modified
										</div>
										<div
											className="text-sm"
											style={{
												color: "var(--color-text)",
											}}
										>
											{formatDate(selectedEntry.modified)}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
