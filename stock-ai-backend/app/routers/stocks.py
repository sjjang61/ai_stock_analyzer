from fastapi import APIRouter, BackgroundTasks, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.mysql import insert as mysql_insert
from app.deps import get_db
from app.database import AsyncSessionLocal
from app.models.stock import Stock, MarketType
from app.models.stock_price import StockPrice
from app.models.stock_price_weekly import StockPriceWeekly
from app.models.stock_price_monthly import StockPriceMonthly
from app.services.krx_service import KRXService
from app.services.yfinance_service import YFinanceService
from app.services.candlestick_service import CandlestickService
from app.utils.helpers import get_date_range
import asyncio
import time as _time
import pandas as pd
from datetime import datetime

router = APIRouter(prefix="/api/stocks", tags=["stocks"])
krx_svc = KRXService()
yf_svc  = YFinanceService()
cs_svc  = CandlestickService()


# ── 시드 상태 추적 ─────────────────────────────────────────────
_seed_status: dict = {
    "running": False,
    "domestic_done": 0,
    "overseas_done": 0,
    "error": None,
    "last_run": None,
}

# ── 시총 순위 인메모리 캐시 ─────────────────────────────────────
_marcap_cache: dict[str, dict] = {}
_MARCAP_TTL = 3600  # 1시간

