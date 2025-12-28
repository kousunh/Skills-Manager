import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { SkillList } from './components/SkillList';
import { SkillPreview } from './components/SkillPreview';
import { CategoryEditor } from './components/CategoryEditor';
import { useSkills } from './hooks/useSkills';
import type { SkillFile } from './types';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<SkillFile | null>(null);

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
    loading,
    error
  } = useSkills();

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
          <p className="text-sm text-gray-500">
            Make sure you have Claude Code installed and the ~/.claude directory exists.
          </p>
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
      />

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="w-2/5 flex flex-col overflow-y-auto">
          <SkillList
            skills={filteredSkills}
            selectedSkill={selectedSkill}
            onSelectSkill={(skill) => {
              // 同じスキルをクリックしたら折りたたむ
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
        />
      )}
    </div>
  );
}

export default App;
