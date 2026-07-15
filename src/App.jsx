import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const checkPhoneStatus = (val) => {
  if (!val || typeof val !== 'string' || val.trim() === '') return 'empty';
  const digits = val.replace(/\D/g, '');
  if (digits.length >= 9 && digits.length <= 10 && digits.startsWith('0')) return 'valid';
  if (digits.length === 11 && digits.startsWith('66')) return 'valid';
  return 'invalid';
};
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Package, User, Bell } from 'lucide-react';
import { version } from '../package.json';
import CustomerForm from './pages/CustomerForm';
import StaffPortal from './pages/StaffPortal';
import PrintPostcard from './pages/PrintPostcard';
import PrintBlankForms from './pages/PrintBlankForms';
import WorldCupPortal from './pages/WorldCupPortal';
import AdminPortal from './pages/AdminPortal';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isPrintPage = location.pathname.includes('/print');
  const isCustomerPage = location.pathname === '/';
  
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState({
    newCustomerOrders: 0,
    newCustomerOrdersList: [],
    invalidPhoneOrders: 0,
    total: 0
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const staffParam = searchParams.get('staff');
    const branchParam = searchParams.get('branch');
    const deptCode = branchParam || staffParam || '10501';

    const q = query(
      collection(db, 'orders'),
      where('dept', '==', deptCode),
      where('printed', '==', false),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let newCustomerCount = 0;
      let newCustomerList = [];
      let invalidCount = 0;
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.deleted) return; // Skip soft-deleted items
        
        if (data.importSource === 'customer_app') {
          newCustomerCount++;
          newCustomerList.push({ id: docSnap.id, ...data });
        }
        
        // Check phone validity (main)
        let isInvalid = false;
        if (data.phone && checkPhoneStatus(data.phone) === 'invalid') {
          isInvalid = true;
        } else if (data.subBookings && Array.isArray(data.subBookings)) {
          isInvalid = data.subBookings.some(sub => sub.phone && checkPhoneStatus(sub.phone) === 'invalid');
        }
        
        if (isInvalid) {
          invalidCount++;
        }
      });
      
      setNotifications({
        newCustomerOrders: newCustomerCount,
        newCustomerOrdersList: newCustomerList,
        invalidPhoneOrders: invalidCount,
        total: newCustomerCount + invalidCount
      });
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [location.search, location.pathname]);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {!isCustomerPage && (
          <>
            <button 
              onClick={() => setShowModal(true)} 
              title="การแจ้งเตือน"
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                color: 'var(--text-color)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '8px',
                borderRadius: '50%',
                position: 'relative'
              }}
            >
              <Bell size={20} />
              {notifications.total > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '0px',
                  right: '0px',
                  background: '#e11d48',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                  padding: '1px 5px',
                  pointerEvents: 'none'
                }}>
                  {notifications.total}
                </span>
              )}
            </button>

            {showModal && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }}
                  onClick={() => setShowModal(false)}
                />
                <div style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  zIndex: 9999,
                  width: '90%',
                  maxWidth: '400px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }}>
                  <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', color: '#1e293b' }}>
                    <Bell size={20} color="#f59e0b" /> การแจ้งเตือน
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1.25rem 0' }}>
                    {notifications.total === 0 ? (
                      <div style={{ textAlign: 'center', color: '#64748b', padding: '1rem 0' }}>ไม่มีการแจ้งเตือนใหม่</div>
                    ) : (
                      <>
                        {notifications.newCustomerOrders > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ fontWeight: 'bold', color: '#166534', paddingBottom: '0.25rem', borderBottom: '1px solid #bbf7d0', fontSize: '0.9rem' }}>
                              ออเดอร์ใหม่จากลูกค้า ({notifications.newCustomerOrders} รายการ)
                            </div>
                            {notifications.newCustomerOrdersList.map((order, idx) => (
                              <div 
                                key={order.id || idx}
                                onClick={() => {
                                  setShowModal(false);
                                  navigate('/staff?filter=customer_app');
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', borderLeft: '4px solid #22c55e', cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
                              >
                                <div>
                                  <div style={{ fontWeight: 'bold', color: '#166534', fontSize: '0.95rem' }}>{order.name || order.senderNickname || 'ไม่ระบุชื่อ'}</div>
                                  <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '2px' }}>จำนวน {order.quantity || 0} ใบ</div>
                                </div>
                                <div style={{ background: '#22c55e', color: 'white', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                  ใหม่
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {notifications.invalidPhoneOrders > 0 && (
                          <div 
                            onClick={() => {
                              setShowModal(false);
                              navigate('/staff?filter=invalid_phone');
                            }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fffbeb', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #f59e0b', cursor: 'pointer' }}
                          >
                            <div>
                              <div style={{ fontWeight: 'bold', color: '#b45309' }}>เบอร์โทรศัพท์ไม่สมบูรณ์</div>
                              <div style={{ fontSize: '0.85rem', color: '#d97706' }}>ออเดอร์รอพิมพ์ที่เบอร์ไม่ครบ</div>
                            </div>
                            <div style={{ background: '#f59e0b', color: 'white', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem' }}>
                              {notifications.invalidPhoneOrders}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setShowModal(false)}
                    className="btn"
                    style={{ width: '100%', background: '#f1f5f9', color: '#475569', fontWeight: 'bold', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </>
            )}
          </>
        )}
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
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/print-postcard" element={<PrintPostcard />} />
            <Route path="/print-blank-forms" element={<PrintBlankForms />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
