import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, arrayUnion, onSnapshot, orderBy } from "firebase/firestore";
import { useAuth } from "../lib/auth";
import { MessageSquare, Send, CornerDownRight, ShieldCheck, HelpCircle } from "lucide-react";

export interface CommentReply {
  id: string;
  uid: string;
  userName: string;
  userPhoto: string;
  content: string;
  createdAt: string;
  isAdmin: boolean;
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
  replies: CommentReply[];
}

interface CommentsSectionProps {
  itemId: string;
  itemTitle: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ itemId, itemTitle }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!itemId) return;

    // Real-time subscription to comments on this item
    const q = query(
      collection(db, "comments"),
      where("itemId", "==", itemId)
    );

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
          replies: data.replies || [],
        };
      });

      // Sort client-side to ensure index is not required immediately
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setComments(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Comments subscription failed:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [itemId]);

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
        replies: []
      });
      setNewComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Just now";
    }
  };

  return (
    <div className="mt-14 border-t border-white/5 pt-10">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="text-[#E50914]" size={20} />
        <h2 className="text-xl md:text-2xl font-semibold text-white">Questions &amp; Answers</h2>
        <span className="text-xs bg-zinc-800 text-zinc-400 font-mono px-2 py-0.5 rounded-full ml-1.5">
          {comments.length}
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
      ) : comments.length === 0 ? (
        <div className="text-zinc-500 text-xs py-6 border border-dashed border-white/5 rounded-2xl text-center">
          No questions yet. Be the first to ask!
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((c) => (
            <div key={c.id} className="bg-zinc-900/20 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors">
              <div className="flex gap-3.5 items-start">
                {c.userPhoto ? (
                  <img
                    src={c.userPhoto}
                    alt={c.userName}
                    className="w-9 h-9 rounded-full shrink-0 border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 text-sm border border-white/5">
                    👤
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1.5 gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{c.userName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-light">{c.content}</p>
                </div>
              </div>

              {/* Nested Replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="mt-4 pl-6 md:pl-10 space-y-3 border-l border-white/5">
                  {c.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3 items-start bg-white/[0.01] rounded-xl p-3 border border-white/[0.02]">
                      <CornerDownRight size={14} className="text-zinc-600 shrink-0 mt-2" />
                      {reply.userPhoto ? (
                        <img
                          src={reply.userPhoto}
                          alt={reply.userName}
                          className={`w-7 h-7 rounded-full shrink-0 border ${reply.isAdmin ? "border-red-500/30" : "border-white/10"}`}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 text-xs">
                          👤
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                          <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                            {reply.userName}
                            {reply.isAdmin && (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <ShieldCheck size={9} /> Editor
                              </span>
                            )}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">{formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="text-zinc-400 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-light">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
