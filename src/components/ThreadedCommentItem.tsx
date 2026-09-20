import React, { useRef, useEffect } from 'react';
import { Heart, CornerDownRight, Trash2, Send, Loader2 } from 'lucide-react';
import { PostComment, User } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { CommunityRoleBadge } from './CommunityRoleBadge';

interface ThreadedCommentItemProps {
  comment: PostComment;
  postAuthorId: string;
  communityName?: string;
  user: User | null;
  level?: number;
  replyingToId: string | null;
  replyInput: string;
  submittingReply: boolean;
  replyCooldownError: string | null;
  deletingCommentId: string | null;
  isPostAuthorOrStaff: boolean;
  onStartReply: (comment: PostComment) => void;
  onCancelReply: () => void;
  onReplyInputChange: (val: string) => void;
  onSubmitReply: (parentId: string, targetAuthorUsername: string) => void;
  onToggleLike: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  formatTime: (timestamp: string) => string;
}

export const ThreadedCommentItem: React.FC<ThreadedCommentItemProps> = ({
  comment,
  postAuthorId,
  communityName,
  user,
  level = 0,
  replyingToId,
  replyInput,
  submittingReply,
  replyCooldownError,
  deletingCommentId,
  isPostAuthorOrStaff,
  onStartReply,
  onCancelReply,
  onReplyInputChange,
  onSubmitReply,
  onToggleLike,
  onDeleteComment,
  formatTime
}) => {
  const isPostCreator = comment.authorId === postAuthorId;
  const isCommentAuthor = user && user.id === comment.authorId;
  const canDelete = isCommentAuthor || isPostAuthorOrStaff;
  const isReplying = replyingToId === comment.id;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isReplying && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isReplying]);

  // Highlight @mentions in comment text
  const renderContent = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={idx}
            className="text-[#ff5500] font-mono-code font-semibold hover:underline"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!submittingReply && replyInput.trim()) {
        onSubmitReply(comment.id, comment.authorUsername);
      }
    } else if (e.key === 'Escape') {
      onCancelReply();
    }
  };

  return (
    <div
      id={`comment-${comment.id}`}
      className={`${
        level === 0
          ? 'py-3 space-y-1.5 bg-transparent'
          : 'border-l-2 border-[#232938] hover:border-[#ff5500]/40 pl-3 sm:pl-3.5 py-1.5 space-y-1 bg-transparent transition-colors'
      }`}
    >
      {/* Author Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <img
            src={
              comment.authorAvatar ||
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'
            }
            alt={comment.authorUsername}
            className={`${
              level === 0 ? 'w-5 h-5' : 'w-4 h-4'
            } rounded-full object-cover border border-[#232938] shrink-0`}
          />
          <span className={`${level === 0 ? 'text-xs' : 'text-[11px]'} font-bold text-white`}>
            {comment.authorDisplayName || comment.authorUsername}
          </span>
          <div className="flex items-center gap-1 text-[10px] font-mono-code text-[#ff5500]">
            <span>@{comment.authorUsername}</span>
            {comment.authorVerified && <VerifiedBadge size="sm" />}
          </div>

          {/* Post Creator Tag */}
          {isPostCreator && (
            <span className="text-[10px] font-mono-code font-bold text-[#ff5500] inline-flex items-center">
              Creator
            </span>
          )}

          {/* Community Role Badge */}
          {comment.authorCommunityRole && (
            <CommunityRoleBadge
              role={comment.authorCommunityRole}
              communityName={communityName}
              size="xs"
            />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono-code text-[#525a6c]">
            {formatTime(comment.createdAt)}
          </span>

          {canDelete && (
            <button
              id={`btn-delete-comment-${comment.id}`}
              onClick={() => onDeleteComment(comment.id)}
              disabled={deletingCommentId === comment.id}
              className="text-[#525a6c] hover:text-red-400 p-0.5 transition-colors cursor-pointer"
              title="Delete comment"
            >
              {deletingCommentId === comment.id ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Trash2 size={11} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Comment Body */}
      <p
        className={`text-xs ${
          level === 0 ? 'text-[#d1d5db] pl-6 sm:pl-7' : 'text-[#c3c8d4] pl-5'
        } leading-relaxed break-words`}
      >
        {renderContent(comment.content)}
      </p>

      {/* Actions (Like & Reply) */}
      <div className={`flex items-center gap-3 ${level === 0 ? 'pl-6 sm:pl-7' : 'pl-5'} pt-0.5`}>
        <button
          id={`btn-like-comment-${comment.id}`}
          onClick={() => onToggleLike(comment.id)}
          className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-mono-code transition-colors cursor-pointer ${
            comment.likedByMe ? 'text-red-500 font-bold' : 'text-[#6b7280] hover:text-white'
          }`}
          title="Like"
        >
          <Heart size={11} className={comment.likedByMe ? 'fill-current text-red-500' : ''} />
          <span>{comment.likes || 0}</span>
        </button>

        <button
          id={`btn-reply-comment-${comment.id}`}
          onClick={() => onStartReply(comment)}
          className={`text-[10px] sm:text-[11px] font-mono-code flex items-center gap-1 transition-colors cursor-pointer ${
            isReplying ? 'text-[#ff5500] font-bold' : 'text-[#6b7280] hover:text-[#ff5500]'
          }`}
          title="Reply"
        >
          <CornerDownRight size={11} />
          <span>Reply</span>
        </button>
      </div>

      {/* Reply Cooldown notice */}
      {isReplying && replyCooldownError && (
        <div className={`${level === 0 ? 'pl-6 sm:pl-7' : 'pl-5'} pt-1 text-[11px] text-amber-400 font-mono-code`}>
          {replyCooldownError}
        </div>
      )}

      {/* Inline Reply Composer targeted at this comment */}
      {isReplying && (
        <div className={`${level === 0 ? 'pl-6 sm:pl-7' : 'pl-5'} pt-2`}>
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={replyInput}
              onChange={e => onReplyInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Reply to @${comment.authorUsername}...`}
              disabled={submittingReply}
              className="flex-1 px-2.5 py-1.5 bg-transparent border-b border-[#232938] focus:border-[#ff5500] text-xs text-white placeholder-[#525a6c] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={onCancelReply}
              disabled={submittingReply}
              className="px-2 py-1 text-[11px] font-mono-code text-[#6b7280] hover:text-white transition-colors cursor-pointer shrink-0"
            >
              Cancel
            </button>
            <button
              id={`btn-send-reply-${comment.id}`}
              onClick={() => onSubmitReply(comment.id, comment.authorUsername)}
              disabled={submittingReply || !replyInput.trim()}
              className="px-2.5 py-1 bg-[#ff5500] hover:bg-[#e64d00] disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              {submittingReply ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              <span>Reply</span>
            </button>
          </div>
        </div>
      )}

      {/* Nested Multi-level Replies with vertical thread line */}
      {comment.replies && comment.replies.length > 0 && (
        <div className={`${level === 0 ? 'pl-5 sm:pl-6 pt-2 space-y-2' : 'pl-2 sm:pl-2.5 pt-1.5 space-y-1.5'}`}>
          {comment.replies.map(reply => (
            <ThreadedCommentItem
              key={reply.id}
              comment={reply}
              postAuthorId={postAuthorId}
              communityName={communityName}
              user={user}
              level={level + 1}
              replyingToId={replyingToId}
              replyInput={replyInput}
              submittingReply={submittingReply}
              replyCooldownError={replyCooldownError}
              deletingCommentId={deletingCommentId}
              isPostAuthorOrStaff={isPostAuthorOrStaff}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onReplyInputChange={onReplyInputChange}
              onSubmitReply={onSubmitReply}
              onToggleLike={onToggleLike}
              onDeleteComment={onDeleteComment}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </div>
  );
};
