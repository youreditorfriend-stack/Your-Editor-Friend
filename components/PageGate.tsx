import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../src/lib/store';

// Blocks a page that's switched off in the Admin panel, even if someone
// types the URL directly — they get sent back to the home page.
export const PageGate: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { store, loading } = useStore();

  if (loading) {
    return <div className="text-center text-zinc-600 py-32">Loading…</div>;
  }

  const page = store?.pages?.find(p => p.id === id);
  if (page && !page.enabled) return <Navigate to="/" replace />;

  return <>{children}</>;
};
