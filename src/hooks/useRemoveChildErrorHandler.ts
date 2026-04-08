"use client";

import { useEffect } from "react";

/**
 * Hook para manejar errores de removeChild en portales de Radix UI
 * Captura estos errores para que no causen crashes en la aplicación
 */
export function useRemoveChildErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Si es un error de removeChild en un portal, lo capturamos
      if (
        event.message &&
        event.message.includes("removeChild") &&
        event.message.includes("not a child")
      ) {
        // Prevenir que el error se propague
        event.preventDefault();
        console.warn(
          "Portal cleanup error (non-critical):",
          event.message
        );
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);
}
