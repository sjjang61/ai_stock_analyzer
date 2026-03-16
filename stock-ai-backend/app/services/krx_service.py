from pykrx import stock as krx
import pandas as pd
from datetime import datetime, timedelta


class KRXService:

    async def get_stock_list(self, market: str = "KOSPI") -> list[dict]:
        """KOSPI/KOSDAQ 전체 종목 리스트 반환"""
        tickers = krx.get_market_ticker_list(market=market)
        result = []
        for ticker in tickers:
            name = krx.get_market_ticker_name(ticker)
            result.append({"id": ticker, "name": name, "market": market})
        return result

    async def fetch_ohlcv(
        self,
        ticker: str,
        start: str,   # "20240101"
        end: str      # "20241231"
    ) -> pd.DataFrame:
        """일별 OHLCV 데이터 조회"""
        df = krx.get_market_ohlcv(start, end, ticker)
        df = df.rename(columns={
            "시가": "open", "고가": "high", "저가": "low",
            "종가": "close", "거래량": "volume"
        })
        df.index.name = "date"
        return df

    async def get_fundamental(self, ticker: str) -> dict:
        """PER, PBR, 배당수익률 등 펀더멘털 조회"""
        today = datetime.now().strftime("%Y%m%d")
        df = krx.get_market_fundamental(today, today, ticker)
        if df.empty:
            return {}
        row = df.iloc[0]
        return {
            "bps": row.get("BPS"), "per": row.get("PER"),
            "pbr": row.get("PBR"), "eps": row.get("EPS"),
            "div": row.get("DIV"), "dps": row.get("DPS"),
        }

    def get_market_prices_sync(self, market: str) -> dict[str, dict]:
        """시장 전체 종목 현재가·등락률 일괄 조회 (동기 — executor에서 호출)
        주말·공휴일·장 개장 전에도 최근 5영업일을 소급해서 데이터를 찾는다."""
        result: dict[str, dict] = {}
        for days_back in range(7):  # 최대 7일(주말+공휴일 대비) 소급
            date = (datetime.now() - timedelta(days=days_back)).strftime("%Y%m%d")
            try:
                df = krx.get_market_ohlcv_by_ticker(date, market=market)
                if df.empty:
                    continue
                for ticker in df.index:
                    row = df.loc[ticker]
                    result[str(ticker)] = {
                        "price": float(row.get("종가", 0) or 0),
                        "change_pct": float(row.get("등락률", 0) or 0),
                    }
                break  # 데이터가 있으면 중단
            except Exception:
                continue
        return result

    async def search_stocks(self, query: str, market: str = "ALL") -> list[dict]:
        """종목명 검색 — 최근 거래일 기준으로 조회해 주말·공휴일 대응"""
        results = []
        markets = ["KOSPI", "KOSDAQ"] if market == "ALL" else [market]
        for mkt in markets:
            try:
                # 최근 10일 소급하여 유효한 거래일 찾기
                tickers: list = []
                for days_back in range(10):
                    date = (datetime.now() - timedelta(days=days_back)).strftime("%Y%m%d")
                    try:
                        tickers = krx.get_market_ticker_list(date, market=mkt)
                        if tickers:
                            break
                    except Exception:
                        continue

                for ticker in tickers:
                    try:
                        name = krx.get_market_ticker_name(ticker)
                        if name and (query.lower() in name.lower() or query in ticker):
                            results.append({
                                "id": ticker, "name": name,
                                "market": mkt, "is_domestic": True,
                            })
                    except Exception:
                        pass
            except Exception:
                continue
        return results
