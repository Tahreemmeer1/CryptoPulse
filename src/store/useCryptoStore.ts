
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type PortfolioAsset = {
  coinId: string;
  quantity: number;
  purchasePrice?: number;
};

type CryptoStore = {
  watchlist: string[];
  portfolio: PortfolioAsset[];
  toggleWatchlist: (coinId: string) => void;
  updatePortfolio: (
    coinId: string,
    quantity: number,
    purchasePrice: number,
  ) => void;
  removePortfolioAsset: (coinId: string) => void;
};

export const useCryptoStore = create<CryptoStore>()(
  persist(
    (set) => ({
      watchlist: ["bitcoin", "ethereum", "solana"],
      portfolio: [],

      toggleWatchlist: (coinId) =>
        set((state) => ({
          watchlist: state.watchlist.includes(coinId)
            ? state.watchlist.filter((id) => id !== coinId)
            : [...state.watchlist, coinId],
        })),

      updatePortfolio: (coinId, quantity, purchasePrice) =>
        set((state) => ({
          portfolio:
            quantity <= 0
              ? state.portfolio.filter((asset) => asset.coinId !== coinId)
              : state.portfolio.some((asset) => asset.coinId === coinId)
                ? state.portfolio.map((asset) =>
                    asset.coinId === coinId
                      ? { ...asset, quantity, purchasePrice }
                      : asset,
                  )
                : [...state.portfolio, { coinId, quantity, purchasePrice }],
        })),

      removePortfolioAsset: (coinId) =>
        set((state) => ({
          portfolio: state.portfolio.filter(
            (asset) => asset.coinId !== coinId,
          ),
        })),
    }),
    {
      name: "cryptopulse-watchlist",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
