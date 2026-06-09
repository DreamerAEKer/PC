import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Package, User } from 'lucide-react';
import CustomerForm from './pages/CustomerForm';
import StaffPortal from './pages/StaffPortal';
import PrintPostcard from './pages/PrintPostcard';
import PrintBlankForms from './pages/PrintBlankForms';

function Navigation() {
  const location = useLocation();
  const isPrintPage = location.pathname.includes('/print');

  if (isPrintPage) return null; // Hide navigation on print pages

  return (
    <header className="header no-print">
      <Link to="/" className="header-logo">
        <Package size={28} />
        <span>PostcardApp</span>
      </Link>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.3, fontWeight: 500 }}>
        © MrAEK 10501
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <div className="container">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<CustomerForm />} />
            <Route path="/staff" element={<StaffPortal />} />
            <Route path="/print-postcard" element={<PrintPostcard />} />
            <Route path="/print-blank-forms" element={<PrintBlankForms />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
