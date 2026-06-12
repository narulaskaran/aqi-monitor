import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

const AUTH_TOKEN_KEY = "aqi_auth_token";

interface AuthState {
  isSignedIn: boolean;
  email: string;
  token: string | null;
  isValidating: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (token: string, email: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isSignedIn: false,
    email: "",
    token: null,
    isValidating: true,
  });

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setState((s) => ({ ...s, isValidating: false }));
      return;
    }

    fetch("/api/validate-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => {
        if (data.valid) {
          setState({
            isSignedIn: true,
            email: data.email ?? "",
            token,
            isValidating: false,
          });
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setState({ isSignedIn: false, email: "", token: null, isValidating: false });
        }
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setState({ isSignedIn: false, email: "", token: null, isValidating: false });
      });
  }, []);

  const signIn = (token: string, email: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setState({ isSignedIn: true, email, token, isValidating: false });
  };

  const signOut = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setState({ isSignedIn: false, email: "", token: null, isValidating: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
