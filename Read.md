## 初期インストール
1) .env.sample をコピーして .env を作成。必要に応じて設定を変更 

```env
SERVER_HOST=localhost
SERVER_PORT=3001
CLIENT_HOST=http://localhost:3000
```

2) ターミナルコマンドでモジュールインストール

```bash
npm i
```

## チャットサーバ起動
1) ターミナルコマンドでチャットサーバ起動

```bash
npm run dev
```

2) next-chat プロジェクトでクライアントを起動して動作確認