import React from 'react';
import { createPortal } from 'react-dom';

export default function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, document.body);
}