# ── 해외 주요 종목 사전 정의 리스트 (ticker, name, market) ──────
_OVERSEAS_STOCKS: list[tuple[str, str, str]] = [
    # ── NASDAQ · Big Tech ──────────────────────────────────────
    ("AAPL",  "Apple Inc.",                      "NASDAQ"),
    ("MSFT",  "Microsoft Corporation",            "NASDAQ"),
    ("NVDA",  "NVIDIA Corporation",               "NASDAQ"),
    ("GOOGL", "Alphabet Inc. Class A",            "NASDAQ"),
    ("GOOG",  "Alphabet Inc. Class C",            "NASDAQ"),
    ("AMZN",  "Amazon.com Inc.",                  "NASDAQ"),
    ("META",  "Meta Platforms Inc.",              "NASDAQ"),
    ("TSLA",  "Tesla Inc.",                       "NASDAQ"),
    ("AVGO",  "Broadcom Inc.",                    "NASDAQ"),
    # ── NASDAQ · Semiconductor ─────────────────────────────────
    ("AMD",   "Advanced Micro Devices",           "NASDAQ"),
    ("QCOM",  "Qualcomm Inc.",                    "NASDAQ"),
    ("MU",    "Micron Technology",                "NASDAQ"),
    ("INTC",  "Intel Corporation",                "NASDAQ"),
    ("AMAT",  "Applied Materials",                "NASDAQ"),
    ("LRCX",  "Lam Research",                     "NASDAQ"),
    ("KLAC",  "KLA Corporation",                  "NASDAQ"),
    ("MRVL",  "Marvell Technology",               "NASDAQ"),
    ("ON",    "ON Semiconductor",                 "NASDAQ"),
    ("TXN",   "Texas Instruments",                "NASDAQ"),
    ("MCHP",  "Microchip Technology",             "NASDAQ"),
    ("ASML",  "ASML Holding",                     "NASDAQ"),
    ("ARM",   "Arm Holdings",                     "NASDAQ"),
    ("SMCI",  "Super Micro Computer",             "NASDAQ"),
    ("MPWR",  "Monolithic Power Systems",         "NASDAQ"),
    ("ADI",   "Analog Devices",                   "NASDAQ"),
    ("NXPI",  "NXP Semiconductors",               "NASDAQ"),
    ("SWKS",  "Skyworks Solutions",               "NASDAQ"),
    # ── NASDAQ · Software / Cloud / AI ────────────────────────
    ("ORCL",  "Oracle Corporation",               "NASDAQ"),
    ("ADBE",  "Adobe Inc.",                       "NASDAQ"),
    ("INTU",  "Intuit Inc.",                      "NASDAQ"),
    ("ANSS",  "ANSYS Inc.",                       "NASDAQ"),
    ("CDNS",  "Cadence Design Systems",           "NASDAQ"),
    ("SNPS",  "Synopsys Inc.",                    "NASDAQ"),
    ("WDAY",  "Workday Inc.",                     "NASDAQ"),
    ("TEAM",  "Atlassian Corporation",            "NASDAQ"),
    ("ZS",    "Zscaler Inc.",                     "NASDAQ"),
    ("CRWD",  "CrowdStrike Holdings",             "NASDAQ"),
    ("PANW",  "Palo Alto Networks",               "NASDAQ"),
    ("FTNT",  "Fortinet Inc.",                    "NASDAQ"),
    ("DDOG",  "Datadog Inc.",                     "NASDAQ"),
    ("PLTR",  "Palantir Technologies",            "NASDAQ"),
    ("NFLX",  "Netflix Inc.",                     "NASDAQ"),
    ("ABNB",  "Airbnb Inc.",                      "NASDAQ"),
    ("ZM",    "Zoom Video Communications",        "NASDAQ"),
    ("COIN",  "Coinbase Global",                  "NASDAQ"),
    ("PYPL",  "PayPal Holdings",                  "NASDAQ"),
    ("ROKU",  "Roku Inc.",                        "NASDAQ"),
    ("TTD",   "The Trade Desk",                   "NASDAQ"),
    ("OKTA",  "Okta Inc.",                        "NASDAQ"),
    ("MAR",   "Marriott International",           "NASDAQ"),
    ("BKNG",  "Booking Holdings",                 "NASDAQ"),
    ("EXPE",  "Expedia Group",                    "NASDAQ"),
    ("RIVN",  "Rivian Automotive",                "NASDAQ"),
    ("LCID",  "Lucid Group",                      "NASDAQ"),
    # ── NASDAQ · Biotech / Healthcare ─────────────────────────
    ("AMGN",  "Amgen Inc.",                       "NASDAQ"),
    ("GILD",  "Gilead Sciences",                  "NASDAQ"),
    ("BIIB",  "Biogen Inc.",                      "NASDAQ"),
    ("REGN",  "Regeneron Pharmaceuticals",        "NASDAQ"),
    ("VRTX",  "Vertex Pharmaceuticals",           "NASDAQ"),
    ("MRNA",  "Moderna Inc.",                     "NASDAQ"),
    ("ILMN",  "Illumina Inc.",                    "NASDAQ"),
    ("ISRG",  "Intuitive Surgical",               "NASDAQ"),
    ("ALGN",  "Align Technology",                 "NASDAQ"),
    ("IDXX",  "IDEXX Laboratories",               "NASDAQ"),
    ("DXCM",  "DexCom Inc.",                      "NASDAQ"),
    ("HOLX",  "Hologic Inc.",                     "NASDAQ"),
    # ── NASDAQ · Consumer / Telecom / Other ───────────────────
    ("COST",  "Costco Wholesale",                 "NASDAQ"),
    ("SBUX",  "Starbucks Corporation",            "NASDAQ"),
    ("TMUS",  "T-Mobile US",                      "NASDAQ"),
    ("CMCSA", "Comcast Corporation",              "NASDAQ"),
    ("MDLZ",  "Mondelez International",           "NASDAQ"),
    ("MNST",  "Monster Beverage",                 "NASDAQ"),
    ("ROST",  "Ross Stores",                      "NASDAQ"),
    ("DLTR",  "Dollar Tree",                      "NASDAQ"),
    ("PEP",   "PepsiCo Inc.",                     "NASDAQ"),
    ("HON",   "Honeywell International",          "NASDAQ"),
    ("CSX",   "CSX Corporation",                  "NASDAQ"),
    ("ODFL",  "Old Dominion Freight Line",        "NASDAQ"),
    ("CTAS",  "Cintas Corporation",               "NASDAQ"),
    ("FITB",  "Fifth Third Bancorp",              "NASDAQ"),
    ("HBAN",  "Huntington Bancshares",            "NASDAQ"),
    ("BKR",   "Baker Hughes",                     "NASDAQ"),
    ("FANG",  "Diamondback Energy",               "NASDAQ"),
    ("AEP",   "American Electric Power",          "NASDAQ"),
    ("EXC",   "Exelon Corporation",               "NASDAQ"),
    ("EQIX",  "Equinix Inc.",                     "NASDAQ"),
    ("MELI",  "MercadoLibre Inc.",                "NASDAQ"),
    ("JD",    "JD.com Inc.",                      "NASDAQ"),
    ("PDD",   "PDD Holdings",                     "NASDAQ"),
    ("BIDU",  "Baidu Inc.",                       "NASDAQ"),
    ("NTES",  "NetEase Inc.",                     "NASDAQ"),
    ("LI",    "Li Auto Inc.",                     "NASDAQ"),
    ("GRAB",  "Grab Holdings",                    "NASDAQ"),
    # ── NYSE · Financials ──────────────────────────────────────
    ("JPM",   "JPMorgan Chase & Co.",             "NYSE"),
    ("BAC",   "Bank of America",                  "NYSE"),
    ("WFC",   "Wells Fargo",                      "NYSE"),
    ("GS",    "Goldman Sachs",                    "NYSE"),
    ("MS",    "Morgan Stanley",                   "NYSE"),
    ("C",     "Citigroup Inc.",                   "NYSE"),
    ("BLK",   "BlackRock Inc.",                   "NYSE"),
    ("USB",   "U.S. Bancorp",                     "NYSE"),
    ("PNC",   "PNC Financial Services",           "NYSE"),
    ("SCHW",  "Charles Schwab",                   "NYSE"),
    ("AXP",   "American Express",                 "NYSE"),
    ("V",     "Visa Inc.",                        "NYSE"),
    ("MA",    "Mastercard Inc.",                  "NYSE"),
    ("COF",   "Capital One Financial",            "NYSE"),
    ("PRU",   "Prudential Financial",             "NYSE"),
    ("MET",   "MetLife Inc.",                     "NYSE"),
    ("AFL",   "Aflac Inc.",                       "NYSE"),
    ("AIG",   "American International Group",     "NYSE"),
    ("ALL",   "Allstate Corporation",             "NYSE"),
    ("CB",    "Chubb Limited",                    "NYSE"),
    ("MMC",   "Marsh & McLennan",                 "NYSE"),
    # ── NYSE · Healthcare / Pharma ────────────────────────────
    ("JNJ",   "Johnson & Johnson",                "NYSE"),
    ("UNH",   "UnitedHealth Group",               "NYSE"),
    ("PFE",   "Pfizer Inc.",                      "NYSE"),
    ("ABBV",  "AbbVie Inc.",                      "NYSE"),
    ("MRK",   "Merck & Co.",                      "NYSE"),
    ("LLY",   "Eli Lilly and Company",            "NYSE"),
    ("BMY",   "Bristol-Myers Squibb",             "NYSE"),
    ("ABT",   "Abbott Laboratories",              "NYSE"),
    ("MDT",   "Medtronic plc",                    "NYSE"),
    ("CVS",   "CVS Health Corporation",           "NYSE"),
    ("CI",    "Cigna Group",                      "NYSE"),
    ("HUM",   "Humana Inc.",                      "NYSE"),
    ("HCA",   "HCA Healthcare",                   "NYSE"),
    ("SYK",   "Stryker Corporation",              "NYSE"),
    ("BSX",   "Boston Scientific",                "NYSE"),
    ("DHR",   "Danaher Corporation",              "NYSE"),
    ("TMO",   "Thermo Fisher Scientific",         "NYSE"),
    ("ZTS",   "Zoetis Inc.",                      "NYSE"),
    # ── NYSE · Consumer Discretionary / Staples ───────────────
    ("WMT",   "Walmart Inc.",                     "NYSE"),
    ("TGT",   "Target Corporation",               "NYSE"),
    ("HD",    "Home Depot",                       "NYSE"),
    ("LOW",   "Lowe's Companies",                 "NYSE"),
    ("NKE",   "Nike Inc.",                        "NYSE"),
    ("MCD",   "McDonald's Corporation",           "NYSE"),
    ("YUM",   "Yum! Brands",                      "NYSE"),
    ("CMG",   "Chipotle Mexican Grill",            "NYSE"),
    ("DIS",   "Walt Disney Company",              "NYSE"),
    ("CCL",   "Carnival Corporation",             "NYSE"),
    ("RCL",   "Royal Caribbean Group",            "NYSE"),
    ("HLT",   "Hilton Worldwide Holdings",        "NYSE"),
    ("F",     "Ford Motor Company",               "NYSE"),
    ("GM",    "General Motors",                   "NYSE"),
    ("KO",    "Coca-Cola Company",                "NYSE"),
    ("PM",    "Philip Morris International",      "NYSE"),
    ("MO",    "Altria Group",                     "NYSE"),
    ("PG",    "Procter & Gamble",                 "NYSE"),
    ("CL",    "Colgate-Palmolive",                "NYSE"),
    ("KMB",   "Kimberly-Clark",                   "NYSE"),
    ("EL",    "Estee Lauder Companies",           "NYSE"),
    # ── NYSE · Energy ──────────────────────────────────────────
    ("XOM",   "Exxon Mobil Corporation",          "NYSE"),
    ("CVX",   "Chevron Corporation",              "NYSE"),
    ("COP",   "ConocoPhillips",                   "NYSE"),
    ("EOG",   "EOG Resources",                    "NYSE"),
    ("MPC",   "Marathon Petroleum",               "NYSE"),
    ("PSX",   "Phillips 66",                      "NYSE"),
    ("VLO",   "Valero Energy",                    "NYSE"),
    ("SLB",   "SLB",                              "NYSE"),
    ("HAL",   "Halliburton Company",              "NYSE"),
    ("OXY",   "Occidental Petroleum",             "NYSE"),
    # ── NYSE · Industrials ─────────────────────────────────────
    ("CAT",   "Caterpillar Inc.",                 "NYSE"),
    ("DE",    "Deere & Company",                  "NYSE"),
    ("GE",    "GE Aerospace",                     "NYSE"),
    ("RTX",   "RTX Corporation",                  "NYSE"),
    ("LMT",   "Lockheed Martin",                  "NYSE"),
    ("BA",    "Boeing Company",                   "NYSE"),
    ("NOC",   "Northrop Grumman",                 "NYSE"),
    ("GD",    "General Dynamics",                 "NYSE"),
    ("UPS",   "United Parcel Service",            "NYSE"),
    ("FDX",   "FedEx Corporation",                "NYSE"),
    ("MMM",   "3M Company",                       "NYSE"),
    ("EMR",   "Emerson Electric",                 "NYSE"),
    ("ETN",   "Eaton Corporation",                "NYSE"),
    ("ROK",   "Rockwell Automation",              "NYSE"),
    ("PH",    "Parker Hannifin",                  "NYSE"),
    ("ITW",   "Illinois Tool Works",              "NYSE"),
    ("RSG",   "Republic Services",                "NYSE"),
    ("WM",    "Waste Management",                 "NYSE"),
    ("UNP",   "Union Pacific Corporation",        "NYSE"),
    # ── NYSE · Communication / Services / Tech ────────────────
    ("CRM",   "Salesforce Inc.",                  "NYSE"),
    ("NET",   "Cloudflare Inc.",                  "NYSE"),
    ("SNOW",  "Snowflake Inc.",                   "NYSE"),
    ("NOW",   "ServiceNow Inc.",                  "NYSE"),
    ("SHOP",  "Shopify Inc.",                     "NYSE"),
    ("TWLO",  "Twilio Inc.",                      "NYSE"),
    ("HUBS",  "HubSpot Inc.",                     "NYSE"),
    ("VEEV",  "Veeva Systems",                    "NYSE"),
    ("VZ",    "Verizon Communications",           "NYSE"),
    ("T",     "AT&T Inc.",                        "NYSE"),
    ("UBER",  "Uber Technologies",                "NYSE"),
    ("DASH",  "DoorDash Inc.",                    "NYSE"),
    ("RBLX",  "Roblox Corporation",               "NYSE"),
    ("SQ",    "Block Inc.",                       "NYSE"),
    ("SPOT",  "Spotify Technology",               "NYSE"),
    ("SE",    "Sea Limited",                      "NYSE"),
    # ── NYSE · Materials / Utilities / Real Estate ────────────
    ("LIN",   "Linde plc",                        "NYSE"),
    ("APD",   "Air Products and Chemicals",       "NYSE"),
    ("SHW",   "Sherwin-Williams",                 "NYSE"),
    ("NEM",   "Newmont Corporation",              "NYSE"),
    ("FCX",   "Freeport-McMoRan",                 "NYSE"),
    ("NEE",   "NextEra Energy",                   "NYSE"),
    ("DUK",   "Duke Energy",                      "NYSE"),
    ("SO",    "Southern Company",                 "NYSE"),
    ("AMT",   "American Tower",                   "NYSE"),
    ("PLD",   "Prologis Inc.",                    "NYSE"),
    ("CCI",   "Crown Castle",                     "NYSE"),
    ("O",     "Realty Income Corporation",        "NYSE"),
    ("SPG",   "Simon Property Group",             "NYSE"),
    ("DLR",   "Digital Realty Trust",             "NYSE"),
    # ── NYSE · Berkshire / 글로벌 ──────────────────────────────
    ("BRK-B", "Berkshire Hathaway Class B",       "NYSE"),
    ("TSM",   "Taiwan Semiconductor Mfg.",        "NYSE"),
    ("BABA",  "Alibaba Group Holding",            "NYSE"),
    ("NIO",   "NIO Inc.",                         "NYSE"),
    ("XPEV",  "XPeng Inc.",                       "NYSE"),
    ("STLA",  "Stellantis N.V.",                  "NYSE"),
    ("TM",    "Toyota Motor Corporation",         "NYSE"),
    # ── ETF · 주요 지수 ────────────────────────────────────────
    ("SPY",   "SPDR S&P 500 ETF",                "NYSE"),
    ("QQQ",   "Invesco QQQ Trust",                "NASDAQ"),
    ("IWM",   "iShares Russell 2000 ETF",         "NYSE"),
    ("DIA",   "SPDR Dow Jones Industrial ETF",    "NYSE"),
    ("VTI",   "Vanguard Total Stock Market ETF",  "NYSE"),
    ("VOO",   "Vanguard S&P 500 ETF",             "NYSE"),
    ("VEA",   "Vanguard FTSE Developed Markets",  "NYSE"),
    ("VWO",   "Vanguard FTSE Emerging Markets",   "NYSE"),
    # ── ETF · 원자재 ───────────────────────────────────────────
    ("GLD",   "SPDR Gold Shares",                 "NYSE"),
    ("SLV",   "iShares Silver Trust",             "NYSE"),
    ("USO",   "United States Oil Fund",           "NYSE"),
    # ── ETF · 섹터 ─────────────────────────────────────────────
    ("XLF",   "Financial Select Sector SPDR",     "NYSE"),
    ("XLK",   "Technology Select Sector SPDR",    "NYSE"),
    ("XLE",   "Energy Select Sector SPDR",        "NYSE"),
    ("XLV",   "Health Care Select Sector SPDR",   "NYSE"),
    ("XLY",   "Consumer Discret. Select SPDR",    "NYSE"),
    ("XLP",   "Consumer Staples Select SPDR",     "NYSE"),
    ("XLI",   "Industrial Select Sector SPDR",    "NYSE"),
    ("XLB",   "Materials Select Sector SPDR",     "NYSE"),
    ("XLRE",  "Real Estate Select Sector SPDR",   "NYSE"),
    ("XLU",   "Utilities Select Sector SPDR",     "NYSE"),
    ("XLC",   "Comm. Services Select SPDR",       "NYSE"),
    # ── ETF · 레버리지 / 인버스 (한국 투자자 인기) ────────────
    ("TQQQ",  "ProShares UltraPro QQQ",           "NASDAQ"),
    ("SQQQ",  "ProShares UltraPro Short QQQ",     "NASDAQ"),
    ("UPRO",  "ProShares UltraPro S&P 500",       "NYSE"),
    ("SPXS",  "Direxion Daily S&P 500 Bear 3X",   "NYSE"),
    ("TECL",  "Direxion Daily Tech Bull 3X",      "NYSE"),
    ("SOXL",  "Direxion Daily Semicon Bull 3X",   "NYSE"),
    ("SOXS",  "Direxion Daily Semicon Bear 3X",   "NYSE"),
    ("FNGU",  "MicroSectors FANG+ 3X ETN",        "NYSE"),
    ("ARKK",  "ARK Innovation ETF",               "NYSE"),
    ("ARKG",  "ARK Genomic Revolution ETF",       "NYSE"),
    # ── ETF · 반도체 / 테마 ────────────────────────────────────
    ("SOXX",  "iShares Semiconductor ETF",        "NASDAQ"),
    ("SMH",   "VanEck Semiconductor ETF",         "NASDAQ"),
    ("BOTZ",  "Global X Robotics & AI ETF",       "NASDAQ"),
    # ── ETF · 한국 / 아시아 관련 ──────────────────────────────
    ("EWY",   "iShares MSCI South Korea ETF",     "NYSE"),
    ("KORU",  "Direxion Daily S.Korea Bull 3X",   "NYSE"),
    ("EWT",   "iShares MSCI Taiwan ETF",          "NYSE"),
    ("MCHI",  "iShares MSCI China ETF",           "NASDAQ"),
    ("FXI",   "iShares China Large-Cap ETF",      "NYSE"),
    ("KWEB",  "KraneShares CSI China Internet",   "NYSE"),
    # ── ETF · 채권 ─────────────────────────────────────────────
    ("TLT",   "iShares 20+ Year Treasury Bond",   "NASDAQ"),
    ("IEF",   "iShares 7-10 Year Treasury Bond",  "NASDAQ"),
    ("SHY",   "iShares 1-3 Year Treasury Bond",   "NASDAQ"),
    ("HYG",   "iShares iBoxx High Yield Corp.",   "NYSE"),
    ("LQD",   "iShares iBoxx Invest. Grade Corp.","NYSE"),
    ("AGG",   "iShares Core US Aggregate Bond",   "NYSE"),
    ("TIP",   "iShares TIPS Bond ETF",            "NYSE"),
]

