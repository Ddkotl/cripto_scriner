import { RestClientV5 } from "bybit-api";
import { detectTriangle } from "./triangle";
import type { Candle } from "./types";
import fs from "fs";
import path from "path";

const client = new RestClientV5({
  testnet: false,
});

const CONCURRENCY_LIMIT = 10;
const INTERVAL = "15";

// файл результата
const OUTPUT_FILE = path.resolve(process.cwd(), "triangles_found.txt");

// безопасный append
function writeToFile(data: string) {
  fs.appendFileSync(OUTPUT_FILE, data + "\n", {
    encoding: "utf8",
  });
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

async function scanSymbol(symbol: string) {
  try {
    const res = await client.getKline({
      category: "spot",
      symbol,
      interval: INTERVAL as any,
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

    const line = [
      `SYMBOL=${symbol}`,
      `PRICE=${last?.close}`,
      `RESISTANCE=${resistance.toFixed(6)}`,
      `SUPPORT=${support.toFixed(6)}`,
      `APEX_IN=${barsToApex}`,
      `TIME=${new Date().toISOString()}`,
    ].join(" | ");

    // консоль
    console.log("\n📐 TRIANGLE FOUND:", symbol);
    console.log(line);

    // файл
    writeToFile(line);
  } catch {
    // игнор ошибок Bybit
  }
}

export async function mainScanner() {
  console.log("🚀 Scanner started...");

  // создаём/очищаем файл перед запуском
  fs.writeFileSync(OUTPUT_FILE, "=== TRIANGLE SCANNER LOG ===\n");

  const pairs = await getSpotPairs();
  console.log(`📊 USDT pairs: ${pairs.length}`);

  let index = 0;

  async function worker() {
    while (index < pairs.length) {
      const i = index++;
      if (pairs[i]) {
        await scanSymbol(pairs[i]);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY_LIMIT }, () => worker());

  await Promise.all(workers);

  console.log(`\n💾 Results saved to: ${OUTPUT_FILE}`);
}
