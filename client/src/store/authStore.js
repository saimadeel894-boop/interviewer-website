import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';

const decodeUser = (accessToken) => {
  const decoded = jwtDecode(accessToken);
  return {
    id: decoded.id,
    name: decoded.name,
    email: decoded.email,
    role: decoded.role
  };
};

export const useAuthStore = create((set) => ({
  accessToken: null,
  user: null,
  bootstrapped: false,
  setSession: (accessToken) => set({ accessToken, user: decodeUser(accessToken), bootstrapped: true }),
  clearSession: () => set({ accessToken: null, user: null, bootstrapped: true }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped })
}));
