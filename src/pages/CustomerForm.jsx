import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, CheckCircle, Clock } from 'lucide-react';

export default function CustomerForm() {
  const { register, handleSubmit, reset } = useForm();
  const [generatedData, setGeneratedData] = useState(null);
  const [history, setHistory] = useState([]);
  const cardRef = useRef(null);

  useEffect(() => {
    // Load history from local storage
    const saved = localStorage.getItem('customerHistory');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const onSubmit = async (data) => {
    // Create a payload string (JSON) for the QR code
    const payload = JSON.stringify(data);
    setGeneratedData({ ...data, payload });

    // Save to history
    const newRecord = { ...data, id: Date.now(), timestamp: new Date().toISOString() };
    const updatedHistory = [newRecord, ...history].slice(0, 10); // Keep last 10
    setHistory(updatedHistory);
    localStorage.setItem('customerHistory', JSON.stringify(updatedHistory));
  };

  const downloadImage = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2 });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `postcard-data-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to generate image", err);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 400px' }}>
        <div className="card glass-panel">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CheckCircle color="var(--primary)" />
            กรอกข้อมูลเพื่อสั่งพิมพ์ไปรษณียบัตร
          </h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">วันที่สั่งจอง</label>
              <input type="date" className="form-control" required {...register("orderDate")} defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="form-group">
              <label className="form-label">จำนวน (ใบ)</label>
              <input type="number" min="1" className="form-control" required {...register("quantity")} defaultValue="1" />
            </div>
            <div className="form-group">
              <label className="form-label">ชื่อ-นามสกุล</label>
              <input type="text" className="form-control" required {...register("name")} placeholder="ระบุชื่อและนามสกุล" />
            </div>
            <div className="form-group">
              <label className="form-label">เบอร์โทรศัพท์</label>
              <input type="tel" className="form-control" required {...register("phone")} placeholder="08X-XXX-XXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">ที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน, ตำบล, อำเภอ, จังหวัด)</label>
              <textarea className="form-control" rows="3" required {...register("address")} placeholder="ระบุที่อยู่จัดส่งให้ครบถ้วน"></textarea>
            </div>
            <div className="form-group">
              <label className="form-label">รหัสไปรษณีย์</label>
              <input type="text" className="form-control" required {...register("zipcode")} placeholder="เช่น 10110" />
            </div>
            <div className="form-group">
              <label className="form-label">ที่อยู่ D-ID (ไปรษณีย์ไทย)</label>
              <input type="text" className="form-control" {...register("did")} placeholder="ถ้ามี (ตัวเลือก)" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              สร้างข้อมูล / สร้างรูปภาพ
            </button>
          </form>
        </div>
      </div>

      <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {generatedData && (
          <div className="card" style={{ background: '#fff', border: '2px dashed var(--primary)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>ภาพสำหรับส่งให้ไปรษณีย์</h3>
            
            {/* The actual card to be converted to Image */}
            <div 
              ref={cardRef} 
              style={{ 
                padding: '2rem', 
                background: '#fff', 
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                position: 'relative',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                marginBottom: '1.5rem'
              }}
            >
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
                <QRCodeSVG value={generatedData.payload} size={80} level="M" />
              </div>
              <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.4rem', paddingRight: '90px' }}>ข้อมูลผู้รับ (สำหรับการพิมพ์)</h2>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
                วันที่สั่งจอง: {generatedData.orderDate} | จำนวน: {generatedData.quantity} ใบ
              </div>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: '600' }}>
                ชื่อ: {generatedData.name}
              </div>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                เบอร์โทร: {generatedData.phone}
              </div>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.75rem', lineHeight: '1.6' }}>
                ที่อยู่: {generatedData.address} {generatedData.zipcode}
              </div>
              {generatedData.did && (
                <div style={{ fontSize: '1.1rem', marginTop: '1rem', padding: '0.5rem', background: '#f8fafc', borderLeft: '4px solid var(--secondary)' }}>
                  <strong>D-ID:</strong> {generatedData.did}
                </div>
              )}
            </div>

            <button onClick={downloadImage} className="btn btn-primary" style={{ width: '100%' }}>
              <Download size={18} />
              บันทึกเป็นรูปภาพ (ส่งให้ ปณ.)
            </button>
          </div>
        )}

        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock size={20} />
            ประวัติการกรอกข้อมูลของคุณ
          </h3>
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ยังไม่มีประวัติการกรอกข้อมูล</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {history.map((record) => (
                <div 
                  key={record.id} 
                  style={{ 
                    padding: '0.75rem', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => {
                    reset(record);
                    const payload = JSON.stringify({
                      orderDate: record.orderDate,
                      quantity: record.quantity,
                      name: record.name,
                      phone: record.phone,
                      address: record.address,
                      zipcode: record.zipcode,
                      did: record.did
                    });
                    setGeneratedData({ ...record, payload });
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ fontWeight: '500' }}>{record.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(record.timestamp).toLocaleDateString('th-TH')} - {record.quantity} ใบ
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
