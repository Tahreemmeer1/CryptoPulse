
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineSeries,
  type IChartApi,
  type LineData,
  type Time,
} from "lightweight-charts";

type CryptoChartProps = {
  coinId: string;
};

type ChartPoint = LineData<Time>;

const chartColors: Record<string, string> = {
  bitcoin: "#f7931a",
  ethereum: "#8b8cff",
  solana: "#a78bfa",
  ripple: "#60a5fa",
  dogecoin: "#facc15",
};

export default function CryptoChart({ coinId }: CryptoChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError("");
      setPoints([]);

      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`,
        );

        if (!response.ok) {
          throw new Error("Price history is temporarily unavailable.");
        }

        const data = await response.json();

        const history: ChartPoint[] = data.prices.map(
          ([timestamp, price]: [number, number]) => ({
            time: Math.floor(timestamp / 1000) as Time,
            value: price,
          }),
        );

        if (!cancelled) {
          setPoints(history);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Chart data could not load. Please try again later.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [coinId]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || points.length === 0) return;

    const chart: IChartApi = createChart(container, {
      width: container.clientWidth,
      height: 280,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#111522",
        },
        textColor: "#9ca7bd",
        fontFamily: "DM Sans, sans-serif",
      },
      grid: {
        vertLines: { color: "#202638" },
        horzLines: { color: "#202638" },
      },
      rightPriceScale: {
        borderColor: "#2a3042",
      },
      timeScale: {
        borderColor: "#2a3042",
        timeVisible: true,
      },
      crosshair: {
        vertLine: {
          color: "#6577ff",
          labelBackgroundColor: "#6577ff",
        },
        horzLine: {
          color: "#6577ff",
          labelBackgroundColor: "#6577ff",
        },
      },
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: chartColors[coinId] ?? "#6577ff",
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    });

    const uniquePoints = Array.from(
      new Map(points.map((point) => [point.time, point])).values(),
    ).sort((a, b) => Number(a.time) - Number(b.time));

    lineSeries.setData(uniquePoints);
    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [points, coinId]);

  return (
    <section className="chart-panel">
      <div className="chart-heading">
        <div>
          <h2>7-day price history</h2>
          <p>Historical price movement in USD</p>
        </div>
        <span className="chart-period">7D</span>
      </div>

      {loading && (
        <p className="chart-message">Loading price history...</p>
      )}

      {error && (
        <p className="chart-message chart-error">{error}</p>
      )}

      <div
        ref={containerRef}
        className="chart-canvas"
        style={{
          display:
            !loading && !error && points.length > 0
              ? "block"
              : "none",
        }}
      />

      {!loading && !error && points.length === 0 && (
        <p className="chart-message">No chart data available.</p>
      )}
    </section>
  );
}