# ── 주요 가상화폐 사전 정의 리스트 (yfinance 티커: {symbol}-USD) ─
_CRYPTO_STOCKS: list[tuple[str, str]] = [
    # ── 메이저 코인 ─────────────────────────────────────────────
    ("BTC-USD",   "Bitcoin"),
    ("ETH-USD",   "Ethereum"),
    ("BNB-USD",   "BNB"),
    ("SOL-USD",   "Solana"),
    ("XRP-USD",   "XRP"),
    ("DOGE-USD",  "Dogecoin"),
    ("ADA-USD",   "Cardano"),
    ("AVAX-USD",  "Avalanche"),
    ("TRX-USD",   "TRON"),
    ("TON-USD",   "Toncoin"),
    ("SHIB-USD",  "Shiba Inu"),
    ("LTC-USD",   "Litecoin"),
    ("BCH-USD",   "Bitcoin Cash"),
    ("DOT-USD",   "Polkadot"),
    ("LINK-USD",  "Chainlink"),
    ("ATOM-USD",  "Cosmos"),
    # ── Layer 2 / 생태계 ────────────────────────────────────────
    ("MATIC-USD", "Polygon"),
    ("ARB-USD",   "Arbitrum"),
    ("OP-USD",    "Optimism"),
    ("APT-USD",   "Aptos"),
    ("SUI-USD",   "Sui"),
    ("NEAR-USD",  "NEAR Protocol"),
    ("FIL-USD",   "Filecoin"),
    ("ICP-USD",   "Internet Computer"),
    ("INJ-USD",   "Injective"),
    # ── DeFi ────────────────────────────────────────────────────
    ("UNI-USD",   "Uniswap"),
    ("AAVE-USD",  "Aave"),
    ("MKR-USD",   "Maker"),
    ("CRV-USD",   "Curve DAO Token"),
    ("LDO-USD",   "Lido DAO"),
    ("JUP-USD",   "Jupiter"),
    # ── 밈 코인 (한국 투자자 인기) ──────────────────────────────
    ("PEPE-USD",  "Pepe"),
    ("WIF-USD",   "dogwifhat"),
    ("BONK-USD",  "Bonk"),
    ("FLOKI-USD", "FLOKI"),
    # ── 기타 주요 코인 ───────────────────────────────────────────
    ("XLM-USD",   "Stellar"),
    ("VET-USD",   "VeChain"),
    ("ALGO-USD",  "Algorand"),
    ("HBAR-USD",  "Hedera"),
    ("ETC-USD",   "Ethereum Classic"),
    ("XMR-USD",   "Monero"),
    ("FTM-USD",   "Fantom"),
    ("SAND-USD",  "The Sandbox"),
    ("MANA-USD",  "Decentraland"),
    ("AXS-USD",   "Axie Infinity"),
]


