# WireGUI File Manager

What should've been a WireGuard client at first, turned out to be... a file manager?

WireGUI is a file manager built with Tauri. It features a blazingly fast backend written in Rust, and a sleek, modern frontend built with React.

## Features

-   Fast and efficient file operations
-   User-friendly interface
-   Cross-platform support (Windows, macOS, Linux)
-   Secure file handling
-   Customizable themes

## Installation

To install WireGUI, follow these steps:

1. Clone the repository:
    ```bash
    $ git clone https://github.com/RafaeloxMC/wiregui.git
    $ cd wiregui
    ```
2. Install dependencies:
    ```bash
    $ yarn
    ```
3. Build the application:
    ```bash
    $ yarn tauri build
    ```

You can find the release in the `src-tauri/target/release/bundle` directory.

## Troubleshooting

If you encounter the build error `failed to run linuxdeploy`, try to run the build command like this:

```bash
NO_STRIP=true yarn tauri build
```

This should resolve the issue.
