import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Skill, Config } from '../types';
import { invoke } from '@tauri-apps/api/core';

const normalizeConfig = (loadedSkills: Skill[], loadedConfig: Config): Config => {
  const nextCategories: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(loadedConfig.categories)) {
    nextCategories[key] = [...value];
  }

  // categoryOrderがなければcategoriesのキー順で作成
  let categoryOrder = loadedConfig.categoryOrder && loadedConfig.categoryOrder.length > 0
    ? [...loadedConfig.categoryOrder]
    : Object.keys(nextCategories);

  // categoryOrderに含まれないカテゴリがあれば追加
  for (const key of Object.keys(nextCategories)) {
    if (!categoryOrder.includes(key)) {
      categoryOrder.push(key);
    }
  }

  // 存在しないカテゴリをcategoryOrderから削除
  categoryOrder = categoryOrder.filter(cat => cat in nextCategories);

  const categorizedSkills = new Set<string>();
  for (const skillNames of Object.values(nextCategories)) {
    for (const name of skillNames) {
      categorizedSkills.add(name);
    }
  }

  const uncategorized = loadedSkills
    .map(s => s.name)
    .filter(name => !categorizedSkills.has(name));

  if (uncategorized.length > 0 && categoryOrder.length > 0) {
    const firstCategory = categoryOrder[0];
    nextCategories[firstCategory] = [
      ...(nextCategories[firstCategory] || []),
      ...uncategorized
    ];
  }

  return { categories: nextCategories, categoryOrder };
};

