import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { DirectoryContents, FileEntry } from "../types";

export class FileSystemAPI {
	static async listDirectory(path: string): Promise<DirectoryContents> {
		return await invoke<DirectoryContents>("list_directory", { path });
	}

	static async getHomeDirectory(): Promise<string> {
		return await invoke<string>("get_home_directory");
	}

	static async searchFiles(
		path: string,
		query: string,
		maxDepth?: number
	): Promise<FileEntry[]> {
		return await invoke<FileEntry[]>("search_files", {
			path,
			query,
			max_depth: maxDepth,
		});
	}

	static async searchFilesStreaming(
		path: string,
		query: string,
		onResult: (file: FileEntry) => void,
		onStarted?: () => void,
		onCompleted?: () => void,
		maxDepth?: number,
		maxResults?: number
	): Promise<() => void> {
		const unlistenResult = await listen<FileEntry>(
			"search-result",
			(event) => {
				onResult(event.payload);
			}
		);

		const unlistenStarted = await listen("search-started", () => {
			onStarted?.();
		});

		const unlistenCompleted = await listen("search-completed", () => {
			onCompleted?.();
		});

		await invoke("search_files_streaming", {
			path,
			query,
			max_depth: maxDepth,
			max_results: maxResults,
		});

		return () => {
			unlistenResult();
			unlistenStarted();
			unlistenCompleted();
		};
	}

	static async createFile(_path: string): Promise<void> {
		console.warn("createFile not implemented yet");
		throw new Error("createFile not implemented yet");
	}

	static async createDirectory(_path: string): Promise<void> {
		console.warn("createDirectory not implemented yet");
		throw new Error("createDirectory not implemented yet");
	}

	static async renameItem(_oldPath: string, _newName: string): Promise<void> {
		console.warn("renameItem not implemented yet");
		throw new Error("renameItem not implemented yet");
	}

	static async deleteItem(_path: string): Promise<void> {
		console.warn("deleteItem not implemented yet");
		throw new Error("deleteItem not implemented yet");
	}
}
