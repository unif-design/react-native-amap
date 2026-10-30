import { useContext, useLayoutEffect, useState } from 'react';
import { KeyboardPresentationContext } from './context';

/** presented 在关闭动画期间保持 true，由实际呈现壳决定何时释放。 */
export function useKeyboardPresentation(presented: boolean) {
  const parent = useContext(KeyboardPresentationContext);
  const [instance] = useState(() => Symbol('keyboard-presentation'));
  const register = parent?.register;
  useLayoutEffect(() => {
    if (presented) return register?.(instance);
    return undefined;
  }, [instance, presented, register]);
  return presented && (!parent || (parent.active && parent.top === instance));
}

export function useKeyboardPresentationActivity() {
  const scope = useContext(KeyboardPresentationContext);
  return !scope || (scope.active && scope.top === undefined);
}
