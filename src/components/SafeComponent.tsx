"use client";

import React, { useEffect, useState } from 'react';

/**
 * SafeComponent envuelve componentes dinámicos para prevenir errores de
 * removeChild cuando se desmuntan rápidamente mientras hay portales abiertos
 */
export function SafeComponent({ 
  children, 
  isVisible = true,
  transitionDuration = 300 
}: { 
  children: React.ReactNode;
  isVisible?: boolean;
  transitionDuration?: number;
}) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isHidden, setIsHidden] = useState(!isVisible);

  useEffect(() => {
    if (isVisible) {
      // Mostrar inmediatamente
      setShouldRender(true);
      // Quitar la clase de oculto después de un frame
      requestAnimationFrame(() => setIsHidden(false));
    } else {
      // Primero marcar como oculto visualmente
      setIsHidden(true);
      // Luego unmount después del transition
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, transitionDuration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, transitionDuration]);

  if (!shouldRender) return null;

  return (
    <div
      style={{
        opacity: isHidden ? 0 : 1,
        transition: `opacity ${transitionDuration}ms ease-in-out`,
        pointerEvents: isHidden ? 'none' : 'auto',
      }}
    >
      {children}
    </div>
  );
}
