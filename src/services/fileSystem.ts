import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { DirectoryContents, FileEntry } from "../types";

export class FileSystemAPI {
	private static deleteListeners: ((path: string) => void)[] = [];

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

	static async createFile(path: string): Promise<void> {
		return await invoke<void>("create_file", { path });
	}

	static async createDirectory(path: string): Promise<void> {
		return await invoke<void>("create_directory", { path });
	}

	static async renameItem(oldPath: string, newName: string): Promise<void> {
		return await invoke<void>("rename_item", {
			old_path: oldPath,
			new_name: newName,
		});
	}

	static async deleteItem(path: string): Promise<void> {
		await invoke<void>("delete_item", { path });
		this.deleteListeners.forEach((listener) => listener(path));
	}

	static onItemDeleted(callback: (path: string) => void): () => void {
		this.deleteListeners.push(callback);

		return () => {
			const index = this.deleteListeners.indexOf(callback);
			if (index > -1) {
				this.deleteListeners.splice(index, 1);
			}
		};
	}

	static async initializeDeleteListener(): Promise<() => void> {
		const unlisten = await listen<{ path: string }>(
			"item-deleted",
			(event) => {
				this.deleteListeners.forEach((listener) =>
					listener(event.payload.path)
				);
			}
		);

		return unlisten;
	}
}