# ── 국내 종목 일괄 조회 (executor에서 실행) ────────────────────
def _fetch_market_tickers_sync(market_name: str) -> list[tuple[str, str]]:
    """국내 종목 전체 티커+종목명 수집.
    방법 1: FinanceDataReader (NaverFinance 기반, KRX 차단 우회)
    방법 2: pykrx (KRX 접근 가능한 경우)
    """
    # ── 방법 1: FinanceDataReader (KOSPI-DESC / KOSDAQ-DESC → kind.krx.co.kr) ─
    try:
        import FinanceDataReader as fdr
        df = fdr.StockListing(f"{market_name}-DESC")
        if df is not None and not df.empty:
            col_map: dict[str, str] = {}
            for col in df.columns:
                if col.lower() in ("symbol", "code", "ticker"):
                    col_map["ticker"] = col
                elif col.lower() in ("name", "종목명", "company"):
                    col_map["name"] = col
            if "ticker" in col_map and "name" in col_map:
                result = []
                for _, row in df.iterrows():
                    ticker = str(row[col_map["ticker"]]).strip().zfill(6)
                    name = str(row[col_map["name"]]).strip()
                    if ticker and name and name != "nan":
                        result.append((ticker, name))
                if result:
                    return result
    except Exception:
        pass

    # ── 방법 2: pykrx (KRX 접근 가능한 경우) ────────────────────
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from pykrx import stock as krx_sync
    from datetime import datetime as _dt, timedelta as _td

    tickers: list = []
    for days_back in range(10):
        date = (_dt.now() - _td(days=days_back)).strftime("%Y%m%d")
        try:
            t = krx_sync.get_market_ticker_list(date, market=market_name)
            if t:
                tickers = t
                break
        except Exception:
            continue

    if not tickers:
        return []

    def _get_name(ticker: str):
        try:
            name = krx_sync.get_market_ticker_name(ticker)
            return (ticker, name) if name else None
        except Exception:
            return None

    result: list[tuple[str, str]] = []
    with ThreadPoolExecutor(max_workers=20) as pool:
        futures = [pool.submit(_get_name, t) for t in tickers]
        for future in as_completed(futures):
            res = future.result()
            if res:
                result.append(res)
    return result


