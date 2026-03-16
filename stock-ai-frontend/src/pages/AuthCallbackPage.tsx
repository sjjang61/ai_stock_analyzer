import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/useAuthStore";

export const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setToken(token);

    authApi
      .getMe(token)
      .then((user) => {
        setUser(user);
        navigate("/", { replace: true });
      })
      .catch(() => {
        navigate("/login", { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">로그인 처리 중...</p>
      </div>
    </div>
  );
};
