import { useState, useEffect, useRef } from 'react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { invoke } from '@tauri-apps/api/core';
import type { Skill, SkillFile } from '../types';

type AgentType = 'claude' | 'codex' | 'none';

interface SkillCardProps {
  skill: Skill;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  searchHighlight?: string;
  onFileSelect?: (file: SkillFile | null) => void;  // null = SKILL.md
  selectedFile?: SkillFile | null;
  agentType?: AgentType;
}

export function SkillCard({ skill, isSelected, onSelect, onToggle, searchHighlight, onFileSelect, selectedFile, agentType = 'none' }: SkillCardProps) {
  const [copiedPath, setCopiedPath] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // クリック外でメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCopyPath = async () => {
    setContextMenu(null);
    const folderPath = skill.path.replace(/\/SKILL\.md$/, '');
    try {
      await writeText(folderPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 1500);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  const handleCopyToOtherAgent = async () => {
    setContextMenu(null);
    try {
      await invoke('copy_skill_to_other_agent', { skillName: skill.name, enabled: skill.enabled });
      setCopyMessage('コピーしました');
      setTimeout(() => setCopyMessage(null), 2000);
    } catch (err) {
      setCopyMessage(String(err));
      setTimeout(() => setCopyMessage(null), 3000);
    }
  };

  const targetAgent = agentType === 'claude' ? 'Codex' : agentType === 'codex' ? 'Claude Code' : null;

  const highlightText = (text: string, query?: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
      ) : (
        part
      )
    );
  };

  const hasFiles = skill.files && skill.files.length > 0;

  return (
    <div
      className={`rounded-xl transition-all duration-200 ${
        isSelected
          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-md shadow-blue-100'
          : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Main card content */}
      <div
        className="group flex items-center gap-4 p-4 cursor-pointer relative"
        onClick={onSelect}
        onContextMenu={handleRightClick}
      >
        {/* コピー済みフィードバック */}
        {copiedPath && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded shadow-lg z-10">
            パスをコピーしました
          </div>
        )}
        {/* コピーメッセージ */}
        {copyMessage && (
          <div className={`absolute top-2 right-2 px-2 py-1 text-white text-xs rounded shadow-lg z-10 ${
            copyMessage === 'コピーしました' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {copyMessage}
          </div>
        )}
        {/* Toggle Switch */}
        <label
          className="relative inline-flex items-center cursor-pointer shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={skill.enabled}
            onChange={onToggle}
            className="sr-only peer"
          />
          <div className={`w-12 h-7 rounded-full transition-all duration-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100
            ${skill.enabled
              ? 'bg-gradient-to-r from-green-400 to-green-500'
              : 'bg-gray-300'
            }
            after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[22px] after:w-[22px] after:transition-all after:duration-300 after:shadow-sm
            peer-checked:after:translate-x-5
          `} />
        </label>

        {/* Skill Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 truncate">
              {highlightText(skill.name, searchHighlight)}
            </span>
            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
              skill.enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {skill.enabled ? '有効' : '無効'}
            </span>
            {hasFiles && (
              <span className="shrink-0 text-xs text-gray-400">
                +{skill.files.length}ファイル
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate mt-0.5">
            {highlightText(skill.description, searchHighlight)}
          </p>
        </div>

        {/* Expand indicator */}
        <svg
          className={`w-5 h-5 shrink-0 transition-all duration-200 ${
            isSelected
              ? 'text-blue-500 rotate-90'
              : 'text-gray-300 group-hover:text-gray-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Expanded file list */}
      {isSelected && (
        <div className="px-4 pb-3 pt-0">
          <div className="border-t border-blue-200 pt-3">
            <div className="flex flex-wrap gap-2">
              {/* SKILL.md button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelect?.(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  selectedFile === null
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                SKILL.md
              </button>
              {/* Other files */}
              {skill.files.map((file) => (
                <button
                  key={file.path}
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileSelect?.(file);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    selectedFile?.path === file.path
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {file.is_directory ? (
                    <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {file.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleCopyPath}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            スキルパスをコピー
          </button>
          {targetAgent && (
            <button
              onClick={handleCopyToOtherAgent}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              {targetAgent}にコピー
            </button>
          )}
        </div>
      )}
    </div>
  );
}
