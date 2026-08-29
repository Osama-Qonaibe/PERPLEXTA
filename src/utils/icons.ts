import React from 'react';
import {
  Building2,
  Smartphone,
  Puzzle,
  Brain,
  TrendingUp,
  BarChart2,
  Layout,
  SlidersHorizontal,
  Rocket,
  Megaphone,
  Gamepad2,
  BookOpen,
  RefreshCw,
  Gift,
  Code,
  Package,
  Grid,
  LucideIcon,
  LucideProps
} from 'lucide-react';

/**
 * Centralized Category ID to Lucide Icon mapping dictionary.
 */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  saas: Building2,
  mobile: Smartphone,
  plugins: Puzzle,
  'ai-agents': Brain,
  'trading-bots': TrendingUp,
  indicators: BarChart2,
  templates: Layout,
  figma: SlidersHorizontal,
  'startup-box': Rocket,
  'marketing-kits': Megaphone,
  'game-bundles': Gamepad2,
  ebooks: BookOpen,
  plr: RefreshCw,
  free: Gift,
  'free-scripts': Gift,
  'free-templates': Gift,
  'open-source': Gift,
  code: Code,
  fintech: TrendingUp,
  ui: Layout,
  bundles: Package,
  digital: BookOpen,
};

/**
 * Returns the raw LucideIcon component for a given category identifier.
 * Falls back to `Grid` if no matching category is found.
 */
export const getCategoryLucideIcon = (id?: string | null): LucideIcon => {
  if (!id) return Grid;
  const normalizedId = id.toLowerCase().trim();
  return CATEGORY_ICON_MAP[normalizedId] || Grid;
};

/**
 * Returns a rendered React JSX element for a category icon with custom class name and props.
 */
export const getCategoryIcon = (
  id?: string | null,
  className?: string,
  props?: Omit<LucideProps, 'className'>
): React.ReactElement => {
  const IconComponent = getCategoryLucideIcon(id);
  return React.createElement(IconComponent, { className, ...props });
};

export interface CategoryIconProps extends Omit<LucideProps, 'id'> {
  id?: string | null;
}

/**
 * Reusable CategoryIcon React Component.
 */
export const CategoryIcon: React.FC<CategoryIconProps> = ({
  id,
  className,
  ...props
}) => {
  const IconComponent = getCategoryLucideIcon(id);
  return React.createElement(IconComponent, { className, ...props });
};

/**
 * Centralized IconMapper utility object.
 */
export const IconMapper = {
  map: CATEGORY_ICON_MAP,
  getIcon: getCategoryLucideIcon,
  getCategoryIcon,
  render: getCategoryIcon,
  Component: CategoryIcon,
};

export default IconMapper;
