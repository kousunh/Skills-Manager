import { useState, useEffect, useRef } from 'react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import type { SlashCommand } from '../types';

interface SlashCommandCardProps {
  command: SlashCommand;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  searchHighlight?: string;
}

export function SlashCommandCard({ command, isSelected, onSelect, onToggle, searchHighlight }: SlashCommandCardProps) {
  const [copiedPath, setCopiedPath] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
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
    try {
      await writeText(command.path);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 1500);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

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

  return (
    <div
      className={`rounded-xl transition-all duration-200 ${
        isSelected
          ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-400 shadow-md shadow-purple-100'
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

        {/* Toggle Switch */}
        <label
          className="relative inline-flex items-center cursor-pointer shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={command.enabled}
            onChange={onToggle}
            className="sr-only peer"
          />
          <div className={`w-12 h-7 rounded-full transition-all duration-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100
            ${command.enabled
              ? 'bg-gradient-to-r from-purple-400 to-purple-500'
              : 'bg-gray-300'
            }
            after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[22px] after:w-[22px] after:transition-all after:duration-300 after:shadow-sm
            peer-checked:after:translate-x-5
          `} />
        </label>

        {/* Command Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 truncate">
              /{highlightText(command.name, searchHighlight)}
            </span>
            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
              command.enabled
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {command.enabled ? '有効' : '無効'}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate mt-0.5">
            {highlightText(command.description, searchHighlight)}
          </p>
        </div>

        {/* Expand indicator */}
        <svg
          className={`w-5 h-5 shrink-0 transition-all duration-200 ${
            isSelected
              ? 'text-purple-500 rotate-90'
              : 'text-gray-300 group-hover:text-gray-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

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
            コマンドパスをコピー
          </button>
        </div>
      )}
    </div>
  );
}
