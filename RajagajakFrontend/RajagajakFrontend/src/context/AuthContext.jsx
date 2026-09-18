import { useCallback, useState } from "react";
import * as api from "../services/api.js";
import { AuthContext } from "./auth-context.js";
const TOKEN_KEY = "rajagajak_token";
const USER_KEY = "rajagajak_user";

const tokenIsExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 <= Date.now() : false;
  } catch {
    return true;
  }
};

const restoreSession = () => {
  const savedToken = localStorage.getItem(TOKEN_KEY);
  const savedUser = api.getCurrentUser();
  if (savedToken && savedUser && !tokenIsExpired(savedToken))
    return { token: savedToken, user: savedUser };
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  return { token: null, user: null };
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(restoreSession);

  const signIn = async (credentials) => {
    const response = await api.login(credentials);
    const { token: nextToken, user: nextUser } = response.data;
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setSession({ token: nextToken, user: nextUser });
    return nextUser;
  };
  const signUp = (userData) => api.signup(userData);
  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setSession({ token: null, user: null });
  }, []);
  const updateUser = useCallback((nextUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setSession((current) => ({ ...current, user: nextUser }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        token: session.token,
        loading: false,
        signIn,
        signUp,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
