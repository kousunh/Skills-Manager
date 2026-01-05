import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { SkillList } from './components/SkillList';
import { SkillPreview } from './components/SkillPreview';
import { SlashCommandPreview } from './components/SlashCommandPreview';
import { CategoryEditor } from './components/CategoryEditor';
import { ProjectSelector } from './components/ProjectSelector';
import { useSkills } from './hooks/useSkills';
import type { SkillFile, SlashCommand } from './types';

// 開発モード: レイアウト確認用（フォルダ選択をスキップ）
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

type AgentType = 'claude' | 'codex' | 'none';

function App() {
  const [isSetup, setIsSetup] = useState<boolean | undefined>(DEV_MODE ? true : undefined);
  const [agentType, setAgentType] = useState<AgentType>('none');
  const [availableAgents, setAvailableAgents] = useState<AgentType[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<SkillFile | null>(null);

  useEffect(() => {
    if (DEV_MODE) return; // 開発モードではチェックをスキップ
    const checkSetup = async () => {
      const [setup, type, available] = await Promise.all([
        invoke<boolean>('check_setup'),
        invoke<AgentType>('get_agent_type'),
        invoke<string[]>('get_available_agents')
      ]);
      setIsSetup(setup);
      setAgentType(type);
      setAvailableAgents(available as AgentType[]);
    };
    checkSetup();
  }, []);

  const {
    skills,
    slashCommands,
    config,
    categories,
    selectedCategory,
    setSelectedCategory,
    selectedSkill,
    setSelectedSkill,
    selectedSlashCommand,
    setSelectedSlashCommand,
    skillsInCategory,
    commandsInCategory,
    skillCounts,
    enabledCounts,
    toggleSkill,
    toggleSlashCommand,
    setLoadSlashCommands,
    enableAllInCategory,
    disableAllInCategory,
    moveSkillToCategory,
    moveCommandToCategory,
    addCategory,
    removeCategory,
    renameCategory,
    reorderCategories,
    reload,
    loading,
    error,
    getGitMismatch,
    getCommandGitMismatch
  } = useSkills(isSetup === true);

  // エージェントタイプ切り替え
  const handleSwitchAgent = useCallback(async (target: AgentType) => {
    try {
      await invoke('switch_agent_type', { target });
      await exit(0);
    } catch (e) {
      console.error('Failed to switch agent:', e);
    }
  }, []);

  // ウィンドウ状態の復元（初回のみ）
  const windowStateRestored = useRef(false);
  useEffect(() => {
    if (windowStateRestored.current || !config.windowMaximized) return;
    windowStateRestored.current = true;

    const restoreWindow = async () => {
      try {
        const appWindow = getCurrentWindow();
        if (config.windowMaximized) {
          await appWindow.maximize();
        }
      } catch (e) {
        console.error('Failed to restore window state:', e);
      }
    };
    restoreWindow();
  }, [config.windowMaximized]);

  // ウィンドウ状態の監視と保存
  useEffect(() => {
    if (isSetup !== true) return;

    const appWindow = getCurrentWindow();
    let lastMaximized: boolean | null = null;

    const checkAndSaveWindowState = async () => {
      try {
        const isMaximized = await appWindow.isMaximized();
        if (lastMaximized !== null && lastMaximized !== isMaximized) {
          // 状態が変わったらconfigに保存
          await invoke('save_config', {
            config: { ...config, windowMaximized: isMaximized }
          });
        }
        lastMaximized = isMaximized;
      } catch (e) {
        console.error('Failed to check window state:', e);
      }
    };

    // 初回チェック
    checkAndSaveWindowState();

    // リサイズイベントで状態をチェック
    const unlisten = appWindow.onResized(() => {
      checkAndSaveWindowState();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [isSetup, config]);

  // 検索フィルター
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skillsInCategory;
    const query = searchQuery.toLowerCase();
    return skillsInCategory.filter(
      skill =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query)
    );
  }, [skillsInCategory, searchQuery]);

  // スラッシュコマンドの検索フィルター（カテゴリ内のみ）
  const filteredSlashCommands = useMemo(() => {
    if (!searchQuery.trim()) return commandsInCategory;
    const query = searchQuery.toLowerCase();
    return commandsInCategory.filter(
      command =>
        command.name.toLowerCase().includes(query) ||
        command.description.toLowerCase().includes(query)
    );
  }, [commandsInCategory, searchQuery]);

  // 全体の統計（スキル + スラッシュコマンド）
  const totalSkills = skills.length + slashCommands.length;
  const enabledSkills = skills.filter(s => s.enabled).length + slashCommands.filter(c => c.enabled).length;

  // セットアップチェック中
  if (isSetup === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // .claudeディレクトリ外で起動された場合
  if (isSetup === false) {
    return <ProjectSelector onUseCurrentDir={() => setIsSetup(true)} />;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading skills...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Skills</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header
        onSettingsClick={() => setShowSettings(true)}
        onReloadClick={reload}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalSkills={totalSkills}
        enabledSkills={enabledSkills}
      />

      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        skillCounts={skillCounts}
        enabledCounts={enabledCounts}
        onAddCategory={addCategory}
      />

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="w-2/5 flex flex-col overflow-y-auto">
          <SkillList
            skills={filteredSkills}
            slashCommands={filteredSlashCommands}
            selectedSkill={selectedSkill}
            selectedSlashCommand={selectedSlashCommand}
            onSelectSkill={(skill) => {
              if (selectedSkill?.name === skill.name) {
                setSelectedSkill(null);
                setSelectedFile(null);
              } else {
                setSelectedSkill(skill);
                setSelectedSlashCommand(null);
                setSelectedFile(null);
              }
            }}
            onSelectSlashCommand={(command: SlashCommand) => {
              if (selectedSlashCommand?.name === command.name) {
                setSelectedSlashCommand(null);
              } else {
                setSelectedSlashCommand(command);
                setSelectedSkill(null);
                setSelectedFile(null);
              }
            }}
            onToggleSkill={toggleSkill}
            onToggleSlashCommand={toggleSlashCommand}
            onEnableAll={enableAllInCategory}
            onDisableAll={disableAllInCategory}
            searchQuery={searchQuery}
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
            agentType={agentType}
            availableAgents={availableAgents}
            onSwitchAgent={handleSwitchAgent}
            getGitMismatch={getGitMismatch}
            getCommandGitMismatch={getCommandGitMismatch}
          />
        </div>

        <div className="w-3/5 flex flex-col overflow-hidden">
          {selectedSlashCommand ? (
            <SlashCommandPreview
              command={selectedSlashCommand}
              categories={categories}
              currentCategory={selectedCategory}
              onMoveToCategory={moveCommandToCategory}
              onToggle={toggleSlashCommand}
            />
          ) : (
            <SkillPreview
              skill={selectedSkill}
              categories={categories}
              currentCategory={selectedCategory}
              onMoveToCategory={moveSkillToCategory}
              onToggle={toggleSkill}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
            />
          )}
        </div>
      </div>

      {showSettings && (
        <CategoryEditor
          categories={categories}
          skillCounts={skillCounts}
          onClose={() => setShowSettings(false)}
          onAddCategory={addCategory}
          onRemoveCategory={removeCategory}
          onRenameCategory={renameCategory}
          onReorderCategories={reorderCategories}
          loadSlashCommands={config.loadSlashCommands !== false}
          onLoadSlashCommandsChange={setLoadSlashCommands}
        />
      )}
    </div>
  );
}

export default App;
