import { mainScanner } from "./scanner";

(async () => {
  await mainScanner();
  console.log("🏁 Сканирование завершено");
})().catch((err) => {
  console.error("💥 Критическая ошибка:", err);
  });