# ── 해외 종목 일괄 조회 (NASDAQ + NYSE + AMEX via FDR/Naver) ───
def _fetch_overseas_tickers_sync() -> list[dict]:
    """FinanceDataReader NaverStockListing으로 NASDAQ/NYSE/AMEX 전체 수집.
    nasdaqtrader.com FTP 차단 환경에서도 동작."""
    try:
        import FinanceDataReader as fdr
    except ImportError:
        return []

    rows: list[dict] = []
    seen: set[str] = set()

    for market_name in ["NASDAQ", "NYSE", "AMEX"]:
        try:
            df = fdr.StockListing(market_name)
            if df is None or df.empty:
                continue
            sym_col  = next((c for c in df.columns if c.lower() in ("symbol", "code", "ticker")), None)
            name_col = next((c for c in df.columns if c.lower() in ("name", "종목명", "company")), None)
            if not sym_col or not name_col:
                continue
            try:
                market_enum = MarketType(market_name)
            except ValueError:
                market_enum = MarketType.NASDAQ
            for _, row in df.iterrows():
                ticker = str(row[sym_col]).strip()
                name   = str(row[name_col]).strip()
                if not ticker or not name or name == "nan" or ticker in seen:
                    continue
                seen.add(ticker)
                rows.append({
                    "id":          ticker,
                    "name":        name,
                    "market":      market_enum.value,
                    "is_domestic": False,
                    "is_active":   True,
                })
        except Exception:
            continue

    # FDR 실패 시 사전 정의 목록으로 폴백
    if not rows:
        _seen: set[str] = set()
        for ticker, name, market_name in _OVERSEAS_STOCKS:
            if ticker in _seen:
                continue
            _seen.add(ticker)
            try:
                market_enum = MarketType(market_name)
            except ValueError:
                market_enum = MarketType.NASDAQ
            rows.append({
                "id":          ticker,
                "name":        name,
                "market":      market_enum.value,
                "is_domestic": False,
                "is_active":   True,
            })
    return rows


# ── DB 일괄 upsert (100건씩 배치) ──────────────────────────────
async def _bulk_upsert(db: AsyncSession, rows: list[dict]) -> None:
    """MySQL INSERT ... ON DUPLICATE KEY UPDATE 배치 처리"""
    BATCH = 100
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        stmt = mysql_insert(Stock.__table__).values(chunk)
        stmt = stmt.on_duplicate_key_update(
            name=stmt.inserted.name,
            is_active=True,
        )
        await db.execute(stmt)
    await db.commit()


# ── 시드 상태 — crypto_done 필드 추가 ──────────────────────────
_seed_status["crypto_done"] = 0


# ── 시드 백그라운드 태스크 ──────────────────────────────────────
async def _run_seed_task(domestic: bool, overseas: bool, crypto: bool) -> None:
    _seed_status["running"] = True
    _seed_status["error"]   = None
    loop = asyncio.get_running_loop()

    try:
        async with AsyncSessionLocal() as db:

            # ① 국내 종목 (KOSPI + KOSDAQ)
            if domestic:
                dom_rows: list[dict] = []
                for market_name, market_enum in [
                    ("KOSPI",  MarketType.KOSPI),
                    ("KOSDAQ", MarketType.KOSDAQ),
                ]:
                    pairs = await loop.run_in_executor(
                        None, _fetch_market_tickers_sync, market_name
                    )
                    for ticker, name in pairs:
                        dom_rows.append({
                            "id":          ticker,
                            "name":        name,
                            "market":      market_enum.value,
                            "is_domestic": True,
                            "is_active":   True,
                        })

                await _bulk_upsert(db, dom_rows)
                _seed_status["domestic_done"] = len(dom_rows)

            # ② 해외 종목 (FDR NaverStockListing: NASDAQ + NYSE + AMEX)
            if overseas:
                ovs_rows: list[dict] = await loop.run_in_executor(
                    None, _fetch_overseas_tickers_sync
                )
                await _bulk_upsert(db, ovs_rows)
                _seed_status["overseas_done"] = len(ovs_rows)

            # ③ 가상화폐 (사전 정의 리스트)
            if crypto:
                crypto_rows: list[dict] = []
                for ticker, name in _CRYPTO_STOCKS:
                    crypto_rows.append({
                        "id":          ticker,
                        "name":        name,
                        "market":      MarketType.CRYPTO.value,
                        "is_domestic": False,
                        "is_active":   True,
                    })

                await _bulk_upsert(db, crypto_rows)
                _seed_status["crypto_done"] = len(crypto_rows)

    except Exception as e:
        _seed_status["error"] = str(e)
    finally:
        _seed_status["running"]  = False
        _seed_status["last_run"] = datetime.now().isoformat()


