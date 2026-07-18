import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../lib/auth";
import { isAdminEmail } from "../lib/adminAuth";
import { MessageSquare, Send, CornerDownRight, ShieldCheck, HelpCircle, Pencil, Trash2, ChevronDown, ChevronUp, Reply as ReplyIcon, X, Check } from "lucide-react";

// A reply is either a legacy entry embedded in a comment's `replies[]` array
// (admin-only, written before threaded replies existed — read-only here, no
// own Firestore doc to edit/delete) or a flat comment document with
// `parentCommentId` set (the current write path for every new reply,
// available to any signed-in user). `isDoc` distinguishes the two so we only
// show Edit/Delete for entries that are actually addressable documents.
export interface CommentReply {
  id: string;
  uid: string;
  userName: string;
  userPhoto: string;
  content: string;
  createdAt: string;
  isAdmin: boolean;
  editedAt?: string;
  isDoc?: boolean;
}

export interface Comment {
  id: string;
  itemId: string;
  itemTitle: string; // Course or Product name
  uid: string;
  userName: string;
  userPhoto: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  parentCommentId?: string;
  isAdmin?: boolean;
  replies: CommentReply[]; // legacy embedded replies only
}

interface CommentsSectionProps {
  itemId: string;
  itemTitle: string;
}

const REPLIES_COLLAPSE_THRESHOLD = 2;

