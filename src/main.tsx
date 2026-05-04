import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/src/App";
import "@/src/style.css";

const appElement = document.getElementById("app");

if (!appElement) {
	throw new Error('Missing root element with id "app"');
}

createRoot(appElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
