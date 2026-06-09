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
          <div key={item} className="blank-form" style={{ flexDirection: 'row', padding: '0.6cm 0.8cm' }}>
            
            {/* Left Column (Tear-off Receipt - 35%) */}
            <div style={{ flex: '0 0 35%', paddingRight: '0.8rem', borderRight: '1px dashed #94a3b8', display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
              <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '0.1rem', fontSize: '0.85rem', lineHeight: '1.2' }}>แบบฟอร์มสั่งพิมพ์ ชื่อ ที่อยู่<br/>ลงบนไปรษณียบัตร</div>
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
                  <span>บ.</span>
                </div>
              </div>
              
              <div style={{ borderTop: '1px dotted #ccc', paddingTop: '0.4rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>จนท:</span><span className="line-input" style={{ flex: 1 }}></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>โทร:</span><span className="line-input" style={{ flex: 1 }}></span>
                </div>
              </div>
            </div>

            {/* Right Column (Main Form - 65%) */}
            <div style={{ flex: '1', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.25rem', color: 'var(--primary)', textAlign: 'center' }}>ข้อมูลสำหรับพิมพ์ลงไปรษณียบัตร</div>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span style={{ whiteSpace: 'nowrap' }}>วันที่สั่งจอง:</span>
                <span className="line-input" style={{ flex: 1.5 }}></span>
                <span style={{ whiteSpace: 'nowrap' }}>จำนวน:</span>
                <span className="line-input" style={{ flex: 1 }}></span>
                <span style={{ whiteSpace: 'nowrap' }}>ใบ (เป็นเงิน:</span>
                <span className="line-input" style={{ flex: 1 }}></span>
                <span>บ.)</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span style={{ whiteSpace: 'nowrap' }}>ชื่อ-สกุล ผู้รับ:</span>
                <span className="line-input" style={{ flex: 2 }}></span>
                <span style={{ whiteSpace: 'nowrap' }}>เบอร์โทร:</span>
                <span className="line-input" style={{ flex: 1.5 }}></span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>ที่อยู่จัดส่ง:</span>
                  <span className="line-input" style={{ flex: 1 }}></span>
                </div>
                <div style={{ borderBottom: '1px dotted #000', height: '1.5rem', width: '100%' }}></div>
                <div style={{ borderBottom: '1px dotted #000', height: '1.5rem', width: '100%' }}></div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginTop: 'auto' }}>
                <span style={{ whiteSpace: 'nowrap' }}>รหัสไปรษณีย์:</span>
                <span className="line-input" style={{ flex: 1 }}></span>
                <span style={{ whiteSpace: 'nowrap', fontWeight: 'bold', marginLeft: '1rem' }}>D/ID:</span>
                <span className="line-input" style={{ flex: 1 }}></span>
              </div>
            </div>

          </div>
        ))}
      </div>
    </>
  );
}