export const CommentsSection: React.FC<CommentsSectionProps> = ({ itemId, itemTitle }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Edit state (one comment/reply editable at a time)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  // Delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reply compose state (one open at a time)
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [postingReply, setPostingReply] = useState(false);

  // Collapsed-by-default reply threads, keyed by top-level comment id
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!itemId) return;

    // Real-time subscription — fetches both top-level comments and flat
    // replies (parentCommentId set) for this item; grouped client-side below.
    const q = query(collection(db, "comments"), where("itemId", "==", itemId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Comment[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          itemId: data.itemId || "",
          itemTitle: data.itemTitle || "",
          uid: data.uid || "",
          userName: data.userName || "Anonymous User",
          userPhoto: data.userPhoto || "",
          content: data.content || "",
          createdAt: data.createdAt || "",
          editedAt: data.editedAt || undefined,
          parentCommentId: data.parentCommentId || undefined,
          isAdmin: !!data.isAdmin,
          replies: data.replies || [],
        };
      });
      setRows(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Comments subscription failed:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [itemId]);

  // Group into top-level questions + their combined reply list (flat docs +
  // legacy embedded array), newest question first, replies oldest first.
  const threads = useMemo(() => {
    const topLevel = rows.filter(r => !r.parentCommentId);
    const repliesByParent: Record<string, CommentReply[]> = {};
    rows.filter(r => r.parentCommentId).forEach(r => {
      const list = (repliesByParent[r.parentCommentId!] ||= []);
      list.push({
        id: r.id, uid: r.uid, userName: r.userName, userPhoto: r.userPhoto,
        content: r.content, createdAt: r.createdAt, isAdmin: !!r.isAdmin,
        editedAt: r.editedAt, isDoc: true,
      });
    });

    topLevel.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return topLevel.map(c => {
      const combined = [...(repliesByParent[c.id] || []), ...c.replies.map(r => ({ ...r, isDoc: false }))];
      combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return { comment: c, replies: combined };
    });
  }, [rows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "comments"), {
        itemId,
        itemTitle,
        uid: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Student",
        userPhoto: user.photoURL || "",
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
        replies: [],
      });
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (id: string, content: string) => {
    setConfirmDeleteId(null);
    setEditingId(id);
    setEditText(content);
  };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };

  const saveEdit = async (id: string) => {
    const text = editText.trim();
    if (!text) return;
    setSavingEditId(id);
    try {
      await updateDoc(doc(db, "comments", id), { content: text, editedAt: new Date().toISOString() });
      setEditingId(null);
      setEditText("");
    } catch (err) {
      console.error("Failed to save comment edit:", err);
    } finally {
      setSavingEditId(null);
    }
  };

  const confirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "comments", id));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const startReply = (parentId: string) => {
    setEditingId(null);
    setReplyingId(parentId);
    setReplyText("");
  };
  const cancelReply = () => { setReplyingId(null); setReplyText(""); };

  const postReply = async (parentId: string) => {
    const text = replyText.trim();
    if (!text || !user) return;
    setPostingReply(true);
    try {
      const admin = isAdminEmail(user.email);
      await addDoc(collection(db, "comments"), {
        itemId,
        itemTitle,
        parentCommentId: parentId,
        uid: user.uid,
        userName: admin ? "Editor Friend" : (user.displayName || user.email?.split("@")[0] || "Student"),
        userPhoto: user.photoURL || "",
        content: text,
        createdAt: new Date().toISOString(),
        isAdmin: admin,
        replies: [],
      });
      setReplyingId(null);
      setReplyText("");
      setExpandedThreads(prev => ({ ...prev, [parentId]: true }));
    } catch (err) {
      console.error("Failed to post reply:", err);
    } finally {
      setPostingReply(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return "Just now";
    }
  };

  // Shared row renderer for a top-level question or one of its replies.
  const renderRow = (row: { id: string; uid: string; userName: string; userPhoto: string; content: string; createdAt: string; editedAt?: string; isAdmin?: boolean }, opts: { editable: boolean; isReply?: boolean }) => {
    const mine = !!user && row.uid === user.uid;
    const isEditing = editingId === row.id;
    const isConfirmingDelete = confirmDeleteId === row.id;

    return (
      <div className="flex gap-3 items-start">
        {row.userPhoto ? (
          <img
            src={row.userPhoto}
            alt={row.userName}
            className={`rounded-full shrink-0 border ${opts.isReply ? "w-7 h-7 border-white/10" : "w-9 h-9 border-white/10"} ${row.isAdmin ? "border-red-500/30" : ""}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 border border-white/5 ${opts.isReply ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm"}`}>
            👤
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1 gap-2 flex-wrap">
            <span className={`font-semibold text-white ${opts.isReply ? "text-xs" : "text-sm"} flex items-center gap-1.5`}>
              {row.userName}
              {row.isAdmin && (
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <ShieldCheck size={9} /> Editor
                </span>
              )}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
              {formatDate(row.createdAt)}
              {row.editedAt && <span className="text-zinc-600 italic">(edited)</span>}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={opts.isReply ? 2 : 3}
                autoFocus
                className="w-full bg-zinc-950/60 border border-white/10 rounded-lg p-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#E50914] transition-all resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => saveEdit(row.id)}
                  disabled={savingEditId === row.id || !editText.trim()}
                  className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-green-500 text-black font-semibold text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check size={12} /> {savingEditId === row.id ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-zinc-300 leading-relaxed whitespace-pre-wrap font-light ${opts.isReply ? "text-xs md:text-sm text-zinc-400" : "text-sm"}`}>
              {row.content}
            </p>
          )}

          {/* Own-comment actions: Edit / Delete (+ Reply, top-level questions only) */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-2">
              {!opts.isReply && user && (
                <button
                  onClick={() => (replyingId === row.id ? cancelReply() : startReply(row.id))}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <ReplyIcon size={11} /> Reply
                </button>
              )}
              {opts.editable && mine && !isConfirmingDelete && (
                <>
                  <button
                    onClick={() => startEdit(row.id, row.content)}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(row.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </>
              )}
              {isConfirmingDelete && (
                <span className="flex items-center gap-2 text-[11px]">
                  <span className="text-zinc-400">Delete this {opts.isReply ? "reply" : "question"}?</span>
                  <button
                    onClick={() => confirmDelete(row.id)}
                    disabled={deletingId === row.id}
                    className="text-red-400 hover:text-red-300 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === row.id ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                    Cancel
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-14 border-t border-white/5 pt-10">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="text-[#E50914]" size={20} />
        <h2 className="text-xl md:text-2xl font-semibold text-white">Questions &amp; Answers</h2>
        <span className="text-xs bg-zinc-800 text-zinc-400 font-mono px-2 py-0.5 rounded-full ml-1.5">
          {threads.length}
        </span>
      </div>

      {/* Input box */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-8 flex gap-4 items-start">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || ""}
              className="w-10 h-10 rounded-full border border-white/10 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center shrink-0 border border-white/10">
              👤
            </div>
          )}
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Have a question? Ask the editor..."
              rows={3}
              required
              className="w-full bg-zinc-950/60 border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#E50914] transition-all resize-none"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Posting..." : <><Send size={12} /> Post Question</>}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 text-center mb-8">
          <HelpCircle className="mx-auto text-zinc-500 mb-2" size={24} />
          <p className="text-sm text-zinc-400">Have a question about this item? Log in to start the discussion.</p>
        </div>
      )}

      {/* List comments */}
      {loading ? (
        <div className="text-zinc-600 text-xs py-4">Loading discussion board...</div>
      ) : threads.length === 0 ? (
        <div className="text-zinc-500 text-xs py-6 border border-dashed border-white/5 rounded-2xl text-center">
          No questions yet. Be the first to ask!
        </div>
      ) : (
        <div className="space-y-6">
          {threads.map(({ comment: c, replies }) => {
            const expanded = expandedThreads[c.id] ?? replies.length <= REPLIES_COLLAPSE_THRESHOLD;
            return (
              <div key={c.id} className="bg-zinc-900/20 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors">
                {renderRow(c, { editable: true })}

                {/* Reply compose box */}
                {replyingId === c.id && (
                  <div className="mt-4 pl-6 md:pl-10 space-y-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      rows={2}
                      autoFocus
                      className="w-full bg-zinc-950/60 border border-white/10 rounded-lg p-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#E50914] transition-all resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => postReply(c.id)}
                        disabled={postingReply || !replyText.trim()}
                        className="inline-flex items-center gap-1.5 bg-[#E50914] hover:bg-red-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <Send size={11} /> {postingReply ? "Posting..." : "Post reply"}
                      </button>
                      <button onClick={cancelReply} className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer">
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Collapse toggle for long reply threads */}
                {replies.length > REPLIES_COLLAPSE_THRESHOLD && (
                  <button
                    onClick={() => setExpandedThreads(prev => ({ ...prev, [c.id]: !expanded }))}
                    className="mt-4 pl-6 md:pl-10 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {expanded ? "Hide replies" : `View ${replies.length} replies`}
                  </button>
                )}

                {/* Nested Replies */}
                {expanded && replies.length > 0 && (
                  <div className="mt-4 pl-6 md:pl-10 space-y-3 border-l border-white/5">
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3 items-start bg-white/[0.01] rounded-xl p-3 border border-white/[0.02]">
                        <CornerDownRight size={14} className="text-zinc-600 shrink-0 mt-2" />
                        <div className="flex-1 min-w-0">
                          {renderRow(reply, { editable: !!reply.isDoc, isReply: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