@router.get("/search")
async def search_stocks(
    q: str = Query(..., min_length=1),
    market: str = Query("ALL"),
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db),
):
    """종목 검색 — DB 우선, 결과 부족 시 실시간 보완
    market: ALL | KOSPI | KOSDAQ | US | CRYPTO
    """
    # ── DB 검색 (market 필터 적용) ──────────────────────────────────
    stmt = select(Stock).where(Stock.name.contains(q) | Stock.id.contains(q))
    if market == "CRYPTO":
        stmt = stmt.where(Stock.market == MarketType.CRYPTO)
    elif market in ("KOSPI", "KOSDAQ"):
        stmt = stmt.where(Stock.market == market)
    elif market == "US":
        stmt = stmt.where(Stock.is_domestic == False, Stock.market != MarketType.CRYPTO)
    # market == "ALL" → 전체 검색 (필터 없음)

    result = await db.execute(stmt.limit(limit))
    stocks = result.scalars().all()
    db_results = [
        {
            "id": s.id,
            "name": s.name,
            "market": s.market.value,
            "is_domestic": s.is_domestic,
            **({"is_crypto": True} if s.market == MarketType.CRYPTO else {}),
        }
        for s in stocks
    ]

    if len(db_results) >= limit:
        return db_results

    # ── DB 결과 부족 → 실시간 보완 ──────────────────────────────────
    db_ids = {s.id for s in stocks}
    live: list[dict] = []

    if market in ("ALL", "KOSPI", "KOSDAQ"):
        try:
            dom = await krx_svc.search_stocks(q, market if market != "ALL" else "ALL")
            live.extend(r for r in dom if r["id"] not in db_ids)
        except Exception:
            pass

    if market in ("ALL", "US"):
        try:
            ovs = yf_svc.search_stocks(q)
            live.extend(r for r in ovs if r["id"] not in db_ids)
        except Exception:
            pass

    if market in ("ALL", "CRYPTO"):
        # 가상화폐: 사전 정의 목록에서도 보완 (DB에 없는 경우)
        q_lower = q.lower()
        live.extend(
            {"id": t, "name": n, "market": "CRYPTO", "is_domestic": False, "is_crypto": True}
            for t, n in _CRYPTO_STOCKS
            if (q_lower in n.lower() or q_lower in t.lower()) and t not in db_ids
        )

    return (db_results + live)[:limit]


@router.get("/domestic")
async def get_domestic_stocks(
    market: str = Query("KOSPI"),
    with_price: bool = Query(True, description="현재가·등락률 포함 여부"),
    db: AsyncSession = Depends(get_db),
):
    """국내 종목 리스트 (DB 우선, 없으면 KRX 실시간) + 현재가"""
    result = await db.execute(
        select(Stock).where(Stock.is_domestic == True, Stock.market == market).limit(2500)
    )
    stocks = result.scalars().all()

    loop = asyncio.get_running_loop()

    # ─ 가격 데이터 조회 ──────────────────────────────────────────────────────
    prices: dict = {}
    if with_price:
        try:
            prices = await loop.run_in_executor(None, krx_svc.get_market_prices_sync, market)
        except Exception:
            pass

    if not stocks:
        # DB에 종목 없으면 pykrx로 목록 구성 (prices는 이미 조회됨)
        try:
            raw_list = await loop.run_in_executor(None, _fetch_market_tickers_sync, market)
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"KRX 데이터 조회 실패: {str(e)}")
        return [
            {
                "id": ticker,
                "name": name,
                "market": market,
                "is_domestic": True,
                "price": prices.get(ticker, {}).get("price"),
                "change_pct": prices.get(ticker, {}).get("change_pct"),
            }
            for ticker, name in raw_list
        ]

    return [
        {
            "id": s.id,
            "name": s.name,
            "market": s.market.value,
            "is_domestic": True,
            "price": prices.get(s.id, {}).get("price"),
            "change_pct": prices.get(s.id, {}).get("change_pct"),
        }
        for s in stocks
    ]


@router.get("/overseas/popular")
async def get_popular_overseas():
    """해외 인기 종목 + 현재가·등락률"""
    popular = [
        {"id": "AAPL",  "name": "Apple Inc.",        "market": "NASDAQ", "is_domestic": False},
        {"id": "MSFT",  "name": "Microsoft",          "market": "NASDAQ", "is_domestic": False},
        {"id": "NVDA",  "name": "NVIDIA",             "market": "NASDAQ", "is_domestic": False},
        {"id": "TSLA",  "name": "Tesla",              "market": "NASDAQ", "is_domestic": False},
        {"id": "GOOGL", "name": "Alphabet",           "market": "NASDAQ", "is_domestic": False},
        {"id": "AMZN",  "name": "Amazon",             "market": "NASDAQ", "is_domestic": False},
        {"id": "META",  "name": "Meta Platforms",     "market": "NASDAQ", "is_domestic": False},
        {"id": "005930","name": "삼성전자",            "market": "KOSPI",  "is_domestic": True},
        {"id": "000660","name": "SK하이닉스",          "market": "KOSPI",  "is_domestic": True},
        {"id": "035420","name": "NAVER",               "market": "KOSPI",  "is_domestic": True},
    ]

    # 해외 종목 현재가 일괄 조회
    overseas_tickers = [s["id"] for s in popular if not s["is_domestic"]]
    prices: dict = {}
    try:
        loop = asyncio.get_running_loop()
        prices = await loop.run_in_executor(None, yf_svc.fetch_current_prices, overseas_tickers)
    except Exception:
        pass

    return [
        {
            **s,
            "price": prices.get(s["id"], {}).get("price") if not s["is_domestic"] else None,
            "change_pct": prices.get(s["id"], {}).get("change_pct") if not s["is_domestic"] else None,
        }
        for s in popular
    ]


@router.get("/overseas")
async def get_overseas_stocks(
    market: str = Query("ALL", description="NASDAQ | NYSE | AMEX | ALL"),
    db: AsyncSession = Depends(get_db),
):
    """해외 종목 전체 리스트 (DB, 가격 제외)"""
    query = select(Stock).where(
        Stock.is_domestic == False,
        Stock.market != MarketType.CRYPTO,
        Stock.is_active == True,
    )
    if market != "ALL":
        try:
            query = query.where(Stock.market == MarketType(market))
        except ValueError:
            pass
    result = await db.execute(query.limit(600))
    stocks = result.scalars().all()

    if stocks:
        return [
            {"id": s.id, "name": s.name, "market": s.market.value, "is_domestic": False}
            for s in stocks
        ]

    # DB에 없으면 사전 정의 목록 반환
    filtered = (
        [(t, n, m) for t, n, m in _OVERSEAS_STOCKS if m == market]
        if market != "ALL"
        else _OVERSEAS_STOCKS
    )
    return [
        {"id": t, "name": n, "market": m, "is_domestic": False}
        for t, n, m in filtered
    ]


