import { Page } from 'playwright';
import { PayPayTransaction, merchantCategoryMap } from '../types/paypay';

export class MoneyForwardService {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async login(email: string, password: string) {
    try {
      // ログインページに遷移
      await this.page.goto('https://id.moneyforward.com/sign_in', {
        waitUntil: 'domcontentloaded'
      });

      // メールアドレス入力画面
      await this.page.waitForSelector('input[type="email"], input[placeholder*="example@moneyforward.com"]', { timeout: 10000 });
      await this.page.fill('input[type="email"], input[placeholder*="example@moneyforward.com"]', email);

      // 次へボタンをクリック
      await this.page.waitForSelector('text=ログインする', { timeout: 10000 });
      await this.page.click('text=ログインする');

      // パスワード入力画面への遷移を待機
      await this.page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await this.page.fill('input[type="password"]', password);

      // ログインボタンクリック
      await this.page.waitForSelector('text=ログインする', { timeout: 10000 });
      await this.page.click('text=ログインする');

      // メール認証コードの入力を待機
      console.log('メール認証コードの入力を待っています...');
      console.log('メールに送信されたコードを入力してください。');

      // email_otpページでの入力を待機
      await this.page.waitForURL('https://id.moneyforward.com/email_otp');

      // 認証コードが入力され、次のページに遷移するまで待機
      await this.page.waitForURL(url =>
        url.hostname.includes('moneyforward.com') && !url.pathname.includes('/email_otp'),
        { timeout: 300000 } // 5分間待機
      );

      console.log('認証完了を確認しました。処理を継続します。');

      // sign_inページにリダイレクト
      console.log('サインインページに移動します...');
      await this.page.goto('https://moneyforward.com/sign_in', {
        waitUntil: 'networkidle'
      });

      // 「現在のアカウント」ボタンをクリック
      console.log('現在のアカウントを選択します...');
      await this.page.waitForSelector('text=現在のアカウント', { timeout: 10000 });
      await this.page.click('text=現在のアカウント');

      // ページ遷移を待機
      await this.page.waitForSelector('text=収入・振替を入力', { timeout: 60000 });

      // 現在のURLを確認
      const currentUrl = this.page.url();
      console.log('現在のURL:', currentUrl);

      // 「収入・振替を入力」ボタンをクリック
      console.log('「収入・振替を入力」ボタンを探しています...');
      await this.page.click('text=収入・振替を入力');

      // 入力ページへの遷移を待機（URLの変化で確認）
      console.log('入力ページへの遷移を待機中...');
      await this.page.waitForURL('**/cf*', { timeout: 60000 });

      // ページが完全に読み込まれるまで待機
      await this.page.waitForTimeout(3000);

      // 現在のURLを確認（デバッグ用）
      console.log('手入力ページへ遷移後のURL:', this.page.url());
    } catch (error) {
      console.error('ログイン処理でエラーが発生しました:', error);
      throw error;
    }
  }

