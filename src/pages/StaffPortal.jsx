import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { QrCode, Keyboard, History, Printer, FileText, Settings, Download, Upload } from 'lucide-react';
import ThaiAddressFields from '../components/ThaiAddressFields';

export default function StaffPortal() {
  const { register, handleSubmit, setValue, getValues, reset, watch, formState: { errors, dirtyFields, touchedFields } } = useForm({ mode: 'onChange' });

  const selectQty = watch("selectQuantity", "100");
  const customQty = watch("customQuantity", "");
  const quantity = selectQty === "custom" ? (parseInt(customQty, 10) || 0) : (parseInt(selectQty, 10) || 0);
  const totalPrice = quantity * 3;

  const setQuantityFields = (qtyVal) => {
    const presets = ["100", "200", "300", "400", "500", "1000", "2000"];
    const qtyStr = String(qtyVal || 100);
    if (presets.includes(qtyStr)) {
      setValue("selectQuantity", qtyStr, { shouldValidate: true });
      setValue("customQuantity", "", { shouldValidate: true });
    } else {
      setValue("selectQuantity", "custom", { shouldValidate: true });
      setValue("customQuantity", qtyStr, { shouldValidate: true });
    }
  };

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
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setHistory([]);
      }
    }

    const savedForm = localStorage.getItem('staffFormData');
    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        if (data && typeof data === 'object') {
          Object.keys(data).forEach(key => {
            setValue(key, data[key]);
          });
        }
      } catch (e) {}
    } else {
      setQuantityFields(100);
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

  const [printSettings, setPrintSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('customPrintSettings');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object') {
        return {
          top: typeof parsed.top === 'number' ? parsed.top : 4.5,
          left: typeof parsed.left === 'number' ? parsed.left : 9.5,
          fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : 5,
          isNameBold: typeof parsed.isNameBold === 'boolean' ? parsed.isNameBold : true,
          isPhoneBold: typeof parsed.isPhoneBold === 'boolean' ? parsed.isPhoneBold : true,
          didPrintMode: (parsed.didPrintMode === 'did' || parsed.didPrintMode === 'address') ? parsed.didPrintMode : 'did'
        };
      }
      return { top: 4.5, left: 9.5, fontSize: 5, isNameBold: true, isPhoneBold: true, didPrintMode: 'did' };
    } catch (e) {
      return { top: 4.5, left: 9.5, fontSize: 5, isNameBold: true, isPhoneBold: true, didPrintMode: 'did' };
    }
  });

  useEffect(() => {
    localStorage.setItem('customPrintSettings', JSON.stringify(printSettings));
  }, [printSettings]);

  const handleDirectPrintClick = (e) => {
    const form = e.target.closest('form');
    if (form && form.checkValidity()) {
      e.preventDefault(); // Stop async react-hook-form submit
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      onSubmit(data);
    }
  };

  const onSubmit = (data) => {
    const isBKK = data.province === 'กรุงเทพมหานคร';
    const subTitle = isBKK ? `แขวง${data.subdistrict}` : `ต.${data.subdistrict}`;
    const distTitle = isBKK ? `เขต${data.district}` : `อ.${data.district}`;
    const provTitle = isBKK ? data.province : `จ.${data.province}`;
    
    const fullAddress = `${data.addressLine1} ${subTitle} ${distTitle} ${provTitle}`;
    
    const resolvedQty = data.selectQuantity === "custom" ? (parseInt(data.customQuantity, 10) || 0) : (parseInt(data.selectQuantity, 10) || 0);

    const processedData = {
      ...data,
      quantity: resolvedQty,
      address: fullAddress
    };

    // Remove select helper fields
    delete processedData.selectQuantity;
    delete processedData.customQuantity;
    
    // Create the record manually so we have the ID for printing
    const newRecord = { ...processedData, id: Date.now(), timestamp: new Date().toISOString() };
    
    // Update ONLY the print data synchronously.
    // This perfectly matches the DOM mutation of the "พิมพ์ซ้ำ" button, which we know works flawlessly.
    flushSync(() => {
      setPrintData(newRecord);
    });
    
    // Print synchronously
    window.print();
    
    // Defer the heavy history update, form reset, and hiding the print area
    // to avoid crashing Chrome's print preview
    setTimeout(() => {
      setHistory(prevHistory => {
        const safeHistory = Array.isArray(prevHistory) ? prevHistory : [];
        const updatedHistory = [newRecord, ...safeHistory].slice(0, 50);
        localStorage.setItem('staffHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
      
      reset(); // clear form
      setQuantityFields(100);
      setScanMode('manual');
      setPrintData(null); // Hide the print area from the dashboard
    }, 500);
  };

  const handlePrintHistory = (record) => {
    flushSync(() => {
      setPrintData(record);
    });
    window.print();
    
    setTimeout(() => {
      setPrintData(null);
    }, 500);
  };

  const exportHistory = () => {
    if (history.length === 0) {
      alert("ไม่มีประวัติการพิมพ์ให้ส่งออกครับ");
      return;
    }
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `staff-history-${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importHistory = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (Array.isArray(parsed)) {
          setHistory(prevHistory => {
            const safePrev = Array.isArray(prevHistory) ? prevHistory : [];
            const merged = [...parsed, ...safePrev];
            const unique = [];
            const seen = new Set();
            for (const item of merged) {
              if (item && item.id && !seen.has(item.id)) {
                seen.add(item.id);
                unique.push(item);
              }
            }
            const sortedUnique = unique.sort((a, b) => b.id - a.id).slice(0, 100);
            localStorage.setItem('staffHistory', JSON.stringify(sortedUnique));
            return sortedUnique;
          });
          alert(`นำเข้าข้อมูลสำเร็จ! โหลดประวัติเพิ่มได้ ${parsed.length} รายการ`);
        } else {
          alert("รูปแบบไฟล์ไม่ถูกต้อง (ต้องเป็นรายการอาร์เรย์)");
        }
      } catch (err) {
        alert("ไม่สามารถอ่านไฟล์ได้ กรุณาใช้ไฟล์ .json ที่ส่งออกมาจากระบบนี้เท่านั้น");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const parseQrPayload = (payloadString) => {
    try {
      const raw = JSON.parse(payloadString);
      if (raw && typeof raw === 'object') {
        if ('n' in raw || 'p' in raw) {
          return {
            orderDate: raw.d || '',
            quantity: raw.q || 1,
            name: raw.n || '',
            phone: raw.p || '',
            addressLine1: raw.a || '',
            subdistrict: raw.sd || '',
            district: raw.dt || '',
            province: raw.pv || '',
            zipcode: raw.zp || '',
            did: raw.id || ''
          };
        }
        return raw;
      }
    } catch (e) {
      console.error("Payload parse error:", e);
    }
    throw new Error("Invalid payload format");
  };

  const populateFromScan = (data) => {
    setValue("orderDate", data.orderDate, { shouldValidate: true });
    setQuantityFields(data.quantity || 1);
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
            const data = parseQrPayload(decodedText);
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

  const handleFileDecode = async (file) => {
    if (!file) return;

    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const imageBitmap = await createImageBitmap(file);
        const barcodes = await barcodeDetector.detect(imageBitmap);
        if (barcodes.length > 0) {
          try {
            const data = parseQrPayload(barcodes[0].rawValue);
            populateFromScan(data);
            alert("อ่านรูปภาพสำเร็จ! กรุณาตรวจสอบข้อมูล");
            return;
          } catch (err) {
            console.log("Barcode parsing error:", err);
          }
        }
      } catch (err) {
        console.log("BarcodeDetector error:", err);
      }
    }

    // Fallback to html5QrCode
    const html5QrCode = new Html5Qrcode("reader-hidden");
    try {
      const decodedText = await html5QrCode.scanFile(file, false);
      const data = parseQrPayload(decodedText);
      populateFromScan(data);
      alert("อ่านรูปภาพสำเร็จ! กรุณาตรวจสอบข้อมูล");
    } catch (err) {
      alert("ไม่พบ QR Code ในรูปภาพนี้ หรือข้อมูลไม่ถูกต้อง กรุณาลองสแกนผ่านกล้องแทน");
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
              padding-top: ${printSettings.top}cm;
              padding-left: ${printSettings.left}cm;
              padding-right: 1cm;
              overflow: hidden;
              box-sizing: border-box;
            }
          }
        `}
      </style>
      
      <div className="staff-no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>แดชบอร์ดเจ้าหน้าที่ ปณ.</h2>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/worldcup" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#3b82f6', color: '#1d4ed8', backgroundColor: '#eff6ff' }}>
              <span role="img" aria-label="soccer">⚽</span> ทายผลบอลโลก 2026
            </Link>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#eff6ff', 
          borderLeft: '4px solid #3b82f6', 
          padding: '0.75rem 1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem', 
          fontSize: '0.85rem', 
          color: '#1e3a8a',
          lineHeight: '1.5'
        }}>
          💡 <strong>เคล็ดลับสำหรับสาขา:</strong> สามารถพิมพ์ QR Code หรือส่งลิงก์ระบบของลูกค้าโดยต่อท้าย URL ด้วย <code>?branch=ชื่อสาขาของคุณ</code> (เช่น <code>?branch=ปณ.เชียงใหม่</code> หรือ <code>?b=ปณ.เชียงใหม่</code>) เพื่อให้ใบจองบนมือถือของลูกค้าแสดงชื่อสาขาของท่านโดยอัตโนมัติ (ค่าเริ่มต้นคือ ไปรษณีย์กลาง 10501)
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
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
                          const data = parseQrPayload(val);
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
                      if (val.length > 10 && val.startsWith('{') && val.endsWith('}')) {
                        try {
                          const data = parseQrPayload(val);
                          if (data.name || data.phone || data.did) {
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
                    <div 
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                      onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.backgroundColor = 'transparent';
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          await handleFileDecode(file);
                        }
                      }}
                      onClick={() => document.getElementById('drag-file-input').click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '2rem 1rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        marginTop: '1rem',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <input 
                        type="file" 
                        id="drag-file-input" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) await handleFileDecode(file);
                        }} 
                        style={{ display: 'none' }} 
                      />
                      <div style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                        <QrCode size={32} />
                      </div>
                      <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-main)' }}>ลากไฟล์รูปภาพ QR Code มาวางที่นี่</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>หรือคลิกเพื่อเลือกไฟล์รูปภาพจากเครื่องคอมพิวเตอร์</span>
                    </div>
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
                    <select 
                      className="form-control" 
                      required 
                      {...register("selectQuantity", { required: true })}
                      style={{ width: '100%' }}
                    >
                      <option value="100">100 ใบ</option>
                      <option value="200">200 ใบ</option>
                      <option value="300">300 ใบ</option>
                      <option value="400">400 ใบ</option>
                      <option value="500">500 ใบ</option>
                      <option value="1000">1,000 ใบ</option>
                      <option value="2000">2,000 ใบ</option>
                      <option value="custom">ระบุค่าเอง...</option>
                    </select>
                    {errors.selectQuantity && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุจำนวน</span>}
                    
                    {selectQty === 'custom' && (
                      <div className="form-group" style={{ marginTop: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ระบุจำนวนใบเอง <span style={{color:'red'}}>*</span></label>
                        <input 
                          type="number" 
                          min="1" 
                          className={`form-control ${getFieldClass('customQuantity')}`} 
                          required 
                          {...register("customQuantity", { required: true, min: 1 })} 
                          placeholder="เช่น 150" 
                        />
                        {errors.customQuantity && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุจำนวนอย่างน้อย 1 ใบ</span>}
                      </div>
                    )}
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
                <button type="submit" onClick={handleDirectPrintClick} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', fontSize: '1.1rem' }}>
                  <Printer size={20} />
                  บันทึกและสั่งพิมพ์ลงไปรษณียบัตร
                </button>

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                    <Settings size={16} />
                    ตั้งค่าตำแหน่งและขนาดการพิมพ์ (ปรับแต่งเอง)
                  </h4>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>ขยับลง (ซม.): {printSettings.top}</label>
                      <input type="range" min="0" max="10" step="0.5" value={printSettings.top} onChange={(e) => setPrintSettings(p => ({...p, top: parseFloat(e.target.value)}))} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>ขยับขวา (ซม.): {printSettings.left}</label>
                      <input type="range" min="0" max="15" step="0.5" value={printSettings.left} onChange={(e) => setPrintSettings(p => ({...p, left: parseFloat(e.target.value)}))} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>ขนาดตัวอักษร: {printSettings.fontSize}</label>
                      <input type="range" min="4" max="24" step="1" value={printSettings.fontSize} onChange={(e) => setPrintSettings(p => ({...p, fontSize: parseInt(e.target.value)}))} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={printSettings.isNameBold} 
                          onChange={(e) => setPrintSettings(p => ({...p, isNameBold: e.target.checked}))} 
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        ชื่อ-นามสกุล ตัวหนา
                      </label>
                      <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={printSettings.isPhoneBold} 
                          onChange={(e) => setPrintSettings(p => ({...p, isPhoneBold: e.target.checked}))} 
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        เบอร์โทร ตัวหนา
                      </label>
                    </div>
                  </div>

                  <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', marginTop: '1rem', paddingTop: '1rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem', color: '#475569' }}>รูปแบบกรณีมี D-ID และที่อยู่:</label>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="didPrintMode" 
                          checked={printSettings.didPrintMode === 'did'} 
                          onChange={() => setPrintSettings(p => ({...p, didPrintMode: 'did'}))} 
                        />
                        พิมพ์ D-ID (ซ่อนที่อยู่ปกติ)
                      </label>
                      <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="didPrintMode" 
                          checked={printSettings.didPrintMode === 'address'} 
                          onChange={() => setPrintSettings(p => ({...p, didPrintMode: 'address'}))} 
                        />
                        พิมพ์ที่อยู่ปกติ (ซ่อน D-ID)
                      </label>
                    </div>
                  </div>

                  {/* Live Preview Section */}
                  <div style={{ marginTop: '1.5rem' }}>
                    <h5 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>ตัวอย่างพื้นที่การพิมพ์ (จำลองสัดส่วนไปรษณียบัตร 14.8 x 10.5 ซม.)</h5>
                    <div style={{ 
                      width: '100%', 
                      maxWidth: '400px', 
                      margin: '0 auto', 
                      backgroundColor: '#e2e8f0', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'center',
                      overflow: 'hidden'
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
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          transform: 'scale(0.5)',
                          transformOrigin: 'top left',
                          paddingTop: `${printSettings.top}cm`,
                          paddingLeft: `${printSettings.left}cm`,
                          paddingRight: '1cm',
                          boxSizing: 'border-box',
                          overflow: 'hidden'
                        }}>
                          <div style={{ fontSize: `${printSettings.fontSize}pt`, lineHeight: '1.4', fontFamily: 'Sarabun, Inter, sans-serif' }}>
                            {formValues.did && printSettings.didPrintMode !== 'address' ? (
                              <div>
                                <div style={{ fontWeight: printSettings.isNameBold ? 'bold' : 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, marginBottom: '0.2em' }}>
                                  {formValues.name || 'ชื่อ-นามสกุล ผู้รับ'}
                                </div>
                                <div style={{ fontSize: `${printSettings.fontSize}pt`, marginBottom: '0.4em' }}>
                                  โทร. <span style={{ fontWeight: printSettings.isPhoneBold ? 'bold' : 'normal' }}>{formValues.phone || '08X-XXX-XXXX'}</span>
                                </div>
                                {!(formValues.did && formValues.did.trim().length === 6) && (
                                  <div style={{ fontSize: `${Math.max(4, printSettings.fontSize - 1)}pt`, color: '#111', lineHeight: '1.3', marginBottom: '0.4em' }}>
                                    {`${formValues.addressLine1 || 'บ้านเลขที่/ถนน'} ${formValues.subdistrict ? (formValues.province === 'กรุงเทพมหานคร' ? 'แขวง' : 'ต.') + formValues.subdistrict : ''} ${formValues.district ? (formValues.province === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.') + formValues.district : ''} ${formValues.province ? (formValues.province === 'กรุงเทพมหานคร' ? '' : 'จ.') + formValues.province : ''} ${formValues.zipcode || 'XXXXX'}`.trim()}
                                  </div>
                                )}
                                <div style={{ fontSize: `${printSettings.fontSize * 1.5}pt`, fontWeight: 'bold', letterSpacing: '0.05em', color: '#000', marginTop: '0.4em' }}>
                                  {formValues.did}
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ fontWeight: printSettings.isNameBold ? 'bold' : 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, marginBottom: '0.2em' }}>
                                  {formValues.name || 'ชื่อ-นามสกุล ผู้รับ'}
                                </div>
                                <div style={{ fontSize: `${printSettings.fontSize}pt`, marginBottom: '0.4em' }}>
                                  โทร. <span style={{ fontWeight: printSettings.isPhoneBold ? 'bold' : 'normal' }}>{formValues.phone || '08X-XXX-XXXX'}</span>
                                </div>
                                <div style={{ fontSize: `${printSettings.fontSize}pt`, lineHeight: '1.3' }}>
                                  {`${formValues.addressLine1 || 'บ้านเลขที่/ถนน'} ${formValues.subdistrict ? (formValues.province === 'กรุงเทพมหานคร' ? 'แขวง' : 'ต.') + formValues.subdistrict : ''} ${formValues.district ? (formValues.province === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.') + formValues.district : ''} ${formValues.province ? (formValues.province === 'กรุงเทพมหานคร' ? '' : 'จ.') + formValues.province : ''}`.trim()}
                                </div>
                                <div style={{ marginTop: '0.2em', fontWeight: 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, letterSpacing: '0.05em' }}>
                                  {formValues.zipcode || 'XXXXX'}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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
              {/* Export/Import Control Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button 
                  onClick={exportHistory} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                  title="ดาวน์โหลดประวัติทั้งหมดเป็นไฟล์เพื่อนำไปเปิดเครื่องอื่น"
                >
                  <Download size={14} /> ส่งออกข้อมูล (.json)
                </button>
                <label 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: 'pointer', margin: 0 }}
                  title="เลือกไฟล์ข้อมูลที่ส่งออกมาเพื่อนำเข้าในเครื่องนี้"
                >
                  <Upload size={14} /> นำเข้าข้อมูล
                  <input type="file" accept=".json" onChange={importHistory} style={{ display: 'none' }} />
                </label>
              </div>

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
          <div style={{ fontSize: `${printSettings.fontSize}pt`, lineHeight: '1.4', fontFamily: 'Sarabun, Inter, sans-serif' }}>
            {printData.did && printSettings.didPrintMode !== 'address' ? (
              <div>
                <div style={{ fontWeight: printSettings.isNameBold ? 'bold' : 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, marginBottom: '0.2em' }}>
                  {printData.name}
                </div>
                <div style={{ fontSize: `${printSettings.fontSize}pt`, marginBottom: '0.4em' }}>
                  โทร. <span style={{ fontWeight: printSettings.isPhoneBold ? 'bold' : 'normal' }}>{printData.phone}</span>
                </div>
                {!(printData.did && printData.did.trim().length === 6) && (
                  <div style={{ fontSize: `${Math.max(4, printSettings.fontSize - 1)}pt`, color: '#111', lineHeight: '1.3', marginBottom: '0.4em' }}>
                    {printData.address} {printData.zipcode}
                  </div>
                )}
                <div style={{ fontSize: `${printSettings.fontSize * 1.5}pt`, fontWeight: 'bold', letterSpacing: '0.05em', color: '#000', marginTop: '0.4em' }}>
                  {printData.did}
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: printSettings.isNameBold ? 'bold' : 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, marginBottom: '0.2em' }}>
                  {printData.name}
                </div>
                <div style={{ fontSize: `${printSettings.fontSize}pt`, marginBottom: '0.4em' }}>
                  โทร. <span style={{ fontWeight: printSettings.isPhoneBold ? 'bold' : 'normal' }}>{printData.phone}</span>
                </div>
                <div style={{ fontSize: `${printSettings.fontSize}pt`, lineHeight: '1.3' }}>
                  {printData.address}
                </div>
                <div style={{ marginTop: '0.2em', fontWeight: 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, letterSpacing: '0.05em' }}>
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