@router.get("/seed/status")
async def get_seed_status():
    """종목 시드 작업 진행 상황 조회"""
    return _seed_status


@router.post("/seed")
async def seed_stocks(
    background_tasks: BackgroundTasks,
    domestic: bool = Query(True,  description="국내(KOSPI+KOSDAQ) 시드 여부"),
    overseas: bool = Query(True,  description="해외 주요 종목 시드 여부"),
    crypto:   bool = Query(True,  description="가상화폐 시드 여부"),
):
    """
    국내(KOSPI+KOSDAQ) 전 종목, 해외 주요 종목, 가상화폐 티커 정보를 DB에 일괄 저장.
    - 이미 존재하는 종목은 이름만 갱신 (ON DUPLICATE KEY UPDATE)
    - 백그라운드로 실행 → /api/stocks/seed/status 에서 진행 상황 확인
    ※ 기존 DB에 stocks 테이블이 있으면 아래 마이그레이션 필요:
      ALTER TABLE stocks MODIFY market ENUM('KOSPI','KOSDAQ','NYSE','NASDAQ','AMEX','CRYPTO') NOT NULL;
    """
    if _seed_status["running"]:
        return {
            "message": "이미 시드 작업이 진행 중입니다.",
            "status":  _seed_status,
        }

    background_tasks.add_task(_run_seed_task, domestic, overseas, crypto)
    return {
        "message": "종목 시드 작업을 시작했습니다. "
                   "GET /api/stocks/seed/status 에서 진행 상황을 확인하세요.",
        "options": {"domestic": domestic, "overseas": overseas, "crypto": crypto},
    }


@router.get("/crypto")
async def get_crypto_list(db: AsyncSession = Depends(get_db)):
    """주요 가상화폐 목록 (DB 우선, 없으면 사전 정의 목록)"""
    result = await db.execute(
        select(Stock).where(Stock.market == MarketType.CRYPTO, Stock.is_active == True)
    )
    stocks = result.scalars().all()

    if stocks:
        return [
            {
                "id":          s.id,
                "name":        s.name,
                "market":      "CRYPTO",
                "is_domestic": False,
                "is_crypto":   True,
            }
            for s in stocks
        ]

    # DB에 없으면 사전 정의 목록 반환
    return [
        {"id": ticker, "name": name, "market": "CRYPTO", "is_domestic": False, "is_crypto": True}
        for ticker, name in _CRYPTO_STOCKS
    ]


# ══════════════════════════════════════════════════════════════════
# 네이버 금융 시총 상위 종목 크롤링
# ══════════════════════════════════════════════════════════════════
def _crawl_naver_marcap(market: str, pages: int = 2) -> list[dict]:
    """네이버 금융 시총 상위 종목 크롤링 (euc-kr, 50건/page)
    컬럼 순서: [0]N [1]종목명 [2]현재가 [3]전일비 [4]등락률
              [5]액면가 [6]시가총액(억) [7]상장주식수 [8]외국인비율
              [9]거래량 [10]PER [11]ROE [12]토론
    """
    import requests
    from bs4 import BeautifulSoup

    sosok = "0" if market == "KOSPI" else "1"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Referer": "https://finance.naver.com/",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }

    def parse_num(text: str):
        t = text.replace(",", "").strip()
        # 전일비 텍스트: "하락22900" / "상승22900" / "보합0" 처리
        for prefix in ("하락", "상승", "보합"):
            if t.startswith(prefix):
                t = t[len(prefix):]
                break
        t = t.replace("%", "").replace("+", "").strip()
        if not t or t in ("-", "N/A", "해당없음", "해당 없음"):
            return None
        try:
            return float(t)
        except ValueError:
            return None

    rows: list[dict] = []

    for page in range(1, pages + 1):
        url = (
            f"https://finance.naver.com/sise/sise_market_sum.naver"
            f"?sosok={sosok}&page={page}"
        )
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            resp.encoding = "euc-kr"
            soup = BeautifulSoup(resp.text, "html.parser")

            table = soup.find("table", class_="type_2")
            if not table:
                break

            for tr in table.find_all("tr"):
                tds = tr.find_all("td")
                if len(tds) < 12:
                    continue

                # 순위 (td[0])
                rank_text = tds[0].get_text(strip=True)
                try:
                    rank = int(rank_text)
                except ValueError:
                    continue

                # 종목명 + 티커 (td[1])
                name_tag = tds[1].find("a")
                if not name_tag:
                    continue
                name = name_tag.get_text(strip=True)
                if not name:
                    continue
                href = name_tag.get("href", "")
                ticker = href.split("code=")[-1].strip() if "code=" in href else ""

                # 현재가 (td[2])
                current_price = parse_num(tds[2].get_text(strip=True))

                # 전일비 (td[3]): 텍스트가 "하락22,900" / "상승22,900" 형태
                change_raw_text = tds[3].get_text(strip=True)
                change_sign = (
                    -1 if change_raw_text.startswith("하락")
                    else 0 if change_raw_text.startswith("보합")
                    else 1
                )
                change_val = parse_num(change_raw_text)
                change = (change_val * change_sign) if change_val is not None else None

                # 등락률 (td[4]): "-11.74%" / "+5.00%"
                cpct_text = tds[4].get_text(strip=True)
                change_pct = parse_num(cpct_text)

                market_cap = parse_num(tds[6].get_text(strip=True))   # 억원 단위
                volume_raw = parse_num(tds[9].get_text(strip=True))
                volume = int(volume_raw) if volume_raw is not None else None
                per = parse_num(tds[10].get_text(strip=True))
                roe = parse_num(tds[11].get_text(strip=True))

                rows.append({
                    "rank": rank,
                    "ticker": ticker,
                    "name": name,
                    "current_price": current_price,
                    "change": change,
                    "change_pct": change_pct,
                    "volume": volume,
                    "market_cap": market_cap,
                    "per": per,
                    "roe": roe,
                })

        except Exception as e:
            print(f"[marcap] 크롤링 오류 page={page}: {e}")
            break

    return rows