export function useSkills(isReady: boolean) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [config, setConfig] = useState<Config>({ categories: {}, categoryOrder: [] });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // リロード関数
  const reload = useCallback(async () => {
    if (!isReady) return;

    try {
      setLoading(true);
      setError(null);

      const [loadedSkills, loadedConfig] = await Promise.all([
        invoke<Skill[]>('load_skills'),
        invoke<Config>('load_config')
      ]);

      setSkills(loadedSkills);
      const normalizedConfig = normalizeConfig(loadedSkills, loadedConfig);
      setConfig(normalizedConfig);

      // Set initial category
      const cats = normalizedConfig.categoryOrder || [];
      if (cats.length > 0 && !cats.includes(selectedCategory)) {
        setSelectedCategory(cats[0]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [isReady, selectedCategory]);

  // Load skills and config when ready
  useEffect(() => {
    if (!isReady) {
      setLoading(false);
      return;
    }
    reload();
  }, [isReady]);

  // Save config when it changes
  const saveConfig = useCallback(async (newConfig: Config) => {
    try {
      await invoke('save_config', { config: newConfig });
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  }, []);

  const updateConfig = useCallback((updater: (prev: Config) => Config) => {
    setConfig(prev => {
      const next = updater(prev);
      void saveConfig(next);
      return next;
    });
  }, [saveConfig]);

  // categoryOrderを使用してカテゴリリストを取得
  const categories = useMemo(() => {
    return config.categoryOrder || Object.keys(config.categories);
  }, [config.categoryOrder, config.categories]);

  const skillsInCategory = useMemo(() => {
    const skillNames = config.categories[selectedCategory] || [];
    return skills.filter(skill => skillNames.includes(skill.name));
  }, [skills, config.categories, selectedCategory]);

  // カテゴリごとのスキル数（実際に存在するスキルのみカウント）
  const skillCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const existingSkillNames = new Set(skills.map(s => s.name));
    for (const [cat, skillNames] of Object.entries(config.categories)) {
      counts[cat] = skillNames.filter(name => existingSkillNames.has(name)).length;
    }
    return counts;
  }, [config.categories, skills]);

  // カテゴリごとの有効スキル数
  const enabledCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [cat, skillNames] of Object.entries(config.categories)) {
      counts[cat] = skills.filter(s => skillNames.includes(s.name) && s.enabled).length;
    }
    return counts;
  }, [config.categories, skills]);

  const updateSkillPaths = useCallback((skill: Skill, newEnabled: boolean): Skill => {
    // パスの置換: skills/ <-> disabled-skills/
    const updatePath = (path: string): string => {
      if (newEnabled) {
        // disabled-skills/ -> skills/
        return path.replace(/\/disabled-skills\//, '/skills/');
      } else {
        // skills/ -> disabled-skills/
        return path.replace(/\/skills\//, '/disabled-skills/');
      }
    };

    return {
      ...skill,
      enabled: newEnabled,
      path: updatePath(skill.path),
      files: skill.files.map(file => ({
        ...file,
        path: updatePath(file.path),
      })),
    };
  }, []);

  const setEnabledForSkillNames = useCallback((skillNames: string[], enabled: boolean) => {
    setSkills(prev => prev.map(skill =>
      skillNames.includes(skill.name) ? updateSkillPaths(skill, enabled) : skill
    ));
    setSelectedSkill(prev =>
      prev && skillNames.includes(prev.name) ? updateSkillPaths(prev, enabled) : prev
    );
  }, [updateSkillPaths]);

  const toggleSkill = useCallback(async (skillName: string) => {
    const skill = skills.find(s => s.name === skillName);
    if (!skill) return;

    const newEnabled = !skill.enabled;

    try {
      await invoke('toggle_skill', { skillName, enabled: newEnabled });
      setEnabledForSkillNames([skillName], newEnabled);
    } catch (err) {
      console.error('Failed to toggle skill:', err);
    }
  }, [skills, setEnabledForSkillNames]);

  const setEnabledForCategory = useCallback(async (enabled: boolean) => {
    const skillNames = config.categories[selectedCategory] || [];

    const results = await Promise.allSettled(
      skillNames.map(skillName => invoke('toggle_skill', { skillName, enabled }))
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to update skill: ${skillNames[index]}`, result.reason);
      }
    });

    setEnabledForSkillNames(skillNames, enabled);
  }, [config.categories, selectedCategory, setEnabledForSkillNames]);

  const enableAllInCategory = useCallback(async () => {
    await setEnabledForCategory(true);
  }, [setEnabledForCategory]);

  const disableAllInCategory = useCallback(async () => {
    await setEnabledForCategory(false);
  }, [setEnabledForCategory]);

  const moveSkillToCategory = useCallback((skillName: string, newCategory: string) => {
    updateConfig(prev => {
      const newCategories = { ...prev.categories };

      // 既存のカテゴリから削除
      for (const cat of Object.keys(newCategories)) {
        newCategories[cat] = newCategories[cat].filter(name => name !== skillName);
      }

      // 新しいカテゴリに追加
      if (newCategories[newCategory]) {
        newCategories[newCategory] = [...newCategories[newCategory], skillName];
      }

      return { ...prev, categories: newCategories };
    });
  }, [updateConfig]);

  const deleteSkill = useCallback((skillName: string) => {
    setSkills(prev => prev.filter(skill => skill.name !== skillName));
    updateConfig(prev => {
      const newCategories = { ...prev.categories };
      for (const cat of Object.keys(newCategories)) {
        newCategories[cat] = newCategories[cat].filter(name => name !== skillName);
      }
      return { ...prev, categories: newCategories };
    });
    if (selectedSkill?.name === skillName) {
      setSelectedSkill(null);
    }
  }, [selectedSkill, updateConfig]);

  const addCategory = useCallback((name: string) => {
    updateConfig(prev => ({
      categories: { ...prev.categories, [name]: [] },
      categoryOrder: [...(prev.categoryOrder || []), name]
    }));
  }, [updateConfig]);

  const removeCategory = useCallback((name: string) => {
    // 最後の1つは削除不可
    const catOrder = config.categoryOrder || [];
    if (catOrder.length <= 1) return;

    updateConfig(prev => {
      const newCategories = { ...prev.categories };
      const skillsToMove = newCategories[name] || [];
      delete newCategories[name];

      const newOrder = (prev.categoryOrder || []).filter(c => c !== name);

      // 最初のカテゴリにスキルを移動
      if (newOrder.length > 0) {
        const firstCategory = newOrder[0];
        newCategories[firstCategory] = [...(newCategories[firstCategory] || []), ...skillsToMove];
      }
      return { categories: newCategories, categoryOrder: newOrder };
    });

    if (selectedCategory === name) {
      const remaining = (config.categoryOrder || []).filter(c => c !== name);
      setSelectedCategory(remaining[0] || '');
    }
  }, [selectedCategory, config.categoryOrder, updateConfig]);

  const renameCategory = useCallback((oldName: string, newName: string) => {
    if (!newName || oldName === newName) return;

    updateConfig(prev => {
      const newCategories: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(prev.categories)) {
        if (key === oldName) {
          newCategories[newName] = value;
        } else {
          newCategories[key] = value;
        }
      }

      const newOrder = (prev.categoryOrder || []).map(c => c === oldName ? newName : c);

      return { categories: newCategories, categoryOrder: newOrder };
    });

    if (selectedCategory === oldName) {
      setSelectedCategory(newName);
    }
  }, [selectedCategory, updateConfig]);

  const reorderCategories = useCallback((newOrder: string[]) => {
    updateConfig(prev => ({
      ...prev,
      categoryOrder: newOrder
    }));
  }, [updateConfig]);

  return {
    skills,
    config,
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
    deleteSkill,
    addCategory,
    removeCategory,
    renameCategory,
    reorderCategories,
    reload,
    loading,
    error
  };
}
