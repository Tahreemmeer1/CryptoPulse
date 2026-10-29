
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bitcoin,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Star,
  Wallet,
  Trash2,
  ArrowDownUp,
  SlidersHorizontal,
} from "lucide-react";
import CryptoChart from "./CryptoChart";
import { useCryptoStore } from "./store/useCryptoStore";
import "./App.css";

type Coin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  change: number;
  marketCap: number;
};

type SortOption = "marketCap" | "price" | "change";
type MarketFilter = "all" | "gainers" | "losers";

const initialCoins: Coin[] = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC", image: "₿", price: 0, change: 0, marketCap: 0 },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", image: "◆", price: 0, change: 0, marketCap: 0 },
  { id: "tether", name: "Tether", symbol: "USDT", image: "₮", price: 0, change: 0, marketCap: 0 },
  { id: "solana", name: "Solana", symbol: "SOL", image: "◎", price: 0, change: 0, marketCap: 0 },
  { id: "binancecoin", name: "BNB", symbol: "BNB", image: "◆", price: 0, change: 0, marketCap: 0 },
  { id: "ripple", name: "XRP", symbol: "XRP", image: "✕", price: 0, change: 0, marketCap: 0 },
  { id: "dogecoin", name: "Dogecoin", symbol: "DOGE", image: "Ð", price: 0, change: 0, marketCap: 0 },
  { id: "cardano", name: "Cardano", symbol: "ADA", image: "●", price: 0, change: 0, marketCap: 0 },
];

async function fetchMarkets(): Promise<Coin[]> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h",
  );

  if (!response.ok) {
    throw new Error("Market data is temporarily unavailable.");
  }

  const data = await response.json();

  return data.map(
    (coin: {
      id: string;
      name: string;
      symbol: string;
      current_price: number;
      price_change_percentage_24h: number | null;
      market_cap: number;
    }): Coin => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      image: coin.symbol.slice(0, 1).toUpperCase(),
      price: coin.current_price,
      change: coin.price_change_percentage_24h ?? 0,
      marketCap: coin.market_cap,
    }),
  );
}

const money = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 5 : 2,
  });

