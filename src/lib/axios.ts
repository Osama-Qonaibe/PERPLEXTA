import { secureStorage } from "@/lib/storage";
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Dynamically attach Bearer token from storage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = secureStorage.getSync('app_token');
    if (token && config.headers) {
      if (typeof (config.headers as any).set === 'function') {
        (config.headers as any).set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const performSilentTokenRefresh = async (): Promise<string | null> => {
  const currentRefreshToken = secureStorage.getSync('app_refresh_token');
  if (!currentRefreshToken) {
    return null;
  }

  try {
    const response = await axios.post('/api/auth/refresh-token', {
      refreshToken: currentRefreshToken,
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data && response.data.token) {
      const newAccessToken = response.data.token;
      const newRefreshToken = response.data.refreshToken;

      secureStorage.set('app_token', newAccessToken);
      if (newRefreshToken) {
        secureStorage.set('app_refresh_token', newRefreshToken);
      }

      window.dispatchEvent(
        new CustomEvent('app_token_refreshed', {
          detail: { token: newAccessToken, refreshToken: newRefreshToken },
        })
      );

      return newAccessToken;
    }
    return null;
  } catch (err: any) {
    if (err?.response?.status === 401 || err?.response?.status === 403) {
      secureStorage.remove('app_token');
      secureStorage.remove('app_refresh_token');
      window.dispatchEvent(new CustomEvent('app_session_expired'));
    }
    return null;
  }
};

// Response Interceptor: Silent refresh on 401 Unauthorized responses before retrying original request
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const is401 = error.response && error.response.status === 401;
    const isRefreshEndpoint = originalRequest?.url?.includes('/api/auth/refresh-token');

    if (is401 && !isRefreshEndpoint && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              if (typeof (originalRequest.headers as any).set === 'function') {
                (originalRequest.headers as any).set('Authorization', `Bearer ${token}`);
              } else {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await performSilentTokenRefresh();
        if (newToken) {
          processQueue(null, newToken);
          if (originalRequest.headers) {
            if (typeof (originalRequest.headers as any).set === 'function') {
              (originalRequest.headers as any).set('Authorization', `Bearer ${newToken}`);
            } else {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
          }
          return apiClient(originalRequest);
        } else {
          processQueue(error, null);
          return Promise.reject(error);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
