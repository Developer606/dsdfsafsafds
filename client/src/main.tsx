import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setupWebSocket } from "./lib/websocket";

// Initialize global WebSocket connection
setupWebSocket();

createRoot(document.getElementById("root")!).render(<App />);