function App() {
  const watchlist = useCryptoStore((state) => state.watchlist);
  const portfolio = useCryptoStore((state) => state.portfolio);
  const toggleWatchlist = useCryptoStore((state) => state.toggleWatchlist);
  const updatePortfolio = useCryptoStore((state) => state.updatePortfolio);
  const removePortfolioAsset = useCryptoStore((state) => state.removePortfolioAsset);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedCoin, setSelectedCoin] = useState("bitcoin");
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [purchaseInputs, setPurchaseInputs] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<SortOption>("marketCap");
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("all");

  const {
    data: marketData,
    isFetching: loading,
    error: queryError,
    refetch: loadMarkets,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["crypto-markets"],
    queryFn: fetchMarkets,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const displayedCoins = marketData ?? initialCoins;
  const connected = Boolean(marketData);
  const error = queryError
    ? "Could not load live prices. Check your internet connection or try again."
    : "";
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "";

  const visibleCoins = displayedCoins
    .filter((coin) => {
      const term = search.trim().toLowerCase();
      const matchesSearch =
        coin.name.toLowerCase().includes(term) ||
        coin.symbol.toLowerCase().includes(term);
      const matchesWatchlist =
        activeTab !== "Watchlist" || watchlist.includes(coin.id);
      const matchesFilter =
        marketFilter === "all" ||
        (marketFilter === "gainers" && coin.change > 0) ||
        (marketFilter === "losers" && coin.change < 0);

      return matchesSearch && matchesWatchlist && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "price") return b.price - a.price;
      if (sortBy === "change") return b.change - a.change;
      return b.marketCap - a.marketCap;
    });

  const marketUp = displayedCoins.filter((coin) => coin.change > 0).length;
  const marketCap =
    marketData?.reduce((total, coin) => total + coin.marketCap, 0) ?? 0;

  const portfolioRows = portfolio
    .map((asset) => {
      const coin = displayedCoins.find((item) => item.id === asset.coinId);
      if (!coin) return null;

      const value = coin.price * asset.quantity;
      const hasPurchasePrice =
        typeof asset.purchasePrice === "number" && asset.purchasePrice > 0;
      const invested = hasPurchasePrice
        ? asset.purchasePrice! * asset.quantity
        : null;
      const profit = invested !== null ? value - invested : null;
      const returnPercent =
        invested !== null && invested > 0 ? (profit! / invested) * 100 : null;

      return {
        ...asset,
        coin,
        value,
        invested,
        profit,
        returnPercent,
      };
    })
    .filter((item) => item !== null);

  const portfolioValue = portfolioRows.reduce(
    (total, asset) => total + asset.value,
    0,
  );

  const totalInvested = portfolioRows.reduce(
    (total, asset) => total + (asset.invested ?? 0),
    0,
  );

  const hasCompleteCostBasis = portfolioRows.some(
    (asset) => asset.invested !== null,
  );

  const totalProfit = portfolioRows.reduce(
    (total, asset) => total + (asset.profit ?? 0),
    0,
  );

  const totalReturn =
    totalInvested > 0 ? (totalProfit / totalInvested) * 100 : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Activity size={23} /></div>
          <span>Crypto<span className="brand-accent">Pulse</span></span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        {[
          { label: "Overview", icon: LayoutDashboard },
          { label: "Markets", icon: ChartNoAxesCombined },
          { label: "Watchlist", icon: Star },
          { label: "Portfolio", icon: Wallet },
        ].map(({ label, icon: Icon }) => (
          <button
            className={`nav-link ${activeTab === label ? "active" : ""}`}
            key={label}
            onClick={() => setActiveTab(label)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {label === "Watchlist" && <span className="nav-count">{watchlist.length}</span>}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="pro-card">
            <div className="pro-icon"><CircleDollarSign size={22} /></div>
            <strong>Stay ahead of the market</strong>
            <p>Track prices and keep your favorite assets close.</p>
            <button onClick={() => void loadMarkets()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh market"}
            </button>
          </div>

          <button className="nav-link" onClick={() => setActiveTab("Settings")}>
            <Settings size={18} /><span>Settings</span>
          </button>

          <div className="profile">
            <div className="avatar">C</div>
            <div><strong>Crypto Trader</strong><small>Personal workspace</small></div>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><Menu size={20} /> CryptoPulse</div>
          <div className="breadcrumb">Workspace <span>/</span> {activeTab}</div>
          <div className="top-actions">
            <span className={`connection ${connected ? "online" : ""}`}>
              <span className="status-dot" />
              {connected ? "API connected" : "Connecting..."}
            </span>
            <button
              className="icon-button"
              title="Notifications"
              onClick={() => window.alert("You're all caught up!")}
            >
              <Bell size={19} />
            </button>
            <div className="avatar">C</div>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <p className="eyebrow">MARKET INTELLIGENCE</p>
            <h1>{activeTab === "Overview" ? "Market overview" : activeTab}</h1>
            <p className="subtitle">Your crypto market, all in one place.</p>
          </div>
          <button className="primary-button" onClick={() => void loadMarkets()} disabled={loading}>
            <Activity size={17} /> {loading ? "Loading..." : "Refresh prices"}
          </button>
        </section>

        {error && <div className="error-banner">{error}</div>}

        {activeTab === "Portfolio" ? (
          <section className="market-panel portfolio-panel">
            <div className="panel-heading">
              <div>
                <h2>Your portfolio</h2>
                <p>Estimated value, investment cost and performance</p>
              </div>
            </div>

            <div className="portfolio-summary">
              <span>Total current value</span>
              <h2>{money(portfolioValue)}</h2>
              <div className="portfolio-metrics">
                <div>
                  <small>Total invested</small>
                  <strong>{hasCompleteCostBasis ? money(totalInvested) : "Add purchase prices"}</strong>
                </div>
                <div>
                  <small>Profit / loss</small>
                  <strong className={totalProfit >= 0 ? "profit-positive" : "profit-negative"}>
                    {hasCompleteCostBasis ? money(totalProfit) : "—"}
                  </strong>
                </div>
                <div>
                  <small>Return</small>
                  <strong className={(totalReturn ?? 0) >= 0 ? "profit-positive" : "profit-negative"}>
                    {totalReturn === null ? "—" : `${totalReturn.toFixed(2)}%`}
                  </strong>
                </div>
              </div>
              <small>USD estimates based on current market prices. Not investment advice.</small>
            </div>

            <div className="portfolio-add">
              <label htmlFor="portfolio-coin">Choose cryptocurrency</label>
              <select
                id="portfolio-coin"
                value={selectedCoin}
                onChange={(event) => setSelectedCoin(event.target.value)}
              >
                {displayedCoins.map((coin) => (
                  <option key={coin.id} value={coin.id}>
                    {coin.name} ({coin.symbol})
                  </option>
                ))}
              </select>

              <label htmlFor="portfolio-quantity">Quantity owned</label>
              <input
                id="portfolio-quantity"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 0.5"
                value={quantityInputs[selectedCoin] ?? ""}
                onChange={(event) =>
                  setQuantityInputs((current) => ({
                    ...current,
                    [selectedCoin]: event.target.value,
                  }))
                }
              />

              <label htmlFor="portfolio-purchase">Purchase price per coin ($)</label>
              <input
                id="portfolio-purchase"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 65000"
                value={purchaseInputs[selectedCoin] ?? ""}
                onChange={(event) =>
                  setPurchaseInputs((current) => ({
                    ...current,
                    [selectedCoin]: event.target.value,
                  }))
                }
              />

              <button
                className="primary-button"
                onClick={() => {
                  const rawQuantity = quantityInputs[selectedCoin];
                  const rawPurchase = purchaseInputs[selectedCoin];
                  const quantity = Number(rawQuantity);
                  const purchasePrice = Number(rawPurchase);

                  if (
                    rawQuantity?.trim() &&
                    rawPurchase?.trim() &&
                    Number.isFinite(quantity) &&
                    quantity >= 0 &&
                    Number.isFinite(purchasePrice) &&
                    purchasePrice > 0
                  ) {
                    updatePortfolio(selectedCoin, quantity, purchasePrice);
                    setQuantityInputs((current) => ({
                      ...current,
                      [selectedCoin]: "",
                    }));
                    setPurchaseInputs((current) => ({
                      ...current,
                      [selectedCoin]: "",
                    }));
                  } else {
                    window.alert("Enter a valid quantity and purchase price greater than zero.");
                  }
                }}
              >
                Save holding
              </button>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Quantity</th>
                    <th>Purchase price</th>
                    <th>Current price</th>
                    <th>Invested</th>
                    <th>Current value</th>
                    <th>Profit / loss</th>
                    <th>Return</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioRows.map((asset) => (
                    <tr key={asset.coinId}>
                      <td>
                        <div className="coin-cell">
                          <div className="coin-logo">{asset.coin.image}</div>
                          <div><strong>{asset.coin.name}</strong><small>{asset.coin.symbol}</small></div>
                        </div>
                      </td>
                      <td>{asset.quantity}</td>
                      <td>{asset.purchasePrice ? money(asset.purchasePrice) : "Not set"}</td>
                      <td>{money(asset.coin.price)}</td>
                      <td>{asset.invested === null ? "—" : money(asset.invested)}</td>
                      <td className="price-cell">{money(asset.value)}</td>
                      <td className={asset.profit === null ? "" : asset.profit >= 0 ? "profit-positive" : "profit-negative"}>
                        {asset.profit === null ? "Add purchase price" : money(asset.profit)}
                      </td>
                      <td className={asset.returnPercent === null ? "" : asset.returnPercent >= 0 ? "profit-positive" : "profit-negative"}>
                        {asset.returnPercent === null ? "—" : `${asset.returnPercent.toFixed(2)}%`}
                      </td>
                      <td>
                        <button
                          className="watch-button"
                          title={`Remove ${asset.coin.name}`}
                          onClick={() => removePortfolioAsset(asset.coinId)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {portfolioRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="empty-state">
                        No holdings yet. Select a coin and enter its quantity and purchase price.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : activeTab === "Settings" ? (
          <section className="market-panel settings-panel">
            <div className="panel-heading">
              <div>
                <h2>Settings</h2>
                <p>CryptoPulse dashboard preferences</p>
              </div>
            </div>
            <div className="settings-row">
              <div><strong>Market data refresh</strong><p>Market data refreshes automatically every 60 seconds.</p></div>
              <span className="settings-status">Automatic</span>
            </div>
            <div className="settings-row">
              <div><strong>Saved data</strong><p>Your Watchlist and Portfolio are stored in this browser.</p></div>
              <span className="settings-status">Local storage</span>
            </div>
            <div className="settings-row">
              <div><strong>Currency</strong><p>Prices and portfolio estimates are displayed in US dollars.</p></div>
              <span className="settings-status">USD</span>
            </div>
          </section>
        ) : (
          <>
            <section className="stats-grid">
              <article className="stat-card">
                <div className="stat-top">
                  <span>Total tracked market cap</span>
                  <div className="stat-icon purple"><ChartNoAxesCombined size={19} /></div>
                </div>
                <h2>{marketCap ? `$${(marketCap / 1e12).toFixed(2)}T` : "—"}</h2>
                <p className="stat-note">Based on loaded assets</p>
              </article>
              <article className="stat-card">
                <div className="stat-top">
                  <span>Assets tracked</span>
                  <div className="stat-icon blue"><Bitcoin size={19} /></div>
                </div>
                <h2>{displayedCoins.length}</h2>
                <p className="stat-note">Cryptocurrencies in your view</p>
              </article>
              <article className="stat-card">
                <div className="stat-top">
                  <span>Positive movers</span>
                  <div className="stat-icon green"><ArrowUpRight size={19} /></div>
                </div>
                <h2>{marketUp}</h2>
                <p className="stat-note">Assets up over 24 hours</p>
              </article>
              <article className="stat-card">
                <div className="stat-top">
                  <span>Watchlist</span>
                  <div className="stat-icon orange"><Star size={19} /></div>
                </div>
                <h2>{watchlist.length}</h2>
                <p className="stat-note">Your favorite assets</p>
              </article>
            </section>

            <CryptoChart coinId={selectedCoin} />

            <section className="market-panel">
              <div className="panel-heading market-panel-heading">
                <div>
                  <h2>Cryptocurrency markets</h2>
                  <p>Prices and daily performance</p>
                </div>
                <div className="market-controls">
                  <div className="search-box">
                    <Search size={17} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search name or symbol..."
                      aria-label="Search cryptocurrency by name or symbol"
                    />
                  </div>
                  <label className="select-control">
                    <ArrowDownUp size={16} />
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} aria-label="Sort markets">
                      <option value="marketCap">Market cap</option>
                      <option value="price">Price: high to low</option>
                      <option value="change">24h change</option>
                    </select>
                  </label>
                  <label className="select-control">
                    <SlidersHorizontal size={16} />
                    <select value={marketFilter} onChange={(event) => setMarketFilter(event.target.value as MarketFilter)} aria-label="Filter markets">
                      <option value="all">All coins</option>
                      <option value="gainers">Gainers</option>
                      <option value="losers">Losers</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Asset</th><th>Price (USD)</th><th>24h change</th><th>Market cap</th><th>Watchlist</th></tr>
                  </thead>
                  <tbody>
                    {visibleCoins.map((coin) => (
                      <tr
                        key={coin.id}
                        className={selectedCoin === coin.id ? "selected-coin-row" : ""}
                        onClick={() => setSelectedCoin(coin.id)}
                      >
                        <td>
                          <div className="coin-cell">
                            <div className={`coin-logo coin-${coin.symbol.toLowerCase()}`}>{coin.image}</div>
                            <div><strong>{coin.name}</strong><small>{coin.symbol}</small></div>
                          </div>
                        </td>
                        <td className="price-cell">{coin.price ? money(coin.price) : "—"}</td>
                        <td>
                          <span className={`change-pill ${coin.change >= 0 ? "positive" : "negative"}`}>
                            {coin.change >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                            {coin.change ? `${coin.change.toFixed(2)}%` : "0.00%"}
                          </span>
                        </td>
                        <td>{coin.marketCap ? `$${(coin.marketCap / 1e9).toFixed(2)}B` : "—"}</td>
                        <td>
                          <button
                            className={`watch-button ${watchlist.includes(coin.id) ? "watched" : ""}`}
                            title="Toggle watchlist"
                            aria-label={`${watchlist.includes(coin.id) ? "Remove" : "Add"} ${coin.name} ${watchlist.includes(coin.id) ? "from" : "to"} watchlist`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleWatchlist(coin.id);
                            }}
                          >
                            <Star size={17} fill={watchlist.includes(coin.id) ? "currentColor" : "none"} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {visibleCoins.length === 0 && (
                      <tr><td colSpan={5} className="empty-state">No coins match these settings. Try another search or choose All coins.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="panel-footer">
                <span>{visibleCoins.length} assets shown</span>
                <span>{lastUpdated ? `Last updated ${lastUpdated}` : "Loading market data..."}</span>
              </div>
            </section>
          </>
        )}

        <footer className="page-footer">
          <span>© 2026 CryptoPulse</span>
          <span>Market data provided by CoinGecko API</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
