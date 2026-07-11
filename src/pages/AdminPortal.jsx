import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { Shield, UserPlus, Key, Trash2, Users } from 'lucide-react';

export default function AdminPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '', role: 'staff' });
  const [loginError, setLoginError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if already logged in via session storage
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
      setIsLoggedIn(true);
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const usersList = [];
      snapshot.forEach(doc => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersList);
    } catch (err) {
      console.error("Error fetching users:", err);
      setMessage("Failed to load users.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    // Hardcoded master admin fallback (useful for first-time setup)
    if (loginUsername.trim().toLowerCase() === 'admin' && loginPassword.trim() === 'Gpo10501') {
      setIsLoggedIn(true);
      sessionStorage.setItem('adminLoggedIn', 'true');
      fetchUsers();
      
      // Auto-create initial users if they don't exist
      await initializeDefaultUsers();
      return;
    }

    try {
      const q = query(
        collection(db, 'users'), 
        where('username', '==', loginUsername.toLowerCase()), 
        where('password', '==', loginPassword), 
        where('role', '==', 'admin')
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setIsLoggedIn(true);
        sessionStorage.setItem('adminLoggedIn', 'true');
        fetchUsers();
      } else {
        setLoginError('ข้อมูลเข้าระบบไม่ถูกต้อง หรือไม่มีสิทธิ์ Admin');
      }
    } catch (err) {
      console.error(err);
      setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
    }
  };

  const initializeDefaultUsers = async () => {
    try {
      const adminDoc = doc(db, 'users', 'admin');
      const staffDoc = doc(db, 'users', '10501');
      
      await setDoc(adminDoc, { username: 'admin', password: 'Gpo10501', displayName: 'Master Admin', role: 'admin' }, { merge: true });
      await setDoc(staffDoc, { username: '10501', password: '10501', displayName: 'สาขาหลัก 10501', role: 'staff' }, { merge: true });
      
      fetchUsers();
    } catch(e) {
      console.error("Auto init error:", e);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (!newUser.username || !newUser.password) {
      setMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const usernameLower = newUser.username.toLowerCase();
      await setDoc(doc(db, 'users', usernameLower), {
        ...newUser,
        username: usernameLower
      });
      setMessage(`สร้างผู้ใช้ ${usernameLower} สำเร็จ!`);
      setNewUser({ username: '', password: '', displayName: '', role: 'staff' });
      fetchUsers();
    } catch (err) {
      console.error("Error creating user:", err);
      setMessage("เกิดข้อผิดพลาดในการสร้างผู้ใช้");
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ ${username}?`)) return;
    
    try {
      await deleteDoc(doc(db, 'users', username));
      setMessage(`ลบผู้ใช้ ${username} สำเร็จ`);
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      setMessage("เกิดข้อผิดพลาดในการลบผู้ใช้");
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', padding: '1rem' }}>
        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <Shield size={48} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ margin: 0, color: '#1e293b' }}>Admin Portal</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>ระบบจัดการผู้ใช้งาน (เข้าได้เฉพาะแอดมิน)</p>
          </div>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Username</label>
              <input 
                type="text" 
                className="form-control" 
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            
            {loginError && <div style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{loginError}</div>}
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}>
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield size={32} color="#3b82f6" />
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>ระบบจัดการผู้ใช้งาน (Admin Portal)</h1>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setIsLoggedIn(false);
              sessionStorage.removeItem('adminLoggedIn');
            }}
          >
            ออกจากระบบ
          </button>
        </div>

        {message && (
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #bbf7d0' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          
          {/* Create User Form */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <UserPlus size={20} /> เพิ่มผู้ใช้ใหม่
            </h3>
            
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Username (ใช้สำหรับล็อกอิน / รหัสลิงก์)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  placeholder="เช่น 10501 หรือ somchai"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Password (รหัสผ่าน)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="เช่น 1234"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>ชื่อที่แสดง (Display Name)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                  placeholder="เช่น สาขา 10501"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>สิทธิ์การใช้งาน (Role)</label>
                <select 
                  className="form-control" 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="staff">พนักงานทั่วไป (Staff)</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }}>
                บันทึกผู้ใช้ใหม่
              </button>
            </form>
          </div>

          {/* User List */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
              <Users size={20} /> รายชื่อผู้ใช้งานในระบบ
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Username</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>ชื่อแสดง</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>รหัสผ่าน</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>สิทธิ์</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>ไม่มีข้อมูลผู้ใช้</td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{user.username}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>{user.displayName || '-'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', color: '#64748b' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Key size={14} /> {user.password}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '999px', 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold',
                            backgroundColor: user.role === 'admin' ? '#fef08a' : '#e0f2fe',
                            color: user.role === 'admin' ? '#854d0e' : '#0369a1'
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleDeleteUser(user.username)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                            title="ลบผู้ใช้"
                            disabled={user.username === 'admin'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
