export interface SkillFile {
  name: string;           // ファイル名
  path: string;           // フルパス
  is_directory: boolean;  // ディレクトリかどうか
}

export interface Skill {
  name: string;           // フォルダ名
  description: string;    // SKILL.md の description
  enabled: boolean;       // 有効/無効
  content: string;        // SKILL.md の全内容
  path: string;           // ファイルパス
  files: SkillFile[];     // 関連ファイル
}

export interface SlashCommand {
  name: string;           // ファイル名（.md除く）
  description: string;    // frontmatterのdescriptionまたは最初の行
  enabled: boolean;       // 有効/無効
  content: string;        // ファイルの全内容
  path: string;           // ファイルパス
}

export interface Config {
  categories: Record<string, string[]>;
  categoryOrder?: string[];  // カテゴリの表示順序
  loadSlashCommands?: boolean;  // スラッシュコマンドを読み込むか（デフォルト: true）
  commandCategories?: Record<string, string[]>;  // スラッシュコマンドのカテゴリ分け
}

export interface SkillConflictInfo {
  exists: boolean;
  targetAgent: string;
  isDisabled: boolean;
  sourceModified: string | null;
  targetModified: string | null;
}
