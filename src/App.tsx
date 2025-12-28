import { useState, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { SkillList } from './components/SkillList';
import { SkillPreview } from './components/SkillPreview';
import { CategoryEditor } from './components/CategoryEditor';
import { ProjectSelector } from './components/ProjectSelector';
import { useSkills } from './hooks/useSkills';
import type { SkillFile } from './types';

function App() {
  const [isSetup, setIsSetup] = useState<boolean | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<SkillFile | null>(null);

  useEffect(() => {
    const checkSetup = async () => {
      const setup = await invoke<boolean>('check_setup');
      setIsSetup(setup);
    };
    checkSetup();
  }, []);

  const {
    skills,
    categories,
    selectedCategory,
    setSelectedCategory,
    selectedSkill,
    setSelectedSkill,
    skillsInCategory,
    skillCounts,
    enabledCounts,
    toggleSkill,
    enableAllInCategory,
    disableAllInCategory,
    moveSkillToCategory,
    addCategory,
    removeCategory,
    renameCategory,
    reorderCategories,
    loading,
    error
  } = useSkills(isSetup === true);

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

  // 全体の統計
  const totalSkills = skills.length;
  const enabledSkills = skills.filter(s => s.enabled).length;

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
    return <ProjectSelector />;
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
        onReorderCategories={reorderCategories}
      />

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="w-2/5 flex flex-col overflow-y-auto">
          <SkillList
            skills={filteredSkills}
            selectedSkill={selectedSkill}
            onSelectSkill={(skill) => {
              if (selectedSkill?.name === skill.name) {
                setSelectedSkill(null);
                setSelectedFile(null);
              } else {
                setSelectedSkill(skill);
                setSelectedFile(null);
              }
            }}
            onToggleSkill={toggleSkill}
            onEnableAll={enableAllInCategory}
            onDisableAll={disableAllInCategory}
            searchQuery={searchQuery}
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
          />
        </div>

        <div className="w-3/5 flex flex-col overflow-hidden">
          <SkillPreview
            skill={selectedSkill}
            categories={categories}
            currentCategory={selectedCategory}
            onMoveToCategory={moveSkillToCategory}
            onToggle={toggleSkill}
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
          />
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
        />
      )}
    </div>
  );
}

export default App;
