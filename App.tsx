
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PageGate } from './components/PageGate';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { Courses } from './pages/Courses';
import { Services } from './pages/Services';
import { PortfolioPage } from './pages/PortfolioPage';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Library } from './pages/Library';
import { ItemDetail } from './pages/ItemDetail';
import { Login } from './src/components/Login';
import { AuthProvider, useAuth } from './src/lib/auth';
import { isAdminEmail } from './src/lib/adminAuth';
import { ToastProvider, ConfirmProvider, PromptProvider, Spinner } from './src/components/admin/ui';

// Split out of the main bundle: these two routes alone pull in recharts,
// @dnd-kit, jspdf, jspdf-autotable and html2canvas — none of which any
// storefront visitor needs just to browse products. Lazy-loading them means
// the homepage/catalogue no longer has to download, parse, and execute that
// weight before becoming interactive.
const Admin = lazy(() => import('./src/components/Admin'));
const CustomQuotePage = lazy(() => import('./components/CustomQuotePage').then(m => ({ default: m.CustomQuotePage })));

const RouteFallback: React.FC = () => (
  <div className="min-h-screen bg-[#080808] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#E50914] animate-spin" />
  </div>
);

// The admin panel is locked behind Google sign-in. Only the owner accounts
// in ADMIN_EMAILS (youreditorfriend@gmail.com) can open it — anyone else,
// signed in or not, gets the Login gate instead of the panel.
const AdminRoute: React.FC = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] text-zinc-500 flex items-center justify-center gap-2.5 text-sm font-sans">
        <Spinner size={16} /> Checking access…
      </div>
    );
  }

  // Not signed in, or signed in with a non-admin account → show the gate.
  if (!user || !isAdminEmail(user.email)) {
    return <Login />;
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <PromptProvider>
          <Suspense fallback={<RouteFallback />}>
            <Admin onLogout={() => signOut().finally(() => { window.location.href = '/'; })} />
          </Suspense>
        </PromptProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<PageGate id="products"><Products /></PageGate>} />
            <Route path="/products/:id" element={<PageGate id="products"><ItemDetail kind="product" /></PageGate>} />
            <Route path="/courses" element={<PageGate id="courses"><Courses /></PageGate>} />
            <Route path="/courses/:id" element={<PageGate id="courses"><ItemDetail kind="course" /></PageGate>} />
            <Route path="/services" element={<PageGate id="services"><Services /></PageGate>} />
            <Route path="/portfolio" element={<PageGate id="portfolio"><PortfolioPage /></PageGate>} />
            <Route path="/about" element={<PageGate id="about"><About /></PageGate>} />
            <Route path="/contact" element={<PageGate id="contact"><Contact /></PageGate>} />
            <Route path="/my-library" element={<Library />} />
          </Route>
          <Route path="/custom-quote" element={<Suspense fallback={<RouteFallback />}><CustomQuotePage /></Suspense>} />
          <Route path="/admin" element={<AdminRoute />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
