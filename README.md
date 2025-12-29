# Skills-Manager

Claude Code・Codex(動作未確認)のAgents Skillsを管理するGUIアプリです。
アプリ本体をできるだけ軽量にしているので、圧縮ファイルを解凍後のポータブルファイルを管理したいプロジェクトの.claudeや.codexに複製して配置してください。そこにあるSkillsを読み込み管理できます。

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
5. 以降はプロジェクトフォルダの`.claude/`内のアプリファイルから起動してください。

### macOS: 「壊れているため開けません」エラーの対処

アプリが署名されていないため、macOSでブロックされる場合があります。ターミナルで以下を実行してください：

```bash
xattr -cr /path/to/SkillManager.app
```

例：
```bash
xattr -cr ~/Downloads/SkillManager.app
```

### Windows: SmartScreenの警告

「WindowsによってPCが保護されました」と表示される場合：

1. 「詳細情報」をクリック
2. 「実行」をクリック

別のプロジェクトで使う場合は `.claude/SkillManager.app`（または `.exe`）をコピーしてください。

## 機能

- スキルの有効/無効切り替え
- カテゴリ管理
- スキルの検索
- SKILL.mdや付属リファレンスのプレビュー・編集

## ライセンス

[MIT License](LICENSE) - 自由に使用・改変・再配布できます。
