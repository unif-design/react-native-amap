import {
  BankOutlined,
  CheckOutlined,
  BedOutlined,
  ChevronLeftOutlined,
  CoffeeOutlined,
  CrosshairOutlined,
  FuelOutlined,
  MedicalCrossOutlined,
  MinusOutlined,
  NavigationPointerOutlined,
  PlusOutlined,
  ShoppingBagOutlined,
  StarFilled,
  StoreOutlined,
  UtensilsOutlined,
} from '@unif/react-native-icons';
import type { ComponentType } from 'react';
import type { IconProps } from '@unif/react-native-icons';

export const MAP_PICKER_ICONS = {
  back: ChevronLeftOutlined,
  done: CheckOutlined,
  plus: PlusOutlined,
  minus: MinusOutlined,
  locate: CrosshairOutlined,
  store: StoreOutlined,
  food: UtensilsOutlined,
  shop: ShoppingBagOutlined,
  bank: BankOutlined,
  gas: FuelOutlined,
  cafe: CoffeeOutlined,
  hotel: BedOutlined,
  pharmacy: MedicalCrossOutlined,
  selection: NavigationPointerOutlined,
  rating: StarFilled,
} as const satisfies Record<string, ComponentType<IconProps>>;
