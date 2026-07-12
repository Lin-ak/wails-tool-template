import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "@/App";
import "@/app.css";
import { initTheme } from "@/shared/theme";
import { installMockBridge } from "./mockBridge";

// E2E / visual-dev entry (loaded by e2e.html only): the real App on a mocked
// Wails bridge. The mock must be installed before the first render so any
// bridge-backed query resolves immediately.
installMockBridge();
initTheme();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
