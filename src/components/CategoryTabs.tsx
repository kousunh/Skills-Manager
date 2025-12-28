import { useState } from 'react';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  skillCounts: Record<string, number>;
  enabledCounts: Record<string, number>;
  onAddCategory: (name: string) => void;
  onReorderCategories: (newOrder: string[]) => void;
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
  skillCounts,
  enabledCounts,
  onAddCategory,
  onReorderCategories
}: CategoryTabsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAdd = () => {
    if (newName.trim() && !categories.includes(newName.trim())) {
      onAddCategory(newName.trim());
      setNewName('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewName('');
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    // ドラッグ中の見た目を設定
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const dragIndex = draggedIndex ?? parseInt(e.dataTransfer.getData('text/plain'), 10);

    if (!isNaN(dragIndex) && dragIndex !== dropIndex) {
      const newOrder = [...categories];
      const [removed] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dropIndex, 0, removed);
      onReorderCategories(newOrder);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-white border-b shadow-sm overflow-x-auto">
      {categories.map((category, index) => {
        const total = skillCounts[category] || 0;
        const enabled = enabledCounts[category] || 0;
        const isSelected = selectedCategory === category;
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        return (
          <div
            key={category}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-blue-400 ring-offset-2 rounded-lg' : ''}`}
          >
            <button
              onClick={() => onSelectCategory(category)}
              className={`group flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap cursor-grab active:cursor-grabbing ${
                isSelected
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span>{category}</span>
              {total > 0 && (
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    enabled > 0 ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                  {enabled}/{total}
                </span>
              )}
            </button>
          </div>
        );
      })}

      {isAdding ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="カテゴリ名..."
            autoFocus
            className="w-32 px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            onClick={handleAdd}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => { setIsAdding(false); setNewName(''); }}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 border-2 border-dashed border-gray-200 hover:border-blue-300"
          title="カテゴリを追加"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">追加</span>
        </button>
      )}
    </div>
  );
}
