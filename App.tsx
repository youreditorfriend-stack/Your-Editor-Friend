
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
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
import { CustomQuotePage } from './components/CustomQuotePage';
import Admin from './src/components/Admin';
import { Login } from './src/components/Login';
import { AuthProvider, useAuth } from './src/lib/auth';
import { isAdminEmail } from './src/lib/adminAuth';

// The admin panel is locked behind Google sign-in. Only the owner accounts
// in ADMIN_EMAILS (youreditorfriend@gmail.com) can open it — anyone else,
// signed in or not, gets the Login gate instead of the panel.
const AdminRoute: React.FC = () => {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans','Segoe UI',sans-serif", fontSize: 14 }}>
        Checking access…
      </div>
    );
  }

  // Not signed in, or signed in with a non-admin account → show the gate.
  if (!user || !isAdminEmail(user.email)) {
    return <Login />;
  }

  return <Admin onLogout={() => signOut().finally(() => { window.location.href = '/'; })} />;
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
          <Route path="/custom-quote" element={<CustomQuotePage />} />
          <Route path="/admin" element={<AdminRoute />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
