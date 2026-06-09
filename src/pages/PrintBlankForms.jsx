import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';

export default function PrintBlankForms() {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0.5cm;
            }
            body {
              background: white;
            }
          }
          
          .a4-container {
            width: 21cm;
            min-height: 29.7cm;
            background: white;
            margin: 0 auto;
            border: 1px solid #ccc;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            padding: 1cm;
            gap: 0;
          }

          @media print {
            .a4-container {
              border: none;
              box-shadow: none;
              margin: 0;
              width: 100%;
            }
          }

          .blank-form {
            border: 1px dashed #94a3b8;
            padding: 1cm 1.2cm;
            display: flex;
            flex-direction: column;
            position: relative;
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
            <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>แบบฟอร์มสั่งจองและจัดส่ง</h3>
            
            <div style={{ display: 'flex', marginBottom: '1rem' }}>
              <span style={{ whiteSpace: 'nowrap' }}>วันที่สั่งจอง:</span>
              <span className="line-input"></span>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '1rem', alignItems: 'flex-end' }}>
              <span style={{ whiteSpace: 'nowrap' }}>จำนวน (ใบ):</span>
              <span className="line-input" style={{ flex: 1 }}></span>
              <span style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>เป็นเงิน:</span>
              <span className="line-input" style={{ flex: 1 }}></span>
              <span style={{ whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>บาท</span>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '1rem' }}>
              <span style={{ whiteSpace: 'nowrap' }}>ชื่อ-นามสกุล:</span>
              <span className="line-input"></span>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '1rem' }}>
              <span style={{ whiteSpace: 'nowrap' }}>เบอร์โทรศัพท์:</span>
              <span className="line-input"></span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '1rem' }}>
              <span>ที่อยู่จัดส่ง:</span>
              <div style={{ borderBottom: '1px dotted #000', height: '1.8rem', width: '100%' }}></div>
              <div style={{ borderBottom: '1px dotted #000', height: '1.8rem', width: '100%' }}></div>
              <div style={{ borderBottom: '1px dotted #000', height: '1.8rem', width: '100%' }}></div>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '1rem' }}>
              <span style={{ whiteSpace: 'nowrap' }}>รหัสไปรษณีย์:</span>
              <span className="line-input"></span>
            </div>
            
            <div style={{ display: 'flex', marginBottom: '1rem', marginTop: 'auto' }}>
              <span style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>D/ID (ไปรษณีย์ไทย):</span>
              <span className="line-input"></span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
