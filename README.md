# Skills-Manager

Claude Code・Codex(動作未確認)のAgents Skillsを管理するGUIアプリです。

> **注意**: スキルのオン/オフやカスタムコマンドの変更を反映するには、Claude Codeの再起動が必要です。

アプリ本体をできるだけ軽量にしているので、圧縮ファイルを解凍後のポータブルファイルを管理したいプロジェクトの.claudeや.codexに複製して配置してください。

そこにあるSkillsを読み込み管理できます。

## インストール

[Releases](https://github.com/kousunh/Skills-Manager/releases) からダウンロード:

- **macOS (Apple Silicon)**: `skillsmanager_aarch64_macos.zip`
- **macOS (Intel)**: `skillsmanager_x64_macos.zip`
- **Windows**: `skillsmanager_windows.zip`

## 使い方

1. zipを解凍
2. アプリを起動
3. プロジェクトフォルダを選択（または「現在のディレクトリで使用」）
4. アプリが自動で `.claude/` にコピーされ、そこから起動
5. 以降はプロジェクトフォルダの `.claude/skillsmanager.app`（または `.exe`）から起動

### macOS: 「壊れているため開けません」エラーの対処

アプリが署名されていないため、macOSでブロックされる場合があります。ターミナルで以下を実行してください：

```bash
xattr -cr /path/to/skillsmanager.app
```

例：
```bash
xattr -cr ~/Downloads/skillsmanager.app
```

### Windows: SmartScreenの警告

「WindowsによってPCが保護されました」と表示される場合：

1. 「詳細情報」をクリック
2. 「実行」をクリック

別のプロジェクトで使う場合は `.claude/skillsmanager.app`（または `.exe`）をコピーしてください。

## 機能

- スキルの有効/無効切り替え
- カテゴリ管理（追加・削除・リネーム・並び替え）
- スキルの検索
- SKILL.mdや付属ファイルのプレビュー・編集
- スキルの右クリックメニュー（パスコピー）

## Claude Code / Codex 対応

- アプリ内でClaude CodeとCodexを切り替え可能
- スキルを右クリックして他エージェントへコピー可能（Claude Code ↔ Codex）

## /skillsmanager コマンド

設定画面から `/skillsmanager` コマンドを作成できます。これにより Claude Code で `/skillsmanager` と入力するだけでアプリを起動できます。

> コマンドを作成・変更した後は、Claude Codeの再起動が必要です。

## ライセンス

[MIT License](LICENSE) - 自由に使用・改変・再配布できます。