  async navigateToManualInput() {
    try {
      console.log('手入力ページの確認中...');

      // 現在のURLを確認
      const currentUrl = this.page.url();
      console.log('現在のURL:', currentUrl);

      // URLがcf#で終わっていることを確認
      if (!currentUrl.endsWith('cf#')) {
        throw new Error('手入力ページに正しく遷移していません: ' + currentUrl);
      }

      // 短い待機を追加して、ページが完全に読み込まれるのを待つ
      await this.page.waitForTimeout(2000);

      // モーダルが既に表示されているか確認
      const modalVisible = await this.page.evaluate(() => {
        const modal = document.querySelector('#user_asset_act_new');
        return modal && window.getComputedStyle(modal).display !== 'none';
      });

      // モーダルが表示されていない場合は、追加ボタンをクリック
      if (!modalVisible) {
        console.log('モーダルが表示されていません。追加ボタンをクリックします...');

        // 追加ボタンを探して、見つかったらクリック
        const addButtonVisible = await this.page.evaluate(() => {
          const addButton = document.querySelector('a.btn-warning') ||
                          document.querySelector('a:contains("追加")');
          return !!addButton;
        });

        if (addButtonVisible) {
          // JavaScriptの評価を使用してクリック（より信頼性が高い）
          await this.page.evaluate(() => {
            const addButton = document.querySelector('a.btn-warning') ||
                            document.querySelector('a:contains("追加")');
            if (addButton) (addButton as HTMLElement).click();
          });
          console.log('追加ボタンをクリックしました');
        } else {
          console.log('追加ボタンが見つかりません。直接モーダル表示を試みます...');

          // JavaScriptを使用してモーダルを直接表示
          await this.page.evaluate(() => {
            // MoneyForwardの既存の関数を呼び出す試み
            if (typeof (window as any).userAssetActNew === 'function') {
              (window as any).userAssetActNew();
            } else {
              // 手動でモーダルを表示
              const modal = document.querySelector('#user_asset_act_new');
              if (modal) {
                (modal as HTMLElement).style.display = 'block';
                modal.classList.add('in');
                modal.classList.remove('hide');
              }
            }
          });
        }
      } else {
        console.log('モーダルはすでに表示されています');
      }

      // モーダルが表示されるまで待機
      await this.page.waitForTimeout(2000);

      // モーダルが表示されたか再確認
      const modalVisibleAfterClick = await this.page.evaluate(() => {
        const modal = document.querySelector('#user_asset_act_new');
        return modal && window.getComputedStyle(modal).display !== 'none';
      });

      if (!modalVisibleAfterClick) {
        console.log('モーダルの表示に失敗しました。ページのスクリーンショットを取得します...');

        // ページのHTMLを取得
        const html = await this.page.content();
        console.log('現在のページHTML:', html.substring(0, 1000) + '...');

        throw new Error('モーダルの表示に失敗しました');
      }

      console.log('モーダルの表示を確認しました');
      return true;

    } catch (error) {
      console.error('モーダル表示処理でエラーが発生しました:', error);
      // エラーを再度スローする前に、現在のページのHTMLを取得
      try {
        const html = await this.page.content();
        console.log('エラー時のHTML:', html.substring(0, 1000) + '...');
      } catch (e) {
        console.error('HTMLの取得に失敗:', e);
      }
      throw error;
    }
  }

  private async selectCategory(main: string, sub?: string) {
    try {
      // メインカテゴリーの選択
      await this.page.waitForSelector('.category-select', { timeout: 10000 });
      await this.page.click('.category-select');
      await this.page.waitForSelector(`text="${main}"`, { timeout: 10000 });
      await this.page.click(`text="${main}"`);

      if (sub) {
        // サブカテゴリーの選択（メインカテゴリーを選択後に表示される）
        await this.page.waitForSelector(`text="${sub}"`, { timeout: 10000 });
        await this.page.click(`text="${sub}"`);
      }
    } catch (error) {
      console.error('カテゴリー選択でエラーが発生しました:', error);
      throw error;
    }
  }

