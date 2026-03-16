import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export const UserMenu = () => {
  const { user, logout, isLoggedIn } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isLoggedIn()) {
    return (
      <button
        onClick={() => navigate("/login")}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
      >
        <User size={15} />
        로그인
      </button>
    );
  }

  const displayName = user?.nickname || user?.username || "사용자";
  const avatar = user?.profile_image;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors"
      >
        {avatar ? (
          <img
            src={avatar}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-brand-600 text-xs font-bold">
              {displayName.charAt(0)}
            </span>
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 max-w-[80px] truncate">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            {user?.email && (
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            )}
            {user?.provider && (
              <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                {user.provider === "kakao" ? "카카오" : "네이버"}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              logout();
              setOpen(false);
              navigate("/login");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
};
