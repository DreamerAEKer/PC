import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';

export default function PrintBlankForms() {
  const navigate = useNavigate();
  const [branchName, setBranchName] = React.useState('ไปรษณีย์กลาง 10501');
  const [staffName, setStaffName] = React.useState('');
  const [staffPhone, setStaffPhone] = React.useState('');

  React.useEffect(() => {
    const savedBranch = localStorage.getItem('branchName');
    if (savedBranch) setBranchName(savedBranch);
    const savedStaffName = localStorage.getItem('staffName');
    if (savedStaffName) setStaffName(savedStaffName);
    const savedStaffPhone = localStorage.getItem('staffPhone');
    if (savedStaffPhone) setStaffPhone(savedStaffPhone);
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

      <div className="print-container" style={{ width: '100%', height: '98vh', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', margin: '0 auto', padding: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="blank-form" style={{ display: 'flex', flexDirection: 'row', padding: '0.4cm 0.6cm', border: '1px dashed #94a3b8', boxSizing: 'border-box', overflow: 'hidden' }}>
            
            {/* Left Column (Tear-off Receipt - 35%) */}
            <div style={{ flex: '0 0 35%', paddingRight: '0.8rem', borderRight: '1px dashed #94a3b8', display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
              <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '0.1rem', fontSize: '0.85rem', lineHeight: '1.3' }}>แบบฟอร์มสั่งพิมพ์<br/>ชื่อ-ที่อยู่ ลงบนไปรษณียบัตร</div>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.75rem' }}>ที่ {branchName}</div>
              
              <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '0.15rem', fontSize: '0.8rem', backgroundColor: '#f1f5f9', padding: '0.2rem 0', borderRadius: '4px' }}>ส่วนที่ลูกค้าเก็บไว้</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>ชื่อผู้สั่ง:</span><span className="line-input" style={{ flex: 1 }}></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>เบอร์โทร:</span><span className="line-input" style={{ flex: 1 }}></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>จำนวน:</span><span className="line-input" style={{ flex: 1 }}></span><span style={{ marginLeft: '0.25rem' }}>ใบ</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '10px', height: '10px', border: '1px solid #000', marginRight: '0.3rem', transform: 'translateY(-2px)' }}></div>
                  <span style={{ whiteSpace: 'nowrap' }}>จ่ายแล้ว</span>
                  <span className="line-input" style={{ flex: 1, margin: '0 0.2rem' }}></span>
                  <span>บาท</span>
                </div>
              </div>
              
              <div style={{ borderTop: '1px dotted #ccc', paddingTop: '0.4rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>จนท:</span>
                  {staffName ? (
                    <span style={{ flex: 1, paddingLeft: '0.5rem', fontFamily: 'monospace', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{staffName}</span>
                  ) : (
                    <span className="line-input" style={{ flex: 1 }}></span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>โทร:</span>
                  {staffPhone ? (
                    <span style={{ flex: 1, paddingLeft: '0.5rem', fontFamily: 'monospace', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{staffPhone}</span>
                  ) : (
                    <span className="line-input" style={{ flex: 1 }}></span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (Main Form - 65%) */}
            <div style={{ flex: '1', paddingLeft: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.15rem', color: 'var(--primary)', textAlign: 'center' }}>ข้อมูลสำหรับพิมพ์ลงไปรษณียบัตร</div>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.2rem', width: '100%' }}>
                <span style={{ whiteSpace: 'nowrap' }}>วันที่สั่งจอง:</span>
                <span className="line-input" style={{ flex: 1.5, margin: '0 0.2rem', minWidth: '30px' }}></span>
                <span style={{ whiteSpace: 'nowrap' }}>จำนวน:</span>
                <span className="line-input" style={{ flex: 1, margin: '0 0.2rem', minWidth: '20px' }}></span>
                <span style={{ whiteSpace: 'nowrap' }}>ใบ (เป็นเงิน:</span>
                <span className="line-input" style={{ flex: 1, margin: '0 0.2rem', minWidth: '30px' }}></span>
                <span style={{ whiteSpace: 'nowrap' }}>บาท)</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.2rem', width: '100%' }}>
                <span style={{ whiteSpace: 'nowrap' }}>ชื่อ-สกุล:</span>
                <span className="line-input" style={{ flex: 2, margin: '0 0.2rem' }}></span>
                <span style={{ whiteSpace: 'nowrap' }}>เบอร์โทร:</span>
                <span className="line-input" style={{ flex: 1.5, margin: '0 0.2rem' }}></span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>ที่อยู่จัดส่ง:</span>
                  <span className="line-input" style={{ flex: 1, margin: '0 0 0 0.2rem' }}></span>
                </div>
                <div style={{ borderBottom: '1px dotted #000', height: '1.4rem', width: '100%' }}></div>
                <div style={{ borderBottom: '1px dotted #000', height: '1.4rem', width: '100%' }}></div>
                <div style={{ borderBottom: '1px dotted #000', height: '1.4rem', width: '100%' }}></div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <span style={{ whiteSpace: 'nowrap' }}>รหัสไปรษณีย์:</span>
                <span className="line-input" style={{ flex: 1, margin: '0 0 0 0.2rem' }}></span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 'auto', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>หรือ D/ID:</span>
                  <div style={{ display: 'flex', gap: '0.15rem' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} style={{ width: '22px', height: '26px', border: '1.5px solid #000', borderRadius: '3px', backgroundColor: '#f8fafc' }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </>
  );
}
