import React, { useState, useEffect, useCallback, useRef } from "react";
import { FileSystemAPI } from "../services/fileSystem";
import { FileEntry, DirectoryContents } from "../types";
import { Toolbar } from "./Toolbar";
import { FileList } from "./FileList";
import { FileDetails } from "./FileDetails";
import { ContextMenu } from "./ContextMenu";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { SearchIcon, PaletteIcon, EyeIcon, EyeOffIcon } from "./Icons";

export const FileManager: React.FC = () => {
	const [currentDirectory, setCurrentDirectory] =
		useState<DirectoryContents | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [history, setHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [selectedEntries, setSelectedEntries] = useState<FileEntry[]>([]);
	const [selectedForDetails, setSelectedForDetails] =
		useState<FileEntry | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchResults, setSearchResults] = useState<FileEntry[]>([]);
	const [searchCleanup, setSearchCleanup] = useState<(() => void) | null>(
		null
	);
	const [showHiddenFiles, setShowHiddenFiles] = useState(false);
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
		entry: FileEntry | null;
		currentDirectory: string;
		onClose: () => void;
		onRefresh: () => void;
	} | null>(null);
	const [isThemeSwitcherOpen, setIsThemeSwitcherOpen] = useState(false);
	const themeSwitcherButtonRef = useRef<HTMLButtonElement>(null!);

	useEffect(() => {
		const unsubscribe = FileSystemAPI.onItemDeleted((_deletedPath) => {
			handleRefresh();
		});

		return unsubscribe;
	}, []);

	const handleSelectionChange = (entries: FileEntry[]) => {
		setSelectedEntries(entries);
		setSelectedForDetails(entries.length > 0 ? entries[0] : null);
	};

	const loadDirectory = useCallback(
		async (path: string, addToHistory: boolean = true) => {
			setLoading(true);
			setError(null);
			setSelectedEntries([]);
			setSelectedForDetails(null);

			try {
				const contents = await FileSystemAPI.listDirectory(path);
				setCurrentDirectory(contents);

				if (addToHistory) {
					const newHistory = history.slice(0, historyIndex + 1);
					newHistory.push(path);
					setHistory(newHistory);
					setHistoryIndex(newHistory.length - 1);
				}
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Failed to load directory"
				);
			} finally {
				setLoading(false);
			}
		},
		[history, historyIndex]
	);

	const loadDirectoryNoCache = useCallback(
		async (path: string, addToHistory: boolean = true) => {
			setLoading(true);
			setError(null);
			setSelectedEntries([]);
			setSelectedForDetails(null);

			try {
				const contents = await FileSystemAPI.listDirectoryNoCache(path);
				setCurrentDirectory(contents);

				if (addToHistory) {
					const newHistory = history.slice(0, historyIndex + 1);
					newHistory.push(path);
					setHistory(newHistory);
					setHistoryIndex(newHistory.length - 1);
				}
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Failed to load directory"
				);
			} finally {
				setLoading(false);
			}
		},
		[history, historyIndex]
	);

	const navigateToHome = useCallback(async () => {
		setLoading(true);
		setError(null);
		setSelectedEntries([]);
		setSelectedForDetails(null);

		try {
			const homePath = await FileSystemAPI.getHomeDirectory();
			const contents = await FileSystemAPI.listDirectory(homePath);
			setCurrentDirectory(contents);

			setHistory([homePath]);
			setHistoryIndex(0);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to get home directory"
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		let mounted = true;

		const initializeHome = async () => {
			try {
				const homePath = await FileSystemAPI.getHomeDirectory();
				if (mounted) {
					await loadDirectory(homePath);
				}
			} catch (err) {
				if (mounted) {
					setError(
						err instanceof Error
							? err.message
							: "Failed to get home directory"
					);
				}
			}
		};

		initializeHome();

		return () => {
			mounted = false;
		};
	}, []);

	const handleBack = () => {
		if (historyIndex > 0) {
			const previousPath = history[historyIndex - 1];
			setHistoryIndex(historyIndex - 1);
			loadDirectory(previousPath, false);
		}
	};

	const handleForward = () => {
		if (historyIndex < history.length - 1) {
			const nextPath = history[historyIndex + 1];
			setHistoryIndex(historyIndex + 1);
			loadDirectory(nextPath, false);
		}
	};

	const handleUp = () => {
		if (currentDirectory) {
			const parentPath =
				currentDirectory.current_path
					.split("/")
					.slice(0, -1)
					.join("/") || "/";
			loadDirectory(parentPath);
		}
	};

	const handleRefresh = () => {
		if (currentDirectory) {
			loadDirectoryNoCache(currentDirectory.current_path, false);
		}
	};

	const handleEntryDoubleClick = (entry: FileEntry) => {
		if (entry.is_directory) {
			loadDirectory(entry.path);
		}
	};

	const handleEntryContextMenu = (
		entry: FileEntry,
		event: React.MouseEvent
	) => {
		event.preventDefault();
		setContextMenu({
			x: event.clientX,
			y: event.clientY,
			entry: entry,
			currentDirectory: currentDirectory?.current_path || "/",
			onClose: closeContextMenu,
			onRefresh: handleRefresh,
		});
	};

	const handleEmptySpaceContextMenu = (event: React.MouseEvent) => {
		event.preventDefault();
		setContextMenu({
			x: event.clientX,
			y: event.clientY,
			entry: null,
			currentDirectory: currentDirectory?.current_path || "/",
			onClose: closeContextMenu,
			onRefresh: handleRefresh,
		});
	};

	const closeContextMenu = () => {
		setContextMenu(null);
	};

	const handleSearch = useCallback(
		async (query: string) => {
			if (!query.trim() || !currentDirectory) return;

			if (searchCleanup) {
				searchCleanup();
			}

			setSearchResults([]);
			setIsSearching(true);

			try {
				const cleanup = await FileSystemAPI.searchFilesStreaming(
					currentDirectory.current_path,
					query.trim(),
					(file: FileEntry) => {
						setSearchResults((prev) => {
							const exists = prev.some(
								(existing) =>
									existing.path === file.path &&
									existing.name === file.name &&
									existing.is_directory === file.is_directory
							);
							if (exists) {
								return prev;
							}
							return [...prev, file];
						});
					},
					() => {
						console.log("Search started");
					},
					() => {
						setIsSearching(false);
						console.log("Search completed");
					},
					100
				);

				setSearchCleanup(() => cleanup);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Search failed");
				setIsSearching(false);
			}
		},
		[currentDirectory, searchCleanup]
	);

	useEffect(() => {
		if (!searchQuery.trim()) {
			clearSearch();
			return;
		}

		const timeoutId = setTimeout(() => {
			handleSearch(searchQuery);
		}, 300);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [searchQuery]);

	const clearSearch = useCallback(() => {
		if (searchCleanup) {
			searchCleanup();
			setSearchCleanup(null);
		}

		setSearchQuery("");
		setIsSearching(false);
		setSearchResults([]);
	}, [searchCleanup]);

	useEffect(() => {
		return () => {
			if (searchCleanup) {
				searchCleanup();
			}
		};
	}, [searchCleanup]);

	const displayedEntries =
		searchResults.length > 0 || searchQuery.trim()
			? searchResults
			: currentDirectory?.entries || [];

	return (
		<div
			className="flex flex-col"
			style={{
				backgroundColor: "var(--color-background)",
				color: "var(--color-text)",
				fontFamily: "var(--font-family)",
				height: "100vh",
				width: "100vw",
			}}
		>
			{currentDirectory && (
				<Toolbar
					currentPath={currentDirectory.current_path}
					canGoBack={historyIndex > 0}
					canGoForward={historyIndex < history.length - 1}
					onBack={handleBack}
					onForward={handleForward}
					onUp={handleUp}
					onHome={navigateToHome}
					onRefresh={handleRefresh}
					onNavigateToPath={loadDirectory}
				/>
			)}

			<div
				className="px-6 py-4 border-b"
				style={{
					backgroundColor: "var(--color-surface)",
					borderColor: "var(--color-border)",
				}}
			>
				<div className="flex items-center gap-4">
					<div className="flex-1 relative">
						<div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
							<SearchIcon
								size={18}
								style={{ color: "var(--color-textMuted)" }}
							/>
						</div>
						<input
							type="text"
							placeholder="Search files and folders..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleSearch(searchQuery);
								} else if (e.key === "Escape") {
									clearSearch();
								}
							}}
							className="w-full pl-12 pr-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2"
							style={{
								backgroundColor:
									"var(--color-backgroundSecondary)",
								border: "1px solid var(--color-border)",
								color: "var(--color-text)",
								fontSize: "var(--font-size-sm)",
								borderRadius: "var(--border-radius-xl)",
							}}
							onFocus={(e) => {
								e.target.style.borderColor =
									"var(--color-primary)";
								e.target.style.boxShadow =
									"0 0 0 3px rgba(99, 102, 241, 0.1)";
								e.target.style.transform = "translateY(-1px)";
							}}
							onBlur={(e) => {
								e.target.style.borderColor =
									"var(--color-border)";
								e.target.style.boxShadow = "none";
								e.target.style.transform = "translateY(0)";
							}}
						/>
						{searchQuery && (
							<button
								onClick={clearSearch}
								className="absolute inset-y-0 right-0 flex items-center pr-4"
								style={{ color: "var(--color-textMuted)" }}
							>
								✕
							</button>
						)}
					</div>

					<button
						onClick={() => handleSearch(searchQuery)}
						className="px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
						style={{
							backgroundColor: "var(--color-primary)",
							color: "white",
						}}
					>
						{isSearching ? "Searching..." : "Search"}
					</button>

					{searchResults.length > 0 && (
						<button
							onClick={clearSearch}
							className="px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
							style={{
								backgroundColor: "var(--color-secondary)",
								color: "white",
							}}
						>
							Clear
						</button>
					)}
					<button
						className="p-3 rounded-xl transition-all duration-200"
						style={{
							color: "var(--color-text)",
							backgroundColor: isThemeSwitcherOpen
								? "var(--color-primary)"
								: "var(--color-backgroundSecondary)",
							border: "1px solid var(--color-border)",
							borderRadius: "var(--border-radius-xl)",
						}}
						onClick={() => setShowHiddenFiles(!showHiddenFiles)}
					>
						{showHiddenFiles ? <EyeIcon /> : <EyeOffIcon />}
					</button>
					<button
						ref={themeSwitcherButtonRef}
						onClick={() =>
							setIsThemeSwitcherOpen(!isThemeSwitcherOpen)
						}
						className="p-3 rounded-xl transition-all duration-200"
						style={{
							color: "var(--color-text)",
							backgroundColor: isThemeSwitcherOpen
								? "var(--color-primary)"
								: "var(--color-backgroundSecondary)",
							border: "1px solid var(--color-border)",
							borderRadius: "var(--border-radius-xl)",
						}}
						onMouseEnter={(e) => {
							if (!isThemeSwitcherOpen) {
								e.currentTarget.style.backgroundColor =
									"var(--color-surfaceHover)";
								e.currentTarget.style.transform =
									"translateY(-1px)";
								e.currentTarget.style.boxShadow =
									"var(--shadow-md)";
							}
						}}
						onMouseLeave={(e) => {
							if (!isThemeSwitcherOpen) {
								e.currentTarget.style.backgroundColor =
									"var(--color-backgroundSecondary)";
								e.currentTarget.style.transform =
									"translateY(0)";
								e.currentTarget.style.boxShadow = "none";
							}
						}}
						title="Change theme"
					>
						<PaletteIcon size={18} />
					</button>
				</div>
			</div>

			<div className="flex-1 flex flex-col overflow-hidden">
				{loading && (
					<div
						className="flex items-center justify-center p-8"
						style={{ color: "var(--color-textMuted)" }}
					>
						Loading...
					</div>
				)}

				{error && (
					<div
						className="mx-4 mt-4 p-3 rounded-md"
						style={{
							backgroundColor: "var(--color-error)",
							color: "white",
						}}
					>
						{error}
					</div>
				)}

				{!loading && !error && currentDirectory && (
					<div className="flex-1 flex flex-col overflow-hidden">
						{searchResults.length > 0 && (
							<div
								className="px-4 py-2 text-sm flex-shrink-0 rounded-3xl"
								style={{
									backgroundColor: "var(--color-info)",
									color: "white",
								}}
							>
								Found {searchResults.length} result(s) for "
								{searchQuery}"
							</div>
						)}

						<FileList
							entries={
								showHiddenFiles
									? displayedEntries
									: displayedEntries.filter(
											(f) => !f.name.startsWith(".")
									  )
							}
							onEntryDoubleClick={handleEntryDoubleClick}
							onEntryContextMenu={handleEntryContextMenu}
							onEmptySpaceContextMenu={
								handleEmptySpaceContextMenu
							}
							selectedEntries={selectedEntries}
							onSelectionChange={handleSelectionChange}
							showFullPaths={searchQuery.trim().length > 0}
						/>
					</div>
				)}
			</div>

			<FileDetails selectedEntry={selectedForDetails} />

			<div
				className="flex items-center justify-between px-6 py-3 border-t"
				style={{
					backgroundColor: "var(--color-surfaceElevated)",
					borderColor: "var(--color-border)",
					color: "var(--color-textSecondary)",
					fontSize: "var(--font-size-xs)",
					backdropFilter: "blur(10px)",
				}}
			>
				<div className="flex items-center gap-4">
					{currentDirectory && (
						<>
							<span
								className="px-3 py-1 rounded-full"
								style={{
									backgroundColor: "var(--color-primary)",
									color: "white",
									fontSize: "var(--font-size-xs)",
									fontWeight: "var(--font-weight-medium)",
								}}
							>
								{displayedEntries.length} item
								{displayedEntries.length !== 1 ? "s" : ""}
							</span>
							{selectedEntries.length > 0 && (
								<span
									className="px-3 py-1 rounded-full"
									style={{
										backgroundColor: "var(--color-accent)",
										color: "white",
										fontSize: "var(--font-size-xs)",
										fontWeight: "var(--font-weight-medium)",
									}}
								>
									{selectedEntries.length} selected
								</span>
							)}
						</>
					)}
				</div>

				<div className="flex items-center gap-4">
					<span
						style={{
							fontWeight: "var(--font-weight-semibold)",
							color: "var(--color-primary)",
						}}
					>
						WireGUI File Manager
					</span>
					<span className="opacity-60">v1.0.0</span>
				</div>
			</div>

			{contextMenu && (
				<ContextMenu
					x={contextMenu.x}
					y={contextMenu.y}
					entry={contextMenu.entry}
					currentDirectory={currentDirectory?.current_path || "/"}
					onClose={closeContextMenu}
					onRefresh={handleRefresh}
				/>
			)}

			<ThemeSwitcher
				isOpen={isThemeSwitcherOpen}
				onClose={() => setIsThemeSwitcherOpen(false)}
				buttonRef={themeSwitcherButtonRef}
			/>
		</div>
	);
};
