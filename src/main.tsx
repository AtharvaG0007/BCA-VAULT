import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
// Auto-recover when user's browser requests stale hashed chunks after a new deployment
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const retryKey = "bca_preload_error_reload";
  const lastRetry = sessionStorage.getItem(retryKey);
  const now = Date.now();
  if (!lastRetry || now - parseInt(lastRetry, 10) > 10000) {
    sessionStorage.setItem(retryKey, now.toString());
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
