import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { exit } from '@tauri-apps/plugin-process';

interface Props {
  onUseCurrentDir: () => void;
}

export function ProjectSelector({ onUseCurrentDir }: Props) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'スキルを管理したいプロジェクトを選んでください',
      });

      if (selected && typeof selected === 'string') {
        setInstalling(true);
        setError(null);
        await invoke('copy_app_to_project', { projectPath: selected });
        // コピー先で新しいアプリが起動したので、このアプリを終了
        await exit(0);
      }
    } catch (err) {
      console.error('Failed to install:', err);
      setError(String(err));
      setInstalling(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">skillsmanager</h1>
        <p className="text-gray-600 mb-6">
          スキルを管理したいプロジェクトを選んでください
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleSelectFolder}
            disabled={installing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {installing ? 'インストール中...' : 'フォルダを選択'}
          </button>

          <button
            onClick={onUseCurrentDir}
            disabled={installing}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            現在のディレクトリを使用
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          選択したフォルダの .claude/ にアプリがコピーされます
        </p>
      </div>
    </div>
  );
}
