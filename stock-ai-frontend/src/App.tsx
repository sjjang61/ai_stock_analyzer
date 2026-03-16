import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { DashboardPage }      from "@/pages/DashboardPage";
import { StockDetailPage }    from "@/pages/StockDetailPage";
import { RecommendationPage } from "@/pages/RecommendationPage";
import { StrategyPage }       from "@/pages/StrategyPage";
import { MarketPage }         from "@/pages/MarketPage";
import { WatchlistPage }      from "@/pages/WatchlistPage";
import { StocksPage }         from "@/pages/StocksPage";
import { MarcapPage }         from "@/pages/MarcapPage";
import { PortfolioPage }      from "@/pages/PortfolioPage";
import { LoginPage }          from "@/pages/LoginPage";
import { AuthCallbackPage }   from "@/pages/AuthCallbackPage";

export default function App() {
  return (
    <Routes>
      {/* 인증 없이 접근 가능한 페이지 */}
      <Route path="/login"         element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* 레이아웃이 있는 페이지 */}
      <Route path="/*" element={
        <Layout>
          <Routes>
            <Route path="/"                element={<DashboardPage />} />
            <Route path="/market"          element={<MarketPage />} />
            <Route path="/stocks/:ticker"  element={<StockDetailPage />} />
            <Route path="/recommendations" element={<RecommendationPage />} />
            <Route path="/portfolio"       element={<PortfolioPage />} />
            <Route path="/strategies"      element={<StrategyPage />} />
            <Route path="/watchlist"       element={<WatchlistPage />} />
            <Route path="/tickers"         element={<StocksPage />} />
            <Route path="/marcap"          element={<MarcapPage />} />
            <Route path="*"                element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}
