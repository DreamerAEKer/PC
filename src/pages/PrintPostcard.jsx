import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Settings2 } from 'lucide-react';

export default function PrintPostcard() {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state?.data;
  
  const [fontSize, setFontSize] = useState(14); // default 14px

  const printSettings = (() => {
    try {
      const saved = localStorage.getItem('customPrintSettings');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object') {
        return {
          didPrintMode: typeof parsed.didPrintMode === 'string' ? parsed.didPrintMode : 'did',
          isNameBold: typeof parsed.isNameBold === 'boolean' ? parsed.isNameBold : true,
          isPhoneBold: typeof parsed.isPhoneBold === 'boolean' ? parsed.isPhoneBold : true,
        };
      }
      return { didPrintMode: 'did', isNameBold: true, isPhoneBold: true };
    } catch (e) {
      return { didPrintMode: 'did', isNameBold: true, isPhoneBold: true };
    }
  })();

  if (!data) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '3rem' }}>
        <h2>ไม่มีข้อมูลสำหรับพิมพ์</h2>
        <button onClick={() => navigate('/staff')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          กลับไปหน้าเจ้าหน้าที่
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: 14.8cm 10.5cm; /* Landscape A6 / Postcard */
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
          }
          
          .print-area {
            width: 14.8cm;
            height: 10.5cm;
            background: white;
            border: 1px solid #ccc;
            margin: 2rem auto;
            position: relative;
            padding: 4cm 1cm 1cm 3cm;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
            box-sizing: border-box;
          }
          
          @media print {
            .print-area {
              border: none;
              box-shadow: none;
              margin: 0;
            }
          }
        `}
      </style>

      <div className="container no-print" style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/staff')} className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={18} /> กลับ
        </button>

        <div className="card glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>ตั้งค่าการพิมพ์ไปรษณียบัตร</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>ขนาด 14.8 x 10.5 ซม.</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--background)', padding: '0.75rem 1.5rem', borderRadius: '8px' }}>
            <Settings2 size={20} color="var(--primary)" />
            <label style={{ fontWeight: '500' }}>ขนาดตัวอักษร: {fontSize}px</label>
            <input 
              type="range" 
              min="10" 
              max="24" 
              value={fontSize} 
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{ width: '150px' }}
            />
          </div>

          <button onClick={handlePrint} className="btn btn-primary" style={{ fontSize: '1.1rem' }}>
            <Printer size={20} /> สั่งพิมพ์
          </button>
        </div>
      </div>

      <div className="print-area">
        <div style={{ fontSize: `${fontSize}px`, lineHeight: '1.6', fontFamily: 'Sarabun, Inter, sans-serif', paddingTop: '1em' }}>
          {data.did && printSettings.didPrintMode !== 'address' ? (
            <div style={{ paddingLeft: '2em' }}>
              <div style={{ fontWeight: printSettings.isNameBold ? 'bold' : 'normal', fontSize: '1.2em', marginBottom: '0.2em' }}>
                {data.name}
              </div>
              <div style={{ fontSize: '1em', marginBottom: '0.5em' }}>
                โทร. <span style={{ fontWeight: printSettings.isPhoneBold ? 'bold' : 'normal' }}>{data.phone}</span>
              </div>
              {!(data.did && data.did.trim().length === 6) && (
                <div style={{ fontSize: '0.85em', color: '#333', lineHeight: '1.4', marginBottom: '0.5em' }}>
                  {data.address} {data.zipcode}
                </div>
              )}
              <div style={{ fontSize: '2em', fontWeight: '900', letterSpacing: '0.05em', color: '#000', marginTop: '0.5em' }}>
                {data.did}
              </div>
            </div>
          ) : (
            <>
              <div style={{ paddingLeft: '2em', fontWeight: printSettings.isNameBold ? 'bold' : 'normal', fontSize: '1.2em', marginBottom: '0.2em' }}>
                {data.name}
              </div>
              <div style={{ paddingLeft: '2em', fontSize: '1em', marginBottom: '0.5em' }}>
                โทร. <span style={{ fontWeight: printSettings.isPhoneBold ? 'bold' : 'normal' }}>{data.phone}</span>
              </div>
              <div style={{ paddingLeft: '2em', lineHeight: '1.4' }}>
                {data.address}
              </div>
              <div style={{ paddingLeft: '2em', marginTop: '0.2em', fontWeight: 'bold', fontSize: '1.3em', letterSpacing: '0.1em' }}>
                {data.zipcode}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
