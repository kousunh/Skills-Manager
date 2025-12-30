import type { Skill, SkillFile } from '../types';
import { SkillCard } from './SkillCard';

type AgentType = 'claude' | 'codex' | 'none';

interface SkillListProps {
  skills: Skill[];
  selectedSkill: Skill | null;
  onSelectSkill: (skill: Skill) => void;
  onToggleSkill: (skillName: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  searchQuery?: string;
  onFileSelect?: (file: SkillFile | null) => void;
  selectedFile?: SkillFile | null;
  agentType?: AgentType;
  availableAgents?: AgentType[];
  onSwitchAgent?: (target: AgentType) => void;
}

export function SkillList({
  skills,
  selectedSkill,
  onSelectSkill,
  onToggleSkill,
  onEnableAll,
  onDisableAll,
  searchQuery,
  onFileSelect,
  selectedFile,
  agentType = 'none',
  availableAgents = [],
  onSwitchAgent
}: SkillListProps) {
  const enabledCount = skills.filter(s => s.enabled).length;
  const totalCount = skills.length;

  return (
    <div className="flex flex-col gap-2">
      {/* Header with controls */}
      <div className="flex items-center justify-between sticky top-0 bg-gray-100 py-1 z-10">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <button
              onClick={() => agentType !== 'claude' && onSwitchAgent?.('claude')}
              disabled={agentType === 'claude' || !availableAgents.includes('claude')}
              className={`${agentType === 'claude' ? 'text-gray-700 font-medium' : availableAgents.includes('claude') ? 'text-gray-400 hover:text-gray-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
            >
              Claude Code
            </button>
            <span className="text-gray-400">/</span>
            <button
              onClick={() => agentType !== 'codex' && onSwitchAgent?.('codex')}
              disabled={agentType === 'codex' || !availableAgents.includes('codex')}
              className={`${agentType === 'codex' ? 'text-gray-700 font-medium' : availableAgents.includes('codex') ? 'text-gray-400 hover:text-gray-600 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
            >
              Codex
            </button>
          </div>
          {skills.length > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-2 text-gray-500">
                <span className="font-medium text-gray-700">{totalCount}件</span>
                <span>({enabledCount}件 有効)</span>
              </div>
            </>
          )}
        </div>
        {skills.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={onEnableAll}
              disabled={enabledCount === totalCount}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors border border-green-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              全てON
            </button>
            <button
              onClick={onDisableAll}
              disabled={enabledCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-50 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors border border-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              全てOFF
            </button>
          </div>
        )}
      </div>

      {/* Skill cards or empty state */}
      {skills.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
          <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-center">
            {searchQuery
              ? `「${searchQuery}」に一致するスキルがありません`
              : 'このカテゴリにはスキルがありません'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {skills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              isSelected={selectedSkill?.name === skill.name}
              onSelect={() => onSelectSkill(skill)}
              onToggle={() => onToggleSkill(skill.name)}
              searchHighlight={searchQuery}
              onFileSelect={onFileSelect}
              selectedFile={selectedSkill?.name === skill.name ? selectedFile : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
