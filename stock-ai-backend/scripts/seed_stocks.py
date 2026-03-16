"""
국내 주식(KOSPI + KOSDAQ) 전체 종목 DB 시딩 스크립트

실행 방법:
  # Docker 컨테이너 내부
  docker compose exec api python scripts/seed_stocks.py

  # 로컬 직접 실행 (.env 자동 로드)
  cd stock-ai-backend
  python3 scripts/seed_stocks.py
"""
import sys
import os
from pathlib import Path

_BACKEND_DIR = Path(__file__).parent.parent
_PROJECT_DIR = _BACKEND_DIR.parent
sys.path.insert(0, str(_BACKEND_DIR))

# ── .env 로드 ────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    for env_path in [_PROJECT_DIR / ".env", _BACKEND_DIR / ".env"]:
        if env_path.exists():
            load_dotenv(env_path, override=False)
            print(f"  .env 로드: {env_path}")
            break
except ImportError:
    pass

from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests as _req
import pymysql
import pymysql.cursors
import pandas as pd


# ── DB 접속 정보 ─────────────────────────────────────────────────
DB_HOST     = os.getenv("DB_HOST", "db")
DB_PORT     = int(os.getenv("DB_PORT", "3306"))
DB_USER     = os.getenv("DB_USER", "stock_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "stock_pass")
DB_NAME     = os.getenv("DB_NAME", "stock_db")


def get_db_conn():
    return pymysql.connect(
        host=DB_HOST, port=DB_PORT,
        user=DB_USER, password=DB_PASSWORD,
        database=DB_NAME, charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


# ══════════════════════════════════════════════════════════════════
# 방법 1: KRX 데이터포털 직접 API (requests, pykrx 불필요)
# ══════════════════════════════════════════════════════════════════
def fetch_via_krx_api(market_name: str) -> list[tuple[str, str]]:
    """KRX 데이터포털 JSON API 직접 호출 — 종목코드 + 종목명 한 번에"""
    mkt_id = "STK" if market_name == "KOSPI" else "KSQ"
    headers = {
        "Referer": "http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd?menuId=MDC0201020101",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
    }

    for days_back in range(10):
        date = (datetime.now() - timedelta(days=days_back)).strftime("%Y%m%d")
        try:
            resp = _req.post(
                "http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd",
                headers=headers,
                data={
                    "bld": "dbms/MDC/STAT/standard/MDCSTAT01501",
                    "mktId": mkt_id,
                    "trdDd": date,
                    "share": "1",
                    "money": "1",
                    "csvxls_isNo": "false",
                },
                timeout=30,
            )
            raw = resp.json()
            # 응답 키가 "output" 또는 "OutBlock_1" 일 수 있음
            items = raw.get("output") or raw.get("OutBlock_1") or []
            if not items:
                print(f"    {date}: KRX API 빈 응답 (공휴일/주말 또는 미공개)")
                continue

            result = []
            for item in items:
                ticker = item.get("ISU_SRT_CD", "").strip()
                name   = (item.get("ISU_ABBRV") or item.get("ISU_NM") or "").strip()
                if ticker and name:
                    result.append((ticker, name))

            if result:
                print(f"    [{market_name}] KRX API 성공: {date} → {len(result)}개")
                return result

        except Exception as e:
            print(f"    {date}: KRX API 오류 — {type(e).__name__}: {e}")
            continue

    return []


# ══════════════════════════════════════════════════════════════════
# 방법 2: pykrx (티커코드 1회 + 종목명 병렬 조회)
# ══════════════════════════════════════════════════════════════════
def fetch_via_pykrx(market_name: str) -> list[tuple[str, str]]:
    """pykrx로 전체 티커 + 종목명 수집 (날짜 자동 소급)"""
    try:
        from pykrx import stock as krx
    except ImportError:
        print("  pykrx 미설치 — pip install pykrx")
        return []

    # 티커 코드 목록 (날짜 없이 먼저 시도)
    tickers: list = []
    for days_back in range(10):
        date = (datetime.now() - timedelta(days=days_back)).strftime("%Y%m%d")
        try:
            t = krx.get_market_ticker_list(date, market=market_name)
            if t:
                tickers = t
                print(f"    [{market_name}] pykrx 성공: {date} → {len(t)}개 티커")
                break
            else:
                print(f"    {date}: pykrx 빈 결과 (공휴일/주말)")
        except Exception as e:
            print(f"    {date}: pykrx 오류 — {type(e).__name__}: {e}")

    if not tickers:
        return []

    # 종목명 병렬 조회
    def get_name(ticker: str):
        try:
            name = krx.get_market_ticker_name(ticker)
            return (ticker, name) if name else None
        except Exception:
            return None

    result: list[tuple[str, str]] = []
    done = 0
    total = len(tickers)
    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = [pool.submit(get_name, t) for t in tickers]
        for future in as_completed(futures):
            res = future.result()
            if res:
                result.append(res)
            done += 1
            if done % 300 == 0 or done == total:
                print(f"    종목명 수집: {done}/{total}")

    return result


# ══════════════════════════════════════════════════════════════════
# 방법 3: FinanceDataReader (NaverFinance 기반, KRX 차단 우회)
# ══════════════════════════════════════════════════════════════════
def fetch_via_fdr(market_name: str) -> list[tuple[str, str]]:
    """FinanceDataReader StockListing (DESC 형식) — kind.krx.co.kr 기반, data.krx.co.kr 우회"""
    try:
        import FinanceDataReader as fdr
    except ImportError:
        import sys
        print(f"  finance-datareader 미설치 ({sys.executable} -m pip install finance-datareader)")
        return []

    # KOSPI-DESC / KOSDAQ-DESC 는 kind.krx.co.kr 사용 (data.krx.co.kr 불필요)
    fdr_market = f"{market_name}-DESC"
    try:
        df = fdr.StockListing(fdr_market)
        if df is None or df.empty:
            print(f"    [{market_name}] FDR 빈 결과")
            return []

        # 컬럼명 정규화 (Code, Name 이 기본; 버전에 따라 다를 수 있음)
        col_map: dict[str, str] = {}
        for col in df.columns:
            if col.lower() in ("symbol", "code", "ticker"):
                col_map["ticker"] = col
            elif col.lower() in ("name", "종목명", "company"):
                col_map["name"] = col

        if "ticker" not in col_map or "name" not in col_map:
            print(f"    [{market_name}] FDR 컬럼 인식 실패: {list(df.columns)}")
            return []

        result = []
        for _, row in df.iterrows():
            ticker = str(row[col_map["ticker"]]).strip().zfill(6)
            name = str(row[col_map["name"]]).strip()
            if ticker and name and name != "nan":
                result.append((ticker, name))

        print(f"    [{market_name}] FDR 성공 → {len(result)}개")
        return result

    except Exception as e:
        print(f"    [{market_name}] FDR 오류 — {type(e).__name__}: {e}")
        return []


# ══════════════════════════════════════════════════════════════════
# 통합 수집 함수 (방법 3 → 방법 1 → 방법 2 순으로 시도)
# ══════════════════════════════════════════════════════════════════
def fetch_market(market_name: str) -> list[tuple[str, str]]:
    print(f"\n  [방법3] FinanceDataReader (NaverFinance 기반)...")
    result = fetch_via_fdr(market_name)
    if result:
        return result

    print(f"\n  [방법1] KRX 데이터포털 API 직접 호출...")
    result = fetch_via_krx_api(market_name)
    if result:
        return result

    print(f"\n  [방법2] pykrx 라이브러리 사용...")
    result = fetch_via_pykrx(market_name)
    if result:
        return result

    print(f"  ✗ [{market_name}] 모든 방법 실패")
    return []


# ══════════════════════════════════════════════════════════════════
# 해외 주식 수집 (NASDAQ + NYSE + AMEX via FinanceDataReader/Naver)
# ══════════════════════════════════════════════════════════════════
def fetch_overseas_markets() -> list[dict]:
    """NASDAQ / NYSE / AMEX 전체 종목 수집 (FinanceDataReader NaverStockListing 사용)"""
    try:
        import FinanceDataReader as fdr
    except ImportError:
        import sys
        print(f"  finance-datareader 미설치 (Python: {sys.executable})")
        print(f"  설치 명령: {sys.executable} -m pip install finance-datareader")
        return []

    rows: list[dict] = []
    seen: set[str] = set()

    for market_name in ["NASDAQ", "NYSE", "AMEX"]:
        print(f"\n  [{market_name}] FDR NaverStockListing 조회 중...")
        try:
            df = fdr.StockListing(market_name)
            if df is None or df.empty:
                print(f"    [{market_name}] 빈 결과")
                continue

            # 컬럼 정규화 (Symbol, Name 기본)
            sym_col = next((c for c in df.columns if c.lower() in ("symbol", "code", "ticker")), None)
            name_col = next((c for c in df.columns if c.lower() in ("name", "종목명", "company")), None)
            if not sym_col or not name_col:
                print(f"    [{market_name}] 컬럼 인식 실패: {list(df.columns)}")
                continue

            cnt = 0
            for _, row in df.iterrows():
                ticker = str(row[sym_col]).strip()
                name = str(row[name_col]).strip()
                if not ticker or not name or name == "nan" or ticker in seen:
                    continue
                seen.add(ticker)
                rows.append({
                    "id": ticker,
                    "name": name,
                    "market": market_name,
                    "is_domestic": False,
                    "is_active": True,
                })
                cnt += 1
            print(f"    [{market_name}] {cnt}개 수집")

        except Exception as e:
            print(f"    [{market_name}] 오류 — {type(e).__name__}: {e}")

    return rows


# ══════════════════════════════════════════════════════════════════
# DB 저장
# ══════════════════════════════════════════════════════════════════
def upsert_stocks(rows: list[dict]):
    if not rows:
        return
    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            sql = """
                INSERT INTO stocks (id, name, market, is_domestic, is_active)
                VALUES (%(id)s, %(name)s, %(market)s, %(is_domestic)s, %(is_active)s)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    is_active = TRUE
            """
            BATCH = 200
            total = len(rows)
            for i in range(0, total, BATCH):
                cur.executemany(sql, rows[i:i+BATCH])
                conn.commit()
                print(f"  DB 저장: {min(i+BATCH, total)}/{total}개")
    finally:
        conn.close()


def main():
    import argparse
    parser = argparse.ArgumentParser(description="주식 종목 DB 시딩")
    parser.add_argument("--domestic", action="store_true", default=False, help="국내(KOSPI+KOSDAQ) 시딩")
    parser.add_argument("--overseas", action="store_true", default=False, help="해외(NASDAQ+NYSE+AMEX) 시딩")
    parser.add_argument("--all",      action="store_true", default=False, help="국내+해외 모두 시딩")
    args = parser.parse_args()

    # 기본값: 인수 없으면 전체 시딩
    if not args.domestic and not args.overseas and not args.all:
        args.all = True

    do_domestic = args.domestic or args.all
    do_overseas = args.overseas or args.all

    print("=" * 50)
    print("  주식 전체 종목 DB 시딩")
    print("=" * 50)
    print(f"  DB: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    print(f"  대상: {'국내 ' if do_domestic else ''}{'해외' if do_overseas else ''}\n")

    # DB 연결 테스트
    try:
        conn = get_db_conn()
        conn.close()
        print("  ✓ DB 연결 성공")
    except Exception as e:
        print(f"  ✗ DB 연결 실패: {e}")
        sys.exit(1)

    all_rows: list[dict] = []

    # ── 국내 종목 (KOSPI + KOSDAQ) ───────────────────────────────
    if do_domestic:
        print(f"\n{'='*50}")
        print("  국내 종목 수집 (KOSPI + KOSDAQ)")
        print(f"{'='*50}")
        for market_name, market_val in [("KOSPI", "KOSPI"), ("KOSDAQ", "KOSDAQ")]:
            print(f"\n  [{market_name}] 수집 중...")
            pairs = fetch_market(market_name)
            for ticker, name in pairs:
                all_rows.append({
                    "id": ticker, "name": name,
                    "market": market_val,
                    "is_domestic": True, "is_active": True,
                })
            print(f"  → {len(pairs)}개 수집됨")

    # ── 해외 종목 (NASDAQ + NYSE + AMEX) ────────────────────────
    if do_overseas:
        print(f"\n{'='*50}")
        print("  해외 종목 수집 (NASDAQ + NYSE + AMEX)")
        print(f"{'='*50}")
        overseas_rows = fetch_overseas_markets()
        all_rows.extend(overseas_rows)
        print(f"\n  → 해외 합계: {len(overseas_rows)}개 수집됨")

    if not all_rows:
        print("\n✗ 수집된 종목이 없습니다.")
        print("  해결: pip install finance-datareader")
        sys.exit(1)

    print(f"\n{'='*50}")
    print(f"  DB 저장 (총 {len(all_rows)}개)")
    print(f"{'='*50}")
    try:
        upsert_stocks(all_rows)
        print(f"\n✓ 완료: {len(all_rows)}개 종목이 stocks 테이블에 저장되었습니다.")
    except Exception as e:
        print(f"\n✗ DB 저장 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
