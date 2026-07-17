import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc, arrayUnion, onSnapshot } from "firebase/firestore";
import { MessageSquare, CornerDownRight, Check, Trash, Send, Award, Calendar, ExternalLink } from "lucide-react";
import { useAuth } from "../lib/auth";

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
  itemTitle: string;
  uid: string;
  userName: string;
  userPhoto: string;
  content: string;
  createdAt: string;
  replies: CommentReply[];
}

export const StudioComments: React.FC = () => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTexts, setReplyTexts] = useState<{ [commentId: string]: string }>({});
  const [submitting, setSubmitting] = useState<{ [commentId: string]: boolean }>({});

  useEffect(() => {
    // Read all comments across all products and subscribe in real-time
    const unsubscribe = onSnapshot(collection(db, "comments"), (snapshot) => {
      const list: Comment[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          itemId: data.itemId || "",
          itemTitle: data.itemTitle || "Unknown Item",
          uid: data.uid || "",
          userName: data.userName || "Student",
          userPhoto: data.userPhoto || "",
          content: data.content || "",
          createdAt: data.createdAt || "",
          replies: data.replies || [],
        };
      });

      // Sort by newest questions first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setComments(list);
      setLoading(false);
    }, (err) => {
      console.error("Comments subscription failed:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePostReply = async (commentId: string) => {
    const text = replyTexts[commentId]?.trim();
    if (!text || !user) return;

    setSubmitting(prev => ({ ...prev, [commentId]: true }));
    try {
      const commentDocRef = doc(db, "comments", commentId);
      const newReply: CommentReply = {
        id: `reply-${Date.now()}`,
        uid: user.uid,
        userName: "Editor Friend", // The admin's brand name!
        userPhoto: user.photoURL || "",
        content: text,
        createdAt: new Date().toISOString(),
        isAdmin: true
      };

      await updateDoc(commentDocRef, {
        replies: arrayUnion(newReply)
      });

      // Clear the input text for this specific comment
      setReplyTexts(prev => ({ ...prev, [commentId]: "" }));
    } catch (err) {
      console.error("Failed to post admin reply:", err);
    } finally {
      setSubmitting(prev => ({ ...prev, [commentId]: false }));
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <div className="animate-spin text-[#E50914] text-2xl mb-3">⏳</div>
        <p className="text-xs font-mono tracking-wider">LOADING PUBLIC INTERACTIONS...</p>
      </div>
    );
  }

  const unrepliedCount = comments.filter(c => !c.replies.some(r => r.isAdmin)).length;

  return (
    <div className="space-y-6 text-white">
      <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Public Q&amp;A Moderation</h1>
          <p className="text-xs text-zinc-500 mt-1 font-light">Interact with and reply to student questions left across your courses and products</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-xl px-5 py-2.5 flex items-center gap-3 shrink-0">
          <MessageSquare className="text-rose-500" size={18} />
          <div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Unreplied Questions</div>
            <div className="text-lg font-bold font-mono text-rose-500">{unrepliedCount}</div>
          </div>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/5 bg-zinc-900/10 rounded-2xl">
          <MessageSquare size={36} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400 text-sm">No comments have been posted yet.</p>
          <p className="text-zinc-600 text-xs mt-1">When users ask questions on product pages, they will list here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => {
            const hasAdminReply = c.replies.some(r => r.isAdmin);
            
            return (
              <div key={c.id} className={`bg-zinc-900/20 border rounded-2xl p-5 transition-all ${hasAdminReply ? "border-white/5" : "border-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.03)]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 pb-2 border-b border-white/[0.03]">
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wider px-2.5 py-1 rounded flex items-center gap-1.5">
                    <ExternalLink size={10} /> ON: {c.itemTitle}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${hasAdminReply ? "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"}`}>
                    {hasAdminReply ? "Replied" : "Needs Reply"}
                  </span>
                </div>

                {/* Original Question */}
                <div className="flex gap-3 items-start">
                  {c.userPhoto ? (
                    <img src={c.userPhoto} alt="" className="w-8 h-8 rounded-full border border-white/10 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 border border-white/5 text-xs">👤</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-4 mb-0.5">
                      <span className="font-semibold text-white text-sm">{c.userName}</span>
                      <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-1"><Calendar size={10} /> {formatDate(c.createdAt)}</span>
                    </div>
                    <p className="text-zinc-300 text-sm font-light leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>

                {/* Replies Thread */}
                {c.replies && c.replies.length > 0 && (
                  <div className="mt-4 pl-4 md:pl-8 space-y-3 border-l border-white/5">
                    {c.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2.5 items-start bg-white/[0.01] border border-white/[0.02] p-3 rounded-xl">
                        <CornerDownRight size={12} className="text-zinc-600 shrink-0 mt-1.5" />
                        {reply.userPhoto ? (
                          <img src={reply.userPhoto} alt="" className="w-6 h-6 rounded-full border border-white/10 shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0 text-[10px]">👤</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="font-semibold text-white text-xs flex items-center gap-1">
                              {reply.userName}
                              {reply.isAdmin && (
                                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-bold uppercase px-1 rounded flex items-center gap-0.5">
                                  <Award size={8} /> Editor
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono">{formatDate(reply.createdAt)}</span>
                          </div>
                          <p className="text-zinc-400 text-xs md:text-sm font-light leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Reply Form */}
                <div className="mt-4 pl-4 md:pl-8 flex gap-3 items-start border-t border-white/[0.03] pt-4">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border border-white/10 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 border border-white/5 text-[10px]">👤</div>
                  )}
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={replyTexts[c.id] || ""}
                      onChange={(e) => setReplyTexts(prev => ({ ...prev, [c.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") handlePostReply(c.id); }}
                      placeholder="Write a public reply..."
                      className="flex-1 bg-zinc-950/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-all"
                    />
                    <button
                      onClick={() => handlePostReply(c.id)}
                      disabled={submitting[c.id] || !(replyTexts[c.id]?.trim())}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs p-2 rounded-lg shrink-0 flex items-center justify-center cursor-pointer transition-colors"
                    >
                      {submitting[c.id] ? "⏳" : <Send size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
