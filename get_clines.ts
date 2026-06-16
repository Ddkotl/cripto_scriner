import axios from "axios";

// Получение свечей (Klines). MEXC возвращает массив массивов.
// Индексы: 0: openTime, 1: open, 2: high, 3: low, 4: close, 5: volume
export async function getKlines(
  symbol: string,
  interval: string,
  limit: number,
): Promise<any[][] | null> {
  try {
    const response = await axios.get("https://api.mexc.com/api/v3/klines", {
      params: { symbol, interval, limit },
    });
    return response.data;
  } catch (error) {
    // Тихо игнорируем ошибки отдельных пар (например, делистинг или спам-фильтр)
    return null;
  }
}

// Получение всех активных торговых пар к USDT на споте
export async function getSpotPairs(): Promise<string[]> {
  try {
    const response = await axios.get(
      "https://api.mexc.com/api/v3/exchangeInfo",
    );
    const symbols = response.data.symbols;
    console.log(`Всего торговых пар: ${symbols.length}`);
    return symbols
      .filter((s: any) => s.quoteAsset === "USDT")
      .map((s: any) => s.symbol);
  } catch (error) {
    console.error("Ошибка получения списка пар:", error);
    return [];
  }
}
export async function getRecentTradesCount(
  symbol: string,
): Promise<number> {
  try {
    const response = await axios.get(
      "https://api.mexc.com/api/v3/trades",
      {
        params: {
          symbol,
          limit: 1000,
        },
      },
    );

    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    return response.data.filter(
      (t: any) => t.time >= oneMinuteAgo,
    ).length;
  } catch {
    return 0;
  }
}
export async function getSpreadPct(
  symbol: string,
): Promise<number | null> {
  try {
    const response = await axios.get(
      "https://api.mexc.com/api/v3/ticker/bookTicker",
      {
        params: { symbol },
      },
    );

    const bid = Number(response.data.bidPrice);
    const ask = Number(response.data.askPrice);

    if (!bid || !ask) return null;

    return ((ask - bid) / bid) * 100;
  } catch {
    return null;
  }
}