import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress ResizeObserver loop error - this is a known benign issue
// that occurs with components that observe size changes (React Flow, etc.)
const resizeObserverError = window.onerror;
window.onerror = (message, ...args) => {
  if (typeof message === 'string' && message.includes('ResizeObserver loop')) {
    return true; // Suppress the error
  }
  return resizeObserverError ? resizeObserverError(message, ...args) : false;
};

// Also handle unhandled promise rejections for ResizeObserver
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('ResizeObserver loop')) {
    event.stopPropagation();
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
