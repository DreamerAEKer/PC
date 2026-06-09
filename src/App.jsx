import React, { useState, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, User } from 'lucide-react';
import { version } from '../package.json';
import CustomerForm from './pages/CustomerForm';
import StaffPortal from './pages/StaffPortal';
import PrintPostcard from './pages/PrintPostcard';
import PrintBlankForms from './pages/PrintBlankForms';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPrintPage = location.pathname.includes('/print');
  
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef(null);

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
        style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.3, fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}
        title="Secret Portal Entrance"
      >
        © MrAEK 10501 v{version}
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