@router.get("/domestic/marcap")
async def get_marcap_ranking(
    market: str = Query("KOSPI", description="KOSPI | KOSDAQ"),
    refresh: bool = Query(False, description="캐시 무시하고 즉시 크롤링"),
):
    """네이버 금융 시총 상위 종목 (최대 100개, 1시간 캐시)"""
    market = market.upper()
    if market not in ("KOSPI", "KOSDAQ"):
        raise HTTPException(status_code=400, detail="market must be KOSPI or KOSDAQ")

    cache = _marcap_cache.get(market)
    now = _time.time()

    if not refresh and cache and (now - cache["updated_at"]) < _MARCAP_TTL:
        return {
            "market": market,
            "data": cache["data"],
            "updated_at": cache["updated_at"],
            "cached": True,
        }

    loop = asyncio.get_running_loop()
    data = await loop.run_in_executor(None, _crawl_naver_marcap, market, 2)

    _marcap_cache[market] = {"data": data, "updated_at": now}
    return {
        "market": market,
        "data": data,
        "updated_at": now,
        "cached": False,
    }


@router.get("/{ticker}")
async def get_stock_detail(
    ticker: str,
    is_domestic: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    """종목 상세 정보 + 현재 지표"""
    if is_domestic:
        try:
            fundamental = await krx_svc.get_fundamental(ticker)
            name = ""
            result = await db.execute(select(Stock).where(Stock.id == ticker))
            stock = result.scalar_one_or_none()
            if stock:
                name = stock.name

            # DB에 없으면 pykrx로 종목명 실시간 조회
            if not name:
                try:
                    from pykrx import stock as _krx
                    _loop = asyncio.get_event_loop()
                    name = await _loop.run_in_executor(None, _krx.get_market_ticker_name, ticker)
                except Exception:
                    pass

            return {
                "id": ticker,
                "name": name or ticker,
                "market": "KOSPI",
                "is_domestic": True,
                "per": fundamental.get("per"),
                "pbr": fundamental.get("pbr"),
                "dividend_yield": fundamental.get("div"),
            }
        except Exception as e:
            raise HTTPException(status_code=404, detail=str(e))
    else:
        try:
            info = yf_svc.get_stock_info(ticker)
            return {
                "id": ticker,
                "name": info.get("name", ticker),
                "market": "NASDAQ",
                "is_domestic": False,
                "current_price": info.get("current_price"),
                "market_cap": info.get("market_cap"),
                "per": info.get("pe_ratio"),
                "pbr": info.get("pb_ratio"),
                "dividend_yield": info.get("dividend_yield"),
                "high_52w": info.get("52w_high"),
                "low_52w": info.get("52w_low"),
            }
        except Exception as e:
            raise HTTPException(status_code=404, detail=str(e))


@router.get("/{ticker}/price")
async def get_stock_price(
    ticker: str,
    period: str = Query("3mo"),
    is_domestic: bool = Query(True),
):
    """일봉 차트 데이터"""
    try:
        if is_domestic:
            start, end = get_date_range(period)
            df = await krx_svc.fetch_ohlcv(ticker, start, end)
        else:
            df = yf_svc.fetch_ohlcv(ticker, period=period)

        df = df.reset_index()
        records = []
        for _, row in df.iterrows():
            records.append({
                "date":   str(row["date"])[:10],
                "open":   float(row["open"])   if pd.notna(row["open"])   else None,
                "high":   float(row["high"])   if pd.notna(row["high"])   else None,
                "low":    float(row["low"])    if pd.notna(row["low"])    else None,
                "close":  float(row["close"])  if pd.notna(row["close"])  else None,
                "volume": int(row["volume"])   if pd.notna(row["volume"]) else None,
            })
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticker}/price/weekly")
async def get_stock_price_weekly(
    ticker: str,
    is_domestic: bool = Query(True),
):
    """주봉 차트 데이터"""
    try:
        if is_domestic:
            start, _ = get_date_range("3y")
            end = datetime.now().strftime("%Y%m%d")
            df = await krx_svc.fetch_ohlcv(ticker, start, end)
        else:
            df = yf_svc.fetch_ohlcv(ticker, period="3y")

        weekly = cs_svc.resample_weekly(df)
        weekly = weekly.reset_index()
        records = []
        for _, row in weekly.tail(52).iterrows():
            records.append({
                "date":    str(row["date"])[:10] if "date" in row else str(row.name)[:10],
                "open":    float(row["open"])   if pd.notna(row.get("open"))   else None,
                "high":    float(row["high"])   if pd.notna(row.get("high"))   else None,
                "low":     float(row["low"])    if pd.notna(row.get("low"))    else None,
                "close":   float(row["close"])  if pd.notna(row.get("close"))  else None,
                "volume":  int(row["volume"])   if pd.notna(row.get("volume")) else None,
                "sma_5w":  float(row["sma_5w"]) if pd.notna(row.get("sma_5w")) else None,
                "sma_13w": float(row["sma_13w"]) if pd.notna(row.get("sma_13w")) else None,
                "sma_26w": float(row["sma_26w"]) if pd.notna(row.get("sma_26w")) else None,
            })
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ticker}/price/monthly")
async def get_stock_price_monthly(
    ticker: str,
    is_domestic: bool = Query(True),
):
    """월봉 차트 데이터"""
    try:
        if is_domestic:
            start, _ = get_date_range("5y")
            end = datetime.now().strftime("%Y%m%d")
            df = await krx_svc.fetch_ohlcv(ticker, start, end)
        else:
            df = yf_svc.fetch_ohlcv(ticker, period="5y")

        monthly = cs_svc.resample_monthly(df)
        monthly = monthly.reset_index()
        records = []
        for _, row in monthly.tail(36).iterrows():
            records.append({
                "date":    str(row["date"])[:10] if "date" in row else str(row.name)[:10],
                "open":    float(row["open"])   if pd.notna(row.get("open"))   else None,
                "high":    float(row["high"])   if pd.notna(row.get("high"))   else None,
                "low":     float(row["low"])    if pd.notna(row.get("low"))    else None,
                "close":   float(row["close"])  if pd.notna(row.get("close"))  else None,
                "volume":  int(row["volume"])   if pd.notna(row.get("volume")) else None,
                "sma_3m":  float(row["sma_3m"]) if pd.notna(row.get("sma_3m")) else None,
                "sma_6m":  float(row["sma_6m"]) if pd.notna(row.get("sma_6m")) else None,
                "sma_12m": float(row["sma_12m"]) if pd.notna(row.get("sma_12m")) else None,
            })
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
