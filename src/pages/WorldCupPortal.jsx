import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Printer, CheckSquare, ChevronLeft, X, List } from 'lucide-react';

const zones = [
  {
    name: "โซนยุโรป (UEFA - 16 ทีม)",
    teams: ["อังกฤษ", "ฝรั่งเศส", "โครเอเชีย", "โปรตุเกส", "เยอรมนี", "เนเธอร์แลนด์", "เบลเยียม", "ออสเตรีย", "สวิตเซอร์แลนด์", "สเปน", "สกอตแลนด์", "ตุรกี", "สวีเดน", "สาธารณรัฐเช็ก", "นอร์เวย์", "บอสเนีย"]
  },
  {
    name: "โซนแอฟริกา (CAF - 10 ทีม)",
    teams: ["โมร็อกโก", "ตูนิเซีย", "อียิปต์", "แอลจีเรีย", "กานา", "เคปเวิร์ด", "แอฟริกาใต้", "ไอวอรีโคสต์", "เซเนกัล", "ดีอาร์ คองโก"]
  },
  {
    name: "โซนเอเชีย (AFC - 9 ทีม)",
    teams: ["ญี่ปุ่น", "อิหร่าน", "เกาหลีใต้", "อุซเบกิสถาน", "จอร์แดน", "ออสเตรเลีย", "กาตาร์", "ซาอุดีอาระเบีย", "อิรัก"]
  },
  {
    name: "โซนอเมริกาเหนือ อเมริกากลาง และแคริบเบียน (CONCACAF - 6 ทีม)",
    teams: ["แคนาดา", "เม็กซิโก", "สหรัฐอเมริกา", "ปานามา", "คอสตาริกา", "จาเมกา"]
  },
  {
    name: "โซนอเมริกาใต้ (CONMEBOL - 6 ทีม)",
    teams: ["บราซิล", "อาร์เจนตินา", "อุรุกวัย", "โคลอมเบีย", "เอกวาดอร์", "ปารากวัย"]
  },
  {
    name: "โซนโอเชียเนีย (OFC - 1 ทีม)",
    teams: ["นิวซีแลนด์"]
  }
];

const allInitialTeams = zones.flatMap(z => z.teams);

