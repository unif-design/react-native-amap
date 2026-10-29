import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardPresentationContext } from './context';
import type { KeyboardPresentationScopeProps } from './types';

/** 每个原生呈现壳拥有自己的子层；根作用域覆盖同级窗口。 */
export function KeyboardPresentationScope({
  children,
  active = true,
}: KeyboardPresentationScopeProps) {
  const [instances, setInstances] = useState<symbol[]>([]);
  const register = useCallback((instance: symbol) => {
    setInstances((previous) =>
      previous.includes(instance) ? previous : [...previous, instance],
    );
    return () => {
      setInstances((previous) => previous.filter((item) => item !== instance));
    };
  }, []);
  const top = instances.at(-1);
  const value = useMemo(
    () => ({ active, top, register }),
    [active, top, register],
  );
  return (
    <KeyboardPresentationContext.Provider value={value}>
      {children}
    </KeyboardPresentationContext.Provider>
  );
}
