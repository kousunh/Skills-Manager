# SkillManager

Codex/Claudeのスキルフォルダを管理するためのTauriアプリです。スキルの有効/無効切り替え、カテゴリ管理、SKILL.mdの編集を行えます。

## 開発

```bash
npm install
npm run tauri:dev
```

## ビルド

```bash
npm run tauri:build
```

## 配布用ディレクトリの作成

```bash
./scripts/prepare-distribution.sh
```

`distribution/` に `SkillManager.app` が準備されます。
