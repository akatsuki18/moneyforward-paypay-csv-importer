import { chromium } from 'playwright';
import { PayPayCSVParser } from './services/csv-parser';
import { MoneyForwardService } from './services/moneyforward-service';
import 'dotenv/config';

async function main() {
  const csvFilePath = process.env.CSV_FILE_PATH;
  const email = process.env.MONEYFORWARD_EMAIL;
  const password = process.env.MONEYFORWARD_PASSWORD;

  if (!csvFilePath || !email || !password) {
    throw new Error('環境変数が設定されていません。.envファイルを確認してください。');
  }

  // CSVファイルの読み込み
  const transactions = await PayPayCSVParser.parseCSV(csvFilePath);

  // ブラウザの起動
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const moneyforward = new MoneyForwardService(page);

  try {
    // ログイン
    await moneyforward.login(email, password);
    console.log('ログイン完了');

    // 取引データの入力
    for (const transaction of transactions) {
      console.log('取引データの入力');
      await moneyforward.inputTransaction(transaction);
      // レート制限のための待機
      await page.waitForTimeout(2000);
    }
    console.log('取引データの入力完了');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    await browser.close();
    console.log('処理が完了しました');
  }
}

main();