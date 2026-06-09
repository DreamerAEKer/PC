import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';

export default function PrintBlankForms() {
  const navigate = useNavigate();
  const [branchName, setBranchName] = React.useState('ไปรษณีย์กลาง 10501');

  React.useEffect(() => {
    const savedBranch = localStorage.getItem('branchName');
    if (savedBranch) {
      setBranchName(savedBranch);
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 0.5cm;
            }
            body {
              background: white;
              margin: 0;
            }
          }
          
          .a4-container {
            width: 29.7cm;
            min-height: 21cm;
            background: white;
            margin: 0 auto;
            border: 1px solid #ccc;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            padding: 0;
            gap: 0;
            box-sizing: border-box;
          }

          @media print {
            .a4-container {
              border: none;
              box-shadow: none;
              margin: 0;
              width: 100%;
              height: 100%;
              page-break-inside: avoid;
            }
          }

          .blank-form {
            border: 1px dashed #94a3b8;
            padding: 0.8cm 1.2cm;
            display: flex;
            flex-direction: column;
            position: relative;
            box-sizing: border-box;
          }

          .line-input {
            border-bottom: 1px dotted #000;
            flex: 1;
            margin-left: 0.5rem;
            min-height: 1.5rem;
            display: inline-block;
          }
        `}
      </style>

      <div className="container no-print" style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/staff')} className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={18} /> กลับ
        </button>

        <div className="card glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>พิมพ์ฟอร์มเปล่าสำหรับเขียนมือ</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>ขนาด A4 (แบ่ง 4 ส่วน)</p>
          </div>
          <button onClick={handlePrint} className="btn btn-primary" style={{ fontSize: '1.1rem' }}>
            <Printer size={20} /> สั่งพิมพ์
          </button>
        </div>
      </div>

      <div className="a4-container">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="blank-form">
            <h3 style={{ textAlign: 'center', marginBottom: '0.25rem', fontSize: '1rem', lineHeight: '1.2' }}>แบบฟอร์มสั่งพิมพ์ ชื่อ ที่อยู่ ลงบนไปรษณียบัตร</h3>
            <div style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              ของ {branchName}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flex: 1 }}>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>วันที่สั่งจอง:</span>
                  <span className="line-input" style={{ flex: 1 }}></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>จำนวน (ใบ):</span>
                  <span className="line-input" style={{ flex: 1, marginLeft: '0.25rem' }}></span>
                  <span style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>เงิน:</span>
                  <span className="line-input" style={{ flex: 1, marginLeft: '0.25rem' }}></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>ชื่อ-สกุล:</span>
                  <span className="line-input" style={{ flex: 1 }}></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>เบอร์โทร:</span>
                  <span className="line-input" style={{ flex: 1 }}></span>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>ที่อยู่จัดส่ง:</span>
                  <div style={{ borderBottom: '1px dotted #000', height: '1.6rem', width: '100%' }}></div>
                  <div style={{ borderBottom: '1px dotted #000', height: '1.6rem', width: '100%' }}></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 'auto' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>รหัสไปรษณีย์:</span>
                  <span className="line-input" style={{ flex: 1 }}></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>D/ID:</span>
                  <span className="line-input" style={{ flex: 1 }}></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
