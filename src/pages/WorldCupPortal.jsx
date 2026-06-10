import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Printer, CheckSquare, Square, ChevronLeft } from 'lucide-react';

const defaultTeams = [
  "อาร์เจนตินา", "บราซิล", "ฝรั่งเศส", "อังกฤษ", "สเปน", 
  "เยอรมนี", "โปรตุเกส", "อิตาลี", "เนเธอร์แลนด์", "เบลเยียม", 
  "โครเอเชีย", "อุรุกวัย", "โคลอมเบีย", "เม็กซิโก", "สหรัฐอเมริกา",
  "ญี่ปุ่น", "เกาหลีใต้", "เซเนกัล", "โมร็อกโก", "สวิตเซอร์แลนด์"
];

function WorldCupPortal() {
  const [wcPrintSettings, setWcPrintSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('wcPrintSettings');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object') {
        return {
          top: typeof parsed.top === 'number' ? parsed.top : 5.5,
          left: typeof parsed.left === 'number' ? parsed.left : 1.5,
          fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : 16
        };
      }
      return { top: 5.5, left: 1.5, fontSize: 16 };
    } catch (e) {
      return { top: 5.5, left: 1.5, fontSize: 16 };
    }
  });

  const [selectedTeams, setSelectedTeams] = useState(defaultTeams);
  const [customTeam, setCustomTeam] = useState("");
  const [teamsList, setTeamsList] = useState(defaultTeams);

  useEffect(() => {
    localStorage.setItem('wcPrintSettings', JSON.stringify(wcPrintSettings));
  }, [wcPrintSettings]);

  const handlePrint = () => {
    if (selectedTeams.length === 0) {
      alert("กรุณาเลือกอย่างน้อย 1 ประเทศ");
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
    if (customTeam.trim() && !teamsList.includes(customTeam.trim())) {
      setTeamsList([...teamsList, customTeam.trim()]);
      setSelectedTeams([...selectedTeams, customTeam.trim()]);
      setCustomTeam("");
    }
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: 14.8cm 10.5cm;
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
              width: 14.8cm;
              height: 10.5cm;
              background: white;
              position: relative;
              padding-top: ${wcPrintSettings.top}cm;
              padding-left: ${wcPrintSettings.left}cm;
              padding-right: 1cm;
              overflow: hidden;
              box-sizing: border-box;
              page-break-after: always;
            }
          }
        `}
      </style>

      <div className="wc-no-print">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <Link to="/staff" className="btn btn-secondary">
            <ChevronLeft size={20} /> กลับหน้าพิมพ์จ่าหน้า
          </Link>
          <div style={{ flex: 1 }}></div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px' }}>
            <div className="card">
              <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={20} className="text-primary" /> เลือกประเทศที่จะพิมพ์
              </h3>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button type="button" onClick={() => setSelectedTeams(teamsList)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  เลือกทั้งหมด
                </button>
                <button type="button" onClick={() => setSelectedTeams([])} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  ไม่เลือกเลย
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {teamsList.map(team => (
                  <label key={team} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', backgroundColor: selectedTeams.includes(team) ? '#eff6ff' : '#f8fafc', border: `1px solid ${selectedTeams.includes(team) ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '6px', transition: 'all 0.2s' }}>
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

              <form onSubmit={addCustomTeam} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={customTeam} 
                  onChange={(e) => setCustomTeam(e.target.value)} 
                  placeholder="เพิ่มชื่อประเทศอื่นๆ..." 
                  className="form-control"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-secondary">เพิ่ม</button>
              </form>
            </div>
          </div>

          <div style={{ flex: '1 1 400px' }}>
            <div className="card glass-panel" style={{ position: 'sticky', top: '1rem' }}>
              <button 
                type="button" 
                onClick={handlePrint}
                className="btn btn-primary" 
                style={{ width: '100%', marginBottom: '1.5rem', fontSize: '1.1rem', padding: '1rem', backgroundColor: '#dc2626' }}
              >
                <Printer size={20} /> พิมพ์ {selectedTeams.length} ประเทศ
              </button>

              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
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
                    <input type="range" min="4" max="36" step="1" value={wcPrintSettings.fontSize} onChange={(e) => setWcPrintSettings(p => ({...p, fontSize: parseInt(e.target.value)}))} style={{ width: '100%' }} />
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', textAlign: 'center' }}>
                ตัวอย่างพื้นที่การพิมพ์ (จำลองสัดส่วนไปรษณียบัตร 14.8 x 10.5 ซม.)
              </div>
              <div style={{ 
                backgroundColor: '#e2e8f0', 
                padding: '1rem', 
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <div style={{ 
                  /* 14.8cm = 559px, 10.5cm = 396px. At scale(0.5): 279.5px x 198px */
                  width: '280px', 
                  height: '198px',
                  position: 'relative'
                }}>
                  <div style={{
                    width: '14.8cm',
                    height: '10.5cm',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    transform: 'scale(0.5)',
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    paddingTop: `${wcPrintSettings.top}cm`,
                    paddingLeft: `${wcPrintSettings.left}cm`,
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      fontSize: `${wcPrintSettings.fontSize}pt`, 
                      fontFamily: 'Sarabun, Inter, sans-serif',
                      fontWeight: 'bold',
                      color: '#000'
                    }}>
                      {selectedTeams.length > 0 ? selectedTeams[0] : "ชื่อประเทศ"}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {selectedTeams.map((team, index) => (
        <div key={index} className="print-only print-area">
          <div style={{ 
            fontSize: `${wcPrintSettings.fontSize}pt`, 
            fontFamily: 'Sarabun, Inter, sans-serif',
            fontWeight: 'bold',
            color: '#000'
          }}>
            {team}
          </div>
        </div>
      ))}
    </>
  );
}

export default WorldCupPortal;
