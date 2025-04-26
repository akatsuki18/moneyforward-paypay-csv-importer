// PayPayの取引先とカテゴリーのマッピングのサンプル
// 実際の使用時はこのファイルをcategories.tsにコピーして編集してください
export const merchantCategoryMap: Record<string, { main: string; sub?: string }> = {
  'お店の名前': { main: '食費', sub: '外食' },
  'スーパーの名前': { main: '食費', sub: '食料品' },
  'ドラッグストアの名前': { main: '日用品', sub: 'ドラッグストア' },
  '趣味関連のお店': { main: '趣味・娯楽' }
};