function WorldCupPortal() {
  const [wcPrintSettings, setWcPrintSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('wcPrintSettings');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object') {
        return {
          top: typeof parsed.top === 'number' ? parsed.top : 5.5,
          left: typeof parsed.left === 'number' ? parsed.left : 8,
          fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : 16,
          paperSize: typeof parsed.paperSize === 'string' ? parsed.paperSize : 'A6',
          calX: typeof parsed.calX === 'number' ? parsed.calX : 0,
          calY: typeof parsed.calY === 'number' ? parsed.calY : 0
        };
      }
      return { top: 5.5, left: 8, fontSize: 16, paperSize: 'A6', calX: 0, calY: 0 };
    } catch (e) {
      return { top: 5.5, left: 8, fontSize: 16, paperSize: 'A6', calX: 0, calY: 0 };
    }
  });

  const [selectedTeams, setSelectedTeams] = useState(() => {
    try {
      const saved = localStorage.getItem('wcSelectedTeams');
      if (saved) return JSON.parse(saved);
      return allInitialTeams;
    } catch (e) {
      return allInitialTeams;
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [customTeam, setCustomTeam] = useState("");
  const [customTeamsList, setCustomTeamsList] = useState(() => {
    try {
      const saved = localStorage.getItem('wcCustomTeamsList');
      if (saved) return JSON.parse(saved);
      return [];
    } catch (e) {
      return [];
    }
  });

  const [printTeam, setPrintTeam] = useState(() => {
    try {
      const saved = localStorage.getItem('wcPrintTeam');
      if (saved) return saved;
      return "อาร์เจนตินา";
    } catch (e) {
      return "อาร์เจนตินา";
    }
  });

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMainDropdownOpen, setIsMainDropdownOpen] = useState(false);
  const [mainSearchFilter, setMainSearchFilter] = useState("");
  const [activeZoneFilter, setActiveZoneFilter] = useState("ทั้งหมด");
  const [isPortrait, setIsPortrait] = useState(() => {
    const saved = localStorage.getItem('wcIsPortrait');
    if (saved === null) return true;
    return saved === 'true';
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const container = document.getElementById('country-dropdown-container');
      if (container && !container.contains(event.target)) {
        setIsMainDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('wcPrintSettings', JSON.stringify(wcPrintSettings));
    localStorage.setItem('wcSelectedTeams', JSON.stringify(selectedTeams));
    localStorage.setItem('wcCustomTeamsList', JSON.stringify(customTeamsList));
    localStorage.setItem('wcPrintTeam', printTeam);
    localStorage.setItem('wcIsPortrait', isPortrait);
  }, [wcPrintSettings, selectedTeams, customTeamsList, printTeam, isPortrait]);

  const handleDragStart = (e) => {
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;

    e.preventDefault();

    const initialTop = wcPrintSettings.top;
    const initialLeft = wcPrintSettings.left;

    const isA4 = wcPrintSettings.paperSize === 'A4';
    const scale = isA4 ? 0.25 : 0.5;
    const pixelsPerCm = 37.795 * scale;

    const handleDragMove = (moveEvent) => {
      const currentX = moveEvent.clientX !== undefined ? moveEvent.clientX : (moveEvent.touches && moveEvent.touches[0] && moveEvent.touches[0].clientX);
      const currentY = moveEvent.clientY !== undefined ? moveEvent.clientY : (moveEvent.touches && moveEvent.touches[0] && moveEvent.touches[0].clientY);
      if (currentX === undefined || currentY === undefined) return;

      const deltaX = currentX - clientX;
      const deltaY = currentY - clientY;

      const deltaLeftCm = deltaX / pixelsPerCm;
      const deltaTopCm = deltaY / pixelsPerCm;

      let newLeft = Math.max(0, Math.min(15, Math.round((initialLeft + deltaLeftCm) * 10) / 10));
      let newTop = Math.max(0, Math.min(10, Math.round((initialTop + deltaTopCm) * 10) / 10));

      setWcPrintSettings(prev => ({
        ...prev,
        left: newLeft,
        top: newTop
      }));
    };

    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  };

  const handlePrint = () => {
    if (!printTeam.trim()) {
      alert("กรุณาระบุประเทศที่ต้องการพิมพ์ 1 ประเทศ");
      return;
    }
    window.print();
  };

  const toggleTeam = (team) => {
    setSelectedTeams(prev => 
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  };

  const addCustomTeam = (e) => {
    e.preventDefault();
    if (customTeam.trim() && !allInitialTeams.includes(customTeam.trim()) && !customTeamsList.includes(customTeam.trim())) {
      setCustomTeamsList([...customTeamsList, customTeam.trim()]);
      setSelectedTeams([...selectedTeams, customTeam.trim()]);
      setCustomTeam("");
    }
  };

  const selectZone = (teams) => {
    setSelectedTeams(prev => {
      const set = new Set(prev);
      teams.forEach(t => set.add(t));
      return Array.from(set);
    });
  };

  const deselectZone = (teams) => {
    setSelectedTeams(prev => prev.filter(t => !teams.includes(t)));
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: ${wcPrintSettings.paperSize === 'A4' ? '29.7cm 21.0cm' : (isPortrait ? '10.5cm 14.8cm' : '14.8cm 10.5cm')};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            .wc-no-print {
              display: none !important;
            }
            .print-area {
              width: ${isPortrait ? '10.5cm' : '14.8cm'};
              height: ${isPortrait ? '14.7cm' : '10.4cm'};
              background: white;
              position: relative !important;
              overflow: hidden;
              color: black !important;
            }
            .print-a4-wrapper {
              width: 29.7cm;
              height: 21.0cm;
              position: relative;
              background: white;
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
          
          /* Modal Styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            z-index: 50;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 1rem;
          }
          .modal-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 800px;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
          }
          .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
          }
          .modal-body {
            padding: 1.5rem;
            overflow-y: auto;
            flex: 1;
          }
          .modal-close {
            background: transparent;
            border: none;
            cursor: pointer;
            color: #64748b;
            padding: 0.5rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }
          .modal-close:hover {
            background: #e2e8f0;
            color: #0f172a;
          }
        `}
      </style>

      {/* Main Screen */}
      <div className="wc-no-print container" style={{ maxWidth: '700px', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
          <Link to="/staff" className="btn btn-secondary">
            <ChevronLeft size={20} /> กลับ
          </Link>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>ฟุตบอลโลก 2026</h2>
        </div>

        <div className="card glass-panel">
          
          <div style={{ marginBottom: '2rem' }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.75rem' }}>ระบุประเทศที่จะพิมพ์ (1 ประเทศ)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }} id="country-dropdown-container">
                <div 
                  className="form-control" 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'white', fontSize: '1.1rem', padding: '0.8rem 1rem' }}
                  onClick={() => setIsMainDropdownOpen(!isMainDropdownOpen)}
                >
                  <span style={{ color: printTeam ? '#000' : '#64748b' }}>{printTeam || "คลิกเพื่อเลือกประเทศ..."}</span>
                  <span style={{ fontSize: '0.8rem' }}>▼</span>
                </div>
                
                {isMainDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 10, padding: '0.5rem', maxHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                    <input 
                      type="text"
                      autoFocus
                      autoComplete="off"
                      spellCheck="false"
                      placeholder="พิมพ์ค้นหาชื่อประเทศ..."
                      value={mainSearchFilter}
                      onChange={e => setMainSearchFilter(e.target.value)}
                      className="form-control"
                      style={{ marginBottom: '0.5rem' }}
                    />
                    
                    <div style={{ display: 'flex', gap: '0.4rem', paddingBottom: '0.5rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                      {["ทั้งหมด", "ยุโรป", "แอฟริกา", "เอเชีย", "CONCACAF", "อเมริกาใต้", "โอเชียเนีย", "อื่น ๆ"].map(zone => (
                        <button
                          key={zone}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveZoneFilter(zone); }}
                          style={{
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.75rem',
                            borderRadius: '20px',
                            border: '1px solid',
                            borderColor: activeZoneFilter === zone ? '#3b82f6' : '#cbd5e1',
                            background: activeZoneFilter === zone ? '#eff6ff' : 'white',
                            color: activeZoneFilter === zone ? '#1d4ed8' : '#475569',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {zone}
                        </button>
                      ))}
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {selectedTeams
                        .filter(t => {
                          if (activeZoneFilter === "ทั้งหมด") return true;
                          if (activeZoneFilter === "อื่น ๆ") return !allInitialTeams.includes(t);
                          const z = zones.find(z => z.name.includes(activeZoneFilter));
                          return z ? z.teams.includes(t) : true;
                        })
                        .filter(t => t.toLowerCase().includes(mainSearchFilter.toLowerCase()))
                        .map(t => (
                        <div 
                          key={t}
                          onClick={() => { 
                            setPrintTeam(t); 
                            setIsMainDropdownOpen(false); 
                            setMainSearchFilter(""); 
                            setActiveZoneFilter("ทั้งหมด");
                          }}
                          style={{ padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px', backgroundColor: printTeam === t ? '#eff6ff' : 'transparent', fontWeight: printTeam === t ? 'bold' : 'normal' }}
                          onMouseEnter={e => { if(printTeam !== t) e.target.style.backgroundColor = '#f8fafc'; }}
                          onMouseLeave={e => { if(printTeam !== t) e.target.style.backgroundColor = 'transparent'; }}
                        >
                          {t}
                        </div>
                      ))}
                      {selectedTeams
                        .filter(t => {
                          if (activeZoneFilter === "ทั้งหมด") return true;
                          if (activeZoneFilter === "อื่น ๆ") return !allInitialTeams.includes(t);
                          const z = zones.find(z => z.name.includes(activeZoneFilter));
                          return z ? z.teams.includes(t) : true;
                        })
                        .filter(t => t.toLowerCase().includes(mainSearchFilter.toLowerCase())).length === 0 && (
                        <div style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                          ไม่พบประเทศในหมวดหมู่นี้ (ตรวจสอบใน "จัดการรายชื่อ")
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => setIsSettingsOpen(true)} 
                className="btn btn-secondary"
                title="จัดการรายชื่อประเทศที่ชื่นชอบ"
              >
                <List size={22} /> จัดการรายชื่อ
              </button>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
              สามารถพิมพ์ค้นหาได้เลย ระบบจะแสดงเฉพาะประเทศที่คุณได้ตั้งค่าเลือกไว้
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            {/* Left Column: Settings and Controls */}
            <div style={{ flex: '1 1 500px', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 600 }}>
                <Settings size={18} /> ตั้งค่าตำแหน่งการพิมพ์ (อ้างอิงจากกรอบ "แชมป์คือ")
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>ขยับลง (ซม.): {wcPrintSettings.top}</label>
                  <input type="range" min="0" max="10" step="0.5" value={wcPrintSettings.top} onChange={(e) => setWcPrintSettings(p => ({...p, top: parseFloat(e.target.value)}))} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>ขยับขวา (ซม.): {wcPrintSettings.left}</label>
                  <input type="range" min="0" max="15" step="0.5" value={wcPrintSettings.left} onChange={(e) => setWcPrintSettings(p => ({...p, left: parseFloat(e.target.value)}))} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>ขนาดตัวอักษร: {wcPrintSettings.fontSize}</label>
                  <input type="range" min="8" max="48" step="1" value={wcPrintSettings.fontSize} onChange={(e) => setWcPrintSettings(p => ({...p, fontSize: parseInt(e.target.value)}))} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.8rem', color: '#334155' }}>รูปแบบไปรษณียบัตร</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="radio" name="main_isPortrait" checked={!isPortrait} onChange={() => setIsPortrait(false)} />
                      แนวนอน (14.8 x 10.5 ซม.)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="radio" name="main_isPortrait" checked={isPortrait} onChange={() => setIsPortrait(true)} />
                      แนวตั้ง (10.5 x 14.8 ซม.)
                    </label>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.8rem', color: '#334155' }}>ขนาดกระดาษพิมพ์จริง</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="radio" name="wc_paperSize" checked={wcPrintSettings.paperSize === 'A6'} onChange={() => setWcPrintSettings(p => ({...p, paperSize: 'A6'}))} />
                      ไปรษณียบัตรเดี่ยว (A6)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="radio" name="wc_paperSize" checked={wcPrintSettings.paperSize === 'A4'} onChange={() => setWcPrintSettings(p => ({...p, paperSize: 'A4'}))} />
                      กระดาษ A4 (พิมพ์เดี่ยวมุมบนซ้าย)
                    </label>
                  </div>
                </div>
                
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                    <button type="button" onClick={() => setIsGuideOpen(true)} style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="ดูรูปคู่มือการป้อนกระดาษ">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                      <span style={{ fontSize: '0.75rem', marginLeft: '0.2rem', textDecoration: 'underline' }}>ดูรูปตัวอย่างการป้อนกระดาษเข้าเครื่อง</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Printer Calibration Offset section */}
              <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', marginTop: '1.5rem', paddingTop: '1rem', backgroundColor: '#fffbeb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem', color: '#b45309' }}>⚙️ ปรับชดเชยระยะเครื่องพิมพ์ (สำหรับชดเชยระยะช่องใส่กระดาษเบี้ยว):</label>
                <p style={{ fontSize: '0.75rem', color: '#d97706', margin: '0 0 0.75rem 0', lineHeight: '1.4' }}>
                  *แก้ปัญหางานพิมพ์เลื่อนไม่ตรงช่อง โดยที่การตั้งค่าจัดเลย์เอาต์หน้าจอหลักยังแสดงรูปภาพตรงสวยงามตามปกติ (ค่าชดเชยนี้จะส่งผลต่อตอนกดพิมพ์ออกเครื่องพิมพ์เท่านั้น)
                </p>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '130px' }}>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>ชดเชยซ้าย/ขวา (แกน X): {wcPrintSettings.calX > 0 ? `ขวา +${wcPrintSettings.calX}` : wcPrintSettings.calX < 0 ? `ซ้าย ${wcPrintSettings.calX}` : '0'} ซม.</label>
                    <input type="range" min="-10" max="10" step="0.1" value={wcPrintSettings.calX || 0} onChange={(e) => setWcPrintSettings(p => ({...p, calX: parseFloat(e.target.value)}))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: '130px' }}>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>ชดเชยบน/ล่าง (แกน Y): {wcPrintSettings.calY > 0 ? `ล่าง +${wcPrintSettings.calY}` : wcPrintSettings.calY < 0 ? `บน ${wcPrintSettings.calY}` : '0'} ซม.</label>
                    <input type="range" min="-10" max="10" step="0.1" value={wcPrintSettings.calY || 0} onChange={(e) => setWcPrintSettings(p => ({...p, calY: parseFloat(e.target.value)}))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="button" onClick={() => setWcPrintSettings(p => ({...p, calX: 0, calY: 0}))} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: '#d97706', color: '#b45309', backgroundColor: '#fff', margin: 0, cursor: 'pointer' }}>รีเซ็ตชดเชย</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Preview & Print Button */}
            <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem', textAlign: 'center', fontWeight: 600 }}>
                ตัวอย่างพื้นที่การพิมพ์ ({wcPrintSettings.paperSize === 'A4' ? 'จำลองกระดาษ A4 แนวนอน 29.7 x 21 ซม.' : `จำลองสัดส่วนไปรษณียบัตร ${isPortrait ? 'แนวตั้ง 10.5 x 14.8 ซม.' : 'แนวนอน 14.8 x 10.5 ซม.'}`})
              </div>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.5rem', textAlign: 'center', fontWeight: 600 }}>
                🖱️ ใช้เมาส์คลิก/แตะลากชื่อประเทศเพื่อปรับตำแหน่งได้อิสระ
              </div>
              <div style={{ 
                backgroundColor: '#e2e8f0', 
                padding: '1.5rem', 
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '1rem',
                width: '100%',
                maxWidth: '340px'
              }}>
                <div style={{ 
                  width: wcPrintSettings.paperSize === 'A4' ? '280px' : (isPortrait ? '198px' : '280px'), 
                  height: wcPrintSettings.paperSize === 'A4' ? '198px' : (isPortrait ? '280px' : '198px'),
                  position: 'relative'
                }}>
                  {wcPrintSettings.paperSize === 'A4' ? (
                    <div style={{
                      width: '29.7cm',
                      height: '21.0cm',
                      backgroundColor: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transform: 'scale(0.25)',
                      transformOrigin: 'top left',
                      boxSizing: 'border-box'
                    }}>
                      {/* Dash lines representing A4 divisions */}
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '29.7cm', height: '21.0cm', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                        <div style={{ borderRight: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', position: 'relative', overflow: 'hidden' }}>
                          {/* Ideal Position guide (if calibrated) */}
                          {(wcPrintSettings.calX !== 0 || wcPrintSettings.calY !== 0) && (
                            <div 
                              onMouseDown={handleDragStart}
                              onTouchStart={handleDragStart}
                              style={{
                                position: 'absolute',
                                top: `${wcPrintSettings.top}cm`,
                                left: `${wcPrintSettings.left}cm`,
                                fontSize: `${wcPrintSettings.fontSize}pt`, 
                                fontFamily: 'Sarabun, Inter, sans-serif',
                                fontWeight: 'bold',
                                color: '#94a3b8',
                                opacity: 0.5,
                                whiteSpace: 'nowrap',
                                border: '1px dashed #94a3b8',
                                padding: '2px',
                                cursor: 'grab',
                                userSelect: 'none',
                                pointerEvents: 'auto'
                              }}
                            >
                              {printTeam || "ชื่อประเทศ"} (ตำแหน่งบนการ์ด)
                            </div>
                          )}
                          {/* Calibrated print position */}
                          <div 
                            onMouseDown={handleDragStart}
                            onTouchStart={handleDragStart}
                            style={{
                              position: 'absolute',
                              top: `${wcPrintSettings.top + (wcPrintSettings.calY || 0)}cm`,
                              left: `${wcPrintSettings.left + (wcPrintSettings.calX || 0)}cm`,
                              fontSize: `${wcPrintSettings.fontSize}pt`, 
                              fontFamily: 'Sarabun, Inter, sans-serif',
                              fontWeight: 'bold',
                              color: (wcPrintSettings.calX !== 0 || wcPrintSettings.calY !== 0) ? '#d97706' : '#000',
                              whiteSpace: 'nowrap',
                              border: (wcPrintSettings.calX !== 0 || wcPrintSettings.calY !== 0) ? '1px dashed #d97706' : 'none',
                              padding: (wcPrintSettings.calX !== 0 || wcPrintSettings.calY !== 0) ? '2px' : '0',
                              cursor: 'grab',
                              userSelect: 'none',
                              pointerEvents: 'auto'
                            }}
                          >
                            {printTeam || "ชื่อประเทศ"}
                          </div>
                        </div>
                        <div style={{ borderBottom: '1px dashed #cbd5e1' }}></div>
                        <div style={{ borderRight: '1px dashed #cbd5e1' }}></div>
                        <div></div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      width: isPortrait ? '10.5cm' : '14.8cm',
                      height: isPortrait ? '14.8cm' : '10.5cm',
                      backgroundColor: 'white',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      transform: 'scale(0.5)',
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}>
                      {/* Ideal Position guide (if calibrated) */}
                      {(wcPrintSettings.calX !== 0 || wcPrintSettings.calY !== 0) && (
                        <div 
                          onMouseDown={handleDragStart}
                          onTouchStart={handleDragStart}
                          style={{
                            position: 'absolute',
                            top: `${wcPrintSettings.top}cm`,
                            left: `${wcPrintSettings.left}cm`,
                            fontSize: `${wcPrintSettings.fontSize}pt`, 
                            fontFamily: 'Sarabun, Inter, sans-serif',
                            fontWeight: 'bold',
                            color: '#94a3b8',
                            opacity: 0.5,
                            whiteSpace: 'nowrap',
                            border: '1px dashed #94a3b8',
                            padding: '2px',
                            cursor: 'grab',
                            userSelect: 'none',
                            pointerEvents: 'auto'
                          }}
                        >
                          {printTeam || "ชื่อประเทศ"} (ตำแหน่งบนการ์ด)
                        </div>
                      )}
                      {/* Calibrated print position */}
                      <div 
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        style={{ 
                          position: 'absolute',
                          top: `${wcPrintSettings.top + (wcPrintSettings.calY || 0)}cm`,
                          left: `${wcPrintSettings.left + (wcPrintSettings.calX || 0)}cm`,
                          fontSize: `${wcPrintSettings.fontSize}pt`, 
                          fontFamily: 'Sarabun, Inter, sans-serif',
                          fontWeight: 'bold',
                          color: (wcPrintSettings.calX !== 0 || wcPrintSettings.calY !== 0) ? '#d97706' : '#000',
                          whiteSpace: 'nowrap',
                          border: (wcPrintSettings.calX !== 0 || wcPrintSettings.calY !== 0) ? '1px dashed #d97706' : 'none',
                          padding: (wcPrintSettings.calX !== 0 || wcPrintSettings.calY !== 0) ? '2px' : '0',
                          cursor: 'grab',
                          userSelect: 'none',
                          pointerEvents: 'auto'
                        }}
                      >
                        {printTeam || "ชื่อประเทศ"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="button" 
                onClick={handlePrint}
                className="btn btn-primary" 
                style={{ width: '100%', fontSize: '1.2rem', padding: '1rem', backgroundColor: '#dc2626' }}
                disabled={!printTeam.trim()}
              >
                <Printer size={24} /> พิมพ์ "{printTeam || "..."}"
              </button>
            </div>
          </div>

          {/* Guide Modal */}
          {isGuideOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    คู่มือการป้อนกระดาษ
                  </h3>
                  <button onClick={() => setIsGuideOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.5rem' }}>
                    ✕
                  </button>
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                  <h4 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>แบบที่ 1: ใส่ช่องด้านบน/หลัง (เช่น Canon PIXMA iP2700)</h4>
                  <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>สอดกระดาษ <strong>แนวนอน</strong> ลงไปตรงกลาง <strong>(หันหน้าที่มีลายพิมพ์เข้าหาตัว และเอาด้านที่มีรหัสไปรษณีย์ 10900 ใส่ลงไปในเครื่อง)</strong> เพื่อให้พิมพ์ลงในช่องว่างใต้คำว่า "แชมป์คือ" พอดี<br/><strong>บนเว็บให้เลือก:</strong> แนวนอน</p>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '2rem', textAlign: 'center', background: '#f8fafc' }}>
                    <img src="./guide_ip2700.png" alt="การป้อนกระดาษแนวตั้ง Canon iP2700" style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }} />
                  </div>

                  <h4 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>แบบที่ 2: ป้อนมือด้านหน้า (เช่น Brother Laser)</h4>
                  <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>จัดวางทิศทางของกระดาษ ในแนวตั้ง ตามล็อดกระดาษ ขนาด A6 ตามตัวอย่างในรูปภาพ  โดยหงายด้านว่างขึ้นบน และจำกัดการใส่สูงสุดไม่เกิน 100 ใบ<br/><strong>บนเว็บให้เลือก:</strong> แนวนอน</p>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', textAlign: 'center', background: '#f8fafc' }}>
                    <img src="./guide_brother.png" alt="การป้อนกระดาษแนวตั้ง Brother Laser" style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }} />
                  </div>
                  
                  <div style={{ marginTop: '2rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px', fontSize: '0.85rem', color: '#1e3a8a' }}>
                    <strong>คำแนะนำ:</strong> ไดร์เวอร์เครื่องพิมพ์ (ในหน้าต่าง Print ของ Chrome) แนะนำให้ตั้งขนาดกระดาษ (Paper Size) เป็น A6 หรือขนาดใกล้เคียง (14.8x10.5 ซม.) ครับ
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="wc-no-print modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                <CheckSquare size={24} className="text-primary" /> จัดการรายชื่อประเทศที่จะให้เลือกได้
              </h3>
              <button className="modal-close" onClick={() => setIsSettingsOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="ค้นหาชื่อประเทศในรายการนี้..." 
                  className="form-control"
                  style={{ flex: 1 }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <button type="button" onClick={() => setSelectedTeams([...allInitialTeams, ...customTeamsList])} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  เลือกทั้งหมด 48 ทีม
                </button>
                <button type="button" onClick={() => setSelectedTeams([])} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  ไม่เลือกเลย
                </button>
              </div>

              {zones.map(zone => {
                const filteredTeams = zone.teams.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
                if (filteredTeams.length === 0) return null;
                return (
                  <div key={zone.name} style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.25rem', borderBottom: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>{zone.name}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => selectZone(filteredTeams)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>เลือกโซนนี้</button>
                        <button onClick={() => deselectZone(filteredTeams)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>เอาโซนนี้ออก</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                      {filteredTeams.map(team => (
                      <label key={team} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.4rem', backgroundColor: selectedTeams.includes(team) ? '#eff6ff' : '#f8fafc', border: `1px solid ${selectedTeams.includes(team) ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '4px', transition: 'all 0.2s' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedTeams.includes(team)} 
                          onChange={() => toggleTeam(team)} 
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.95rem' }}>{team}</span>
                      </label>
                    ))}
                  </div>
                </div>
                );
              })}

              <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#334155', marginBottom: '0.75rem', paddingBottom: '0.25rem', borderBottom: '1px solid #e2e8f0' }}>
                  พิมพ์ระบุชื่อประเทศเอง
                </h4>
                
                {customTeamsList.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                    {customTeamsList.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase())).map(team => (
                      <label key={team} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.4rem', backgroundColor: selectedTeams.includes(team) ? '#eff6ff' : '#f8fafc', border: `1px solid ${selectedTeams.includes(team) ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '4px', transition: 'all 0.2s' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedTeams.includes(team)} 
                          onChange={() => toggleTeam(team)} 
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.95rem' }}>{team}</span>
                      </label>
                    ))}
                  </div>
                )}

                <form onSubmit={addCustomTeam} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={customTeam} 
                    onChange={(e) => setCustomTeam(e.target.value)} 
                    placeholder="พิมพ์ชื่อประเทศที่ต้องการเพิ่ม..." 
                    className="form-control"
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-secondary">เพิ่มเข้าในรายการ</button>
                </form>
              </div>
            </div>
            


            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsSettingsOpen(false)} className="btn btn-primary" style={{ minWidth: '120px' }}>
                บันทึกและปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actual Print Area (1 page for the selected printTeam) */}
      {wcPrintSettings.paperSize === 'A4' ? (
        <div className="print-only print-a4-wrapper">
          <div className="print-area" style={{ width: isPortrait ? '10.5cm' : '14.8cm', height: isPortrait ? '14.8cm' : '10.5cm', position: 'absolute', top: 0, left: 0 }}>
            <div style={{ 
              position: 'absolute',
              top: `${wcPrintSettings.top + (wcPrintSettings.calY || 0)}cm`,
              left: `${wcPrintSettings.left + (wcPrintSettings.calX || 0)}cm`,
              fontSize: `${wcPrintSettings.fontSize}pt`, 
              fontFamily: 'Sarabun, Inter, sans-serif',
              fontWeight: 'bold',
              color: '#000',
              whiteSpace: 'nowrap',
              margin: 0,
              padding: 0
            }}>
              {printTeam}
            </div>
          </div>
        </div>
      ) : (
        <div className="print-only print-area">
          <div style={{ 
            position: 'absolute',
            top: `${wcPrintSettings.top + (wcPrintSettings.calY || 0)}cm`,
            left: `${wcPrintSettings.left + (wcPrintSettings.calX || 0)}cm`,
            fontSize: `${wcPrintSettings.fontSize}pt`, 
            fontFamily: 'Sarabun, Inter, sans-serif',
            fontWeight: 'bold',
            color: '#000',
            whiteSpace: 'nowrap',
            margin: 0,
            padding: 0
          }}>
            {printTeam}
          </div>
        </div>
      )}
    </>
  );
}

export default WorldCupPortal;
