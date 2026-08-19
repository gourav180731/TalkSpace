import { createContext, useContext, useEffect, useState } from "react";
import { refreshApi, logoutApi } from "../apis/auth.api";
import { socket } from "../apis/socket";
import { useNavigate } from "react-router-dom";

type AuthContextType = {
  isAuth: boolean | null;
  user: any | null;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isAuth: null,
  user: null,
  refreshAuth: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const navigate = useNavigate();

  const refreshAuth = async () => {
    try {
      const res = await refreshApi();
      if (res.data?.authenticated) {
        setUser(res.data.user);
        setIsAuth(true);
        socket.connect();
      } else {
        setIsAuth(false);
        setUser(null);
      }
    } catch {
      setIsAuth(false);
      setUser(null);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const logout = async () => {
    await logoutApi();
    socket.disconnect();

    setIsAuth(false);
    setUser(null);

    //  FORCE EXIT FROM PROTECTED ROUTE
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ isAuth, user, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
