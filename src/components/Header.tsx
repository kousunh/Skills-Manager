interface HeaderProps {
  onSettingsClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalSkills: number;
  enabledSkills: number;
  projectPath: string;
}

export function Header({
  onSettingsClick,
  searchQuery,
  onSearchChange,
  totalSkills,
  enabledSkills,
  projectPath
}: HeaderProps) {
  const displayPath = projectPath.split('/').slice(-2).join('/');

  return (
    <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Skill Manager</h1>
              <p className="text-xs text-slate-400">Agent Skills 管理アプリ</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 ml-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm text-slate-300">{enabledSkills} 有効</span>
              </div>
              <span className="text-slate-500">/</span>
              <span className="text-sm text-slate-400">{totalSkills} 総数</span>
            </div>
            <span className="text-xs text-slate-500">OFF → disabled-skills/ディレクトリ | ON → skills/ディレクトリ</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="スキルを検索..."
              className="w-48 sm:w-64 pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg"
            title={projectPath}
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-sm text-slate-300 max-w-32 truncate">{displayPath}</span>
          </div>

          <button
            onClick={onSettingsClick}
            className="p-2.5 hover:bg-slate-700 rounded-lg transition-colors group"
            aria-label="設定"
          >
            <svg className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors group-hover:rotate-90 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
