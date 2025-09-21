export interface FileEntry {
	name: string;
	path: string;
	is_directory: boolean;
	size?: number;
	modified?: string;
	item_count?: number;
}
export interface DirectoryContents {
	entries: FileEntry[];
	current_path: string;
}

export type ViewMode = "list" | "grid";
export type SortBy = "name" | "size" | "modified" | "type";
export type SortOrder = "asc" | "desc";
