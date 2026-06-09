import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { QrCode, Keyboard, History, Printer, FileText } from 'lucide-react';

export default function StaffPortal() {
  const { register, handleSubmit, setValue, reset } = useForm();
  const [history, setHistory] = useState([]);
  const [scanMode, setScanMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('staffHistory');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveToHistory = (data) => {
    const newRecord = { ...data, id: Date.now(), timestamp: new Date().toISOString() };
    const updatedHistory = [newRecord, ...history].slice(0, 50); // Keep last 50
    setHistory(updatedHistory);
    localStorage.setItem('staffHistory', JSON.stringify(updatedHistory));
    return newRecord;
  };

  const onSubmit = (data) => {
    const record = saveToHistory(data);
    // Navigate to print with data
    navigate('/print-postcard', { state: { data: record } });
  };

  const handlePrintHistory = (record) => {
    navigate('/print-postcard', { state: { data: record } });
  };

  useEffect(() => {
    let scanner = null;
    if (scanMode) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: {width: 250, height: 250} },
        /* verbose= */ false
      );
      scanner.render((decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          setValue("orderDate", data.orderDate);
          setValue("quantity", data.quantity);
          setValue("name", data.name);
          setValue("phone", data.phone);
          setValue("address", data.address);
          setValue("zipcode", data.zipcode);
          setValue("did", data.did);
          scanner.clear();
          setScanMode(false);
          alert("สแกนข้อมูลสำเร็จ! กรุณาตรวจสอบและกด สั่งพิมพ์");
        } catch (err) {
          alert("QR Code ไม่ถูกต้องหรือไม่ใช่ข้อมูลจากระบบนี้");
        }
      }, (error) => {
        // Handle scan error (ignored generally)
      });
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [scanMode, setValue]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("reader-hidden");
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      const data = JSON.parse(decodedText);
      setValue("orderDate", data.orderDate);
      setValue("quantity", data.quantity);
      setValue("name", data.name);
      setValue("phone", data.phone);
      setValue("address", data.address);
      setValue("zipcode", data.zipcode);
      setValue("did", data.did);
      alert("อ่านรูปภาพสำเร็จ! กรุณาตรวจสอบข้อมูล");
    } catch (err) {
      alert("ไม่พบ QR Code ในรูปภาพนี้ หรือข้อมูลไม่ถูกต้อง");
    }
  };

  const onError = () => {
    alert("กรุณากรอกข้อมูลให้ครบถ้วนในช่องที่จำเป็นก่อนสั่งพิมพ์ครับ");
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>แดชบอร์ดเจ้าหน้าที่ ปณ.</h2>
        <button onClick={() => navigate('/print-blank-forms')} className="btn btn-secondary">
          <FileText size={18} />
          พิมพ์ฟอร์มเปล่า 4 ใบ (A4)
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Left column: Entry */}
        <div style={{ flex: '1 1 400px' }}>
          <div className="card glass-panel">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button 
                type="button" 
                className={`btn ${!scanMode ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setScanMode(false)}
                style={{ flex: 1 }}
              >
                <Keyboard size={18} /> กรอกข้อมูล
              </button>
              <button 
                type="button" 
                className={`btn ${scanMode ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setScanMode(true)}
                style={{ flex: 1 }}
              >
                <QrCode size={18} /> สแกน QR
              </button>
            </div>

            <div id="reader-hidden" style={{ display: 'none' }}></div>

            {scanMode ? (
              <div>
                <div id="reader" style={{ width: '100%', marginBottom: '1rem' }}></div>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <strong>หรืออัปโหลดรูปภาพที่มี QR Code</strong>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="form-control" style={{ marginTop: '0.5rem' }} />
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit, onError)}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">วันที่สั่งจอง</label>
                  <input type="date" className="form-control" required {...register("orderDate")} defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">จำนวน (ใบ)</label>
                  <input type="number" min="1" className="form-control" required {...register("quantity")} defaultValue="1" list="quantity-options" placeholder="พิมพ์ตัวเลข หรือเลือกจากรายการ" />
                  <datalist id="quantity-options">
                    <option value="100" />
                    <option value="200" />
                    <option value="300" />
                    <option value="400" />
                    <option value="500" />
                    <option value="1000" />
                    <option value="2000" />
                  </datalist>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">ชื่อ-นามสกุล</label>
                <input type="text" className="form-control" required {...register("name")} />
              </div>
              <div className="form-group">
                <label className="form-label">เบอร์โทรศัพท์</label>
                <input type="text" className="form-control" required {...register("phone")} placeholder="เช่น 08X-XXX-XXXX หรือ 02-XXX-XXXX ต่อ 123" />
              </div>
              <div className="form-group">
                <label className="form-label">ที่อยู่จัดส่ง</label>
                <textarea className="form-control" rows="3" required {...register("address")}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">รหัสไปรษณีย์</label>
                  <input type="text" className="form-control" required {...register("zipcode")} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">D-ID</label>
                  <input type="text" className="form-control" {...register("did")} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', fontSize: '1.1rem' }}>
                <Printer size={20} />
                เตรียมสั่งพิมพ์ลงไปรษณียบัตร
              </button>
            </form>
          </div>
        </div>

        {/* Right column: History */}
        <div style={{ flex: '1 1 350px' }}>
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <History size={20} />
              ประวัติการพิมพ์ (เครื่องนี้)
            </h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>ยังไม่มีประวัติการพิมพ์</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
                {history.map((record) => (
                  <div 
                    key={record.id} 
                    style={{ 
                      padding: '1rem', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#fff'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{record.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {new Date(record.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button 
                      onClick={() => handlePrintHistory(record)} 
                      className="btn btn-secondary" 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                    >
                      <Printer size={16} /> พิมพ์ซ้ำ
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
