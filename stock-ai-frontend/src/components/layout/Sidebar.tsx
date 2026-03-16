import { NavLink } from "react-router-dom";
import { BarChart2, TrendingUp, Star, Brain, Settings, Activity, Wallet, Search, Trophy } from "lucide-react";
import clsx from "clsx";

const navItems = [
  { to: "/",               label: "대시보드",       icon: BarChart2  },
  { to: "/market",         label: "시장 개요",      icon: Activity   },
  { to: "/marcap",         label: "시총 상위",      icon: Trophy     },
  { to: "/tickers",        label: "종목 조회",      icon: Search     },
  { to: "/recommendations",label: "AI 추천",        icon: Brain      },
  { to: "/portfolio",      label: "내 종목 관리",    icon: Wallet     },
  { to: "/strategies",     label: "전략 관리",      icon: Settings   },
  { to: "/watchlist",      label: "관심 종목",      icon: Star       },
];

export const Sidebar = () => (
  <aside className="w-56 bg-white border-r border-gray-100 flex flex-col h-full fixed left-0 top-0 bottom-0 z-30">
    {/* Logo */}
    <div className="px-5 py-5 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
          <TrendingUp size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">Stock AI</p>
          <p className="text-xs text-gray-400">Analyzer</p>
        </div>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 p-3 space-y-0.5">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-50 text-brand-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>

    {/* Footer */}
    <div className="p-4 border-t border-gray-100">
      <p className="text-xs text-gray-400 text-center">주식 AI 분석 플랫폼</p>
    </div>
  </aside>
);
