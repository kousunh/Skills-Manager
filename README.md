# SkillManager

Claude Codeのスキルを管理するGUIアプリです。

## インストール

[Releases](https://github.com/kousunh/Skills-Manager/releases) からダウンロード:

- **macOS (Apple Silicon)**: `SkillManager_aarch64_macos.zip`
- **macOS (Intel)**: `SkillManager_x64_macos.zip`
- **Windows**: `SkillManager_windows.zip`

## 使い方

1. zipを解凍
2. アプリを起動
3. プロジェクトフォルダを選択
4. アプリが自動で `.claude/` にコピーされ、そこから起動

別のプロジェクトで使う場合は `.claude/SkillManager.app`（または `.exe`）をコピーしてください。

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
