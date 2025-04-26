export interface PayPayTransaction {
  date: string; // YYYY/MM/DD形式の文字列
  amount: number;
  deposit: number;
  description: string;
  merchant: string;
  paymentMethod: string;
  transactionId: string;
  category?: {
    main: string;
    sub?: string;
  };
}

// 取引先とカテゴリーのマッピングはconfigに移動しました
// categories.tsがない場合はcategories.sample.tsを使用
let merchantCategoryMap: Record<string, { main: string; sub?: string }>;

try {
  // 実際の設定ファイルを最初に試す
  merchantCategoryMap = require('../config/categories').merchantCategoryMap;
} catch (e) {
  // 存在しない場合はサンプルを使用
  console.warn('categories.tsが見つかりません。サンプル設定を使用します。');
  merchantCategoryMap = require('../config/categories.sample').merchantCategoryMap;
}

export { merchantCategoryMap };