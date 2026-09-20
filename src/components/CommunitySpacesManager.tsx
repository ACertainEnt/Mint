import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Flame,
  Palette,
  Award,
  Zap,
  Tag,
  Loader2,
  X
} from 'lucide-react';
import { CommunitySpace } from '../types';

interface CommunitySpacesManagerProps {
  communityId: string;
  spaces: CommunitySpace[];
  onSaveSpace: (space: Partial<CommunitySpace>) => Promise<void>;
  onDeleteSpace: (spaceId: string) => Promise<void>;
}

const SPACE_ICON_OPTIONS = [
  { id: 'layers', label: 'Spaces', icon: Layers },
  { id: 'sparkles', label: 'Drops / Featured', icon: Sparkles },
  { id: 'palette', label: 'Artwork / Media', icon: Palette },
  { id: 'flame', label: 'Trending / Alpha', icon: Flame },
  { id: 'message', label: 'Discussions', icon: MessageSquare },
  { id: 'zap', label: 'Announcements', icon: Zap },
  { id: 'award', label: 'Milestones', icon: Award },
];

export const CommunitySpacesManager: React.FC<CommunitySpacesManagerProps> = ({
  communityId,
  spaces,
  onSaveSpace,
  onDeleteSpace
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [spaceName, setSpaceName] = useState('');
  const [spaceDescription, setSpaceDescription] = useState('');
  const [spaceIcon, setSpaceIcon] = useState('layers');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setSpaceName('');
    setSpaceDescription('');
    setSpaceIcon('layers');
    setEditingSpaceId(null);
    setIsEditing(false);
    setError(null);
  };

  const handleStartEdit = (space: CommunitySpace) => {
    setEditingSpaceId(space.id);
    setSpaceName(space.name);
    setSpaceDescription(space.description || '');
    setSpaceIcon(space.icon || 'layers');
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = spaceName.trim().replace(/^#+/, ''); // Enforce no # prefixes
    if (!cleanName || saving) return;

    setSaving(true);
    setError(null);

    try {
      const payload: Partial<CommunitySpace> = {
        id: editingSpaceId || `space_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        communityId,
        name: cleanName,
        slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: spaceDescription.trim() || undefined,
        icon: spaceIcon,
        order: spaces.length + 1,
        createdAt: new Date().toISOString()
      };

      await onSaveSpace(payload);
      resetForm();
    } catch (err: any) {
      setError(err?.message || 'Failed to save Space');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-center justify-between pb-2 border-b border-[#212634]">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Layers size={14} className="text-[#ff5500]" />
            <span>Community Spaces ({spaces.length})</span>
          </h4>
          <p className="text-[10px] text-[#6b7280] font-mono-code">
            Organize discussions into distinct Spaces. Navigation uses clean &gt; pathways (no &quot;#&quot; prefixes).
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => { resetForm(); setIsEditing(true); }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#ff5500] hover:bg-[#e64d00] text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-[#ff5500]/20"
          >
            <Plus size={13} />
            <span>New Space</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="p-4 bg-[#0d1017] border border-[#232938] rounded-xl space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#212634]">
            <span className="text-xs font-bold text-white">
              {editingSpaceId ? 'Edit Space' : 'Create New Community Space'}
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-[#8e97a8] hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-white block mb-1">
              Space Name * <span className="text-[10px] font-mono-code text-[#ff5500]">(e.g. General, Drops, Artwork)</span>
            </label>
            <input
              type="text"
              required
              value={spaceName}
              onChange={e => setSpaceName(e.target.value.replace(/^#+/, ''))}
              placeholder="e.g. General Discussions, Drops & Trades"
              className="w-full px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-white block mb-1">Space Description</label>
            <input
              type="text"
              value={spaceDescription}
              onChange={e => setSpaceDescription(e.target.value)}
              placeholder="What this Space is about..."
              className="w-full px-3 py-1.5 bg-[#141822] border border-[#232938] rounded-lg text-xs text-white focus:outline-none focus:border-[#ff5500]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-white block mb-1.5">Space Icon</label>
            <div className="flex items-center gap-2 flex-wrap">
              {SPACE_ICON_OPTIONS.map(opt => {
                const IconComp = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSpaceIcon(opt.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono-code transition-all ${
                      spaceIcon === opt.id
                        ? 'border-[#ff5500] bg-[#ff5500]/10 text-[#ff5500]'
                        : 'border-[#232938] bg-[#141822] text-[#8e97a8] hover:text-white'
                    }`}
                  >
                    <IconComp size={12} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-2 rounded-lg bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#212634]">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#8e97a8] hover:text-white bg-[#161a24]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !spaceName.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#ff5500] hover:bg-[#e64d00] text-white flex items-center gap-1.5 transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              <span>{editingSpaceId ? 'Update Space' : 'Create Space'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {spaces.length === 0 ? (
            <div className="p-6 text-center bg-[#0d1017] border border-[#232938] rounded-xl">
              <Layers size={24} className="mx-auto text-[#6b7280] mb-2" />
              <h4 className="text-xs font-bold text-white">No Custom Spaces Yet</h4>
              <p className="text-[11px] text-[#8e97a8] mt-1 mb-3">
                Default General space is currently handling all posts. Add dedicated spaces like "Drops", "Artwork", or "Trading".
              </p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ff5500] text-white inline-flex items-center gap-1.5"
              >
                <Plus size={13} />
                <span>Create Space</span>
              </button>
            </div>
          ) : (
            spaces.map(space => (
              <div
                key={space.id}
                className="p-3 bg-[#0d1017] border border-[#232938] hover:border-[#384259] rounded-xl flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#161a24] border border-[#232938] flex items-center justify-center text-[#ff5500] shrink-0">
                    <Layers size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{space.name}</span>
                      {space.isDefault && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono-code bg-[#232938] text-[#8e97a8]">
                          Default
                        </span>
                      )}
                    </div>
                    {space.description && (
                      <p className="text-[11px] text-[#8e97a8] truncate max-w-[200px] sm:max-w-md">
                        {space.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(space)}
                    className="p-1.5 rounded-lg text-[#8e97a8] hover:text-white bg-[#141822] hover:bg-[#202737] transition-colors"
                    title="Edit Space"
                  >
                    <Edit2 size={13} />
                  </button>
                  {!space.isDefault && (
                    <button
                      type="button"
                      onClick={() => onDeleteSpace(space.id)}
                      className="p-1.5 rounded-lg text-[#8e97a8] hover:text-red-400 bg-[#141822] hover:bg-red-950/30 transition-colors"
                      title="Delete Space"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
