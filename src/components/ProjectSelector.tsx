import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface ProjectSelectorProps {
  onProjectSelected: (path: string) => void;
}

export function ProjectSelector({ onProjectSelected }: ProjectSelectorProps) {
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'スキルを管理したいプロジェクトを選んでください',
      });

      if (selected && typeof selected === 'string') {
        await invoke('set_project_path', { path: selected });
        onProjectSelected(selected);
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">SkillManager</h1>
        <p className="text-gray-600 mb-6">
          スキルを管理したいプロジェクトを選んでください
        </p>
        <button
          onClick={handleSelectFolder}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          フォルダを選択
        </button>
        <p className="text-sm text-gray-500 mt-4">
          選択したフォルダ内の .claude/ にスキルが保存されます
        </p>
      </div>
    </div>
  );
}
