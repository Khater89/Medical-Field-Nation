import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isLovablePreview =
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.startsWith("id-preview--");

const unregisterPreviewServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((cacheKey) => cacheKey.startsWith("mfn-"))
        .map((cacheKey) => caches.delete(cacheKey)),
    );
  }
};

const shouldRegisterServiceWorker = import.meta.env.PROD && !isLovablePreview;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (shouldRegisterServiceWorker) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      return;
    }

    unregisterPreviewServiceWorkers().catch(() => {});
  });
}
