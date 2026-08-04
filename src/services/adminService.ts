import { getAuthHeaders } from '../utils/adminUtils';

export class AdminService {
  static async getStats(token: string) {
    const res = await fetch('/api/admin/stats', { headers: getAuthHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  }

  static async getSecurityAlerts(token: string) {
    const res = await fetch('/api/admin/security-alerts', { headers: getAuthHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch security alerts');
    return res.json();
  }

  static async getActivityStream(token: string) {
    const res = await fetch('/api/admin/activity-stream', { headers: getAuthHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch activity stream');
    return res.json();
  }

  static async getApiKeys(token: string) {
    const res = await fetch('/api/admin/api-keys', { headers: getAuthHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch API keys');
    return res.json();
  }

  static async getHealth(token: string) {
    const res = await fetch('/api/admin/health', { headers: getAuthHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  }

  static async getDatabases(token: string) {
    const res = await fetch('/api/admin/databases/registry', { headers: getAuthHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch databases');
    return res.json();
  }

  static async getOrchestratorRoutes(token: string) {
    const res = await fetch('/api/admin/orchestrator/routes', { headers: getAuthHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch orchestrator routes');
    return res.json();
  }

  static async getUsers(token: string) {
    const res = await fetch('/api/admin/users', { headers: getAuthHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  }

  static async getPlans(token: string) {
    const res = await fetch('/api/admin/plans', { headers: getAuthHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch plans');
    return res.json();
  }
}
