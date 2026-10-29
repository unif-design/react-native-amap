import type { ReactNode } from 'react';

export interface MapPickerRowProps {
  title: string;
  address: string;
  icon: ReactNode;
  titleExtra?: ReactNode;
  descriptionExtra?: ReactNode;
  distance?: string;
  selected?: boolean;
  summary?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onSelect?(): void;
}
