import { RestClientV5 } from "bybit-api";
import { detectTriangle } from "./triangle";
import type { Candle } from "./types";
import fs from "fs";
import path from "path";

const client = new RestClientV5({
  testnet: false,
});

const CONCURRENCY_LIMIT = 10;

// таймфреймы
const TIMEFRAMES = [
  { label: "5m", interval: "5" },
  { label: "15m", interval: "15" },
  { label: "30m", interval: "30" },
  { label: "1h", interval: "60" },
] as const;

const OUTPUT_FILE = path.resolve(process.cwd(), "triangles_found.txt");

function writeToFile(obj: any) {
  fs.appendFileSync(OUTPUT_FILE, JSON.stringify(obj) + "\n", "utf8");
}

async function getSpotPairs(): Promise<string[]> {
  try {
    const res = await client.getInstrumentsInfo({
      category: "spot",
    });

    return res.result.list
      .filter((i: any) => i.quoteCoin === "USDT")
      .map((i: any) => i.symbol);
  } catch (e) {
    console.error("Ошибка получения пар:", e);
    return [];
  }
}

async function scanSymbol(symbol: string, interval: string, tfLabel: string) {
  try {
    const res = await client.getKline({
      category: "spot",
      symbol,
      interval: interval as any,
      limit: 120,
    });

    const raw = res.result.list;
    if (!raw || raw.length < 50) return;

    const candles: Candle[] = raw
      .map((c: any) => ({
        openTime: Number(c[0]),
        open: Number(c[1]),
        high: Number(c[2]),
        low: Number(c[3]),
        close: Number(c[4]),
      }))
      .reverse();

    const result = detectTriangle(candles);

    if (!result.isTriangle) return;

    const lastIndex = candles.length - 1;
    const last = candles[lastIndex];

    const resistance = result.upperSlope * lastIndex + result.upperIntercept;

    const support = result.lowerSlope * lastIndex + result.lowerIntercept;

    const barsToApex = result.apexIndex - lastIndex;

    const payload = {
      symbol,
      timeframe: tfLabel,
      price: last?.close,
      resistance,
      support,
      apexInBars: barsToApex,
      time: new Date().toISOString(),
    };

    // консоль (структурно)
    console.log(`📐 ${symbol} [${tfLabel}]`, payload);

    // файл (JSONL)
    writeToFile(payload);
  } catch {
    // игнор ошибок
  }
}

export async function mainScanner() {
  console.log("🚀 Multi-TF scanner started...");

  fs.writeFileSync(OUTPUT_FILE, "", "utf8");

  const pairs = await getSpotPairs();

  console.log(`📊 USDT pairs: ${pairs.length}`);

  let index = 0;

  async function worker() {
    while (index < pairs.length) {
      const i = index++;
      const symbol = pairs[i];

      if (!symbol) continue;

      // сканим ВСЕ таймфреймы
      for (const tf of TIMEFRAMES) {
        await scanSymbol(symbol, tf.interval, tf.label);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => worker());

  await Promise.all(workers);

  console.log(`\n💾 Results saved to: ${OUTPUT_FILE}`);
}
