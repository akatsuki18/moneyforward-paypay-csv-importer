import { parse } from 'csv-parse';
import * as fs from 'fs';
import { PayPayTransaction } from '../types/paypay';

export class PayPayCSVParser {
  static async parseCSV(filePath: string): Promise<PayPayTransaction[]> {
    const transactions: PayPayTransaction[] = [];

    return new Promise((resolve, reject) => {
      // ファイルの内容をバッファとして読み込む
      const fileContent = fs.readFileSync(filePath, 'utf8');
      console.log('CSVファイルの最初の100文字:', fileContent.substring(0, 100));

      // CSVヘッダーを確認
      const firstLine = fileContent.split('\n')[0];
      console.log('CSVヘッダー行:', firstLine);

      let isFirstRow = true;
      fs.createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true
        }))
        .on('data', (row) => {
          // キーと値のペアを全て出力してデバッグ
          if (isFirstRow) {
            console.log('最初の行のデータ (全てのキー):', Object.keys(row));
            Object.entries(row).forEach(([key, value]) => {
              console.log(`キー: "${key}", 値: "${value}"`);
            });
            isFirstRow = false;
          }

          // 金額の文字列から数値への変換（カンマ除去）
          console.log('CSV行データ:', row);

          // 「支払い」または「送った金額」の取引のみを処理
          if (row['取引内容'] !== '支払い' && row['取引内容'] !== '送った金額') {
            console.log('支払い取引ではないためスキップします:', row['取引内容']);
            return;
          }

          const amount = row['出金金額（円）'] && row['出金金額（円）'] !== '-' ?
            parseInt(row['出金金額（円）'].replace(/,/g, '')) : 0;

          // 金額が0の場合はスキップ
          if (amount === 0) {
            console.log('金額が0のためスキップします');
            return;
          }

          const deposit = row['入金金額（円）'] && row['入金金額（円）'] !== '-' ?
            parseInt(row['入金金額（円）'].replace(/,/g, '')) : 0;

          // 日付の処理 (YYYY/MM/DD HH:mm:ss 形式)
          const dateStr = row['取引日'];
          console.log('取引日の値:', dateStr);

          if (!dateStr || typeof dateStr !== 'string') {
            console.error('日付が見つからないか、文字列ではありません:', dateStr);

            // キーが異なる可能性があるので、日付っぽいキーを探す
            const dateKeys = Object.keys(row).filter(key =>
              key.includes('日') || key.includes('date') || key.includes('Date')
            );
            console.log('日付を含む可能性のあるキー:', dateKeys);

            if (dateKeys.length > 0) {
              for (const key of dateKeys) {
                console.log(`キー "${key}" の値:`, row[key]);
                if (row[key] && typeof row[key] === 'string' &&
                    /\d{4}\/\d{2}\/\d{2}/.test(row[key])) {
                  console.log('日付形式の値が見つかりました:', row[key]);
                  // この値を使用
                  const match = row[key].match(/^(\d{4}\/\d{2}\/\d{2})/);
                  if (match) {
                    const formattedDate = match[1];
                    console.log('フォーマット済み日付:', formattedDate);

                    const transaction: PayPayTransaction = {
                      date: formattedDate,
                      amount: amount,
                      deposit: deposit,
                      description: row['取引内容'] || '',
                      merchant: row['取引先'] || '',
                      paymentMethod: row['取引方法'] || '',
                      transactionId: row['取引番号'] || ''
                    };

                    console.log('作成されたトランザクション:', transaction);
                    transactions.push(transaction);
                    return;
                  }
                }
              }
            }

            return;
          }

          // 日付フォーマットを変換 (YYYY/MM/DD HH:mm:ss -> YYYY/MM/DD)
          const dateMatch = dateStr.match(/^(\d{4}\/\d{2}\/\d{2})/);
          if (!dateMatch) {
            console.error('日付形式の変換に失敗しました:', dateStr);
            return;
          }

          const formattedDate = dateMatch[1];
          console.log('フォーマット済み日付:', formattedDate);

          const transaction: PayPayTransaction = {
            date: formattedDate,
            amount: amount,
            deposit: deposit,
            description: row['取引内容'],
            merchant: row['取引先'],
            paymentMethod: row['取引方法'],
            transactionId: row['取引番号']
          };

          console.log('作成されたトランザクション:', transaction);

          transactions.push(transaction);
        })
        .on('end', () => {
          console.log(`${transactions.length}件の取引データを読み込みました`);
          resolve(transactions);
        })
        .on('error', (error) => reject(error));
    });
  }
}