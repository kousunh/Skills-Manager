import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 開発モード判定
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

interface CategoryEditorProps {
  categories: string[];
  skillCounts: Record<string, number>;
  onClose: () => void;
  onAddCategory: (name: string) => void;
  onRemoveCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onReorderCategories: (newOrder: string[]) => void;
  loadSlashCommands?: boolean;
  onLoadSlashCommandsChange?: (value: boolean) => void;
}

export function CategoryEditor({
  categories,
  skillCounts,
  onClose,
  onAddCategory,
  onRemoveCategory,
  onRenameCategory,
  onReorderCategories,
  loadSlashCommands = true,
  onLoadSlashCommandsChange
}: CategoryEditorProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCommandConfirm, setShowCommandConfirm] = useState(false);
  const [addingToCommands, setAddingToCommands] = useState(false);
  const [addedToCommands, setAddedToCommands] = useState(false);
  const [canShowCommandButton, setCanShowCommandButton] = useState(false);

  useEffect(() => {
    if (!DEV_MODE) {
      invoke<boolean>('can_show_command_button').then(setCanShowCommandButton);
    }
  }, []);

  const handleAddToCommands = async () => {
    setShowCommandConfirm(false);
    setAddingToCommands(true);
    try {
      await invoke('copy_app_to_commands');
      setAddedToCommands(true);
    } catch (e) {
      setErrorMessage(`コマンドの追加に失敗しました: ${e}`);
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setAddingToCommands(false);
    }
  };

  const handleAdd = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName('');
    }
  };

  const handleRename = (oldName: string) => {
    if (editValue.trim() && editValue.trim() !== oldName) {
      onRenameCategory(oldName, editValue.trim());
    }
    setEditingCategory(null);
  };

  const startEditing = (category: string) => {
    setEditingCategory(category);
    setEditValue(category);
  };

  const handleRemove = (category: string) => {
    const count = skillCounts[category] || 0;
    if (count > 0) {
      setErrorMessage(`「${category}」には${count}件のスキルが登録されています。先にスキルを他のカテゴリに移動してください。`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setConfirmDelete(category);
  };

  const confirmRemove = () => {
    if (confirmDelete) {
      onRemoveCategory(confirmDelete);
      setConfirmDelete(null);
    }
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const newOrder = [...categories];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    onReorderCategories(newOrder);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">カテゴリ設定</h2>
            <p className="text-sm text-slate-400 mt-0.5">カテゴリの追加・編集・削除・並び替え</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Error message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Confirm delete dialog */}
          {confirmDelete && (
            <div className="mb-4 p-4 bg-slate-100 border border-slate-300 rounded-lg">
              <p className="text-slate-700 mb-3">「{confirmDelete}」カテゴリを削除しますか？</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmRemove}
                  className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800"
                >
                  削除する
                </button>
              </div>
            </div>
          )}

          {/* Add new category */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="新しいカテゴリ名を入力..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!newCategoryName.trim()}
              className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200 disabled:shadow-none"
            >
              追加
            </button>
          </div>

          {/* Category list */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
            {categories.map((category, index) => (
              <div
                key={category}
                className="flex items-center gap-3 p-3 rounded-xl transition-all bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm"
              >
                {editingCategory === category ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(category);
                        if (e.key === 'Escape') setEditingCategory(null);
                      }}
                    />
                    <button
                      onClick={() => handleRename(category)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-1">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="font-medium text-gray-700">
                        {category}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({skillCounts[category] || 0}件)
                      </span>
                    </div>

                    {/* Up/Down buttons */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveCategory(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="上に移動"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveCategory(index, 'down')}
                        disabled={index === categories.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="下に移動"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(category)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="名前を変更"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* 最後の1つは削除不可 */}
                      {categories.length > 1 && (
                        <button
                          onClick={() => handleRemove(category)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="削除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-gray-400 text-center">
            矢印ボタンで並び替え
          </p>

          {/* Slash commands toggle */}
          {onLoadSlashCommandsChange && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <div>
                    <span className="font-medium text-gray-700">カスタムスラッシュコマンドを読み込む</span>
                    <p className="text-xs text-gray-500 mt-0.5">.claude/commands/ 内の .md ファイルを管理</p>
                  </div>
                </div>
                <label
                  className="relative inline-flex items-center cursor-pointer shrink-0"
                >
                  <input
                    type="checkbox"
                    checked={loadSlashCommands}
                    onChange={(e) => onLoadSlashCommandsChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full transition-all duration-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100
                    ${loadSlashCommands
                      ? 'bg-gradient-to-r from-purple-400 to-purple-500'
                      : 'bg-gray-300'
                    }
                    after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 after:shadow-sm
                    peer-checked:after:translate-x-5
                  `} />
                </label>
              </div>
            </div>
          )}

          {/* Command confirm dialog */}
          {canShowCommandButton && showCommandConfirm && (
            <div className="mt-4 p-4 bg-slate-100 border border-slate-300 rounded-lg">
              <p className="text-slate-700 mb-3">Claude Code用の /skillsmanager コマンドを作成しますか？</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCommandConfirm(false)}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddToCommands}
                  className="px-3 py-1.5 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Add to commands button */}
          {canShowCommandButton && !showCommandConfirm && !addedToCommands && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowCommandConfirm(true)}
                disabled={addingToCommands || addedToCommands}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  addedToCommands
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900 shadow-md shadow-slate-300 disabled:opacity-50'
                }`}
              >
                {addingToCommands ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    追加中...
                  </>
                ) : addedToCommands ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    コマンドに追加しました
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    /skillsmanager コマンドを追加
                  </>
                )}
              </button>
              <p className="mt-2 text-xs text-gray-400 text-center">
                Claude Codeから /skillsmanager で起動可能に
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
          <span className="text-xs text-gray-400">Version {__APP_VERSION__}</span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
