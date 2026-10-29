import type { ReactNode } from 'react';

export interface KeyboardPresentationScopeProps {
  children: ReactNode;
  active?: boolean;
}

export interface KeyboardPresentationContextValue {
  active: boolean;
  top: symbol | undefined;
  register(instance: symbol): () => void;
}
