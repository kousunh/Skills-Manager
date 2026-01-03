import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import type { SlashCommand } from '../types';

interface SlashCommandPreviewProps {
  command: SlashCommand | null;
  onToggle: (commandName: string) => void;
}

export function SlashCommandPreview({
  command,
  onToggle
}: SlashCommandPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<string>('');
  const [commandContent, setCommandContent] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  const handleCopyPath = async () => {
    if (!command) return;
    try {
      await writeText(command.path);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 1500);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  // コマンドが変わったらコンテンツをリセット
  useEffect(() => {
    setCommandContent(command?.content || '');
    setIsEditing(false);
    setEditContent('');
  }, [command?.name, command?.content]);

  const handleStartEdit = () => {
    setEditContent(commandContent);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const handleSave = async () => {
    if (!command) return;

    setSaving(true);
    try {
      await invoke('write_file', { path: command.path, content: editContent });
      setCommandContent(editContent);
      setIsEditing(false);
      setEditContent('');
    } catch (err) {
      console.error('Failed to save:', err);
      alert(`保存に失敗しました: ${err}`);
    }
    setSaving(false);
  };

  if (!command) {
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
      <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 truncate">/{command.name}</h2>
              <button
                onClick={() => onToggle(command.name)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full transition-all duration-200 ${
                  command.enabled
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${command.enabled ? 'bg-purple-500' : 'bg-gray-400'}`} />
                {command.enabled ? '有効' : '無効'}
              </button>
              <button
                onClick={handleCopyPath}
                className="px-2 py-1 text-xs text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors flex items-center gap-1"
                title="パスをコピー"
              >
                {copiedPath ? (
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
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{command.description}</p>
          </div>
          {/* 右側: 編集ボタン */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors border border-gray-300"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-500 text-white hover:bg-purple-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                編集
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metadata bar */}
      <div className="px-5 py-3 bg-purple-50 border-b flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <span className="text-purple-600 font-medium">カスタムスラッシュコマンド</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{command.name}.md</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 overflow-y-auto">
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full bg-slate-50 text-slate-800 p-4 rounded-lg text-sm font-mono border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            placeholder="内容を入力..."
          />
        ) : (
          <pre className="bg-slate-50 text-slate-800 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono">
            {commandContent}
          </pre>
        )}
      </div>
    </div>
  );
}
