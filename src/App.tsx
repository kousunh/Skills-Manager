import { useState, useMemo, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';
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
      const setup = await invoke<boolean>('check_setup');
      setIsSetup(setup);
      const type = await invoke<AgentType>('get_agent_type');
      setAgentType(type);
      const available = await invoke<string[]>('get_available_agents');
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
    skillCounts,
    enabledCounts,
    toggleSkill,
    toggleSlashCommand,
    setLoadSlashCommands,
    enableAllInCategory,
    disableAllInCategory,
    moveSkillToCategory,
    addCategory,
    removeCategory,
    renameCategory,
    reorderCategories,
    reload,
    loading,
    error
  } = useSkills(isSetup === true);

  // 1分ごとに自動更新
  useEffect(() => {
    if (isSetup !== true) return;

    const interval = setInterval(() => {
      reload();
    }, 60000); // 60秒 = 1分

    return () => clearInterval(interval);
  }, [isSetup, reload]);

  // エージェントタイプ切り替え
  const handleSwitchAgent = useCallback(async (target: AgentType) => {
    try {
      await invoke('switch_agent_type', { target });
      await exit(0);
    } catch (e) {
      console.error('Failed to switch agent:', e);
    }
  }, []);

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

  // スラッシュコマンドの検索フィルター
  const filteredSlashCommands = useMemo(() => {
    if (!searchQuery.trim()) return slashCommands;
    const query = searchQuery.toLowerCase();
    return slashCommands.filter(
      command =>
        command.name.toLowerCase().includes(query) ||
        command.description.toLowerCase().includes(query)
    );
  }, [slashCommands, searchQuery]);

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
          />
        </div>

        <div className="w-3/5 flex flex-col overflow-hidden">
          {selectedSlashCommand ? (
            <SlashCommandPreview
              command={selectedSlashCommand}
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