  async inputTransaction(transaction: PayPayTransaction) {
    try {
      // モーダルを表示
      await this.navigateToManualInput();
      console.log('取引入力を開始します...');

      // 安全性のため待機
      await this.page.waitForTimeout(1000);

      try {
        // 支出タブを選択（直接JavaScriptで）
        await this.page.evaluate(() => {
          const minusTab = document.querySelector('.tab-menu input.minus-payment');
          if (minusTab) {
            (minusTab as HTMLElement).click();
          }
        });
        console.log('支出タブを選択しました');

        // 安全性のため待機
        await this.page.waitForTimeout(500);

        // 日付の入力
        console.log('日付入力を開始します...');

        // 日付入力フィールドが存在するか確認
        const dateFieldExists = await this.page.evaluate(() => {
          return !!document.querySelector('#updated-at');
        });

        if (!dateFieldExists) {
          throw new Error('日付入力フィールドが見つかりません');
        }

        // YYYY/MM/DD HH:mm:ss 形式から日付部分のみを抽出
        let dateStr = '';
        if (transaction.date && typeof transaction.date === 'string') {
          const dateMatch = transaction.date.match(/^\d{4}\/\d{2}\/\d{2}/);
          if (dateMatch) {
            dateStr = dateMatch[0];
            console.log('使用する日付文字列:', dateStr);
          } else {
            console.error('日付の抽出に失敗しました:', transaction.date);
            dateStr = '2025/03/01'; // デフォルト日付
          }
        } else {
          console.error('不正な日付形式です:', transaction.date);
          dateStr = '2025/03/01'; // デフォルト日付
        }

        // 日付を直接設定（JavaScriptで）
        await this.page.evaluate((date) => {
          const dateField = document.querySelector('#updated-at') as HTMLInputElement;
          if (dateField) {
            dateField.value = date;

            // イベントをトリガーして変更を登録
            const event = new Event('change', { bubbles: true });
            dateField.dispatchEvent(event);
          }
        }, dateStr);
        console.log('日付入力完了');

        // 安全性のため待機
        await this.page.waitForTimeout(500);

        // 金額の入力（JavaScriptで）
        console.log('金額を入力します...');
        await this.page.evaluate((amount) => {
          const amountField = document.querySelector('#appendedPrependedInput') as HTMLInputElement;
          if (amountField) {
            amountField.value = amount;

            // イベントをトリガーして変更を登録
            const event = new Event('change', { bubbles: true });
            amountField.dispatchEvent(event);
          }
        }, transaction.amount.toString());
        console.log('金額入力完了');

        // 安全性のため待機
        await this.page.waitForTimeout(500);

        // PayPayアカウントの選択
        console.log('PayPayアカウントを選択します...');
        await this.page.evaluate(() => {
          const accountSelect = document.querySelector('#user_asset_act_sub_account_id_hash') as HTMLSelectElement;
          if (accountSelect) {
            // 'PayPay'という文字を含むオプションを探す
            for (let i = 0; i < accountSelect.options.length; i++) {
              const option = accountSelect.options[i];
              if (option.textContent && option.textContent.includes('PayPay')) {
                accountSelect.selectedIndex = i;

                // イベントをトリガーして変更を登録
                const event = new Event('change', { bubbles: true });
                accountSelect.dispatchEvent(event);
                break;
              }
            }
          }
        });
        console.log('PayPayアカウント選択完了');

        // 安全性のため待機
        await this.page.waitForTimeout(500);

        // 大カテゴリーの選択
        console.log('大カテゴリーを選択します...');
        const category = merchantCategoryMap[transaction.merchant] || { main: '未分類' };
        console.log('使用するカテゴリー:', category);

        // カテゴリー選択ボタンをクリック
        await this.page.evaluate(() => {
          const categoryBtn = document.querySelector('#js-large-category-selected');
          if (categoryBtn) {
            (categoryBtn as HTMLElement).click();
          }
        });

        // 安全性のため待機
        await this.page.waitForTimeout(500);

        // カテゴリーを選択
        await this.page.evaluate((categoryName) => {
          // ドロップダウンメニューが表示された後、カテゴリーを選択
          const categoryItems = document.querySelectorAll('.dropdown-menu li a');
          for (let i = 0; i < categoryItems.length; i++) {
            const item = categoryItems[i] as HTMLElement;
            if (item.textContent && item.textContent.includes(categoryName)) {
              item.click();
              break;
            }
          }
        }, category.main);
        console.log('大カテゴリー選択完了');

        // 安全性のため待機
        await this.page.waitForTimeout(500);

        // 内容（取引先）の入力
        console.log('取引先を入力します:', transaction.merchant);
        await this.page.evaluate((merchant) => {
          const contentField = document.querySelector('#js-content-field') as HTMLInputElement;
          if (contentField) {
            contentField.value = merchant;

            // イベントをトリガーして変更を登録
            const event = new Event('change', { bubbles: true });
            contentField.dispatchEvent(event);
          }
        }, transaction.merchant);
        console.log('取引先入力完了');

        // 安全性のため待機
        await this.page.waitForTimeout(500);

        // 保存ボタンのクリック
        console.log('保存ボタンをクリックします...');
        await this.page.evaluate(() => {
          const submitButton = document.querySelector('input[type="submit"].btn.btn-success');
          if (submitButton) {
            (submitButton as HTMLElement).click();
          }
        });
        console.log('保存ボタンクリック完了');

        // 保存完了の確認を待機
        console.log('保存完了を待機中...');
        await this.page.waitForTimeout(3000);

        // 保存完了の確認（エラーが発生しても続行）
        try {
          const confirmationVisible = await this.page.evaluate(() => {
            return !!document.querySelector('.confirmation:not([style*="display: none"])');
          });

          if (confirmationVisible) {
            console.log('保存完了を確認しました');

            // 続けて入力するボタンをクリック（あれば）
            await this.page.evaluate(() => {
              const continueButton = document.querySelector('#confirmation-button');
              if (continueButton) {
                (continueButton as HTMLElement).click();
              }
            });
            console.log('続けて入力するボタンをクリックしました');
          } else {
            console.log('確認画面が表示されませんでしたが、処理を続行します');
          }
        } catch (error) {
          console.error('保存完了確認でエラーが発生しましたが、処理を続行します:', error);
        }

      } catch (innerError) {
        console.error('取引データの入力中にエラーが発生しました:', innerError);
        // インナーエラーをスローせず、続行を試みる
      }

      console.log('取引入力処理が完了しました');
      return true;

    } catch (error) {
      console.error('取引入力処理のトップレベルでエラーが発生しました:', error);
      return false;
    }
  }
}