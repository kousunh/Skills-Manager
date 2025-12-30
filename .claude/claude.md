# 開発ガイドライン

## 開発モード

レイアウト確認用の開発モードを使用できる。

```bash
npm run dev:layout
```

- フォルダ選択をスキップしてトップページを直接表示
- `VITE_DEV_MODE=true` 環境変数で制御

通常の開発:
```bash
npm run tauri:dev
```

## ビルドとリリース

- ビルドおよびGitHubリモートへのpushは、ユーザーの明示的な指示があるときのみ行う
- 基本的にビルドはGitHub Actionsで行う
- 新しいバージョンで main ブランチにpushすることで、自動的にビルドしてリリースされる
- バージョンは `src-tauri/tauri.conf.json` で管理する
