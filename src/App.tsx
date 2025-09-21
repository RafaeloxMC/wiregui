import { ThemeProvider } from "./context/ThemeContext";
import { FileManager } from "./components/FileManager";
import "./App.css";

function App() {
	return (
		<ThemeProvider>
			<FileManager />
		</ThemeProvider>
	);
}

export default App;
