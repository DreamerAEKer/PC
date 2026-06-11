import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { QrCode, Keyboard, History, Printer, FileText, Settings, Download, Upload } from 'lucide-react';
import ThaiAddressFields from '../components/ThaiAddressFields';
import DidBoxInput from '../components/DidBoxInput';
import { QRCodeCanvas } from 'qrcode.react';

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
  const [scanMode, setScanMode] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768 ? 'camera' : 'manual');
  const [cameraActive, setCameraActive] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const didValue = watch("did", "");
  const isDidActive = (didValue || "").trim().length === 6;
  const [showDidInput, setShowDidInput] = useState(false);

  useEffect(() => {
    if (didValue && didValue.trim().length > 0) {
      setShowDidInput(true);
    }
  }, [didValue]);
  const [hasActiveData, setHasActiveData] = useState(false);
  const [branchName, setBranchName] = useState('ไปรษณีย์กลาง 10501');
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (scanMode !== 'camera') {
      setCameraActive(false);
    } else {
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        setCameraActive(true);
      }
    }
  }, [scanMode]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (scanMode !== 'camera') return;
      
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      )) {
        if (activeEl.id === 'usb-scanner-input') {
          return;
        }
        return;
      }
      
      const usbInput = document.getElementById("usb-scanner-input");
      if (usbInput) {
        usbInput.focus();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [scanMode]);

  const hasTextToSave = (staffName && staffName.trim() !== '') || (staffPhone && staffPhone.trim() !== '');
  const shouldShowRed = hasTextToSave && isSettingsDirty;

  useEffect(() => {
    const savedBranch = localStorage.getItem('branchName') || 'ไปรษณีย์กลาง 10501';
    setBranchName(savedBranch);
    const savedStaffName = localStorage.getItem('staffName') || '';
    setStaffName(savedStaffName);
    const savedStaffPhone = localStorage.getItem('staffPhone') || '';
    setStaffPhone(savedStaffPhone);
    

    
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

  const handleSaveOnlyClick = (e) => {
    const form = e.target.closest('form');
    if (form && form.checkValidity()) {
      e.preventDefault();
      
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      onSubmitSaveOnly(data);
    } else if (form) {
      form.reportValidity();
    }
  };

  const onSubmitSaveOnly = (data) => {
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

    delete processedData.selectQuantity;
    delete processedData.customQuantity;
    
    const newRecord = { ...processedData, id: Date.now(), timestamp: new Date().toISOString() };
    
    setHistory(prevHistory => {
      const safeHistory = Array.isArray(prevHistory) ? prevHistory : [];
      const updatedHistory = [newRecord, ...safeHistory].slice(0, 50);
      localStorage.setItem('staffHistory', JSON.stringify(updatedHistory));
      return updatedHistory;
    });
    
    reset(); // clear form
    setQuantityFields(100);
    setHasActiveData(false);
    setScanMode('manual');
    alert("บันทึกข้อมูลลูกค้าเข้าระบบสำเร็จ (ไม่ได้สั่งพิมพ์)");
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
      setHasActiveData(false);
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

  const exportHistory = async () => {
    if (history.length === 0) {
      alert("ไม่มีประวัติการพิมพ์ให้ส่งออกครับ");
      return;
    }
    const dataStr = JSON.stringify(history, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `staff-history-${dateStr}.json`;

    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([dataStr], filename, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'ประวัติข้อมูลลูกค้าจอง',
            text: `ไฟล์ข้อมูลลูกค้าสาขา ${branchName} ประจำวันที่ ${dateStr}`
          });
          return;
        }
      } catch (err) {
        console.warn("Share failed, falling back to download", err);
      }
    }

    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
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
    setHasActiveData(true);
  };

  useEffect(() => {
    let qrCodeInstance = null;
    let isMounted = true;

    if (scanMode === 'camera' && cameraActive) {
      const timer = setTimeout(() => {
        if (!isMounted) return;
        const element = document.getElementById("reader");
        if (!element) return;

        try {
          qrCodeInstance = new Html5Qrcode("reader");
          qrCodeInstance.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              try {
                const data = parseQrPayload(decodedText);
                populateFromScan(data);
                
                if (qrCodeInstance && qrCodeInstance.isScanning) {
                  qrCodeInstance.stop().catch(() => {}).then(() => {
                    setScanMode('manual');
                  });
                } else {
                  setScanMode('manual');
                }
                alert("รับข้อมูลสั่งพิมพ์สำเร็จ");
              } catch (err) {
                alert("QR Code ไม่ถูกต้องหรือไม่ใช่ข้อมูลจากระบบนี้");
              }
            },
            (errorMessage) => {
              // Ignore scanning trace errors
            }
          ).catch((err) => {
            console.error("Failed to start scanner:", err);
          });
        } catch (e) {
          console.error("Scanner init error:", e);
        }
      }, 150);

      return () => {
        clearTimeout(timer);
        isMounted = false;
        if (qrCodeInstance) {
          if (qrCodeInstance.isScanning) {
            qrCodeInstance.stop().catch((e) => console.error("Stop failed", e));
          }
        }
      };
    }
  }, [scanMode, cameraActive]);

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
            alert("รับข้อมูลสั่งพิมพ์สำเร็จ");
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
      alert("รับข้อมูลสั่งพิมพ์สำเร็จ");
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
    setIsSettingsDirty(true);
  };
  const handleStaffNameChange = (e) => {
    setStaffName(e.target.value);
    setIsSettingsDirty(true);
  };
  const handleStaffPhoneChange = (e) => {
    setStaffPhone(e.target.value);
    setIsSettingsDirty(true);
  };

  const [isUrlCopied, setIsUrlCopied] = useState(false);
  const [showQuickQrModal, setShowQuickQrModal] = useState(false);
  
  // Helper to get 5-digit branch code, or fallback to the full typed name
  const getBranchCode = (name) => {
    if (!name) return '';
    const match = name.match(/\d{5}/);
    return match ? match[0] : name;
  };

  const branchCode = getBranchCode(branchName);
  const generatedCustomerUrl = `${window.location.origin}${window.location.pathname}?branch=${encodeURIComponent(branchCode)}`;

  const copyGeneratedUrl = () => {
    navigator.clipboard.writeText(generatedCustomerUrl);
    setIsUrlCopied(true);
    setTimeout(() => setIsUrlCopied(false), 2000);
  };

  const downloadBranchQr = () => {
    const canvas = document.getElementById('branch-qr-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-customer-${branchCode || 'branch'}.png`;
    link.click();
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
    setIsSettingsDirty(false);
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

          @media (max-width: 768px) {
            .staff-tip-banner {
              display: none !important;
            }
            .print-settings-panel {
              display: none !important;
            }
            .staff-settings-bar {
              flex-direction: column !important;
              align-items: stretch !important;
              gap: 0.5rem !important;
              padding: 0.75rem !important;
              width: 100% !important;
            }
            .staff-settings-bar > div {
              width: 100% !important;
              justify-content: space-between !important;
              flex-wrap: wrap !important;
            }
            .staff-settings-bar input {
              flex: 1 !important;
              max-width: none !important;
              width: auto !important;
            }
            .staff-settings-bar button {
              width: 100% !important;
              margin-left: 0 !important;
              margin-top: 0.25rem !important;
            }
            .staff-settings-bar > button {
              width: 100% !important;
            }
            .staff-columns {
              flex-direction: column !important;
              gap: 1.5rem !important;
            }
            .usb-scanner-box {
              display: none !important;
            }
            .drag-drop-box {
              display: none !important;
            }
            .mobile-only-hide-when-no-data {
              display: none !important;
            }
            .mobile-only-hide-when-no-data.active {
              display: block !important;
            }
            .staff-dashboard-wrapper {
              display: flex;
              flex-direction: column;
            }
            .staff-header-row {
              display: none !important;
            }
            .staff-columns {
              order: 1 !important;
              display: flex;
              flex-direction: column;
            }
            .staff-settings-container-row {
              order: 2 !important;
            }
          }

          .quick-qr-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(8px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            animation: fadeIn 0.2s ease-out;
          }
          .quick-qr-modal-content {
            background: white;
            border-radius: 20px;
            padding: 2.5rem 2rem;
            width: 90%;
            max-width: 440px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            text-align: center;
            position: relative;
            animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.9) translateY(10px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
          #reader video {
            border-radius: 12px;
            width: 100% !important;
            height: auto !important;
            object-fit: cover;
          }
        `}
      </style>
      
      <div className="staff-no-print staff-dashboard-wrapper">
        <div className="staff-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>แดชบอร์ดเจ้าหน้าที่ ปณ.</h2>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label 
              className="btn btn-secondary" 
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.9rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                cursor: 'pointer', 
                margin: 0, 
                borderColor: '#22c55e', 
                color: '#15803d', 
                backgroundColor: '#f0fdf4', 
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(34, 197, 94, 0.15)'
              }}
              title="เลือกไฟล์ข้อมูลที่ส่งออกมาเพื่อนำเข้าในเครื่องนี้"
            >
              <Upload size={16} /> นำเข้าข้อมูลลูกค้า (.json)
              <input type="file" accept=".json" onChange={importHistory} style={{ display: 'none' }} />
            </label>
            <Link to="/worldcup" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#3b82f6', color: '#1d4ed8', backgroundColor: '#eff6ff' }}>
              <span role="img" aria-label="soccer">⚽</span> ทายผลบอลโลก 2026
            </Link>
          </div>
        </div>



        <div className="staff-columns" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
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
                  className={`btn ${scanMode === 'camera' || scanMode === 'usb' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setScanMode('camera')}
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem', 
                    fontSize: '0.9rem', 
                    minWidth: '150px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <QrCode size={16} />
                  <span style={{ textAlign: 'left', lineHeight: '1.1', fontSize: '0.8rem' }}>
                    สแกน QR Code<br />และรับข้อมูลสั่งพิมพ์
                  </span>
                </button>
              </div>

              <div id="reader-hidden" style={{ position: 'absolute', top: '-9999px', width: '500px', height: '500px' }}></div>

              {(scanMode === 'camera' || scanMode === 'usb') && (
                <div>
                  {/* Camera Scanner View */}
                  <div id="reader" style={{ width: '100%', marginBottom: '1rem', display: cameraActive ? 'block' : 'none' }}></div>
                  {cameraActive && (
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setCameraActive(false)}
                        style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        ❌ ปิดกล้องสแกน
                      </button>
                    </div>
                  )}

                  {/* Drag and drop image upload (Shown at top in place of camera placeholder on desktop when camera is inactive, hidden on mobile via CSS class 'drag-drop-box') */}
                  {!cameraActive && (
                    <div className="drag-drop-box" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
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
                          padding: '2.5rem 1rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: '#f8fafc'
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
                        
                        {/* Option to start webcam on desktop */}
                        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCameraActive(true);
                            }}
                            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            📷 เปิดกล้องสแกนเนอร์
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* USB Scanner Input View (Hidden on mobile via class 'usb-scanner-box') */}
                  <div className="usb-scanner-box" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', border: '2px dashed var(--primary)', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>🔌 ใช้เครื่องสแกนบาร์โค้ด (USB)</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        ยิงเครื่องสแกนเนอร์ได้ทันทีโดยไม่ต้องคลิก (หรือคลิกที่ช่องด้านล่างเพื่อยิง)
                      </div>
                    </div>
                    <input 
                      type="text" 
                      id="usb-scanner-input"
                      autoFocus
                      className="form-control" 
                      placeholder="👉 คลิกตรงนี้ แล้วยิงสแกนเนอร์..." 
                      style={{ fontSize: '1rem', padding: '0.6rem', textAlign: 'center', borderColor: 'var(--primary)', borderWidth: '2px', backgroundColor: '#fff' }}
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
                            alert("รับข้อมูลสั่งพิมพ์สำเร็จ");
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
                              alert("รับข้อมูลสั่งพิมพ์สำเร็จ");
                            }
                          } catch (err) {}
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit, onError)} className={`mobile-only-hide-when-no-data ${(hasActiveData || scanMode === 'manual') ? 'active' : ''}`}>
                {hasActiveData && (
                  <div style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#1e3a8a', fontWeight: 'bold' }}>
                      ✏️ กำลังแก้ไขข้อมูลลูกค้าที่เลือก/สแกน
                    </span>
                    <button 
                      type="button" 
                      onClick={() => {
                        reset();
                        setQuantityFields(100);
                        setHasActiveData(false);
                        setScanMode('manual');
                      }} 
                      className="btn" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', border: '1px solid #ef4444', color: '#dc2626', backgroundColor: '#fef2f2', cursor: 'pointer', margin: 0 }}
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
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
                      <div className="form-group" style={{ 
                        marginTop: '0.75rem', 
                        padding: '0.75rem', 
                        backgroundColor: '#fff1f2', 
                        border: '2px solid #fecdd3', 
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e11d48', whiteSpace: 'nowrap' }}>โปรดระบุจำนวน</span>
                          <input 
                            type="number" 
                            min="50" 
                            className={`form-control ${getFieldClass('customQuantity')}`} 
                            required 
                            {...register("customQuantity", { required: true, min: 50 })} 
                            placeholder="เช่น 150" 
                            style={{ width: '85px', display: 'inline-block', margin: 0, padding: '0.35rem 0.5rem', textAlign: 'center', borderColor: '#e11d48', borderWidth: '2px', fontSize: '0.95rem' }}
                          />
                          <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e11d48', whiteSpace: 'nowrap' }}>ใบ <span style={{color:'red'}}>*</span></span>
                        </div>
                        {errors.customQuantity && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุจำนวนอย่างน้อย 50 ใบ</span>}
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
                {/* D-ID toggle button row and box inputs */}
                <input type="hidden" {...register("did")} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'bold' }}>ที่อยู่ D-ID (ไปรษณีย์ไทย):</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !showDidInput;
                        setShowDidInput(nextState);
                        if (!nextState) {
                          setValue("did", "", { shouldValidate: true, shouldDirty: true });
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        border: showDidInput ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        boxShadow: showDidInput ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
                        transition: 'all 0.2s',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                      }}
                    >
                      <span style={{ color: '#003399', fontWeight: '800', fontSize: '1rem' }}>D</span>
                      <span style={{ color: '#e11d48', fontWeight: '800', fontSize: '1rem' }}>/ID</span>
                    </button>
                  </div>

                  {showDidInput && (
                    <DidBoxInput 
                      value={didValue} 
                      onChange={(val) => setValue("did", val, { shouldValidate: true, shouldDirty: true })} 
                    />
                  )}
                </div>

                <ThaiAddressFields register={register} setValue={setValue} errors={errors} dirtyFields={dirtyFields} touchedFields={touchedFields} isAddressRequired={!isDidActive} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  <button 
                    type="submit" 
                    onClick={handleDirectPrintClick} 
                    className="btn btn-primary" 
                    style={{ width: '100%', fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0, padding: '0.65rem' }}
                  >
                    <Printer size={18} />
                    บันทึกและสั่งพิมพ์
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSaveOnlyClick} 
                    className="btn" 
                    style={{ width: '100%', fontSize: '1.05rem', fontWeight: 'bold', border: '2px solid #3b82f6', color: '#1d4ed8', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0, padding: '0.65rem', cursor: 'pointer' }}
                  >
                    💾 บันทึกข้อมูลเข้าระบบ (ไม่พิมพ์)
                  </button>
                </div>

                <div className="print-settings-panel" style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {record.phone && <span>โทร: {record.phone}</span>}
                          {record.phone && <span style={{ color: '#cbd5e1' }}>|</span>}
                          {record.quantity !== undefined && <span>จำนวนที่พิมพ์: {record.quantity} ใบ</span>}
                          {record.quantity !== undefined && <span style={{ color: '#cbd5e1' }}>|</span>}
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {new Date(record.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => handlePrintHistory(record)} 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem', margin: 0 }}
                        >
                          <Printer size={12} /> พิมพ์ซ้ำ
                        </button>
                        <button 
                          onClick={() => {
                            populateFromScan(record);
                            // Scroll to form on mobile
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          className="btn" 
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderColor: '#3b82f6', color: '#1d4ed8', backgroundColor: '#eff6ff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem', margin: 0, cursor: 'pointer' }}
                        >
                          ✏️ แก้ไข
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2 & 1 moved to the bottom of the page */}
        <div className="staff-settings-container-row" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '2rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div className="staff-settings-bar" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#fff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: '1 1 auto', minWidth: '150px', maxWidth: '280px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>สาขา:</span>
              <input 
                type="text" 
                className="form-control" 
                value={branchName} 
                onChange={handleBranchChange} 
                style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: '1 1 auto', minWidth: '110px', maxWidth: '200px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>จนท:</span>
              <input 
                type="text" 
                className="form-control" 
                value={staffName} 
                onChange={handleStaffNameChange} 
                placeholder="คลิกเพื่อพิมพ์ชื่อ"
                style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: '1 1 auto', minWidth: '100px', maxWidth: '160px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>โทร:</span>
              <input 
                type="text" 
                className="form-control" 
                value={staffPhone} 
                onChange={handleStaffPhoneChange} 
                placeholder="คลิกเพื่อพิมพ์"
                style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={saveSettings} 
                className="btn" 
                style={{ 
                  padding: '0.3rem 0.8rem', 
                  fontSize: '0.85rem', 
                  marginLeft: '0.25rem',
                  backgroundColor: shouldShowRed ? 'var(--primary)' : '#fff', 
                  color: shouldShowRed ? '#fff' : '#475569', 
                  border: shouldShowRed ? '1px solid var(--primary)' : '1px solid #cbd5e1',
                  fontWeight: shouldShowRed ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {showSaveSuccess ? 'บันทึกแล้ว' : 'บันทึก'}
              </button>
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
              แบบฟอร์ม สั่งพิมพ์ไปรษณียบัตร
            </button>
          </div>
        </div>

        <div className="staff-tip-banner" style={{ 
          backgroundColor: '#eff6ff', 
          borderLeft: '4px solid #3b82f6', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem', 
          fontSize: '0.85rem', 
          color: '#1e3a8a',
          lineHeight: '1.5'
        }}>
          <div>
            💡 <strong>เคล็ดลับสำหรับสาขา:</strong> ลูกค้าสามารถกรอกข้อมูลล่วงหน้าจากบ้านได้ โดยท่านสามารถส่งลิงก์ระบบของลูกค้าที่มีชื่อสาขาของท่านต่อท้ายโดยอัตโนมัติ เพื่อให้เมื่อลูกค้ากดบันทึก ข้อมูลใบสั่งจองจะผูกกับรหัสสาขาของท่านทันที
          </div>
          
          <div style={{ 
            marginTop: '0.75rem', 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '1rem', 
            alignItems: 'center', 
            backgroundColor: '#fff', 
            padding: '0.75rem', 
            borderRadius: '6px', 
            border: '1px solid #bfdbfe' 
          }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '0.8rem', marginBottom: '0.25rem' }}>🔗 ลิงก์สำหรับส่งให้ลูกค้าจองของสาขา:</div>
              <input 
                type="text" 
                readOnly 
                value={generatedCustomerUrl} 
                style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }} 
                onClick={(e) => e.target.select()}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ 
                backgroundColor: '#fff', 
                padding: '0.4rem 0.4rem 0.2rem 0.4rem', 
                border: '2px solid #3b82f6', 
                borderRadius: '8px', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
              }}>
                <QRCodeCanvas id="branch-qr-canvas" value={generatedCustomerUrl} size={55} level="M" />
                <div style={{ fontSize: '0.55rem', color: '#1d4ed8', fontWeight: 'bold', marginTop: '0.2rem', whiteSpace: 'nowrap' }}>
                  QR Customer
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button 
                  onClick={copyGeneratedUrl} 
                  className="btn" 
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid #3b82f6', color: '#1d4ed8', backgroundColor: isUrlCopied ? '#eff6ff' : '#fff', fontWeight: 'bold', margin: 0, cursor: 'pointer' }}
                >
                  {isUrlCopied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
                </button>
                <button 
                  onClick={downloadBranchQr} 
                  className="btn" 
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid #16a34a', color: '#15803d', backgroundColor: '#f0fdf4', fontWeight: 'bold', margin: 0, cursor: 'pointer' }}
                >
                  โหลดไฟล์ QR (.png)
                </button>
                <button 
                  onClick={() => setShowQuickQrModal(true)} 
                  className="btn" 
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid #e11d48', color: '#e11d48', backgroundColor: '#fff1f2', fontWeight: 'bold', margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                >
                  ⚡ สแกนด่วนบนจอ
                </button>
              </div>
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
      {showQuickQrModal && (
        <div className="quick-qr-modal-overlay" onClick={() => setShowQuickQrModal(false)}>
          <div className="quick-qr-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 'bold' }}>
              📲 สแกน QR เพื่อกรอกข้อมูล
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              สาขา: <strong style={{ color: 'var(--primary)' }}>{branchName}</strong>
            </p>
            
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '1.25rem 1rem 1rem 1rem', 
              borderRadius: '16px', 
              display: 'inline-flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center',
              border: '3px solid #3b82f6',
              boxShadow: '0 10px 25px rgba(59, 130, 246, 0.15)',
              marginBottom: '1.25rem',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'absolute', 
                top: '-0.75rem', 
                backgroundColor: '#3b82f6', 
                color: '#fff', 
                fontSize: '0.75rem', 
                fontWeight: 'bold', 
                padding: '0.15rem 0.6rem', 
                borderRadius: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                QR Customer (ลิงก์สำหรับลูกค้าสแกน)
              </div>
              <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                <QRCodeCanvas value={generatedCustomerUrl} size={280} level="H" includeMargin={true} />
              </div>
            </div>
            
            <p style={{ margin: '0 0 1.5rem 0', color: '#475569', fontSize: '0.85rem', lineHeight: '1.5', padding: '0 0.5rem' }}>
              ให้ลูกค้าใช้โทรศัพท์มือถือสแกน QR Code นี้เพื่อเข้าสู่ระบบลงทะเบียนผู้รับ และสั่งจองได้สะดวกรวดเร็วจากมือถือตัวเอง
            </p>
            
            <button 
              onClick={() => setShowQuickQrModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.6rem 1rem', fontSize: '0.95rem', borderRadius: '10px' }}
            >
              ปิดหน้าต่างนี้
            </button>
          </div>
        </div>
      )}
    </>
  );
}
