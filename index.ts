import * as fs from "fs";
import * as path from "path";
import { getRecentTradesCount, getSpotPairs, getSpreadPct } from "./get_clines";
import { analyzeMarket, type MarketRegime } from "./analyze";

interface ScreenResult {
  symbol: string;
  data: MarketRegime;
}

// Настройки пула запросов (количество одновременных вызовов к API)
const CONCURRENCY_LIMIT = 20;

async function main() {
  console.log("🚀 Запуск криптоскринера MEXC...");

  const allPairs = await getSpotPairs();
  console.log(`🔍 Найдено активных пар к USDT: ${allPairs.length}`);

  const matchedResults: ScreenResult[] = [];
  let processedCount = 0;

  // Функция для обработки пула задач
  async function worker(pairsQueue: string[]) {
    while (pairsQueue.length > 0) {
      const symbol = pairsQueue.shift();
      if (!symbol) continue;

      processedCount++;
      if (processedCount % 50 === 0) {
        console.log(
          `⌛ Обработано пар: ${processedCount}/${allPairs.length}...`,
        );
      }

      const analysis = await analyzeMarket(symbol, 15);

      // Оставляем только те монеты, которые во флэте
      if (!analysis || !analysis.isSideways) {
        continue;
      }

      const [spreadPct, tradesLastMinute] = await Promise.all([
        getSpreadPct(symbol),
        getRecentTradesCount(symbol),
      ]);

      if (spreadPct !== null && spreadPct > 0.1 && tradesLastMinute >= 10) {
        analysis.spreadPct = spreadPct;
        analysis.tradesLastMinute = tradesLastMinute;

        matchedResults.push({
          symbol,
          data: analysis,
        });
      }
    }
  }

  // Запуск параллельных воркеров
  const queue = [...allPairs];
  const workers = Array(CONCURRENCY_LIMIT)
    .fill(null)
    .map(() => worker(queue));
  await Promise.all(workers);

  console.log(
    `✅ Сканирование завершено. Найдено монет во флэте: ${matchedResults.length}`,
  );

  saveTextReport(matchedResults);
}

function saveTextReport(results: ScreenResult[]) {
  const filePath = path.resolve(process.cwd(), "report.txt");

  // Сортируем от самого явного флета (минимальный фактор тренда)
  results.sort((a, b) => a.data.trendFactor - b.data.trendFactor);

  // Формируем шапку текстовой таблицы с фиксированной шириной колонок
  let output = "";
  output += `MEXC SIDEWAYS SCREENER REPORT\n`;
  output += `Дата генерации: ${new Date().toLocaleString()}\n`;
  output += `Найдено монет: ${results.length}\n`;
  output += `=======================================================================================================================\n`;
  output += `${"Тикер".padEnd(12)} | ${"Цена".padEnd(12)} | ${"Диап.15м%".padEnd(10)} | ${"Отклон.%".padEnd(10)} | ${"Ф.Тренда".padEnd(10)} | ${"Спред%".padEnd(10)} | ${"Сделок1м".padEnd(10)}\n`;
  output += `-----------------------------------------------------------------------------------------------------------------------\n`;

  // Наполняем строки данными
  for (const r of results) {
    const s = r.symbol.padEnd(12);
    const price = r.data.currentPrice.toFixed(6).padEnd(12);
    const rPct = r.data.rangePct.toFixed(3).padEnd(10);
    const dPct = r.data.driftPct.toFixed(3).padEnd(10);
    const tFact = r.data.trendFactor.toFixed(3).padEnd(10);
    const spread = r.data.spreadPct.toFixed(3).padEnd(10);
    const trades = String(r.data.tradesLastMinute).padEnd(10);

    output += `${s} | ${price} | ${rPct} | ${dPct} | ${tFact} | ${spread} | ${trades}\n`;
  }

  output += `=======================================================================================================================\n`;

  // Запись собранной строки напрямую в файл report.txt
  fs.writeFileSync(filePath, output, "utf8");
  console.log(`📂 Текстовый вывод сохранен в файл: ${filePath}`);
}

main().catch(console.error);
