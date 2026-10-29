import { createContext } from 'react';
import type { KeyboardPresentationContextValue } from './types';

export const KeyboardPresentationContext =
  createContext<KeyboardPresentationContextValue | null>(null);
