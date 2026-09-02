import { User } from '../types';

const API_BASE = 'https://spychat-production.up.railway.app';

export class AuthService {
  private static tokenKey = 'spychat_access_token';
  private static refreshKey = 'spychat_refresh_token';
  private static userKey = 'spychat_user_profile';

  public static getApiBase(): string {
    return API_BASE;
  }

  public static getAccessToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public static getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshKey);
  }

  public static getUser(): User | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public static setSession(accessToken: string, refreshToken: string, user: User) {
    localStorage.setItem(this.tokenKey, accessToken);
    localStorage.setItem(this.refreshKey, refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  public static clearSession() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
    localStorage.removeItem(this.userKey);
  }

  public static async signup(email: string, password: string, displayName?: string, username?: string): Promise<{ user: User; accessToken: string }> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName, username })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    this.setSession(data.accessToken, data.refreshToken, data.user);
    return data;
  }

  public static async login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    this.setSession(data.accessToken, data.refreshToken, data.user);
    return data;
  }

  public static async getMe(): Promise<User | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          localStorage.setItem(this.userKey, JSON.stringify(data.user));
          return data.user;
        }
      }

      // If banned or forbidden by firewall (403), IMMEDIATELY wipe session
      if (res.status === 403) {
        console.warn('[AuthService] Account or IP banned by Administrator. Evicting session.');
        this.clearSession();
        return null;
      }

      // If token expired (401), attempt refresh
      if (res.status === 401) {
        const refreshToken = this.getRefreshToken();
        if (refreshToken) {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.accessToken) {
              localStorage.setItem(this.tokenKey, refreshData.accessToken);
              return this.getMe();
            }
          }
        }
        this.clearSession();
        return null;
      }

      return this.getUser();
    } catch {
      return this.getUser();
    }
  }

  public static async updateProfile(updates: Partial<User>): Promise<User> {
    const token = this.getAccessToken();
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update profile');
    }

    localStorage.setItem(this.userKey, JSON.stringify(data.user));
    return data.user;
  }

  public static async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const token = this.getAccessToken();
    const res = await fetch(`${API_BASE}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change password');
    }

    return data;
  }

  public static async searchUsers(query: string): Promise<User[]> {
    const token = this.getAccessToken();
    const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    return data.users || [];
  }
}
