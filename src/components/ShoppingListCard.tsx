import { useState } from 'react';
import { Check, Trash2, ExternalLink, Plus, Pin, ChevronDown, ChevronUp, Sparkles, Archive, ArchiveRestore } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShoppingItem, ShoppingList } from '@/types';
import { useFrequentItems } from '@/hooks/useFrequentItems';
import { useSwipe } from '@/hooks/useSwipe';

const typeEmoji: Record<string, string> = { daily: '📅', global: '📦', wishlist: '💫' };

interface ShoppingListCardProps {
  list: ShoppingList;
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (item: Omit<ShoppingItem, 'id'>) => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
}

export function ShoppingListCard({ list, onToggleItem, onDeleteItem, onAddItem, onDelete, onArchive, onUnarchive }: ShoppingListCardProps) {
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const boughtCount = list.items.filter(i => i.bought).length;
  const progress = list.items.length ? (boughtCount / list.items.length) * 100 : 0;
  const { recordItem, getSuggestions } = useFrequentItems();

  const { offset, released, elRef, handlers } = useSwipe({
    threshold: 120,
    onSwipeLeft: onDelete,
    onSwipeRight: list.archived ? onUnarchive : onArchive,
  });

  const absOffset = Math.abs(offset);
  const isLeft = offset < 0;
  const isRight = offset > 0;
  const actionVisible = absOffset > 20;

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onAddItem({ name: newItem.trim(), quantity: newQty.trim() || '1', bought: false });
    recordItem(newItem.trim());
    setNewItem('');
    setNewQty('');
    setShowSuggestions(false);
  };

  const handleInputChange = (val: string) => {
    setNewItem(val);
    setSuggestions(getSuggestions(val));
    setShowSuggestions(true);
  };

  const pickSuggestion = (suggestion: string) => {
    setNewItem(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden animate-fade-in">
      {/* Delete zone (red) — swipe left */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-5"
        style={{
          background: `rgba(239,68,68,${isLeft && actionVisible ? Math.min(absOffset / 120, 1) * 0.85 : 0})`,
          transition: released ? 'background 0.3s' : 'none',
        }}
      >
        <Trash2 className={cn('w-6 h-6 text-white transition-opacity', isLeft && actionVisible ? 'opacity-100' : 'opacity-0')} />
      </div>

      {/* Archive / Unarchive zone — swipe right */}
      <div
        className="absolute inset-0 flex items-center justify-start pl-5"
        style={{
          background: list.archived
            ? `rgba(249,115,22,${isRight && actionVisible ? Math.min(absOffset / 120, 1) * 0.85 : 0})`
            : `rgba(34,197,94,${isRight && actionVisible ? Math.min(absOffset / 120, 1) * 0.85 : 0})`,
          transition: released ? 'background 0.3s' : 'none',
        }}
      >
        <Archive className={cn('w-6 h-6 text-white transition-opacity', isRight && actionVisible ? 'opacity-100' : 'opacity-0')} />
      </div>

      {/* Card */}
      <div
        ref={elRef}
        {...handlers}
        style={{
          transform: `translateX(${offset}px)`,
          transition: released ? 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
        }}
        className={cn(
          'glass rounded-2xl overflow-hidden card-hover',
          list.archived && 'opacity-50 saturate-0'
        )}
      >
        <button className="w-full p-4 text-left tap-scale" onClick={() => setCollapsed(c => !c)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{typeEmoji[list.type] || '📋'}</span>
                {list.pinned && <Pin className="w-3.5 h-3.5 text-gold flex-shrink-0" />}
                <h3 className="font-bold text-base text-foreground truncate">{list.title}</h3>
              </div>
              {list.createdByName && <p className="text-xs text-muted-foreground mt-1">{`Додала: ${list.createdByName}`}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                {boughtCount}/{list.items.length}
              </span>
              {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="w-full bg-muted/60 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="progress-gold h-1.5" style={{ width: `${progress}%` }} />
          </div>
        </button>

        {!collapsed && (
          <>
            {list.items.length > 0 && (
              <div className="border-t border-border/40 divide-y divide-border/30">
                {list.items.map(item => (
                  <div key={item.id} className={cn('flex items-center gap-3 px-4 py-3 group transition-all', item.bought && 'opacity-45')}>
                    <button
                      onClick={() => onToggleItem(item.id)}
                      className={cn(
                        'w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all tap-scale',
                        item.bought ? 'bg-green-500 border-green-500 shadow-[0_0_8px_hsla(142,60%,50%,0.4)]' : 'border-muted-foreground/30 hover:border-primary hover:bg-primary/10'
                      )}
                    >
                      {item.bought && <Check className="w-3.5 h-3.5 text-white check-anim" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className={cn('text-sm font-medium', item.bought && 'line-through text-muted-foreground')}>{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">× {item.quantity}</span>
                      {item.note && <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>}
                      {item.addedByName && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{`Додала: ${item.addedByName}`}</p>}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-accent hover:text-accent/80 tap-scale" onClick={e => e.stopPropagation()}>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => onDeleteItem(item.id)} className="text-destructive/50 hover:text-destructive tap-scale">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border/40 bg-muted/20 relative">
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 glass-strong border border-border/50 rounded-t-xl overflow-hidden z-10 shadow-glass">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Підказки</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onMouseDown={() => pickSuggestion(suggestion)}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 tap-scale transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3">
                <input
                  placeholder="Додати товар..."
                  value={newItem}
                  onChange={e => handleInputChange(e.target.value)}
                  onFocus={() => { setSuggestions(getSuggestions(newItem)); setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="flex-1 h-10 px-3 bg-transparent border border-border/40 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all"
                />
                <input
                  placeholder="Кіл."
                  value={newQty}
                  onChange={e => setNewQty(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="w-14 h-10 px-2 bg-transparent border border-border/40 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all text-center"
                />
                <button
                  onClick={handleAdd}
                  className="w-10 h-10 rounded-xl bg-primary/15 hover:bg-primary/25 flex items-center justify-center text-primary tap-scale transition-all flex-shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
