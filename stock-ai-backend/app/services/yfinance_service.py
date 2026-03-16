import yfinance as yf
import pandas as pd


class YFinanceService:

    def get_stock_info(self, ticker: str) -> dict:
        """종목 기본 정보"""
        t = yf.Ticker(ticker)
        info = t.info
        return {
            "id": ticker,
            "name": info.get("longName", ""),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "pb_ratio": info.get("priceToBook"),
            "dividend_yield": info.get("dividendYield"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
        }

    def fetch_ohlcv(
        self,
        ticker: str,
        period: str = "2y",
        interval: str = "1d"
    ) -> pd.DataFrame:
        """OHLCV 데이터 조회"""
        t = yf.Ticker(ticker.upper())
        df = t.history(period=period, interval=interval)
        if df.empty:
            raise ValueError(f"No price data found for ticker: {ticker}")
        df.columns = df.columns.str.lower()
        df.index.name = "date"
        # yfinance는 tz-aware DatetimeIndex를 반환 → tz-naive로 변환
        if df.index.tz is not None:
            df.index = df.index.tz_convert(None)
        return df[["open", "high", "low", "close", "volume"]]

    def fetch_current_prices(self, tickers: list[str]) -> dict[str, dict]:
        """복수 티커 현재가·등락률 일괄 조회 (동기 — executor에서 호출).
        yfinance 버전별 MultiIndex 차이를 피하기 위해 Ticker.history() 방식 사용."""
        result: dict[str, dict] = {}
        for ticker in tickers:
            try:
                hist = yf.Ticker(ticker).history(period="5d", interval="1d")
                if hist.empty:
                    continue
                hist.columns = hist.columns.str.lower()
                closes = hist["close"].dropna()
                if closes.empty:
                    continue
                curr = float(closes.iloc[-1])
                prev = float(closes.iloc[-2]) if len(closes) >= 2 else curr
                change_pct = round((curr - prev) / prev * 100, 2) if prev else 0.0
                result[ticker] = {"price": curr, "change_pct": change_pct}
            except Exception:
                pass
        return result

    def search_stocks(self, query: str) -> list[dict]:
        """해외 종목 검색 (yfinance search)"""
        try:
            results = yf.Search(query, max_results=20)
            stocks = []
            for quote in results.quotes:
                stocks.append({
                    "id": quote.get("symbol", ""),
                    "name": quote.get("longname") or quote.get("shortname", ""),
                    "market": quote.get("exchange", "US"),
                    "is_domestic": False,
                })
            return stocks
        except Exception:
            return []
