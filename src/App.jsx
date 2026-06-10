import React, { useState, useRef, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, User } from 'lucide-react';
import { version } from '../package.json';
import CustomerForm from './pages/CustomerForm';
import StaffPortal from './pages/StaffPortal';
import PrintPostcard from './pages/PrintPostcard';
import PrintBlankForms from './pages/PrintBlankForms';
import WorldCupPortal from './pages/WorldCupPortal';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPrintPage = location.pathname.includes('/print');
  
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef(null);

  useEffect(() => {
    // Some apps like LINE browser might strip the #/staff hash fragment.
    // This allows using ?page=staff as an alternative.
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('page') === 'staff' || searchParams.get('staff') === '1') {
      navigate('/staff', { replace: true });
    }
  }, [navigate]);

  const handleSecretClick = () => {
    setClickCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        navigate('/staff');
        return 0;
      }
      return newCount;
    });

    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 1500); // Reset if not clicked 3 times within 1.5 seconds
  };

  if (isPrintPage) return null; // Hide navigation on print pages

  return (
    <header className="header no-print">
      <Link to="/" className="header-logo">
        <Package size={28} />
        <span>PostcardApp</span>
      </Link>
      <div 
        onClick={handleSecretClick}
        style={{ 
          fontSize: '0.7rem', 
          color: 'var(--text-muted)', 
          opacity: 0.3, 
          fontWeight: 500, 
          cursor: 'pointer', 
          userSelect: 'none',
          textAlign: 'right',
          lineHeight: '1.2'
        }}
        title="Secret Portal Entrance"
      >
        <div>© MrAEK 10501</div>
        <div style={{ fontSize: '0.6rem', marginTop: '0.1rem' }}>v{version}</div>
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
            <Route path="/worldcup" element={<WorldCupPortal />} />
            <Route path="/print-postcard" element={<PrintPostcard />} />
            <Route path="/print-blank-forms" element={<PrintBlankForms />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
