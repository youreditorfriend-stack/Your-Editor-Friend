// Reusable Chat History service.
//
// Persists every assistant conversation to Firestore so it can be reviewed
// later (e.g. from the Admin panel). Structure:
//
//   chats/{conversationId}                     ← one doc per chat session
//     { uid, email, createdAt, updatedAt }
//   chats/{conversationId}/messages/{turnId}   ← one doc per exchange
//     { userMessage, aiMessage, createdAt }
//
// The UI only needs newConversationId() once per session, then recordTurn()
// after each user⇄assistant exchange. All writes are best-effort — callers
// should swallow errors so a logging failure never breaks the chat.

import { db, auth } from '../firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// A url-safe id that also satisfies the Firestore rules' isValidId() pattern.
export function newConversationId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `chat_${Date.now()}_${rand}`;
}

// Create (or touch) the parent conversation doc. Safe to call once per session.
export async function startConversation(conversationId: string): Promise<void> {
  await setDoc(
    doc(db, 'chats', conversationId),
    {
      uid: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// Save one user → AI exchange with a server timestamp.
export async function saveChatTurn(
  conversationId: string,
  userMessage: string,
  aiMessage: string
): Promise<void> {
  await addDoc(collection(db, 'chats', conversationId, 'messages'), {
    userMessage: (userMessage || '').slice(0, 5000),
    aiMessage: (aiMessage || '').slice(0, 20000),
    createdAt: serverTimestamp(),
  });
  // Bump the parent's activity time so conversations can be ordered by recency.
  await setDoc(
    doc(db, 'chats', conversationId),
    { updatedAt: serverTimestamp() },
    { merge: true }
  );
}
