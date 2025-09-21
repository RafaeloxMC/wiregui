# WireGUI File Manager

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/RafaeloxMC/wiregui)](https://github.com/RafaeloxMC/wiregui/releases/latest)
[![Build Status](https://img.shields.io/github/actions/workflow/status/RafaeloxMC/wiregui/tauri.yml?branch=main)](https://github.com/RafaeloxMC/wiregui/actions/workflows/tauri.yml)
[![GitHub downloads](https://img.shields.io/github/downloads/RafaeloxMC/wiregui/total)](https://github.com/RafaeloxMC/wiregui/releases)
[![License](https://img.shields.io/github/license/RafaeloxMC/wiregui)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/RafaeloxMC/wiregui/releases)

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
