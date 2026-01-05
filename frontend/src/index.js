import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Fix ResizeObserver loop error - patch before any component renders
// This is a known benign issue with React Flow and similar components
if (typeof window !== 'undefined') {
  const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };

  const OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class ResizeObserver extends OriginalResizeObserver {
    constructor(callback) {
      super(debounce(callback, 20));
    }
  };

  // Suppress the error in error overlay
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.toString().includes('ResizeObserver loop')) {
      return;
    }
    originalError.apply(console, args);
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
