import { chromium } from 'playwright';
import { PayPayCSVParser } from './services/csv-parser';
import { MoneyForwardService } from './services/moneyforward-service';
import 'dotenv/config';
import * as readline from 'readline';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  // CSVファイルのパスをCUIで入力
  const csvFilePath = await prompt('CSVファイルのパスを入力してください: ');
  const email = process.env.MONEYFORWARD_EMAIL;
  const password = process.env.MONEYFORWARD_PASSWORD;

  if (!csvFilePath || !email || !password) {
    throw new Error('CSVファイルのパスまたは環境変数が設定されていません。');
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