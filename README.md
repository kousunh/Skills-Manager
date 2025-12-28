# SkillManager

Claude Codeのスキルを管理するGUIアプリです。

## インストール

[Releases](https://github.com/kousunh/Skills-Manager/releases) から最新版をダウンロード:

- **macOS (Apple Silicon)**: `SkillManager_x.x.x_aarch64.dmg`
- **macOS (Intel)**: `SkillManager_x.x.x_x64.dmg`
- **Windows**: `.msi` または `.exe`

## 使い方

1. アプリを起動
2. 初回起動時、スキルを管理したいプロジェクトフォルダを選択
3. 選択したフォルダ内の `.claude/skills/` が管理対象になります

## 機能

- スキルの有効/無効切り替え
- カテゴリ管理
- スキルの検索
- SKILL.mdのプレビュー

## 開発

```bash
npm install
npm run tauri:dev
```

## ビルド

```bash
npm run tauri:build
```
