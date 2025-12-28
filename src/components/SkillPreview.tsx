import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import type { Skill, SkillFile } from '../types';

interface SkillPreviewProps {
  skill: Skill | null;
  categories: string[];
  currentCategory: string;
  onMoveToCategory: (skillName: string, category: string) => void;
  onToggle: (skillName: string) => void;
  selectedFile?: SkillFile | null;
  onFileSelect?: (file: SkillFile | null) => void;
}

export function SkillPreview({
  skill,
  categories,
  currentCategory,
  onMoveToCategory,
  onToggle,
  selectedFile,
  onFileSelect
}: SkillPreviewProps) {
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [currentDir, setCurrentDir] = useState<SkillFile | null>(null);
  const [dirFiles, setDirFiles] = useState<SkillFile[]>([]);
  const [pathHistory, setPathHistory] = useState<SkillFile[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [skillContent, setSkillContent] = useState<string>('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const handleCopyPath = async (path: string) => {
    try {
      await writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 1500);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  // スキルが変わったらコンテンツをリセット
  useEffect(() => {
    setSkillContent(skill?.content || '');
    setFileContent('');
    setCurrentDir(null);
    setDirFiles([]);
    setPathHistory([]);
    setIsEditing(false);
    setEditContent('');
  }, [skill?.name, skill?.content]);

  // 選択ファイルが変わったらファイル内容を読み込む
  useEffect(() => {
    if (selectedFile && !selectedFile.is_directory) {
      setLoadingFile(true);
      invoke<string>('read_file', { path: selectedFile.path })
        .then(content => {
          setFileContent(content);
          setCurrentDir(null);
          setDirFiles([]);
        })
        .catch(err => {
          setFileContent(`Error loading file: ${err}`);
        })
        .finally(() => {
          setLoadingFile(false);
        });
    } else if (selectedFile?.is_directory) {
      // ディレクトリの場合は中身を表示
      setLoadingFile(true);
      invoke<SkillFile[]>('list_directory', { path: selectedFile.path })
        .then(files => {
          setCurrentDir(selectedFile);
          setDirFiles(files);
          setFileContent('');
        })
        .catch(err => {
          console.error('Failed to list directory:', err);
        })
        .finally(() => {
          setLoadingFile(false);
        });
    } else {
      setFileContent('');
      setCurrentDir(null);
      setDirFiles([]);
    }
  }, [selectedFile]);

  const handleFileClick = async (file: SkillFile) => {
    // ディレクトリ内のファイルをクリックした場合
    if (file.is_directory) {
      setPathHistory(prev => currentDir ? [...prev, currentDir] : prev);
    }
    onFileSelect?.(file);
  };

  const handleBackToSkill = () => {
    onFileSelect?.(null);
    setFileContent('');
    setCurrentDir(null);
    setDirFiles([]);
    setPathHistory([]);
  };

  const handleBackToParent = () => {
    if (pathHistory.length > 0) {
      const parent = pathHistory[pathHistory.length - 1];
      setPathHistory(prev => prev.slice(0, -1));
      onFileSelect?.(parent);
    } else {
      onFileSelect?.(null);
      setCurrentDir(null);
      setDirFiles([]);
      setFileContent('');
    }
  };

  const handleStartEdit = () => {
    // 編集対象のコンテンツを設定
    if (selectedFile) {
      setEditContent(fileContent);
    } else {
      setEditContent(skillContent);
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const handleSave = async () => {
    if (!skill) return;

    setSaving(true);
    try {
      const pathToSave = selectedFile ? selectedFile.path : skill.path;
      await invoke('write_file', { path: pathToSave, content: editContent });

      // 保存後にコンテンツを更新
      if (selectedFile) {
        setFileContent(editContent);
      } else {
        // SKILL.mdの場合はローカル状態を更新
        setSkillContent(editContent);
      }

      setIsEditing(false);
      setEditContent('');
    } catch (err) {
      console.error('Failed to save:', err);
      alert(`保存に失敗しました: ${err}`);
    }
    setSaving(false);
  };

  if (!skill) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-200">
        <svg className="w-20 h-20 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <p className="text-lg font-medium text-gray-500">スキルを選択してプレビュー</p>
        <p className="text-sm text-gray-400 mt-1">左のリストからスキルをクリック</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 truncate">{skill.name}</h2>
              <button
                onClick={() => onToggle(skill.name)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full transition-all duration-200 ${
                  skill.enabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${skill.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                {skill.enabled ? '有効' : '無効'}
              </button>
              <button
                onClick={() => handleCopyPath(skill.path)}
                className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                title="SKILL.mdのパスをコピー"
              >
                {copiedPath === skill.path ? (
                  <>
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-500">コピー済</span>
                  </>
                ) : (
                  <span>パスコピー</span>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">{skill.description}</p>
          </div>
          {/* カテゴリ変更 */}
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs text-gray-500">カテゴリ</span>
            <select
              value={currentCategory}
              onChange={(e) => onMoveToCategory(skill.name, e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">へ移動</span>
          </div>
        </div>
      </div>

      {/* Metadata bar */}
      <div className="px-5 py-3 bg-slate-50 border-b flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-slate-600">{currentCategory}</span>
        </div>
        {(selectedFile || currentDir) ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToSkill}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              SKILL.md
            </button>
            {currentDir && (
              <>
                <span className="text-slate-400">/</span>
                <button
                  onClick={handleBackToParent}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  {pathHistory.length > 0 && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  )}
                  {currentDir.name}
                </button>
              </>
            )}
            {selectedFile && !selectedFile.is_directory && (
              <>
                <span className="text-slate-400">/</span>
                <span className="text-slate-600">{selectedFile.name}</span>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-slate-600">SKILL.md</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-5 overflow-y-auto">
        {isEditing ? (
          /* 編集モード */
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full bg-slate-50 text-slate-800 p-4 rounded-lg text-sm font-mono border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            placeholder="内容を入力..."
          />
        ) : selectedFile && !selectedFile.is_directory ? (
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium text-gray-900">{selectedFile.name}</span>
              <button
                onClick={() => handleCopyPath(selectedFile.path)}
                className="px-2 py-0.5 text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1"
                title="パスをコピー"
              >
                {copiedPath === selectedFile.path ? (
                  <>
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-500">コピー済</span>
                  </>
                ) : (
                  <span>パスコピー</span>
                )}
              </button>
            </div>
            {loadingFile ? (
              <div className="text-gray-500">Loading...</div>
            ) : (
              <pre className="bg-slate-50 text-slate-800 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                {fileContent}
              </pre>
            )}
          </div>
        ) : currentDir ? (
          /* ディレクトリの中身を表示 */
          <div>
            {loadingFile ? (
              <div className="text-gray-500">Loading...</div>
            ) : dirFiles.length === 0 ? (
              <div className="text-gray-500 text-center py-8">空のディレクトリ</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {dirFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleFileClick(file)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-left transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    {file.is_directory ? (
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* SKILL.md の内容を表示 */
          <pre className="bg-slate-50 text-slate-800 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono">
            {skillContent}
          </pre>
        )}
      </div>

      {/* Footer with actions */}
      <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-end gap-3">
        {isEditing ? (
          /* 編集モード時のボタン */
          <>
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {saving ? '保存中...' : '保存'}
            </button>
          </>
        ) : (
          /* 通常モード時：ディレクトリ表示中は編集ボタン非表示 */
          !currentDir && (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              編集
            </button>
          )
        )}
      </div>
    </div>
  );
}
