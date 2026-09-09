/**
 * PERPLEXTA MOBILE CAPABILITIES & ROUTE GUARD REGISTRY
 * Single source of truth for features and routes allowed or restricted on mobile.
 */

export const MOBILE_ALLOWED_ROUTES = [
  '/',
  '/chat',
  '/discover',
  '/Studio',
  '/studio',
  '/viralbook',
  '/bulletin',
  '/rewards',
  '/subscription',
  '/settings',
  '/settings/account',
  '/settings/usage',
  '/settings/wallet',
  '/settings/memory',
  '/about',
  '/terms',
  '/privacy',
  '/share',
];

export const DESKTOP_ONLY_ROUTES = [
  '/admin',
  '/admin/dashboard',
  '/admin/sections',
  '/admin/system',
  '/admin/users',
  '/admin/orchestrator',
  '/admin/gpu',
  '/admin/api-keys',
  '/admin/seo',
  '/admin/logs',
  '/admin/broadcast',
  '/admin/database',
  '/admin/financials',
  '/admin/developer-portal',
  '/settings/developer',
  '/settings/developers',
  '/developer-portal',
  '/developer',
];

export const isDesktopOnlyRoute = (pathname: string): boolean => {
  if (!pathname) return false;
  const cleanPath = pathname.toLowerCase();
  return DESKTOP_ONLY_ROUTES.some((route) => cleanPath === route || cleanPath.startsWith(route + '/'));
};

export const isMobileCapabilityAllowed = (capability: string): boolean => {
  if (!capability) return true;
  const restrictedCapabilities = [
    'developer_portal',
    'gpu_orchestrator',
    'database_builder',
    'api_keys_vault',
    'seo_center',
    'raw_audit_logs',
    'bulk_email_broadcast',
    'advanced_erp_financials',
  ];
  return !restrictedCapabilities.includes(capability.toLowerCase());
};
