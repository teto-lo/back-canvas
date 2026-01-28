# AC-Illust Auto-Upload System (Deployment Guide)

このプロジェクトを別環境（本番サーバーや別のPC）でセットアップし、実行するための手順書です。

## 📋 必要要件 (Prerequisites)

- **Node.js**: v18以上 (推奨: v20 LTS)
- **PHP**: v8.1以上 (Laravel実行用)
- **Composer**: PHP依存関係管理
- **Google Chrome** または **Chromium**: Puppeteer操作用（自動インストールされますが、GUI環境推奨）

---

## 🚀 セットアップ手順 (Setup Steps)

### 1. プロジェクトの配置
`back-canvas` ディレクトリごと、新しい環境にコピーまたはCloneしてください。
※ `automation` フォルダだけでなく、親の `back-canvas`（Laravelアプリ）も必要です。

### 2. Laravelサーバーの準備
画像生成ジェネレーター（Canvas）を動かすために、Laravel組み込みサーバーを起動します。

```bash
# back-canvas ルートディレクトリで実行
php artisan serve
```
※ ポート8000で起動します。変更する場合は `automation/config.json` の `baseUrl` も書き換えてください。

### 3. Automationツールのセットアップ

別のターミナルを開き、`automation` ディレクトリで依存関係をインストールします。

```bash
cd automation
npm install
```

### 4. 環境変数の設定

`automation` ディレクトリ内の `.env` ファイルを作成します。

```bash
cp .env.example .env
```

`.env` を編集し、APIキーを設定します：
```env
GEMINI_API_KEY=your_gemini_api_key_here  # 必須: Google AI Studioで取得
LARAVEL_URL=http://localhost:8000        # そのままでOK
# AC_EMAIL / AC_PASSWORD はCookieログイン失敗時の予備ですが、基本は使いません
```

### 5. データベースの初期化

初回のみ、データベースファイルを生成します。

```bash
node scripts/init-db.js
```

---

## 🍪 ログインセッションの移植 (重要)

AC-IllustのBot検知を回避するため、**既存のブラウザからCookieをインポート**することを強く推奨します。

### 方法 A: `cookies.json` をコピーする
開発環境ですでに稼働している場合、`automation/cookies.json` ファイルをそのまま新環境の同じ場所にコピーしてください。これだけでログイン状態を引き継げます。

### 方法 B: 新しくログインする
1. `npm start` を実行します。
2. ログイン画面でスクリプトが一時停止し、「手動でログインしてください」と表示される場合があります。
3. その場合、立ち上がったブラウザで手動ログインを行ってください。
   - ※ ヘッドレスモード（画面なし）で実行している場合は、ログインできません。
   - サーバー上で実行する場合は、ローカルで作成した `cookies.json` をアップロードするのが確実です。

---

## ▶️ 実行方法 (Usage)

準備が整ったら実行します。

```bash
cd automation
npm start
```

### 動作の流れ
1. Cookieを使ってAC-Illustにログイン確認
2. ランダムなジェネレーターを選択して画像を作成
3. 重複チェック
4. AIによるメタデータ生成
5. アップロード（約20分間隔、1回の操作に約3分かけます）

---

## ⚙️ 設定のカスタマイズ

`automation/config.json` で挙動を変更できます。

```json
{
  "batch": {
    "minImages": 1,          // 1回の実行で投稿する最小枚数
    "maxImages": 5,          // 最大枚数
    "delayBetweenUploads": { // 投稿間隔 (ミリ秒)
      "min": 1080000,        // 18分
      "max": 1500000         // 25分
    }
  },
  "upload": {
    "dryRun": false          // trueにすると投稿せずテストのみ行う
  }
}
```

## ⚠️ トラブルシューティング

**Q. Chromiumが起動しない (Linuxサーバーなど)**
A. 必要なライブラリが不足している可能性があります。
```bash
sudo apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils
```

**Q. AI生成に失敗する**
A. Gemini APIキーが正しいか、有効期限が切れていないか確認してください。また、`config.json` のモデル名を変更する必要があるかもしれません（`gemini-pro` 推奨）。

**Q. 投稿ボタンが押されない**
A. サイトのデザイン変更の可能性がありますが、最新版のスクリプトではJSによる強制クリックを実装済みです。
