import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { QrCode, Keyboard, History, Printer, FileText } from 'lucide-react';
import ThaiAddressFields from '../components/ThaiAddressFields';

export default function StaffPortal() {
  const { register, handleSubmit, setValue, reset, watch, formState: { errors, dirtyFields, touchedFields } } = useForm({ mode: 'onChange' });

  const quantity = watch("quantity", 1);
  const totalPrice = (parseInt(quantity, 10) || 0) * 3;

  const getFieldClass = (fieldName) => {
    if (errors[fieldName]) return 'input-error';
    if (dirtyFields[fieldName] || touchedFields[fieldName]) return 'input-success';
    return '';
  };
  const [history, setHistory] = useState([]);
  const [scanMode, setScanMode] = useState('manual');
  const [branchName, setBranchName] = useState('ไปรษณีย์กลาง 10501');
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedBranch = localStorage.getItem('branchName');
    if (savedBranch) setBranchName(savedBranch);
    const savedStaffName = localStorage.getItem('staffName');
    if (savedStaffName) setStaffName(savedStaffName);
    const savedStaffPhone = localStorage.getItem('staffPhone');
    if (savedStaffPhone) setStaffPhone(savedStaffPhone);
    
    let savedHistory = localStorage.getItem('staffHistory');
    if (!savedHistory) {
      savedHistory = localStorage.getItem('printHistory');
      if (savedHistory) {
        localStorage.setItem('staffHistory', savedHistory);
      }
    }
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    const savedForm = localStorage.getItem('staffFormData');
    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        Object.keys(data).forEach(key => {
          setValue(key, data[key]);
        });
      } catch (e) {}
    }
  }, [setValue]);

  const formValues = watch();
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('staffFormData', JSON.stringify(formValues));
    }, 500);
    return () => clearTimeout(timeout);
  }, [formValues]);

  const saveToHistory = (data) => {
    const newRecord = { ...data, id: Date.now(), timestamp: new Date().toISOString() };
    const updatedHistory = [newRecord, ...history].slice(0, 50); // Keep last 50
    setHistory(updatedHistory);
    localStorage.setItem('staffHistory', JSON.stringify(updatedHistory));
    return newRecord;
  };

  const [printData, setPrintData] = useState(null);

  const onSubmit = (data) => {
    const isBKK = data.province === 'กรุงเทพมหานคร';
    const subTitle = isBKK ? `แขวง${data.subdistrict}` : `ต.${data.subdistrict}`;
    const distTitle = isBKK ? `เขต${data.district}` : `อ.${data.district}`;
    const provTitle = isBKK ? data.province : `จ.${data.province}`;
    
    const fullAddress = `${data.addressLine1} ${subTitle} ${distTitle} ${provTitle}`;
    const processedData = {
      ...data,
      address: fullAddress
    };
    const record = saveToHistory(processedData);
    
    flushSync(() => {
      setPrintData(record);
    });
    window.print();
    reset(); // clear form
    setScanMode('manual');
  };

  const handlePrintHistory = (record) => {
    flushSync(() => {
      setPrintData(record);
    });
    window.print();
  };

  const populateFromScan = (data) => {
    setValue("orderDate", data.orderDate, { shouldValidate: true });
    setValue("quantity", data.quantity || 1, { shouldValidate: true });
    setValue("name", data.name, { shouldValidate: true });
    setValue("phone", data.phone, { shouldValidate: true });
    setValue("addressLine1", data.addressLine1 || data.address || "-", { shouldValidate: true });
    setValue("subdistrict", data.subdistrict || "-", { shouldValidate: true });
    setValue("district", data.district || "-", { shouldValidate: true });
    setValue("province", data.province || "-", { shouldValidate: true });
    setValue("zipcode", data.zipcode || "-", { shouldValidate: true });
    setValue("did", data.did || "", { shouldValidate: true });
  };

  useEffect(() => {
    let scanner = null;
    try {
      if (scanMode === 'camera') {
        scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: {width: 250, height: 250} },
          /* verbose= */ false
        );
        scanner.render((decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            populateFromScan(data);
            try { if (scanner) scanner.clear().catch(()=>{}).then(() => setScanMode('manual')); } catch(e){ setScanMode('manual'); }
            alert("สแกนข้อมูลสำเร็จ! กรุณาตรวจสอบและกด สั่งพิมพ์");
          } catch (err) {
            alert("QR Code ไม่ถูกต้องหรือไม่ใช่ข้อมูลจากระบบนี้");
          }
        }, (error) => {
          // Handle scan error (ignored generally)
        });
      }
    } catch (err) {
      console.error("Scanner init error:", err);
    }

    return () => {
      try {
        if (scanner) {
          scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        }
      } catch (err) {
        console.error("Scanner cleanup error:", err);
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
      populateFromScan(data);
      alert("อ่านรูปภาพสำเร็จ! กรุณาตรวจสอบข้อมูล");
    } catch (err) {
      alert("ไม่พบ QR Code ในรูปภาพนี้ หรือข้อมูลไม่ถูกต้อง");
    }
  };

  const onError = () => {
    alert("กรุณากรอกข้อมูลให้ครบถ้วนในช่องที่จำเป็นก่อนสั่งพิมพ์ครับ");
  };

  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showSaveError, setShowSaveError] = useState(false);

  const handleBranchChange = (e) => {
    setBranchName(e.target.value);
    localStorage.setItem('branchName', e.target.value);
  };
  const handleStaffNameChange = (e) => {
    setStaffName(e.target.value);
    localStorage.setItem('staffName', e.target.value);
  };
  const handleStaffPhoneChange = (e) => {
    setStaffPhone(e.target.value);
    localStorage.setItem('staffPhone', e.target.value);
  };

  const saveSettings = () => {
    if (!staffName && !staffPhone) {
      setShowSaveError(true);
      setTimeout(() => setShowSaveError(false), 4000);
      return;
    }
    localStorage.setItem('branchName', branchName);
    localStorage.setItem('staffName', staffName);
    localStorage.setItem('staffPhone', staffPhone);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
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
            .staff-no-print {
              display: none !important;
            }
            .print-area {
              width: 14.8cm;
              height: 10.5cm;
              background: white;
              position: relative;
              padding: 1.5cm 1cm 1cm 1cm;
              overflow: hidden;
              box-sizing: border-box;
            }
          }
        `}
      </style>
      
      <div className="staff-no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>แดชบอร์ดเจ้าหน้าที่ ปณ.</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#fff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>สาขา:</span>
              <input 
                type="text" 
                className="form-control" 
                value={branchName} 
                onChange={handleBranchChange} 
                style={{ width: '150px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>จนท:</span>
              <input 
                type="text" 
                className="form-control" 
                value={staffName} 
                onChange={handleStaffNameChange} 
                placeholder="คลิกเพื่อพิมพ์ชื่อ"
                style={{ width: '110px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>โทร:</span>
              <input 
                type="text" 
                className="form-control" 
                value={staffPhone} 
                onChange={handleStaffPhoneChange} 
                placeholder="คลิกเพื่อพิมพ์"
                style={{ width: '100px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={saveSettings} className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem', marginLeft: '0.25rem' }}>
                บันทึก
              </button>
              {showSaveSuccess && <span style={{ color: '#16a34a', fontSize: '0.8rem', marginLeft: '0.5rem', fontWeight: 'bold' }}>✓ เซฟแล้ว</span>}
              {showSaveError && <span style={{ color: '#dc2626', fontSize: '0.8rem', marginLeft: '0.5rem', fontWeight: 'bold' }}>❌ ยังไม่ได้พิมพ์อะไรเลยครับ!</span>}
            </div>
            
            <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 0.5rem' }}></div>
            
            <button 
              onClick={() => navigate('/print-blank-forms', { state: { branchName, staffName, staffPhone } })} 
              className="btn" 
              style={{ 
                padding: '0.4rem 0.8rem', 
                fontSize: '0.85rem', 
                border: '2px solid var(--primary)', 
                color: 'var(--primary)', 
                backgroundColor: '#fff',
                fontWeight: '700'
              }}
            >
              <FileText size={16} />
              พิมพ์ฟอร์มเปล่า 4 ใบ
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Left column: Entry */}
          <div style={{ flex: '1 1 400px' }}>
            <div className="card glass-panel">
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className={`btn ${scanMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setScanMode('manual')}
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem', minWidth: '100px' }}
                >
                  <Keyboard size={16} /> พิมพ์ข้อมูลเอง
                </button>
                <button 
                  type="button" 
                  className={`btn ${scanMode === 'usb' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setScanMode('usb')}
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem', minWidth: '130px' }}
                >
                  <QrCode size={16} /> เครื่องสแกน USB
                </button>
                <button 
                  type="button" 
                  className={`btn ${scanMode === 'camera' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setScanMode('camera')}
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem', minWidth: '120px' }}
                >
                  <QrCode size={16} /> นำเข้าข้อมูล
                </button>
              </div>

              <div id="reader-hidden" style={{ position: 'absolute', top: '-9999px', width: '500px', height: '500px' }}></div>

              {scanMode === 'usb' && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', border: '2px dashed var(--primary)', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>ใช้เครื่องสแกนบาร์โค้ด (USB)</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      คลิกที่ช่องด้านล่างให้เคอร์เซอร์กระพริบ แล้วยิง QR Code จากหน้าจอมือถือลูกค้าได้เลย
                    </div>
                  </div>
                  <input 
                    type="text" 
                    autoFocus
                    className="form-control" 
                    placeholder="👉 คลิกที่นี่ แล้วยิงสแกนเนอร์..." 
                    style={{ fontSize: '1.1rem', padding: '0.75rem', textAlign: 'center', borderColor: 'var(--primary)', borderWidth: '2px', backgroundColor: '#fff' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        try {
                          const val = e.target.value.trim();
                          if (!val) return;
                          const data = JSON.parse(val);
                          populateFromScan(data);
                          e.target.value = '';
                          setScanMode('manual');
                          alert("ดึงข้อมูลสำเร็จ! กรุณาตรวจสอบแล้วกด สั่งพิมพ์");
                        } catch (err) {
                          alert("ข้อมูล QR Code ไม่ถูกต้อง กรุณาลองใหม่");
                          e.target.value = '';
                        }
                      }
                    }}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      if (val.length > 20 && val.startsWith('{') && val.endsWith('}')) {
                        try {
                          const data = JSON.parse(val);
                          if (data.name && data.phone) {
                            populateFromScan(data);
                            e.target.value = '';
                            setScanMode('manual');
                            alert("ดึงข้อมูลสำเร็จ! กรุณาตรวจสอบแล้วกด สั่งพิมพ์");
                          }
                        } catch (err) {}
                      }
                    }}
                  />
                </div>
              )}

              {scanMode === 'camera' && (
                <div>
                  <div id="reader" style={{ width: '100%', marginBottom: '1rem' }}></div>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <strong>หรืออัปโหลดรูปภาพที่มี QR Code</strong>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="form-control" style={{ marginTop: '0.5rem' }} />
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit, onError)}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">วันที่สั่งจอง <span style={{color:'red'}}>*</span></label>
                    <input type="date" className={`form-control ${getFieldClass('orderDate')}`} required {...register("orderDate", { required: true })} defaultValue={new Date().toISOString().split('T')[0]} />
                    {errors.orderDate && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุวันที่</span>}
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">จำนวน (ใบ) <span style={{color:'red'}}>*</span></label>
                    <input type="number" min="1" className={`form-control ${getFieldClass('quantity')}`} required {...register("quantity", { required: true })} defaultValue="1" list="quantity-options" placeholder="พิมพ์ตัวเลข หรือเลือกจากรายการ" />
                    <datalist id="quantity-options">
                      <option value="100" />
                      <option value="200" />
                      <option value="300" />
                      <option value="400" />
                      <option value="500" />
                      <option value="1000" />
                      <option value="2000" />
                    </datalist>
                    {errors.quantity && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุจำนวน</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">ชื่อ-นามสกุล <span style={{color:'red'}}>*</span></label>
                  <input type="text" className={`form-control ${getFieldClass('name')}`} required {...register("name", { required: true })} />
                  {errors.name && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุชื่อ-นามสกุล</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">เบอร์โทรศัพท์ <span style={{color:'red'}}>*</span></label>
                  <input type="text" className={`form-control ${getFieldClass('phone')}`} required {...register("phone", { 
                    required: "กรุณาระบุเบอร์โทรศัพท์",
                    pattern: {
                      value: /^\s*0([-\s]?\d){8,9}(\s*(ต่อ|ext\.?|x)\s*\d{1,5})?\s*$/i,
                      message: "รูปแบบเบอร์โทรไม่ถูกต้อง (ต้องเป็น 9-10 หลัก เช่น 0812345678 หรือ 021234567 ต่อ 12)"
                    }
                  })} placeholder="เช่น 08X-XXX-XXXX หรือ 02-XXX-XXXX ต่อ 123" />
                  {errors.phone && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>{errors.phone.message}</span>}
                </div>
                <ThaiAddressFields register={register} setValue={setValue} errors={errors} dirtyFields={dirtyFields} touchedFields={touchedFields} />
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">D-ID</label>
                    <input type="text" className="form-control" {...register("did")} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', fontSize: '1.1rem' }}>
                  <Printer size={20} />
                  บันทึกและสั่งพิมพ์ลงไปรษณียบัตร
                </button>

                {quantity > 0 && (
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#f0fdf4',
                    border: '2px dashed #22c55e',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.9rem', color: '#166534', marginBottom: '0.25rem' }}>ราคาไปรษณียบัตร (ใบละ 3 บาท)</div>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#15803d' }}>จำนวน {quantity} ใบ</span>
                      <span style={{ fontSize: '1.1rem', color: '#15803d' }}>=</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a' }}>{totalPrice.toLocaleString()} บาท</span>
                    </div>
                  </div>
                )}
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

      {printData && (
        <div className="print-only print-area">
          <div style={{ fontSize: `14px`, lineHeight: '1.6', fontFamily: 'Sarabun, Inter, sans-serif', paddingTop: '1em' }}>
            {printData.did ? (
              <div style={{ display: 'flex', gap: '2rem', paddingLeft: '1em' }}>
                <div style={{ flex: 1.5 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.2em', marginBottom: '0.2em' }}>
                    {printData.name}
                  </div>
                  <div style={{ fontSize: '1em', marginBottom: '0.5em' }}>
                    โทร. {printData.phone}
                  </div>
                  <div style={{ fontSize: '0.85em', color: '#333', lineHeight: '1.4' }}>
                    {printData.address} {printData.zipcode}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '3.5em', fontWeight: '900', letterSpacing: '0.05em', textAlign: 'center', color: '#000' }}>
                    {printData.did}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ paddingLeft: '2em', fontWeight: 'bold', fontSize: '1.2em', marginBottom: '0.2em' }}>
                  {printData.name}
                </div>
                <div style={{ paddingLeft: '2em', fontSize: '1em', marginBottom: '0.5em' }}>
                  โทร. {printData.phone}
                </div>
                <div style={{ paddingLeft: '2em', lineHeight: '1.4' }}>
                  {printData.address}
                </div>
                <div style={{ paddingLeft: '2em', marginTop: '0.2em', fontWeight: 'bold', fontSize: '1.3em', letterSpacing: '0.1em' }}>
                  {printData.zipcode}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
