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

export interface Config {
  categories: Record<string, string[]>;
}
