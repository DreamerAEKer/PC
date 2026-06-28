import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { flushSync } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QrCode, Keyboard, History, Printer, FileText, Settings, Download, Upload, RefreshCw, Camera, FolderOpen } from 'lucide-react';
import ThaiAddressFields from '../components/ThaiAddressFields';
import DidBoxInput from '../components/DidBoxInput';
import ThaiDatePicker from '../components/ThaiDatePicker';
import { QRCodeCanvas } from 'qrcode.react';
import { useThaiAddress } from 'use-thai-address';
import jsQR from 'jsqr';

let globalHiddenScanner = null;

const DB_NAME = 'StaffPortalDB';
const STORE_NAME = 'FolderHandles';

const saveHandlesToDB = async (handles) => {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(handles, 'directoryHandles');
      tx.oncomplete = () => resolve();
    };
    request.onerror = () => resolve();
  });
};

const loadHandlesFromDB = async () => {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get('directoryHandles');
      getReq.onsuccess = () => resolve(getReq.result || []);
      getReq.onerror = () => resolve([]);
    };
    request.onerror = () => resolve([]);
  });
};

const getSavedDate = (record) => {
  if (record.timestamp) {
    return record.timestamp.split('T')[0];
  }
  if (record.id && typeof record.id === 'number' && record.id > 1000000000000) {
    try {
      return new Date(record.id).toISOString().split('T')[0];
    } catch (e) {}
  }
  return '';
};

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
  const [historyFilter, setHistoryFilter] = useState('pending'); // 'all', 'pending', 'printed'
  const [filterSender, setFilterSender] = useState('');
  const [filterSavedDate, setFilterSavedDate] = useState('');
  const [filterOrderDate, setFilterOrderDate] = useState('');
  const [filterImportSource, setFilterImportSource] = useState('');
  const [latestRecordId, setLatestRecordId] = useState(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState(null);
  const [cardRecord, setCardRecord] = useState(null);
  const [directoryHandles, setDirectoryHandles] = useState([]);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [scanMode, setScanMode] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768 ? 'camera' : 'manual');
  const [cameraActive, setCameraActive] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [scanSubMode, setScanSubMode] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768 ? 'camera' : 'file'); // 'file', 'usb', 'camera'
  const didValue = watch("did", "");
  const isDidActive = (didValue || "").trim().length === 6;
  const [showDidInput, setShowDidInput] = useState(false);
  const [isRefreshingFolder, setIsRefreshingFolder] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [scanResultModal, setScanResultModal] = useState(null);

  useEffect(() => {
    if (didValue && didValue.trim().length > 0) {
      setShowDidInput(true);
    }
  }, [didValue]);

  useEffect(() => {
    if (latestRecordId) {
      const record = history.find(r => r.id === latestRecordId);
      if (record) {
        if (!record.printed) {
          setHistoryFilter('pending');
        } else {
          setHistoryFilter('all');
        }
      }
      
      const scrollAndHighlight = () => {
        const row = document.getElementById(`record-row-${latestRecordId}`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.style.transition = 'background-color 0.3s ease';
          row.style.backgroundColor = '#fef08a';
          setTimeout(() => {
            row.style.backgroundColor = record && record.printed ? '#f8fafc' : '#fff';
          }, 2000);
          setLatestRecordId(null);
        }
      };

      scrollAndHighlight();
      const timer = setTimeout(scrollAndHighlight, 350);
      return () => clearTimeout(timer);
    }
  }, [latestRecordId, history]);

  const [hasActiveData, setHasActiveData] = useState(false);
  const [branchName, setBranchName] = useState('ไปรษณีย์กลาง');
  const [branchCode, setBranchCode] = useState('10501');
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [postcardRate, setPostcardRate] = useState(3);
  const [payerName, setPayerName] = useState('');
  const [bulkPaidStatus, setBulkPaidStatus] = useState(true);
  const [bulkPaidDate, setBulkPaidDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });
  const [isPrintingInvoice, setIsPrintingInvoice] = useState(false);
  const [printLayoutType, setPrintLayoutType] = useState('grid'); // 'combined' or 'grid'
  const [invoiceQueue, setInvoiceQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('staffInvoiceQueue');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [isPrintingQueue, setIsPrintingQueue] = useState(false);

  const saveInvoiceQueue = (newQueue) => {
    setInvoiceQueue(newQueue);
    localStorage.setItem('staffInvoiceQueue', JSON.stringify(newQueue));
  };
  const [isPrintingGuide, setIsPrintingGuide] = useState(false);
  const [staffProfiles, setStaffProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem('staffProfiles');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedProfileId, setSelectedProfileId] = useState('');

  const saveStaffProfiles = (newProfiles) => {
    setStaffProfiles(newProfiles);
    localStorage.setItem('staffProfiles', JSON.stringify(newProfiles));
  };
  const [touchStartX, setTouchStartX] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState({});
  const [swipedItemId, setSwipedItemId] = useState(null);
  const navigate = useNavigate();

  const constructFullAddress = (item) => {
    if (!item) return '';
    if (item.address && (item.address.includes('ต.') || item.address.includes('อ.') || item.address.includes('จ.') || item.address.includes('แขวง') || item.address.includes('เขต'))) {
      return item.address;
    }
    const isBKK = item.province === 'กรุงเทพมหานคร';
    const subTitle = isBKK ? (item.subdistrict ? `แขวง${item.subdistrict}` : '') : (item.subdistrict ? `ต.${item.subdistrict}` : '');
    const distTitle = isBKK ? (item.district ? `เขต${item.district}` : '') : (item.district ? `อ.${item.district}` : '');
    const provTitle = isBKK ? (item.province || '') : (item.province ? `จ.${item.province}` : '');
    const parts = [
      item.addressLine1 || item.address || '',
      subTitle,
      distTitle,
      provTitle
    ].filter(Boolean);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };

  const [targetScanCount, setTargetScanCount] = useState(0);
  const [currentScanCount, setCurrentScanCount] = useState(0);
  const [scannedIndexes, setScannedIndexes] = useState([]);
  const [pendingScannedRecords, setPendingScannedRecords] = useState([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === history.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(history.map(r => r.id));
    }
  };

  const toggleSelectRecord = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleUpdatePaymentStatus = () => {
    if (selectedIds.length === 0) return;
    setHistory(prev => {
      const updated = prev.map(r => {
        if (selectedIds.includes(r.id)) {
          return {
            ...r,
            paid: bulkPaidStatus,
            paidDate: bulkPaidStatus ? bulkPaidDate : null
          };
        }
        return r;
      });
      localStorage.setItem('staffHistory', JSON.stringify(updated));
      return updated;
    });
    alert(`อัปเดตสถานะการชำระเงินของ ${selectedIds.length} รายการสำเร็จ!`);
  };

  const { filteredData, searchByField } = useThaiAddress();

  useEffect(() => {
    if (branchCode && branchCode.length === 5 && filteredData && filteredData.length > 0) {
      const item = filteredData[0];
      if (item && item.district) {
        let name = `ไปรษณีย์${item.district}`;
        if (branchCode === '10501') {
          name = 'ไปรษณีย์กลาง';
        }
        setBranchName(name);
      }
    }
  }, [filteredData, branchCode]);

  useEffect(() => {
    if (scanMode !== 'camera') {
      setCameraActive(false);
    } else {
      if (scanSubMode === 'camera') {
        setCameraActive(true);
      } else {
        setCameraActive(false);
      }
    }
  }, [scanMode, scanSubMode]);

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
    saveHandlesToDB(directoryHandles);
  }, [directoryHandles]);

  useEffect(() => {
    loadHandlesFromDB().then(handles => {
      if (Array.isArray(handles)) {
        setDirectoryHandles(handles);
      }
    });

    const savedBranch = localStorage.getItem('branchName') || 'ไปรษณีย์กลาง';
    const savedCode = localStorage.getItem('branchCode');
    if (savedCode) {
      setBranchCode(savedCode);
      setBranchName(savedBranch);
    } else {
      const match = savedBranch.match(/\d{5}/);
      if (match) {
        setBranchCode(match[0]);
        setBranchName(savedBranch.replace(match[0], '').trim());
      } else {
        setBranchName(savedBranch);
      }
    }
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
    setValue("orderDate", new Date().toISOString().split('T')[0]);
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
    const updatedHistory = [newRecord, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('staffHistory', JSON.stringify(updatedHistory));
    return newRecord;
  };

  const [printDataList, setPrintDataList] = useState([]);

  const [presets, setPresets] = useState(() => {
    const defaultList = [
      { name: 'ค่าเริ่มต้นไปรษณียบัตร', top: 4.5, left: 9.5, fontSize: 12, isNameBold: true, isPhoneBold: true, didPrintMode: 'address', calX: 0, calY: 0 },
      { name: 'ตัวอักษรใหญ่ (ซม.)', top: 4.0, left: 9.0, fontSize: 14, isNameBold: true, isPhoneBold: true, didPrintMode: 'address', calX: 0, calY: 0 },
      { name: 'เครื่อง Drop Off', top: 4.0, left: 5.5, fontSize: 16, isNameBold: true, isPhoneBold: true, didPrintMode: 'address', calX: 0, calY: 0 }
    ];
    try {
      const saved = localStorage.getItem('customPrintPresets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...defaultList];
          parsed.forEach(p => {
            if (!merged.some(m => m.name === p.name)) {
              merged.push(p);
            }
          });
          return merged;
        }
      }
    } catch (e) {}
    return defaultList;
  });

  const [newPresetName, setNewPresetName] = useState('');

  const [printSettings, setPrintSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('customPrintSettings');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object') {
        const hasVersionMarker = localStorage.getItem('printSettingsMigrated_1_15_6') === 'true';
        let mode = (parsed.didPrintMode === 'did' || parsed.didPrintMode === 'address') ? parsed.didPrintMode : 'address';
        if (!hasVersionMarker) {
          mode = 'address';
          localStorage.setItem('printSettingsMigrated_1_15_6', 'true');
        }
        return {
          top: typeof parsed.top === 'number' ? parsed.top : 4.5,
          left: typeof parsed.left === 'number' ? parsed.left : 9.5,
          fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : 6,
          isNameBold: typeof parsed.isNameBold === 'boolean' ? parsed.isNameBold : true,
          isPhoneBold: typeof parsed.isPhoneBold === 'boolean' ? parsed.isPhoneBold : true,
          didPrintMode: mode,
          paperSize: typeof parsed.paperSize === 'string' ? parsed.paperSize : 'A6',
          printCountry: typeof parsed.printCountry === 'boolean' ? parsed.printCountry : false,
          countryName: typeof parsed.countryName === 'string' ? parsed.countryName : 'ประเทศไทย',
          calX: typeof parsed.calX === 'number' ? parsed.calX : 0,
          calY: typeof parsed.calY === 'number' ? parsed.calY : 0
        };
      }
      localStorage.setItem('printSettingsMigrated_1_15_6', 'true');
      return { top: 4.5, left: 9.5, fontSize: 6, isNameBold: true, isPhoneBold: true, didPrintMode: 'address', paperSize: 'A6', printCountry: false, countryName: 'ประเทศไทย', calX: 0, calY: 0 };
    } catch (e) {
      localStorage.setItem('printSettingsMigrated_1_15_6', 'true');
      return { top: 4.5, left: 9.5, fontSize: 6, isNameBold: true, isPhoneBold: true, didPrintMode: 'address', paperSize: 'A6', printCountry: false, countryName: 'ประเทศไทย', calX: 0, calY: 0 };
    }
  });

  useEffect(() => {
    localStorage.setItem('customPrintSettings', JSON.stringify(printSettings));
  }, [printSettings]);

  useEffect(() => {
    localStorage.setItem('customPrintPresets', JSON.stringify(presets));
  }, [presets]);

  const handleDragStart = (e) => {
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY);
    if (clientX === undefined || clientY === undefined) return;

    e.preventDefault();

    const initialTop = printSettings.top;
    const initialLeft = printSettings.left;

    const isA4 = printSettings.paperSize === 'A4';
    const scale = isA4 ? 0.25 : 0.5;
    const pixelsPerCm = 37.795 * scale;

    const handleDragMove = (moveEvent) => {
      const currentX = moveEvent.clientX !== undefined ? moveEvent.clientX : (moveEvent.touches && moveEvent.touches[0] && moveEvent.touches[0].clientX);
      const currentY = moveEvent.clientY !== undefined ? moveEvent.clientY : (moveEvent.touches && moveEvent.touches[0] && moveEvent.touches[0].clientY);
      if (currentX === undefined || currentY === undefined) return;

      const deltaX = currentX - clientX;
      const deltaY = currentY - clientY;

      const deltaLeftCm = deltaX / pixelsPerCm;
      const deltaTopCm = deltaY / pixelsPerCm;

      let newLeft = Math.max(0, Math.min(15, Math.round((initialLeft + deltaLeftCm) * 10) / 10));
      let newTop = Math.max(0, Math.min(10, Math.round((initialTop + deltaTopCm) * 10) / 10));

      setPrintSettings(prev => ({
        ...prev,
        left: newLeft,
        top: newTop
      }));
    };

    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
  };

  const handleDirectPrintClick = (e) => {
    const form = e.target.closest('form');
    if (form && form.checkValidity()) {
      e.preventDefault();
      
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
    
    setHistory(prevHistory => {
      const safeHistory = Array.isArray(prevHistory) ? prevHistory : [];
      let updatedHistory;
      if (editingRecordId) {
        updatedHistory = safeHistory.map(r => r.id === editingRecordId ? { ...r, ...processedData, printed: false, timestamp: new Date().toISOString() } : r);
      } else {
        const newRecord = { ...processedData, id: Date.now(), timestamp: new Date().toISOString(), printed: false };
        updatedHistory = [newRecord, ...safeHistory];
      }
      const sliced = updatedHistory.slice(0, 100);
      localStorage.setItem('staffHistory', JSON.stringify(sliced));
      return sliced;
    });
    
    reset();
    setQuantityFields(100);
    setHasActiveData(false);
    setEditingRecordId(null);
    setScanMode('manual');
    setHistoryFilter('pending');
    
    alert(editingRecordId ? "อัพเดทข้อมูลลูกค้าและส่งไปที่แท็บรอพิมพ์สำเร็จ" : "บันทึกข้อมูลลูกค้าเข้าระบบสำเร็จ (ไม่ได้สั่งพิมพ์)");

    setTimeout(() => {
      document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
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

    delete processedData.selectQuantity;
    delete processedData.customQuantity;
    
    let newRecord;
    if (editingRecordId) {
      const existing = history.find(r => r.id === editingRecordId) || {};
      newRecord = { ...existing, ...processedData, printed: true, timestamp: new Date().toISOString() };
    } else {
      newRecord = { ...processedData, id: Date.now(), timestamp: new Date().toISOString(), printed: true };
    }
    
    const handleAfterPrint = () => {
      setPrintDataList([]);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);

    flushSync(() => {
      setPrintDataList([newRecord]);
    });
    
    window.print();
    
    setTimeout(() => {
      setHistory(prevHistory => {
        const safeHistory = Array.isArray(prevHistory) ? prevHistory : [];
        let updatedHistory;
        if (editingRecordId) {
          updatedHistory = safeHistory.map(r => r.id === editingRecordId ? newRecord : r);
        } else {
          updatedHistory = [newRecord, ...safeHistory];
        }
        const sliced = updatedHistory.slice(0, 100);
        localStorage.setItem('staffHistory', JSON.stringify(sliced));
        return sliced;
      });
      
      reset();
      setQuantityFields(100);
      setHasActiveData(false);
      setEditingRecordId(null);
      setScanMode('manual');
    }, 500);
  };

  const handlePrintHistory = (record) => {
    const handleAfterPrint = () => {
      setPrintDataList([]);
      window.removeEventListener('afterprint', handleAfterPrint);
      setHistory(prev => {
        const updated = prev.map(r => r.id === record.id ? { ...r, printed: true } : r);
        localStorage.setItem('staffHistory', JSON.stringify(updated));
        return updated;
      });
    };
    window.addEventListener('afterprint', handleAfterPrint);

    flushSync(() => {
      setPrintDataList([record]);
    });
    window.print();
  };

  const exportHistory = async (mode = 'download') => {
    const recordsToExport = selectedIds.length > 0
      ? history.filter(r => selectedIds.includes(r.id))
      : history;

    if (recordsToExport.length === 0) {
      alert("ไม่มีประวัติการพิมพ์ให้ส่งออกครับ");
      return;
    }
    const dataStr = JSON.stringify(recordsToExport, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = selectedIds.length > 0 
      ? `staff-history-selected-${dateStr}.json`
      : `staff-history-${dateStr}.json`;

    if (mode === 'share') {
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([dataStr], filename, { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'ประวัติข้อมูลลูกค้าจอง',
              text: `ไฟล์ข้อมูลลูกค้าสาขา ${branchName} (${branchCode}) ประจำวันที่ ${dateStr}`
            });
            return;
          }
        } catch (err) {
          console.warn("Share failed", err);
          alert("ไม่สามารถแชร์ได้: " + err.message);
        }
      } else {
        alert("อุปกรณ์หรือเบราว์เซอร์ของคุณไม่รองรับการแชร์โดยตรง กรุณาใช้ปุ่มบันทึกลงเครื่องครับ");
      }
      return;
    }

    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateAndDownloadCard = async (record) => {
    setCardRecord(record);
    setTimeout(async () => {
      const el = document.getElementById('hidden-capture-card');
      if (el) {
        try {
          const canvas = await html2canvas(el, { 
            scale: 2,
            useCORS: true,
            allowTaint: true
          });
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          const dateStr = record.orderDate || new Date().toISOString().split('T')[0];
          a.href = url;
          a.download = `postcard-card-${record.name || 'customer'}-${dateStr}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {
          console.error("Capture card error:", e);
          alert("ไม่สามารถบันทึกภาพการ์ดได้: " + e.message);
        }
      }
      setCardRecord(null);
    }, 500);
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
            const prevMap = new Map();
            for (const r of safePrev) {
              const k = r.id || r.orderCode || `${r.name}-${r.phone}`;
              prevMap.set(k, r);
            }

            const merged = [...parsed, ...safePrev];
            const unique = [];
            const seen = new Set();
            for (const item of merged) {
              if (item && item.id && !seen.has(item.id)) {
                seen.add(item.id);
                const prevKey = item.id || item.orderCode || `${item.name}-${item.phone}`;
                const prevItem = prevMap.get(prevKey);
                
                let cleanedDid = item.did || '';
                if (cleanedDid && (cleanedDid === item.id || cleanedDid === item.orderCode || cleanedDid.length > 10)) {
                  cleanedDid = '';
                }
                
                const cleanedItem = {
                  ...item,
                  did: cleanedDid,
                  address: constructFullAddress(item),
                  importSource: item.importSource || file.name
                };

                if (prevItem) {
                  unique.push({ ...cleanedItem, printed: prevItem.printed });
                } else {
                  unique.push({ ...cleanedItem, printed: false });
                }
              }
            }
            const sortedUnique = unique.sort((a, b) => b.id - a.id).slice(0, 100);
            localStorage.setItem('staffHistory', JSON.stringify(sortedUnique));
            return sortedUnique;
          });

          const importedIds = parsed.map(item => item.id).filter(Boolean);
          setSelectedIds(importedIds);
          setHistoryFilter('pending');

          alert(`นำเข้าข้อมูลสำเร็จ! โหลดประวัติเพิ่มได้ ${parsed.length} รายการ (ระบบได้เลือกรายการเหล่านี้เพื่อเตรียมสั่งพิมพ์แบบกลุ่มให้ท่านแล้ว)`);

          setTimeout(() => {
            document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 300);
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
            orderCode: raw.oc || '',
            senderNickname: raw.sn || '',
            senderPhone: raw.sp || '',
            orderDate: raw.d || '',
            quantity: raw.q || 1,
            name: raw.n || '',
            phone: raw.p || '',
            addressLine1: raw.a || '',
            subdistrict: raw.sd || '',
            district: raw.dt || '',
            province: raw.pv || '',
            zipcode: raw.zp || '',
            did: raw.id || '',
            idx: raw.idx,
            tot: raw.tot
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
    setValue("orderCode", data.orderCode || data.oc || "");
    setValue("senderNickname", data.senderNickname || data.sn || "");
    setValue("senderPhone", data.senderPhone || data.sp || "");
    setHasActiveData(true);
    if (data.id) {
      setEditingRecordId(data.id);
    } else {
      setEditingRecordId(null);
    }
  };

  const onScanSuccess = (data, sourceName = '') => {
    const code = data.oc || data.orderCode || '';
    const existing = history.find(r => 
      (code && (r.orderCode === code || r.oc === code)) || 
      (r.name === data.name && r.phone === data.phone && r.quantity === data.quantity)
    );
    
    if (existing) {
      setScanResultModal({
        success: true,
        isDup: true,
        name: data.name,
        quantity: data.quantity,
        orderCode: code || '-',
        dupDate: new Date(existing.timestamp).toLocaleDateString('th-TH') + ' ' + new Date(existing.timestamp).toLocaleTimeString('th-TH'),
        targetId: existing.id
      });
      setLatestRecordId(existing.id);
    } else {
      let cleanedDid = data.did || '';
      if (cleanedDid) {
        const rawDidStr = String(cleanedDid).trim();
        if (!(rawDidStr.length === 6 && /^\d+$/.test(rawDidStr))) {
          cleanedDid = '';
        }
      }
      const newRecord = {
        ...data,
        did: cleanedDid,
        address: constructFullAddress(data),
        orderCode: code,
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        printed: false,
        importSource: sourceName || data.importSource || ''
      };
      setHistory(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const updated = [newRecord, ...safePrev];
        localStorage.setItem('staffHistory', JSON.stringify(updated));
        return updated;
      });
      setHistoryFilter('pending');
      setLatestRecordId(newRecord.id);
      
      setScanResultModal({
        success: true,
        isDup: false,
        name: data.name,
        quantity: data.quantity,
        orderCode: code || '-',
        targetId: newRecord.id
      });
    }
  };

  useEffect(() => {
    let qrCodeInstance = null;
    let isMounted = true;
    let lastScanTime = 0;
    let lastScanText = '';

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && scanMode === 'camera' && cameraActive) {
        setRestartKey(prev => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

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
              fps: 30,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdge * 0.85);
                return { width: qrboxSize, height: qrboxSize };
              },
              formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
              aspectRatio: 1.0,
              experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
              }
            },

            (decodedText) => {
              const now = Date.now();
              if (decodedText === lastScanText && (now - lastScanTime) < 3000) {
                return;
              }
              lastScanText = decodedText;
              lastScanTime = now;

              try {
                const parsed = JSON.parse(decodedText);
                if (parsed && parsed.b === 1 && Array.isArray(parsed.r)) {
                  const newRecords = parsed.r.map(raw => {
                    const mappedSubBookings = (raw.s || []).map((sub, sIdx) => ({
                      id: Date.now() + Math.random() + sIdx,
                      name: sub.n || '',
                      phone: sub.p || '',
                      quantity: sub.q || 20,
                      useMainAddress: sub.m === 1,
                      address: sub.a || ''
                    }));
                    const itemForAddress = {
                      addressLine1: raw.a || '',
                      address: raw.a || '',
                      subdistrict: raw.sd || '',
                      district: raw.dt || '',
                      province: raw.pv || '',
                      zipcode: raw.zp || ''
                    };
                    let cleanedDid = '';
                    if (raw.id) {
                      const rawIdStr = String(raw.id).trim();
                      if (rawIdStr.length === 6 && /^\d+$/.test(rawIdStr)) {
                        cleanedDid = rawIdStr;
                      }
                    }
                    return {
                      id: Date.now() + Math.random(),
                      timestamp: new Date().toISOString(),
                      orderDate: raw.d || '',
                      quantity: raw.q || 1,
                      name: raw.n || '',
                      phone: raw.p || '',
                      addressLine1: itemForAddress.addressLine1,
                      address: constructFullAddress(itemForAddress),
                      subdistrict: itemForAddress.subdistrict,
                      district: itemForAddress.district,
                      province: itemForAddress.province,
                      zipcode: itemForAddress.zipcode,
                      did: cleanedDid,
                      isAdvancedMode: mappedSubBookings.length > 0,
                      subBookings: mappedSubBookings,
                      printed: false,
                      orderCode: raw.oc || ''
                    };
                  });
                  
                  setHistory(prevHistory => {
                    const safePrev = Array.isArray(prevHistory) ? prevHistory : [];
                    const prevMap = new Map();
                    for (const r of safePrev) {
                      const k = r.orderCode || `${r.name}-${r.phone}`;
                      prevMap.set(k, r);
                    }

                    const merged = [...newRecords, ...safePrev];
                    const unique = [];
                    const seen = new Set();
                    for (const item of merged) {
                      const key = item.orderCode ? item.orderCode : `${item.name}-${item.phone}-${item.quantity}-${item.orderDate}`;
                      if (!seen.has(key)) {
                        seen.add(key);
                        const prevKey = item.orderCode ? item.orderCode : `${item.name}-${item.phone}`;
                        const prevItem = prevMap.get(prevKey);
                        if (prevItem) {
                          unique.push({ ...item, printed: prevItem.printed });
                        } else {
                          unique.push({ ...item, printed: false });
                        }
                      }
                    }
                    const sorted = unique.sort((a, b) => b.id - a.id).slice(0, 100);
                    localStorage.setItem('staffHistory', JSON.stringify(sorted));
                    return sorted;
                  });
                  
                  const importedIds = newRecords.map(item => item.id);
                  setSelectedIds(importedIds);
                  setHistoryFilter('pending');
                  if (newRecords[0]) {
                    setLatestRecordId(newRecords[0].id);
                  }

                  alert(`🎉 สแกนนำเข้ากลุ่มสำเร็จ! ได้รับข้อมูล ${newRecords.length} รายการเรียบร้อย`);
                  
                  if (qrCodeInstance && qrCodeInstance.isScanning) {
                    qrCodeInstance.stop().catch(() => {}).then(() => {
                      setScanMode('manual');
                      setTargetScanCount(0);
                      setScannedIndexes([]);
                      setPendingScannedRecords([]);
                    });
                  } else {
                    setScanMode('manual');
                    setTargetScanCount(0);
                    setScannedIndexes([]);
                    setPendingScannedRecords([]);
                  }
                } else {
                  const data = parseQrPayload(decodedText);
                  
                  if (data.tot && data.tot > 1) {
                    const idx = data.idx || 1;
                    const tot = data.tot;
                    
                    const isAlreadyScanned = scannedIndexes.includes(idx);
                    if (isAlreadyScanned) {
                      alert(`⚠️ คุณสแกน QR ลำดับที่ ${idx} ไปแล้วครับ กรุณาสแกนรายการที่ยังไม่ได้สแกน`);
                      return;
                    }

                    const newRecord = { 
                      ...data, 
                      id: Date.now() + Math.random(), 
                      timestamp: new Date().toISOString(),
                      printed: false 
                    };

                    let nextScannedIndexes = [...scannedIndexes];
                    let nextPendingRecords = [...pendingScannedRecords];

                    if (targetScanCount !== tot) {
                      nextScannedIndexes = [idx];
                      setTargetScanCount(tot);
                      setScannedIndexes([idx]);
                      nextPendingRecords = [newRecord];
                      setPendingScannedRecords([newRecord]);
                    } else {
                      nextScannedIndexes.push(idx);
                      setScannedIndexes(nextScannedIndexes);
                      nextPendingRecords.push(newRecord);
                      setPendingScannedRecords(nextPendingRecords);
                    }

                    const scannedCount = nextScannedIndexes.length;
                    if (scannedCount >= tot) {
                      alert(`🎉 สแกนนำเข้ากลุ่มครบถ้วนแล้ว! (${scannedCount} / ${tot} รายการ)`);
                      
                      setHistory(prevHistory => {
                        const safeHistory = Array.isArray(prevHistory) ? prevHistory : [];
                        const prevMap = new Map();
                        for (const r of safeHistory) {
                          const k = r.orderCode || `${r.name}-${r.phone}`;
                          prevMap.set(k, r);
                        }
                        const uniqueMerged = [...nextPendingRecords, ...safeHistory];
                        const unique = [];
                        const seen = new Set();
                        for (const item of uniqueMerged) {
                          const key = item.orderCode ? item.orderCode : `${item.name}-${item.phone}-${item.quantity}-${item.orderDate}`;
                          if (!seen.has(key)) {
                            seen.add(key);
                            const prevKey = item.orderCode ? item.orderCode : `${item.name}-${item.phone}`;
                            const prevItem = prevMap.get(prevKey);
                            if (prevItem) {
                              unique.push({ ...item, printed: prevItem.printed });
                            } else {
                              unique.push({ ...item, printed: false });
                            }
                          }
                        }
                        const sorted = unique.sort((a, b) => b.id - a.id).slice(0, 100);
                        localStorage.setItem('staffHistory', JSON.stringify(sorted));
                        return sorted;
                      });
                      
                      setHistoryFilter('pending');
                      if (nextPendingRecords[0]) {
                        setLatestRecordId(nextPendingRecords[0].id);
                      }

                      if (qrCodeInstance && qrCodeInstance.isScanning) {
                        qrCodeInstance.stop().catch(() => {}).then(() => {
                          setScanMode('manual');
                          setTargetScanCount(0);
                          setScannedIndexes([]);
                          setPendingScannedRecords([]);
                        });
                      } else {
                        setScanMode('manual');
                        setTargetScanCount(0);
                        setScannedIndexes([]);
                        setPendingScannedRecords([]);
                      }
                    } else {
                      alert(`✅ สแกน QR ลำดับที่ ${idx} สำเร็จ!\n(เหลืออีก ${tot - scannedCount} รายการที่ต้องสแกน)`);
                    }
                  } else if (targetScanCount > 0) {
                    const newRecord = { 
                      ...data, 
                      id: Date.now() + Math.random(), 
                      timestamp: new Date().toISOString(),
                      printed: false 
                    };
                    setHistory(prevHistory => {
                      const safeHistory = Array.isArray(prevHistory) ? prevHistory : [];
                      const exists = safeHistory.some(r => r.name === newRecord.name && r.phone === newRecord.phone && r.quantity === newRecord.quantity);
                      if (exists) return safeHistory;
                      const updatedHistory = [newRecord, ...safeHistory].slice(0, 100);
                      localStorage.setItem('staffHistory', JSON.stringify(updatedHistory));
                      return updatedHistory;
                    });
                    
                    setHistoryFilter('pending');
                    setLatestRecordId(newRecord.id);

                    setCurrentScanCount(prev => {
                      const next = prev + 1;
                      if (next >= targetScanCount) {
                        alert(`🎉 สแกนนำเข้าครบตามเป้าหมายและบันทึกทั้งหมดเรียบร้อยแล้ว! (${next} / ${targetScanCount} รายการ)`);
                        if (qrCodeInstance && qrCodeInstance.isScanning) {
                          qrCodeInstance.stop().catch(() => {}).then(() => {
                            setScanMode('manual');
                            setTargetScanCount(0);
                            setCurrentScanCount(0);
                          });
                        } else {
                          setScanMode('manual');
                          setTargetScanCount(0);
                          setCurrentScanCount(0);
                        }
                      } else {
                        alert(`✅ นำเข้ารายการที่ ${next} / ${targetScanCount} เรียบร้อย! กรุณาสไลด์หรือสแกนรายการถัดไปได้เลย`);
                      }
                      return next;
                    });
                  } else {
                    if (qrCodeInstance && qrCodeInstance.isScanning) {
                      qrCodeInstance.stop().catch(() => {}).then(() => {
                        setScanMode('manual');
                      });
                    } else {
                      setScanMode('manual');
                    }
                    onScanSuccess(data);
                  }
                }
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
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (qrCodeInstance) {
          if (qrCodeInstance.isScanning) {
            qrCodeInstance.stop().catch((e) => console.error("Stop failed", e));
          }
        }
      };
    }
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [scanMode, cameraActive, restartKey]);

  const decodeQRFromImage = async (file) => {
    let img = null;
    try {
      img = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imgData.data, img.width, img.height);
        if (code && code.data) {
          return code.data;
        }
      }
    } catch (err) {
      console.warn("Direct jsQR scan failed:", err);
    }

    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const imageBitmap = await createImageBitmap(file);
        const barcodes = await barcodeDetector.detect(imageBitmap);
        if (barcodes.length > 0) {
          return barcodes[0].rawValue;
        }
      } catch (err) {
        console.log("BarcodeDetector error:", err);
      }
    }

    let html5QrCode = globalHiddenScanner;
    if (!html5QrCode) {
      try {
        html5QrCode = new Html5Qrcode("reader-hidden");
        globalHiddenScanner = html5QrCode;
      } catch (err) {
        console.warn("Failed to create Html5Qrcode instance:", err);
      }
    }

    if (html5QrCode) {
      try {
        const decodedText = await html5QrCode.scanFile(file, false);
        if (decodedText) {
          try { await html5QrCode.clear(); } catch (e) {}
          return decodedText;
        }
      } catch (err) {
        console.log("html5QrCode scanFile direct failed, trying preprocessed canvas...");
      }
    }

    if (img) {
      try {
        const scanCanvas = async (cv) => {
          try {
            const ctx = cv.getContext('2d');
            if (ctx) {
              const imgData = ctx.getImageData(0, 0, cv.width, cv.height);
              const code = jsQR(imgData.data, cv.width, cv.height);
              if (code && code.data) {
                return code.data;
              }
            }
          } catch (e) {}

          if ('BarcodeDetector' in window) {
            try {
              const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
              const barcodes = await barcodeDetector.detect(cv);
              if (barcodes.length > 0) {
                return barcodes[0].rawValue;
              }
            } catch (e) {}
          }

          if (html5QrCode) {
            try {
              const blob = await new Promise(resolve => cv.toBlob(resolve, 'image/jpeg', 0.9));
              if (blob) {
                const decodedText = await html5QrCode.scanFile(blob, false);
                if (decodedText) {
                  return decodedText;
                }
              }
            } catch (err) {}
          }
          return null;
        };

        const cropRatios = [0.4, 0.3, 0.6, 0.8, 0.9];
        for (const ratio of cropRatios) {
          const cropSize = Math.min(img.width, img.height) * ratio;
          
          const verticalCenters = [img.height / 2]; 
          if (img.height > img.width) {
            verticalCenters.push(img.height * 0.35);
            verticalCenters.push(img.height * 0.25);
            verticalCenters.push(img.height * 0.45);
          }

          for (const yCenter of verticalCenters) {
            const cropCanvas = document.createElement('canvas');
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
              const sx = Math.max(0, (img.width - cropSize) / 2);
              const sy = Math.max(0, yCenter - (cropSize / 2));
              const sw = Math.min(cropSize, img.width - sx);
              const sh = Math.min(cropSize, img.height - sy);

              cropCanvas.width = sw;
              cropCanvas.height = sh;
              cropCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
              
              const result = await scanCanvas(cropCanvas);
              if (result) {
                if (html5QrCode) { try { await html5QrCode.clear(); } catch (e) {} }
                return result;
              }
            }
          }
        }

        const sizes = [800, 1200, 600];
        for (const targetWidth of sizes) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          const scale = targetWidth / img.width;
          const width = targetWidth;
          const height = img.height * scale;
          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          const result = await scanCanvas(canvas);
          if (result) {
            if (html5QrCode) { try { await html5QrCode.clear(); } catch (e) {} }
            return result;
          }

          try {
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
              data[i] = gray;
              data[i+1] = gray;
              data[i+2] = gray;
            }
            ctx.putImageData(imgData, 0, 0);

            const grayResult = await scanCanvas(canvas);
            if (grayResult) {
              if (html5QrCode) { try { await html5QrCode.clear(); } catch (e) {} }
              return grayResult;
            }
          } catch (e) {}

          try {
            ctx.drawImage(img, 0, 0, width, height);
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i+1];
              const b = data[i+2];
              let gray = 0.299 * r + 0.587 * g + 0.114 * b;
              gray = gray > 120 ? 255 : 0;
              data[i] = gray;
              data[i+1] = gray;
              data[i+2] = gray;
            }
            ctx.putImageData(imgData, 0, 0);

            const binResult = await scanCanvas(canvas);
            if (binResult) {
              if (html5QrCode) { try { await html5QrCode.clear(); } catch (e) {} }
              return binResult;
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error("Canvas preprocessing error:", err);
      }
    }

    if (html5QrCode) {
      try { await html5QrCode.clear(); } catch (e) {}
    }
    return '';
  };

  const handleDeleteRecord = async (id) => {
    if (await window.showConfirm("คุณต้องการลบรายการประวัตินี้ใช่หรือไม่?")) {
      setHistory(prev => {
        const next = prev.filter(r => r.id !== id);
        localStorage.setItem('staffHistory', JSON.stringify(next));
        return next;
      });
      setSelectedIds(prev => prev.filter(i => i !== id));
      setSwipeOffset(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (await window.showConfirm(`⚠️ คำเตือน: คุณต้องการลบรายการที่เลือกทั้งหมดจำนวน ${selectedIds.length} รายการออกจากระบบใช่หรือไม่?\n(ข้อมูลประวัติทั้งหมดที่เลือกจะถูกลบอย่างถาวรและไม่สามารถเรียกคืนได้)`)) {
      setHistory(prev => {
        const next = prev.filter(r => !selectedIds.includes(r.id));
        localStorage.setItem('staffHistory', JSON.stringify(next));
        return next;
      });
      setSelectedIds([]);
      setSwipeOffset({});
    }
  };

  const handleTouchStart = (id, e) => {
    setTouchStartX(e.touches[0].clientX);
    if (swipedItemId && swipedItemId !== id) {
      setSwipeOffset(prev => ({ ...prev, [swipedItemId]: 0 }));
      setSwipedItemId(null);
    }
  };

  const handleTouchMove = (id, e) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = touchStartX - currentX;

    if (diffX > 0) {
      const offset = Math.min(diffX, 80);
      setSwipeOffset(prev => ({ ...prev, [id]: offset }));
    } else {
      const offset = Math.max(diffX, -20);
      setSwipeOffset(prev => ({ ...prev, [id]: Math.max(0, 80 + offset) }));
    }
  };

  const handleTouchEnd = (id, e) => {
    setTouchStartX(null);
    const currentOffset = swipeOffset[id] || 0;
    if (currentOffset > 40) {
      setSwipeOffset(prev => ({ ...prev, [id]: 80 }));
      setSwipedItemId(id);
    } else {
      setSwipeOffset(prev => ({ ...prev, [id]: 0 }));
      if (swipedItemId === id) {
        setSwipedItemId(null);
      }
    }
  };

  const handleSavePendingScansEarly = async () => {
    if (pendingScannedRecords.length === 0) {
      alert("ยังไม่มีรายการที่สแกนสำเร็จครับ");
      return;
    }
    
    if (await window.showConfirm(`บันทึกข้อมูลเฉพาะที่สแกนไปแล้วจำนวน ${pendingScannedRecords.length} รายการใช่หรือไม่?`)) {
      setHistory(prevHistory => {
        const safeHistory = Array.isArray(prevHistory) ? prevHistory : [];
        const uniqueMerged = [...pendingScannedRecords, ...safeHistory];
        const unique = [];
        const seen = new Set();
        for (const item of uniqueMerged) {
          const key = `${item.name}-${item.phone}-${item.quantity}-${item.orderDate}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }
        const sorted = unique.sort((a, b) => b.id - a.id).slice(0, 100);
        localStorage.setItem('staffHistory', JSON.stringify(sorted));
        return sorted;
      });
      
      alert(`💾 บันทึกรายการที่สแกนแล้วจำนวน ${pendingScannedRecords.length} รายการสำเร็จ!`);
      
      setScanMode('manual');
      setTargetScanCount(0);
      setScannedIndexes([]);
      setPendingScannedRecords([]);
    }
  };

  const handleFileDecode = async (file) => {
    if (!file) return;

    const processDecodedData = (decodedText) => {
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed && parsed.b === 1 && Array.isArray(parsed.r)) {
          const newRecords = parsed.r.map(raw => {
            const mappedSubBookings = (raw.s || []).map((sub, sIdx) => ({
              id: Date.now() + Math.random() + sIdx,
              name: sub.n || '',
              phone: sub.p || '',
              quantity: sub.q || 20,
              useMainAddress: sub.m === 1,
              address: sub.a || ''
            }));
            const itemForAddress = {
              addressLine1: raw.a || '',
              address: raw.a || '',
              subdistrict: raw.sd || '',
              district: raw.dt || '',
              province: raw.pv || '',
              zipcode: raw.zp || ''
            };
            let cleanedDid = '';
            if (raw.id) {
              const rawIdStr = String(raw.id).trim();
              if (rawIdStr.length === 6 && /^\d+$/.test(rawIdStr)) {
                cleanedDid = rawIdStr;
              }
            }
            return {
              id: Date.now() + Math.random(),
              timestamp: new Date().toISOString(),
              orderDate: raw.d || '',
              quantity: raw.q || 1,
              name: raw.n || '',
              phone: raw.p || '',
              addressLine1: itemForAddress.addressLine1,
              address: constructFullAddress(itemForAddress),
              subdistrict: itemForAddress.subdistrict,
              district: itemForAddress.district,
              province: itemForAddress.province,
              zipcode: itemForAddress.zipcode,
              did: cleanedDid,
              isAdvancedMode: mappedSubBookings.length > 0,
              subBookings: mappedSubBookings,
              importSource: file.name
            };
          });

          setHistory(prevHistory => {
            const safePrev = Array.isArray(prevHistory) ? prevHistory : [];
            const merged = [...newRecords, ...safePrev];
            const unique = [];
            const seen = new Set();
            for (const item of merged) {
              const key = `${item.name}-${item.phone}-${item.quantity}-${item.orderDate}`;
              if (!seen.has(key)) {
                seen.add(key);
                unique.push(item);
              }
            }
            const sorted = unique.sort((a, b) => b.id - a.id).slice(0, 100);
            localStorage.setItem('staffHistory', JSON.stringify(sorted));
            return sorted;
          });

          alert(`นำเข้าข้อมูลกลุ่มสำเร็จ! นำเข้ารายชื่อสั่งจอง ${newRecords.length} รายการแล้ว`);
          return true;
        }
      } catch (e) {}

      try {
        const data = parseQrPayload(decodedText);
        
        if (targetScanCount > 0) {
          onScanSuccess(data, file.name);
          setCurrentScanCount(prev => {
            const next = prev + 1;
            if (next >= targetScanCount) {
              alert(`🎉 นำเข้าไฟล์รูปภาพครบตามเป้าหมายแล้ว! (${next} / ${targetScanCount} รายการ)`);
              setTargetScanCount(0);
              setCurrentScanCount(0);
            } else {
              alert(`✅ นำเข้าสำเร็จรายการที่ ${next} / ${targetScanCount}`);
            }
            return next;
          });
        } else {
          onScanSuccess(data, file.name);
        }
        return true;
      } catch (err) {
        return false;
      }
    };

    const decodedText = await decodeQRFromImage(file);
    if (decodedText && processDecodedData(decodedText)) {
      return;
    }
    alert("ไม่พบ QR Code ในรูปภาพนี้ หรือข้อมูลไม่ถูกต้อง กรุณาลองสแกนผ่านกล้องแทน");
  };

  const handleFolderPickerClick = async () => {
    if (window.showDirectoryPicker) {
      try {
        const handle = await window.showDirectoryPicker();
        setDirectoryHandles(prev => {
          if (prev.some(h => h.name === handle.name)) return prev;
          const next = [...prev, handle];
          setTimeout(() => refreshFromDirectoryHandles(next), 100);
          return next;
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("showDirectoryPicker error:", err);
          document.getElementById('legacy-folder-input')?.click();
        }
      }
    } else {
      document.getElementById('legacy-folder-input')?.click();
    }
  };

  const refreshFromDirectoryHandles = async (handles = directoryHandles) => {
    if (!handles || handles.length === 0) return;
    setIsRefreshingFolder(true);
    try {
      const files = [];
      for (const handle of handles) {
        const opts = { mode: 'read' };
        if ((await handle.queryPermission(opts)) !== 'granted') {
          if ((await handle.requestPermission(opts)) !== 'granted') {
            alert(`กรุณาอนุญาตให้เข้าถึงโฟลเดอร์ "${handle.name}" เพื่อดึงข้อมูลครับ`);
            continue;
          }
        }
        
        const readDirectory = async (dirHandle) => {
          for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              files.push(file);
            } else if (entry.kind === 'directory') {
              await readDirectory(entry);
            }
          }
        };
        await readDirectory(handle);
      }

      if (files.length === 0) {
        alert("ไม่พบไฟล์ JSON หรือรูปภาพ QR Code ที่ถูกต้องในโฟลเดอร์เลยครับ");
        setIsRefreshingFolder(false);
        return;
      }
      
      const mockEvent = {
        target: {
          files: files
        }
      };
      await handleFolderImport(mockEvent);
    } catch (err) {
      console.error("Refresh folder error:", err);
      alert("เกิดข้อผิดพลาดในการอัพเดทข้อมูลในโฟลเดอร์: " + err.message);
    } finally {
      setIsRefreshingFolder(false);
    }
  };

  const handleFolderImport = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    let duplicateCount = 0;
    const decodedRecords = [];

    const decodeSingleImage = async (file) => {
      try {
        return await decodeQRFromImage(file);
      } catch (err) {
        return null;
      }
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        try {
          const content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (evt) => resolve(evt.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
          });
          const parsed = JSON.parse(content);
          const list = Array.isArray(parsed) ? parsed : [parsed];

          for (const raw of list) {
            const code = raw.orderCode || raw.oc || '';
            const name = raw.name || raw.n || '';
            const isDup = history.some(r => {
              if (code && (r.orderCode === code || r.oc === code)) return true;
              if (!code && r.name === name && r.phone === (raw.phone || raw.p || '')) return true;
              return false;
            }) || decodedRecords.some(r => {
              if (code && r.orderCode === code) return true;
              if (!code && r.name === name && r.phone === (raw.phone || raw.p || '')) return true;
              return false;
            });

            if (isDup) {
              duplicateCount++;
              continue;
            }

            const mappedSubBookings = (raw.subBookings || raw.s || []).map((sub, subIdx) => ({
              id: Date.now() + Math.random() + subIdx,
              name: sub.name || sub.n || '',
              phone: sub.phone || sub.p || '',
              quantity: sub.quantity || sub.q || 20,
              useMainAddress: sub.useMainAddress || sub.m === 1,
              address: sub.address || sub.a || ''
            }));

            const itemForAddress = {
              addressLine1: raw.addressLine1 || raw.a || '',
              address: raw.address || raw.a || '',
              subdistrict: raw.subdistrict || raw.sd || '',
              district: raw.district || raw.dt || '',
              province: raw.province || raw.pv || '',
              zipcode: raw.zipcode || raw.zp || ''
            };

            let cleanedDid = raw.did || '';
            if (!cleanedDid && raw.id) {
              const rawIdStr = String(raw.id).trim();
              if (rawIdStr.length === 6 && /^\d+$/.test(rawIdStr)) {
                cleanedDid = rawIdStr;
              }
            }

            decodedRecords.push({
              id: raw.id || (Date.now() + Math.random()),
              timestamp: raw.timestamp || new Date().toISOString(),
              orderCode: code,
              orderDate: raw.orderDate || raw.d || new Date().toISOString().split('T')[0],
              quantity: raw.quantity || raw.q || 1,
              name: name,
              phone: raw.phone || raw.p || '',
              addressLine1: itemForAddress.addressLine1,
              address: constructFullAddress(itemForAddress),
              subdistrict: itemForAddress.subdistrict,
              district: itemForAddress.district,
              province: itemForAddress.province,
              zipcode: itemForAddress.zipcode,
              did: cleanedDid,
              senderNickname: raw.senderNickname || raw.sn || '',
              senderPhone: raw.senderPhone || raw.sp || '',
              isAdvancedMode: mappedSubBookings.length > 0,
              subBookings: mappedSubBookings,
              printed: false
            });
            successCount++;
          }
        } catch (err) {
          console.error("Error reading JSON file", err);
          failCount++;
        }
      } else if (file.type.startsWith('image/') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
        try {
          const decodedText = await decodeSingleImage(file);
          if (decodedText) {
            const raw = JSON.parse(decodedText);
            
            if (raw && raw.b === 1 && Array.isArray(raw.r)) {
              for (const recordRaw of raw.r) {
                const code = recordRaw.oc || '';
                const name = recordRaw.n || '';
                const isDup = history.some(r => {
                  if (code && (r.orderCode === code || r.oc === code)) return true;
                  if (!code && r.name === name && r.phone === (recordRaw.p || '')) return true;
                  return false;
                }) || decodedRecords.some(r => {
                  if (code && r.orderCode === code) return true;
                  if (!code && r.name === name && r.phone === (recordRaw.p || '')) return true;
                  return false;
                });
                if (isDup) {
                  duplicateCount++;
                  continue; 
                }

                const mappedSubBookings = (recordRaw.s || []).map((sub, subIdx) => ({
                  id: Date.now() + Math.random() + subIdx,
                  name: sub.n || '',
                  phone: sub.p || '',
                  quantity: sub.q || 20,
                  useMainAddress: sub.m === 1,
                  address: sub.a || ''
                }));

                const itemForAddress = {
                  addressLine1: recordRaw.a || '',
                  address: recordRaw.a || '',
                  subdistrict: recordRaw.sd || '',
                  district: recordRaw.dt || '',
                  province: recordRaw.pv || '',
                  zipcode: recordRaw.zp || ''
                };

                let cleanedDid = '';
                if (recordRaw.id) {
                  const rawIdStr = String(recordRaw.id).trim();
                  if (rawIdStr.length === 6 && /^\d+$/.test(rawIdStr)) {
                    cleanedDid = rawIdStr;
                  }
                }

                decodedRecords.push({
                  id: Date.now() + Math.random(),
                  timestamp: new Date().toISOString(),
                  orderCode: code,
                  orderDate: recordRaw.d || new Date().toISOString().split('T')[0],
                  quantity: recordRaw.q || 1,
                  name: name,
                  phone: recordRaw.p || '',
                  addressLine1: itemForAddress.addressLine1,
                  address: constructFullAddress(itemForAddress),
                  subdistrict: itemForAddress.subdistrict,
                  district: itemForAddress.district,
                  province: itemForAddress.province,
                  zipcode: itemForAddress.zipcode,
                  did: cleanedDid,
                  senderNickname: recordRaw.sn || '',
                  senderPhone: recordRaw.sp || '',
                  isAdvancedMode: mappedSubBookings.length > 0,
                  subBookings: mappedSubBookings,
                  printed: false
                });
                successCount++;
              }
            } else {
              const singleData = parseQrPayload(decodedText);
              const code = singleData.orderCode || singleData.oc || '';
              const name = singleData.name || '';
              const isDup = history.some(r => {
                if (code && (r.orderCode === code || r.oc === code)) return true;
                if (!code && r.name === name && r.phone === (singleData.phone || '')) return true;
                return false;
              }) || decodedRecords.some(r => {
                if (code && r.orderCode === code) return true;
                if (!code && r.name === name && r.phone === (singleData.phone || '')) return true;
                return false;
              });
              if (isDup) {
                duplicateCount++;
                continue; 
              }

              const prefixSubdist = singleData.province === 'กรุงเทพมหานคร' ? 'แขวง' : 'ต.';
              const prefixDist = singleData.province === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.';
              const prefixProv = singleData.province === 'กรุงเทพมหานคร' ? '' : 'จ.';
              
              const parts = [
                singleData.addressLine1 || '',
                singleData.subdistrict ? `${prefixSubdist}${singleData.subdistrict}` : '',
                singleData.district ? `${prefixDist}${singleData.district}` : '',
                singleData.province ? `${prefixProv}${singleData.province}` : ''
              ].filter(Boolean);
              const fullAddress = parts.join(' ');

              const mappedSubBookings = (singleData.subBookings || []).map((sub, sIdx) => ({
                id: Date.now() + Math.random() + sIdx,
                name: sub.name || sub.n || '',
                phone: sub.phone || sub.p || '',
                quantity: sub.quantity || sub.q || 20,
                useMainAddress: sub.useMainAddress || sub.m === 1,
                address: sub.address || sub.a || ''
              }));

              let cleanedDid = '';
              if (singleData.did) {
                const rawDidStr = String(singleData.did).trim();
                if (rawDidStr.length === 6 && /^\d+$/.test(rawDidStr)) {
                  cleanedDid = rawDidStr;
                }
              }

              decodedRecords.push({
                id: Date.now() + Math.random(),
                timestamp: new Date().toISOString(),
                orderCode: code,
                orderDate: singleData.orderDate || new Date().toISOString().split('T')[0],
                quantity: singleData.quantity || 100,
                name: name,
                phone: singleData.phone || '',
                addressLine1: singleData.addressLine1 || '',
                address: fullAddress,
                subdistrict: singleData.subdistrict || '',
                district: singleData.district || '',
                province: singleData.province || '',
                zipcode: singleData.zipcode || '',
                did: cleanedDid,
                senderNickname: singleData.senderNickname || singleData.sn || '',
                senderPhone: singleData.senderPhone || singleData.sp || '',
                isAdvancedMode: mappedSubBookings.length > 0,
                subBookings: mappedSubBookings,
                printed: false
              });
              successCount++;
            }
          } else {
            failCount++;
          }
        } catch (err) {
          console.error("Error decoding image", err);
          failCount++;
        }
      }
    }

    if (decodedRecords.length > 0) {
      setHistory(prevHistory => {
        const safePrev = Array.isArray(prevHistory) ? prevHistory : [];

        const prevMap = new Map();
        for (const r of safePrev) {
          const k = r.orderCode || `${r.name}-${r.phone}`;
          prevMap.set(k, r);
        }

        const merged = [...decodedRecords, ...safePrev];
        const unique = [];
        const seen = new Set();
        for (const item of merged) {
          const key = item.orderCode ? item.orderCode : `${item.name}-${item.phone}-${item.quantity}-${item.orderDate}`;
          if (!seen.has(key)) {
            seen.add(key);
            const prevKey = item.orderCode ? item.orderCode : `${item.name}-${item.phone}`;
            const prevItem = prevMap.get(prevKey);
            if (prevItem) {
              unique.push({ ...item, printed: prevItem.printed });
            } else {
              unique.push({ ...item, printed: false });
            }
          }
        }
        const sorted = unique.sort((a, b) => b.id - a.id).slice(0, 100);
        localStorage.setItem('staffHistory', JSON.stringify(sorted));
        return sorted;
      });

      const importedIds = decodedRecords.map(item => item.id);
      setSelectedIds(importedIds);
      setHistoryFilter('pending');
      if (decodedRecords[0]) {
        setLatestRecordId(decodedRecords[0].id);
      }

      alert(`นำเข้าจากโฟลเดอร์สำเร็จ! ตรวจพบและนำเข้าไฟล์สำเร็จ ${successCount} รายการ ${duplicateCount > 0 ? `(ข้ามรหัสซ้ำ ${duplicateCount} รายการ)` : ''} ${failCount > 0 ? `| ล้มเหลว/ไม่พบ QR ${failCount} รายการ` : ''}`);
    } else {
      if (duplicateCount > 0) {
        alert(`ดึงข้อมูลเสร็จสิ้น: ไม่พบรายการใหม่เพิ่มเติม (ข้ามรายการที่เคยนำเข้าหรือสั่งพิมพ์ไปแล้ว ${duplicateCount} รายการ)`);
      } else {
        alert("ไม่พบไฟล์ JSON หรือรูปภาพ QR Code ที่ถูกต้องในโฟลเดอร์ที่เลือกเลยครับ");
      }
    }

    if (e && e.target && 'value' in e.target) {
      e.target.value = '';
    }
  };

  const handleMultipleImagesImport = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    const decodedRecords = [];

    const decodeSingleImage = async (file) => {
      return await decodeQRFromImage(file);
    };

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const decodedText = await decodeSingleImage(file);
          if (decodedText) {
            const parsed = JSON.parse(decodedText);
            
            if (parsed && parsed.b === 1 && Array.isArray(parsed.r)) {
              parsed.r.forEach((raw, sIdx) => {
                const mappedSubBookings = (raw.s || []).map((sub, subIdx) => ({
                  id: Date.now() + Math.random() + sIdx + subIdx,
                  name: sub.n || '',
                  phone: sub.p || '',
                  quantity: sub.q || 20,
                  useMainAddress: sub.m === 1,
                  address: sub.a || ''
                }));
                decodedRecords.push({
                  id: Date.now() + Math.random() + sIdx,
                  timestamp: new Date().toISOString(),
                  orderDate: raw.d || new Date().toISOString().split('T')[0],
                  quantity: raw.q || 1,
                  name: raw.n || '',
                  phone: raw.p || '',
                  addressLine1: raw.a || '',
                  address: raw.a || '',
                  subdistrict: raw.sd || '',
                  district: raw.dt || '',
                  province: raw.pv || '',
                  zipcode: raw.zp || '',
                  did: raw.id || '',
                  isAdvancedMode: mappedSubBookings.length > 0,
                  subBookings: mappedSubBookings,
                  printed: false
                });
              });
              successCount++;
            } else {
              const singleData = parseQrPayload(decodedText);
              
              const prefixSubdist = singleData.province === 'กรุงเทพมหานคร' ? 'แขวง' : 'ต.';
              const prefixDist = singleData.province === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.';
              const prefixProv = singleData.province === 'กรุงเทพมหานคร' ? '' : 'จ.';
              
              const parts = [
                singleData.addressLine1 || '',
                singleData.subdistrict ? `${prefixSubdist}${singleData.subdistrict}` : '',
                singleData.district ? `${prefixDist}${singleData.district}` : '',
                singleData.province ? `${prefixProv}${singleData.province}` : ''
              ].filter(Boolean);
              const fullAddress = parts.join(' ');

              const mappedSubBookings = (singleData.subBookings || []).map((sub, sIdx) => ({
                id: Date.now() + Math.random() + sIdx,
                name: sub.name || sub.n || '',
                phone: sub.phone || sub.p || '',
                quantity: sub.quantity || sub.q || 20,
                useMainAddress: sub.useMainAddress || sub.m === 1,
                address: sub.address || sub.a || ''
              }));

              decodedRecords.push({
                id: Date.now() + Math.random() + i,
                timestamp: new Date().toISOString(),
                orderDate: singleData.orderDate || new Date().toISOString().split('T')[0],
                quantity: singleData.quantity || 100,
                name: singleData.name || '',
                phone: singleData.phone || '',
                addressLine1: singleData.addressLine1 || '',
                address: fullAddress,
                subdistrict: singleData.subdistrict || '',
                district: singleData.district || '',
                province: singleData.province || '',
                zipcode: singleData.zipcode || '',
                did: singleData.did || '',
                isAdvancedMode: mappedSubBookings.length > 0,
                subBookings: mappedSubBookings,
                printed: false
              });
              successCount++;
            }
          } else {
            failCount++;
          }
        } catch (err) {
          console.error("Error processing file index " + i, err);
          failCount++;
        }
      }
    } catch (e) {
      console.error("Multiple images import error:", e);
    }

    if (decodedRecords.length > 0) {
      setHistory(prevHistory => {
        const safePrev = Array.isArray(prevHistory) ? prevHistory : [];
        const prevMap = new Map();
        for (const r of safePrev) {
          const k = r.orderCode || `${r.name}-${r.phone}`;
          prevMap.set(k, r);
        }

        const merged = [...decodedRecords, ...safePrev];
        const unique = [];
        const seen = new Set();
        for (const item of merged) {
          const key = `${item.name}-${item.phone}-${item.quantity}-${item.orderDate}`;
          if (!seen.has(key)) {
            seen.add(key);
            const prevKey = item.orderCode || `${item.name}-${item.phone}`;
            const prevItem = prevMap.get(prevKey);
            if (prevItem) {
              unique.push({ ...item, printed: prevItem.printed });
            } else {
              unique.push({ ...item, printed: false });
            }
          }
        }
        const sorted = unique.sort((a, b) => b.id - a.id).slice(0, 100);
        localStorage.setItem('staffHistory', JSON.stringify(sorted));
        return sorted;
      });

      const importedIds = decodedRecords.map(item => item.id);
      setSelectedIds(importedIds);
      setHistoryFilter('pending');
      if (decodedRecords[0]) {
        setLatestRecordId(decodedRecords[0].id);
      }

      alert(`นำเข้าสำเร็จ ${successCount} ไฟล์! (แปลงเป็นรายการสั่งจองได้ ${decodedRecords.length} รายการและเลือกไว้ให้แล้ว) ${failCount > 0 ? `| ล้มเหลว ${failCount} ไฟล์` : ''}`);
    } else {
      alert("ไม่พบ QR Code หรือข้อมูลไม่ถูกต้องในรูปภาพที่เลือกทั้งหมดครับ");
    }

    e.target.value = '';
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
  const handleBranchCodeChange = (e) => {
    const val = e.target.value.trim();
    setBranchCode(val);
    setIsSettingsDirty(true);
    if (/^\d{5}$/.test(val)) {
      try {
        const savedMappings = JSON.parse(localStorage.getItem('customBranchMappings') || '{}');
        if (savedMappings[val]) {
          setBranchName(savedMappings[val]);
          return;
        }
      } catch (err) {
        console.error(err);
      }
      searchByField('zipCode', val);
    }
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
  
  const generatedCustomerUrl = branchCode === '10501'
    ? `${window.location.origin}${window.location.pathname}`
    : `${window.location.origin}${window.location.pathname}?branch=${encodeURIComponent(branchCode)}`;

  const copyGeneratedUrl = () => {
    navigator.clipboard.writeText(generatedCustomerUrl);
    setIsUrlCopied(true);
    setTimeout(() => setIsUrlCopied(false), 2000);
  };

  const downloadBranchQr = () => {
    const qrCanvas = document.getElementById('branch-qr-canvas-large');
    if (!qrCanvas) return;

    const width = 800;
    const height = 950;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px "Sarabun", "Inter", "Tahoma", sans-serif';
    ctx.fillText('📲 สแกน QR Code พิมพ์ ชื่อ-ที่อยู่', width / 2, 75);

    ctx.font = 'bold 38px "Sarabun", "Inter", "Tahoma", sans-serif';
    const labelText = 'สาขา: ';
    const branchText = `${branchName} ${branchCode}`;
    
    ctx.fillStyle = '#475569';
    const labelWidth = ctx.measureText(labelText).width;
    ctx.fillStyle = '#ef4444';
    const branchWidth = ctx.measureText(branchText).width;
    
    const totalTextWidth = labelWidth + branchWidth;
    const startX = (width - totalTextWidth) / 2;
    
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(labelText, startX, 135);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(branchText, startX + labelWidth, 135);

    const boxWidth = 620;
    const boxHeight = 650;
    const boxX = (width - boxWidth) / 2;
    const boxY = 185;
    const borderRadius = 28;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 6;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
    } else {
      ctx.moveTo(boxX + borderRadius, boxY);
      ctx.lineTo(boxX + boxWidth - borderRadius, boxY);
      ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + borderRadius);
      ctx.lineTo(boxX + boxWidth, boxY + boxHeight - borderRadius);
      ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - borderRadius, boxY + boxHeight);
      ctx.lineTo(boxX + borderRadius, boxY + boxHeight);
      ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - borderRadius);
      ctx.lineTo(boxX, boxY + borderRadius);
      ctx.quadraticCurveTo(boxX, boxY, boxX + borderRadius, boxY);
      ctx.closePath();
    }
    ctx.stroke();

    const qrSize = 500;
    const qrX = boxX + (boxWidth - qrSize) / 2;
    const qrY = boxY + 90;
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    const badgeText = 'QR Customer (ลิงก์สำหรับลูกค้าสแกน)';
    ctx.font = 'bold 28px "Sarabun", "Inter", "Tahoma", sans-serif';
    const badgeTextWidth = ctx.measureText(badgeText).width;
    const badgeWidth = badgeTextWidth + 60;
    const badgeHeight = 58;
    const badgeX = (width - badgeWidth) / 2;
    const badgeY = boxY - (badgeHeight / 2);
    const badgeRadius = 29;

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
    } else {
      ctx.moveTo(badgeX + badgeRadius, badgeY);
      ctx.lineTo(badgeX + badgeWidth - badgeRadius, badgeY);
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + badgeRadius);
      ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - badgeRadius);
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - badgeRadius, badgeY + badgeHeight);
      ctx.lineTo(badgeX + badgeRadius, badgeY + badgeHeight);
      ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - badgeRadius);
      ctx.lineTo(badgeX, badgeY + badgeRadius);
      ctx.quadraticCurveTo(badgeX, badgeY, badgeX + badgeRadius, badgeY);
      ctx.closePath();
    }
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, width / 2, badgeY + (badgeHeight / 2));
    ctx.textBaseline = 'alphabetic'; 

    ctx.fillStyle = '#16a34a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 46px "Sarabun", "Inter", "Tahoma", sans-serif';
    ctx.fillText('เสร็จแล้ว แจ้งกับพี่ไปรได้เลย', width / 2, 905);

    const url = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-customer-${branchCode || 'branch'}.png`;
    link.click();
  };

  const saveSettings = () => {
    if (!branchCode || branchCode.trim().length < 5) {
      alert('กรุณากรอกรหัสที่ทำการอย่างน้อย 5 ตัวอักษรครับ');
      return;
    }
    if (!staffName && !staffPhone) {
      setShowSaveError(true);
      setTimeout(() => setShowSaveError(false), 4000);
      return;
    }
    
    try {
      const savedMappings = JSON.parse(localStorage.getItem('customBranchMappings') || '{}');
      savedMappings[branchCode] = branchName;
      localStorage.setItem('customBranchMappings', JSON.stringify(savedMappings));
    } catch (err) {
      console.error(err);
    }

    localStorage.setItem('branchName', branchName);
    localStorage.setItem('branchCode', branchCode);
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
              size: ${printSettings.paperSize === 'A4' ? '29.7cm 21.0cm' : '14.8cm 10.5cm'};
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
              padding-right: 1cm;
              overflow: hidden;
              box-sizing: border-box;
            }
            .print-a4-page {
              width: 29.7cm;
              height: 21.0cm;
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: 1fr 1fr;
              box-sizing: border-box;
              background: white;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .print-a4-cell {
              width: 14.85cm;
              height: 10.5cm;
              box-sizing: border-box;
              overflow: hidden;
              background: white;
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
            .desktop-only-btn {
              display: none !important;
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
            .staff-left-column,
            .staff-right-column {
              flex: 1 1 100% !important;
              max-width: 100% !important;
              min-width: 0 !important;
            }
          }
          
          @media (min-width: 769px) {
            .mobile-only-scan-helper {
              display: none !important;
            }
            .desktop-only-btn {
              display: flex !important;
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
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
           #reader video {
            border-radius: 12px;
            width: 100% !important;
            height: 100% !important;
            max-height: 320px;
            object-fit: cover !important;
          }
          #reader a,
          #reader img,
          #reader__status_span {
            display: none !important;
          }
          #reader > div:not(:first-child) {
            display: none !important;
          }
          #reader > span {
            display: none !important;
          }
        `}
      </style>
      
      <div className="staff-no-print staff-dashboard-wrapper">
        <div className="staff-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>แดชบอร์ดเจ้าหน้าที่ ปณ.</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                <Download size={16} /> นำเข้าข้อมูลลูกค้า (.json)
                <input type="file" accept=".json" onChange={importHistory} style={{ display: 'none' }} />
              </label>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={() => refreshFromDirectoryHandles(directoryHandles)}
                  disabled={isRefreshingFolder || directoryHandles.length === 0}
                  style={{ 
                    padding: '0.5rem 0.75rem', 
                    fontSize: '0.9rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: directoryHandles.length > 0 ? 'pointer' : 'default', 
                    margin: 0, 
                    borderColor: '#8b5cf6', 
                    color: '#6d28d9', 
                    backgroundColor: '#f5f3ff', 
                    fontWeight: 'bold',
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    borderRight: 'none',
                    opacity: directoryHandles.length === 0 ? 0.4 : (isRefreshingFolder ? 0.7 : 1)
                  }}
                  title={directoryHandles.length > 0 ? `ดึงข้อมูลล่าสุดจาก ${directoryHandles.length} โฟลเดอร์ที่เชื่อมต่อ` : "กรุณาเชื่อมต่อโฟลเดอร์ก่อน"}
                >
                  <RefreshCw size={16} style={{ animation: isRefreshingFolder ? 'spin 1s linear infinite' : 'none' }} />
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={handleFolderPickerClick}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    fontSize: '0.9rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    cursor: 'pointer', 
                    margin: 0, 
                    borderColor: '#8b5cf6', 
                    color: '#6d28d9', 
                    backgroundColor: '#f5f3ff', 
                    fontWeight: 'bold',
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    boxShadow: '0 2px 4px rgba(139, 92, 246, 0.15)'
                  }}
                  title="เลือกหรือเพิ่มโฟลเดอร์สำหรับเชื่อมต่อดึงข้อมูลส่งพิมพ์"
                >
                  <FolderOpen size={16} /> โฟล์เดอร์เก็บข้อมูลสั่งพิมพ์ {directoryHandles.length > 0 ? `(${directoryHandles.length})` : ''}
                </button>
              </div>
              <input 
                id="legacy-folder-input"
                type="file" 
                webkitdirectory="" 
                directory="" 
                multiple 
                onChange={handleFolderImport} 
                style={{ display: 'none' }} 
              />
              <Link to="/worldcup" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#3b82f6', color: '#1d4ed8', backgroundColor: '#eff6ff' }}>
                พิมพ์ชื่อแชมป์ <span role="img" aria-label="globe">🌍</span>
              </Link>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => navigate('/print-blank-forms', { state: { branchName, branchCode, staffName, staffPhone } })}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#f59e0b', color: '#d97706', backgroundColor: '#fffbeb', cursor: 'pointer', margin: 0 }}
                title="พิมพ์ใบกรอกการสั่งพิมพ์ (A4) สำหรับให้ลูกค้าเขียนด้วยมือ"
              >
                <FileText size={16} /> พิมพ์ใบกรอกการสั่งพิมพ์ (A4)
              </button>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => {
                  setIsPrintingGuide(true);
                  setTimeout(() => {
                    window.print();
                    setIsPrintingGuide(false);
                  }, 250);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#ef4444', color: '#b91c1c', backgroundColor: '#fef2f2', cursor: 'pointer', margin: 0 }}
                title="พิมพ์ใบคำแนะนำการร่วมสนุก/รายละเอียดของรางวัล (A4)"
              >
                <Printer size={16} /> พิมพ์ใบคำแนะนำ (A4)
              </button>
            </div>
            
            {directoryHandles.length > 0 && (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '0.35rem', 
                marginTop: '0.5rem', 
                justifyContent: 'flex-start', 
                alignItems: 'center',
                padding: '0.35rem 0.6rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px dashed #e2e8f0',
                width: 'fit-content'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  📁 โฟลเดอร์ที่เชื่อมโยงอยู่:
                </span>
                {directoryHandles.map((handle, idx) => (
                  <span 
                    key={idx}
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      backgroundColor: '#f1f5f9', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '16px', 
                      padding: '0.2rem 0.6rem', 
                      fontSize: '0.75rem', 
                      color: 'var(--text-main)',
                      fontWeight: 500
                    }}
                  >
                    {handle.name}
                    <button 
                      type="button"
                      onClick={() => setDirectoryHandles(prev => prev.filter(h => h.name !== handle.name))}
                      style={{ 
                        border: 'none', 
                        background: 'transparent', 
                        color: '#ef4444', 
                        cursor: 'pointer', 
                        fontSize: '0.9rem', 
                        lineHeight: 1,
                        padding: 0, 
                        fontWeight: 'bold',
                        display: 'flex', 
                        alignItems: 'center' 
                      }}
                      title="ยกเลิกเชื่อมต่อโฟลเดอร์นี้"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>



        <div className="staff-columns" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div className="staff-left-column" style={{ flex: '1 1 400px' }}>
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
                  <Camera size={16} />
                  <span style={{ textAlign: 'left', lineHeight: '1.1', fontSize: '0.8rem' }}>
                    สแกน QR Code<br />และรับข้อมูลสั่งพิมพ์
                  </span>
                </button>
              </div>

              <div id="reader-hidden" style={{ position: 'absolute', top: '-9999px', width: '500px', height: '500px' }}></div>

              {scanMode === 'camera' && targetScanCount > 1 && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  textAlign: 'left',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e293b', marginBottom: '0.75rem' }}>
                    📥 กำลังนำเข้าออเดอร์ของลูกค้า ({scannedIndexes.length} / {targetScanCount})
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {Array.from({ length: targetScanCount }, (_, i) => {
                      const idx = i + 1;
                      const isScanned = scannedIndexes.includes(idx);
                      return (
                        <div
                          key={idx}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            backgroundColor: isScanned ? '#22c55e' : '#ef4444',
                            color: '#fff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'background-color 0.3s ease'
                          }}
                        >
                          {idx}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleSavePendingScansEarly}
                    className="btn"
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      color: '#1e293b',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      margin: 0
                    }}
                  >
                    💾 บันทึกเท่าที่สแกนแล้ว ({scannedIndexes.length} รายการ)
                  </button>
                </div>
              )}

              {(scanMode === 'camera' || scanMode === 'usb') && (
                <div>
                  <div style={{
                    display: 'flex',
                    backgroundColor: '#f1f5f9',
                    padding: '4px',
                    borderRadius: '10px',
                    marginBottom: '1.25rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    <button
                      type="button"
                      onClick={() => setScanSubMode('file')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: scanSubMode === 'file' ? '#fff' : 'transparent',
                        color: scanSubMode === 'file' ? 'var(--primary)' : 'var(--text-muted)',
                        boxShadow: scanSubMode === 'file' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Upload size={16} />
                      อัปโหลดภาพ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanSubMode('usb');
                        setTimeout(() => {
                          const input = document.getElementById('usb-scanner-input');
                          if (input) input.focus();
                        }, 50);
                      }}
                      className="desktop-only-btn"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: scanSubMode === 'usb' ? '#fff' : 'transparent',
                        color: scanSubMode === 'usb' ? 'var(--primary)' : 'var(--text-muted)',
                        boxShadow: scanSubMode === 'usb' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Keyboard size={16} />
                      เครื่องยิง USB
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanSubMode('camera')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: scanSubMode === 'camera' ? '#fff' : 'transparent',
                        color: scanSubMode === 'camera' ? 'var(--primary)' : 'var(--text-muted)',
                        boxShadow: scanSubMode === 'camera' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <QrCode size={16} />
                      กล้องเว็บแคม
                    </button>
                  </div>

                  {scanSubMode === 'file' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div 
                        onDragOver={(e) => { 
                          e.preventDefault(); 
                          e.currentTarget.style.borderColor = 'var(--primary)'; 
                          e.currentTarget.style.backgroundColor = '#eff6ff'; 
                        }}
                        onDragLeave={(e) => { 
                          e.preventDefault(); 
                          e.currentTarget.style.borderColor = '#cbd5e1'; 
                          e.currentTarget.style.backgroundColor = '#f8fafc'; 
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            await handleMultipleImagesImport({ target: { files: e.dataTransfer.files } });
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
                          backgroundColor: '#f8fafc',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                        }}
                      >
                        <input 
                          type="file" 
                          id="drag-file-input" 
                          multiple
                          accept="image/*" 
                          onChange={handleMultipleImagesImport} 
                          style={{ display: 'none' }} 
                        />
                        <div style={{ color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                          <Upload size={36} />
                        </div>
                        <strong style={{ display: 'block', marginBottom: '0.35rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                          ลากไฟล์รูปภาพ QR Code มาวางที่นี่
                        </strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          หรือคลิกเพื่อเลือกไฟล์รูปภาพจากเครื่องคอมพิวเตอร์ (เลือกพร้อมกันได้หลายรูป)
                        </span>
                      </div>
                    </div>
                  )}

                  {scanSubMode === 'usb' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ 
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        backgroundColor: '#fff',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        textAlign: 'center'
                      }}>
                        <div style={{ color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                          <Keyboard size={32} />
                        </div>
                        <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          ใช้เครื่องยิงบาร์โค้ด / QR Code (USB)
                        </strong>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          ยิงเครื่องสแกนเนอร์ได้ทันทีโดยไม่ต้องคลิก (หรือคลิกที่ช่องด้านล่างเพื่อโฟกัส)
                        </p>
                        <input 
                          type="text" 
                          id="usb-scanner-input"
                          autoFocus
                          className="form-control" 
                          placeholder="👉 คลิกตรงนี้ แล้วยิงสแกนเนอร์..." 
                          style={{ 
                            fontSize: '0.95rem', 
                            padding: '0.65rem 1rem', 
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1', 
                            backgroundColor: '#fff',
                            width: '100%',
                            boxSizing: 'border-box',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                            outline: 'none',
                            fontWeight: '600',
                            color: '#1e293b'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = 'var(--primary)';
                            e.target.style.boxShadow = '0 0 0 3px rgba(211, 47, 47, 0.15)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#cbd5e1';
                            e.target.style.boxShadow = 'none';
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              try {
                                const val = e.target.value.trim();
                                if (!val) return;
                                const data = parseQrPayload(val);
                                onScanSuccess(data);
                                e.target.value = '';
                                setScanMode('manual');
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
                                  onScanSuccess(data);
                                  e.target.value = '';
                                  setScanMode('manual');
                                }
                              } catch (err) {}
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {scanSubMode === 'camera' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div id="reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', display: cameraActive ? 'block' : 'none' }}></div>
                      {!cameraActive && (
                        <div style={{ 
                          border: '2px dashed #cbd5e1',
                          borderRadius: '12px',
                          padding: '2.5rem 1rem',
                          textAlign: 'center',
                          backgroundColor: '#f8fafc'
                        }}>
                          <div style={{ color: 'var(--primary)', marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                            <QrCode size={36} />
                          </div>
                          <strong style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            กล้องเว็บแคมปิดอยู่
                          </strong>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setCameraActive(true)}
                            style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            📷 เปิดกล้องสแกนเนอร์
                          </button>
                        </div>
                      )}
                      {cameraActive && (
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setCameraActive(false)}
                            style={{ padding: '0.4rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            ❌ ปิดกล้องสแกน
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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

                {formValues.orderCode && (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    color: '#475569'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      📋 ข้อมูลรหัสสั่งพิมพ์จากลูกค้า
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>รหัสสั่งพิมพ์</span>
                      <input 
                        type="text" 
                        readOnly 
                        {...register("orderCode")} 
                        style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 'bold', color: '#0f172a', padding: 0, outline: 'none' }} 
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">วันที่สั่งจอง <span style={{color:'red'}}>*</span></label>
                    <ThaiDatePicker 
                      className={`form-control ${getFieldClass('orderDate')}`} 
                      required 
                      {...register("orderDate", { required: true })} 
                      watchValue={watch("orderDate")} 
                      defaultValue={new Date().toISOString().split('T')[0]} 
                    />
                    {errors.orderDate && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุวันที่</span>}
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">จำนวน (ใบ) <span style={{color:'red'}}>*</span></label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                      <select 
                        className="form-control" 
                        required 
                        {...register("selectQuantity", { required: true })}
                        style={{ flex: selectQty === 'custom' ? '1 1 50%' : '1 1 100%', minWidth: 0, transition: 'all 0.2s' }}
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
                      
                      {selectQty === 'custom' && (
                        <input 
                          type="number" 
                          min="50" 
                          className={`form-control ${getFieldClass('customQuantity')}`} 
                          required 
                          {...register("customQuantity", { required: true, min: 50 })} 
                          placeholder="ระบุจำนวน" 
                          style={{ 
                            flex: '1 1 50%', 
                            minWidth: '80px', 
                            padding: '0.35rem 0.5rem', 
                            textAlign: 'center', 
                            borderColor: '#e11d48', 
                            borderWidth: '2px', 
                            fontSize: '0.95rem' 
                          }}
                        />
                      )}
                    </div>
                    {errors.selectQuantity && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุจำนวน</span>}
                    {selectQty === 'custom' && errors.customQuantity && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุจำนวนอย่างน้อย 50 ใบ</span>}
                  </div>
                </div>

                {/* ข้อมูลผู้สั่ง (Sender Profile) */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ flex: '1 1 180px' }}>
                    <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>ชื่อเล่นผู้สั่ง <span style={{color:'red'}}>*</span></label>
                    <input type="text" className={`form-control ${getFieldClass('senderNickname')}`} required {...register("senderNickname", { required: "กรุณาระบุชื่อเล่นผู้สั่ง" })} placeholder="ระบุชื่อเล่นผู้สั่ง" />
                    {errors.senderNickname && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>{errors.senderNickname.message}</span>}
                  </div>
                  <div style={{ flex: '1 1 180px' }}>
                    <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>เบอร์โทรผู้สั่ง</label>
                    <input type="text" className={`form-control ${getFieldClass('senderPhone')}`} {...register("senderPhone", { 
                      required: false,
                      validate: value => {
                        if (!value || value.trim() === '') return true;
                        return /^\s*0([-\s]?\d){8,9}(\s*(ต่อ|ext\.?|x)\s*\d{1,5})?\s*$/i.test(value) || "รูปแบบเบอร์โทรไม่ถูกต้อง (ต้องเป็น 9-10 หลัก)";
                      }
                    })} placeholder="ระบุเบอร์โทรผู้สั่ง (ถ้ามี)" />
                    {errors.senderPhone && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>{errors.senderPhone.message}</span>}
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
                {(scanMode === 'manual' || editingRecordId !== null) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                    <button 
                      type="submit" 
                      onClick={handleDirectPrintClick} 
                      className="btn btn-primary" 
                      style={{ width: '100%', fontSize: '1.05rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0, padding: '0.65rem' }}
                    >
                      <Printer size={18} />
                      พิมพ์
                    </button>
                    <button 
                      type="button" 
                      onClick={handleSaveOnlyClick} 
                      className="btn" 
                      style={{ width: '100%', fontSize: '1.05rem', fontWeight: 'bold', border: '2px solid #3b82f6', color: '#1d4ed8', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: 0, padding: '0.65rem', cursor: 'pointer' }}
                    >
                      💾 บันทึกข้อมูล
                    </button>
                  </div>
                )}

                <div className="print-settings-panel" style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                    <Settings size={16} />
                    ตั้งค่าตำแหน่งและขนาดการพิมพ์ (ปรับแต่งเอง)
                  </h4>

                  <div style={{ 
                    marginBottom: '1rem', 
                    paddingBottom: '1rem', 
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.75rem' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        🔖 พรีเซ็ตการพิมพ์ที่บันทึกไว้
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        id="preset-selector"
                        className="form-control"
                        style={{ flex: '1 1 200px', fontSize: '0.85rem', padding: '0.4rem 0.5rem', minWidth: '150px' }}
                        onChange={(e) => {
                          const selectedName = e.target.value;
                          if (!selectedName) return;
                          const found = presets.find(p => p.name === selectedName);
                          if (found) {
                            setPrintSettings({
                              top: found.top,
                              left: found.left,
                              fontSize: found.fontSize,
                              isNameBold: found.isNameBold,
                              isPhoneBold: found.isPhoneBold,
                              didPrintMode: found.didPrintMode || 'did',
                              paperSize: found.paperSize || 'A6',
                              printCountry: typeof found.printCountry === 'boolean' ? found.printCountry : false,
                              countryName: found.countryName || 'ประเทศไทย',
                              calX: typeof found.calX === 'number' ? found.calX : 0,
                              calY: typeof found.calY === 'number' ? found.calY : 0
                            });
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>-- เลือกพรีเซ็ตที่ต้องการโหลด --</option>
                        {presets.map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={async () => {
                          const selectEl = document.getElementById('preset-selector');
                          const nameToDelete = selectEl?.value;
                          if (!nameToDelete) {
                            alert('กรุณาเลือกพรีเซ็ตที่ต้องการลบก่อนครับ');
                            return;
                          }
                          if (nameToDelete === 'ค่าเริ่มต้นไปรษณียบัตร' || nameToDelete === 'ตัวอักษรใหญ่ (ซม.)' || nameToDelete === 'เครื่อง Drop Off') {
                            alert('ไม่สามารถลบพรีเซ็ตเริ่มต้นของระบบได้ครับ');
                            return;
                          }
                          if (await window.showConfirm(`คุณต้องการลบพรีเซ็ต "${nameToDelete}" ใช่หรือไม่?`)) {
                            setPresets(prev => prev.filter(p => p.name !== nameToDelete));
                            if (selectEl) selectEl.value = "";
                          }
                        }}
                        className="btn"
                        style={{ 
                          padding: '0.4rem 0.75rem', 
                          fontSize: '0.8rem', 
                          borderColor: '#ef4444', 
                          color: '#dc2626', 
                          backgroundColor: '#fef2f2', 
                          margin: 0,
                          cursor: 'pointer' 
                        }}
                        title="ลบพรีเซ็ตนี้"
                      >
                        🗑️ ลบพรีเซ็ต
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input 
                        type="text"
                        className="form-control"
                        placeholder="ระบุชื่อพรีเซ็ตเพื่อเซฟ (เช่น 'เครื่องพิมพ์ Brother A6')..."
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        style={{ flex: '1 1 200px', fontSize: '0.85rem', padding: '0.4rem 0.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const name = newPresetName.trim();
                          if (!name) {
                            alert('กรุณากรอกชื่อพรีเซ็ตที่ต้องการบันทึกด้วยครับ');
                            return;
                          }
                          
                          const exists = presets.some(p => p.name.toLowerCase() === name.toLowerCase());
                          if (exists) {
                            if (!await window.showConfirm(`มีพรีเซ็ตชื่อ "${name}" อยู่แล้ว คุณต้องการเซฟทับใช่หรือไม่?`)) {
                              return;
                            }
                          }
                          
                          const newPreset = {
                            name,
                            top: printSettings.top,
                            left: printSettings.left,
                            fontSize: printSettings.fontSize,
                            isNameBold: printSettings.isNameBold,
                            isPhoneBold: printSettings.isPhoneBold,
                            didPrintMode: printSettings.didPrintMode,
                            paperSize: printSettings.paperSize || 'A6',
                            printCountry: typeof printSettings.printCountry === 'boolean' ? printSettings.printCountry : false,
                            countryName: printSettings.countryName || 'ประเทศไทย',
                            calX: typeof printSettings.calX === 'number' ? printSettings.calX : 0,
                            calY: typeof printSettings.calY === 'number' ? printSettings.calY : 0
                          };
                          
                          setPresets(prev => {
                            const filtered = prev.filter(p => p.name.toLowerCase() !== name.toLowerCase());
                            return [...filtered, newPreset];
                          });
                          
                          setNewPresetName('');
                          alert(`บันทึกพรีเซ็ต "${name}" สำเร็จเรียบร้อยแล้วครับ!`);
                          
                          setTimeout(() => {
                            const selectEl = document.getElementById('preset-selector');
                            if (selectEl) selectEl.value = name;
                          }, 50);
                        }}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', margin: 0, cursor: 'pointer', backgroundColor: '#22c55e', borderColor: '#22c55e' }}
                      >
                        💾 บันทึกพรีเซ็ต
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 2, minWidth: '220px', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                      📍 ตำแหน่งปัจจุบัน: ลง {printSettings.top} ซม. | ขวา {printSettings.left} ซม.
                      <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b', marginTop: '0.25rem' }}>
                        (ลากข้อความผู้รับบนภาพตัวอย่างด้านล่างเพื่อปรับตำแหน่งได้โดยตรง)
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>ขนาดตัวอักษร: {printSettings.fontSize}</label>
                      <input type="range" min="4" max="28" step="1" value={printSettings.fontSize} onChange={(e) => setPrintSettings(p => ({...p, fontSize: parseInt(e.target.value)}))} style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '1.2rem' }}>
                      <button 
                        type="button" 
                        onClick={() => setPrintSettings(prev => ({ 
                          ...prev, 
                          top: 4.5, 
                          left: 9.5, 
                          fontSize: 6,
                          paperSize: 'A6',
                          calX: 0,
                          calY: 0
                        }))} 
                        className="btn" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderColor: '#cbd5e1', color: '#475569', backgroundColor: '#f1f5f9', margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        🔄 กลับสู่ค่าเริ่มต้น
                      </button>
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
                          checked={printSettings.didPrintMode === 'address'} 
                          onChange={() => setPrintSettings(p => ({...p, didPrintMode: 'address'}))} 
                        />
                        พิมพ์ที่อยู่ปกติ (ซ่อน D-ID)
                      </label>
                      <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="didPrintMode" 
                          checked={printSettings.didPrintMode === 'did'} 
                          onChange={() => setPrintSettings(p => ({...p, didPrintMode: 'did'}))} 
                        />
                        พิมพ์ D-ID (ซ่อนที่อยู่ปกติ)
                      </label>
                    </div>
                  </div>

                  <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', marginTop: '1rem', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ width: '100%', backgroundColor: '#fffbeb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem', color: '#b45309' }}>⚙️ ปรับชดเชยระยะเครื่องพิมพ์ (สำหรับชดเชยระยะช่องใส่กระดาษเบี้ยว):</label>
                      <p style={{ fontSize: '0.75rem', color: '#d97706', margin: '0 0 0.75rem 0', lineHeight: '1.4' }}>
                        *แก้ปัญหางานพิมพ์เลื่อนไม่ตรงช่อง โดยที่การตั้งค่าจัดเลย์เอาต์หน้าจอหลักยังแสดงรูปภาพตรงสวยงามตามปกติ (ค่าชดเชยนี้จะผลต่อตอนกดพิมพ์ออกเครื่องพิมพ์เท่านั้น)
                      </p>
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '130px' }}>
                          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>ชดเชยซ้าย/ขวา (แกน X): {printSettings.calX > 0 ? `ขวา +${printSettings.calX}` : printSettings.calX < 0 ? `ซ้าย ${printSettings.calX}` : '0'} ซม.</label>
                          <input type="range" min="-10" max="10" step="0.1" value={printSettings.calX || 0} onChange={(e) => setPrintSettings(p => ({...p, calX: parseFloat(e.target.value)}))} style={{ width: '100%' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: '130px' }}>
                          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>ชดเชยบน/ล่าง (แกน Y): {printSettings.calY > 0 ? `ล่าง +${printSettings.calY}` : printSettings.calY < 0 ? `บน ${printSettings.calY}` : '0'} ซม.</label>
                          <input type="range" min="-10" max="10" step="0.1" value={printSettings.calY || 0} onChange={(e) => setPrintSettings(p => ({...p, calY: parseFloat(e.target.value)}))} style={{ width: '100%' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <button type="button" onClick={() => setPrintSettings(p => ({...p, calX: 0, calY: 0}))} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: '#d97706', color: '#b45309', backgroundColor: '#fff', margin: 0, cursor: 'pointer' }}>รีเซ็ตชดเชย</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem' }}>
                    <h5 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      ตัวอย่างพื้นที่การพิมพ์ (จำลองสัดส่วนไปรษณียบัตร 14.8 x 10.5 ซม.)
                    </h5>
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
                          paddingTop: `${printSettings.top + (printSettings.calY || 0)}cm`,
                          paddingLeft: `${printSettings.left + (printSettings.calX || 0)}cm`,
                          paddingRight: '1cm',
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          {(printSettings.calX !== 0 || printSettings.calY !== 0) && (
                            <div style={{
                              position: 'absolute',
                              top: `${printSettings.top}cm`,
                              left: `${printSettings.left}cm`,
                              width: '5cm',
                              height: '2.5cm',
                              border: '1px dashed #94a3b8',
                              borderRadius: '4px',
                              pointerEvents: 'none',
                              opacity: 0.5
                            }} />
                          )}
                          <div 
                            onMouseDown={handleDragStart}
                            onTouchStart={handleDragStart}
                            style={{ 
                              fontSize: `${printSettings.fontSize}pt`, 
                              lineHeight: '1.4', 
                              fontFamily: 'Sarabun, Inter, sans-serif', 
                              color: (printSettings.calX !== 0 || printSettings.calY !== 0) ? '#d97706' : '#111', 
                              textAlign: 'left',
                              cursor: 'grab',
                              userSelect: 'none',
                              pointerEvents: 'auto'
                            }}
                          >
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
                                    {`${formValues.addressLine1 || 'บ้านเลขที่/ถนน'} ${formValues.subdistrict ? (formValues.province === 'กรุงเทพมหานคร' ? 'แขวง' : 'ต.') + formValues.subdistrict : ''} ${formValues.district ? (formValues.province === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.') + formValues.district : ''} ${formValues.province ? (formValues.province === 'กรุงเทพมหานคร' ? '' : 'จ.') + formValues.province : ''} ${formValues.zipcode || 'XXXXX'}${printSettings.printCountry ? ' ' + printSettings.countryName : ''}`.trim()}
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
                                  {`${formValues.zipcode || 'XXXXX'}${printSettings.printCountry ? ' ' + printSettings.countryName : ''}`}
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

          <div className="staff-right-column" style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {history.length > 0 && (() => {
              const pendingRecordsList = history.filter(r => !r.printed);
              const pendingCount = pendingRecordsList.length;
              const pendingTotal = pendingRecordsList.reduce((sum, r) => sum + (parseInt(r.quantity, 10) || 0), 0);
              const pendingPrice = pendingTotal * 3;

              const grandCount = history.length;
              const grandTotal = history.reduce((sum, r) => sum + (parseInt(r.quantity, 10) || 0), 0);
              const grandPrice = grandTotal * 3;
              return (
                <div className="stats-grid">
                  <div className="stats-card" style={{
                    background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                    border: '1.5px solid #fecdd3',
                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.05)'
                  }}>
                    <div className="stats-card-header" style={{ color: 'var(--primary)', borderBottom: '1px solid #fda4af' }}>
                      ยอดรอการสั่งพิมพ์
                    </div>
                    <div className="stats-subgrid">
                      <div className="stats-subcard" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(225, 29, 72, 0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#9f1239', fontWeight: 'bold' }}>จำนวน</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.15rem' }}>{pendingCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>รายการ</span></div>
                      </div>
                      <div className="stats-subcard" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(225, 29, 72, 0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#9f1239', fontWeight: 'bold' }}>จำนวน</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.15rem' }}>{pendingTotal} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>ใบ</span></div>
                      </div>
                    </div>
                    <div className="stats-footer" style={{ 
                      background: 'linear-gradient(90deg, var(--primary) 0%, #be123c 100%)',
                      color: 'white',
                      boxShadow: '0 4px 10px rgba(225, 29, 72, 0.2)'
                    }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.9 }}>รวมเป็นเงิน:</span>
                      <strong style={{ fontSize: '1.25rem', fontWeight: '900' }}>{pendingPrice.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>บาท</span></strong>
                    </div>
                  </div>

                  <div className="stats-card" style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    border: '1.5px solid #bfdbfe',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.05)'
                  }}>
                    <div className="stats-card-header" style={{ color: '#1d4ed8', borderBottom: '1px solid #93c5fd' }}>
                      <span style={{ fontSize: '1.2rem' }}>📊</span> ยอดรวมทั้งหมด
                    </div>
                    <div className="stats-subgrid">
                      <div className="stats-subcard" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold' }}>จำนวน</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1d4ed8', marginTop: '0.15rem' }}>{grandCount} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>รายการ</span></div>
                      </div>
                      <div className="stats-subcard" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 'bold' }}>จำนวน</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1d4ed8', marginTop: '0.15rem' }}>{grandTotal.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>ใบ</span></div>
                      </div>
                    </div>
                    <div className="stats-footer" style={{ 
                      background: 'linear-gradient(90deg, #1d4ed8 0%, #1e40af 100%)',
                      color: 'white',
                      boxShadow: '0 4px 10px rgba(29, 78, 216, 0.2)'
                    }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.9 }}>รวมเป็นเงิน:</span>
                      <strong style={{ fontSize: '1.25rem', fontWeight: '900' }}>{grandPrice.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>บาท</span></strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            {selectedIds.length > 0 && (() => {
              const selectedRecords = history.filter(r => selectedIds.includes(r.id));
              const totalQty = selectedRecords.reduce((sum, r) => sum + (parseInt(r.quantity, 10) || 0), 0);
              const totalAmount = totalQty * postcardRate;

              return (
                <div className="card" style={{
                  border: '1.5px solid #3b82f6',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.12)',
                  background: 'linear-gradient(to bottom right, #ffffff, #f0f7ff)',
                  padding: '1.25rem'
                }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#1d4ed8' }}>
                    <span>💰 สรุปการเก็บเงิน ({selectedIds.length} รายการที่เลือก)</span>
                  </h3>
                  
                  <div style={{ overflowX: 'auto', marginBottom: '1rem', border: '1px solid #dbeafe', borderRadius: '8px', backgroundColor: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#eff6ff', borderBottom: '1px solid #dbeafe' }}>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#1e40af' }}>ชื่อผู้รับ</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#1e40af', textAlign: 'right' }}>จำนวน (ใบ)</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#1e40af', textAlign: 'right' }}>ค่าไปรษณียบัตร</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#1e40af', textAlign: 'center' }}>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRecords.map(r => (
                          <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500' }}>{r.name}</td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>{r.quantity || 0}</td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>{((r.quantity || 0) * postcardRate).toLocaleString()} บาท</td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                              {r.paid ? (
                                <span style={{ color: '#15803d', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ จ่ายแล้ว</span>
                              ) : (
                                <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>✗ ยังไม่จ่าย</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #dbeafe' }}>
                          <td style={{ padding: '0.65rem 0.75rem', color: '#1e40af' }}>รวมทั้งสิ้น</td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#1e40af' }}>{totalQty.toLocaleString()}</td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: '#1d4ed8', fontSize: '0.95rem' }}>{totalAmount.toLocaleString()} บาท</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 180px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>อัตราค่าไปรษณียบัตร (บาทต่อใบ)</label>
                        <select 
                          className="form-control"
                          value={postcardRate} 
                          onChange={(e) => setPostcardRate(parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                        >
                          <option value="2">2 บาท (ไปรษณียบัตรปกติ)</option>
                          <option value="3">3 บาท (พิมพ์ + การ์ดสติกเกอร์/พิเศษ)</option>
                          <option value="4">4 บาท</option>
                          <option value="5">5 บาท</option>
                        </select>
                      </div>

                      <div style={{ flex: '1 1 220px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>ชื่อผู้จ่ายเงิน (ถ้าต้องการระบุในใบเรียกเก็บ)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="เช่น บริษัท/กลุ่มบุคคล, คุณสมชาย..." 
                          value={payerName} 
                          onChange={(e) => setPayerName(e.target.value)} 
                          style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="checkbox" 
                          id="bulkPaidCheckbox"
                          checked={bulkPaidStatus} 
                          onChange={(e) => setBulkPaidStatus(e.target.checked)} 
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="bulkPaidCheckbox" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}>ทำเครื่องหมายว่า "จ่ายแล้ว"</label>
                      </div>

                      {bulkPaidStatus && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>วันที่:</span>
                          <input 
                            type="date" 
                            className="form-control"
                            value={bulkPaidDate} 
                            onChange={(e) => setBulkPaidDate(e.target.value)} 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>รูปแบบพิมพ์บิล:</span>
                      <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', margin: 0 }}>
                        <input 
                          type="radio" 
                          name="printLayoutType" 
                          value="grid" 
                          checked={printLayoutType === 'grid'} 
                          onChange={() => setPrintLayoutType('grid')} 
                          style={{ cursor: 'pointer' }}
                        />
                        พิมพ์แยกใบ (2x2 บน A4)
                      </label>
                      <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', margin: 0 }}>
                        <input 
                          type="radio" 
                          name="printLayoutType" 
                          value="combined" 
                          checked={printLayoutType === 'combined'} 
                          onChange={() => setPrintLayoutType('combined')} 
                          style={{ cursor: 'pointer' }}
                        />
                        พิมพ์รวมเป็นใบเดียว
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={handleUpdatePaymentStatus}
                      style={{
                        flex: '1 1 200px',
                        padding: '0.6rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        margin: 0
                      }}
                    >
                      💾 บันทึกสถานะชำระเงิน ({selectedIds.length} รายการ)
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setIsPrintingInvoice(true);
                        setTimeout(() => {
                          window.print();
                          setIsPrintingInvoice(false);
                        }, 300);
                      }}
                      style={{
                        flex: '1 1 180px',
                        padding: '0.6rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        margin: 0
                      }}
                    >
                      🖨️ พิมพ์บิลเรียกเก็บเงิน A4
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        if (selectedIds.length === 0) return;
                        const selectedRecords = history.filter(r => selectedIds.includes(r.id));
                        const totalQty = selectedRecords.reduce((sum, r) => sum + (parseInt(r.quantity, 10) || 0), 0);
                        const totalAmount = totalQty * postcardRate;
                        
                        const newInvoice = {
                          id: Date.now() + Math.random(),
                          timestamp: new Date().toISOString(),
                          branchName: branchName,
                          payerName: payerName || 'ยอดรวมกลุ่ม',
                          postcardRate: postcardRate,
                          records: selectedRecords,
                          totalQty: totalQty,
                          totalAmount: totalAmount
                        };
                        
                        const updatedQueue = [...invoiceQueue, newInvoice];
                        saveInvoiceQueue(updatedQueue);
                        
                        setSelectedIds([]);
                        setPayerName('');
                        alert('💾 บันทึกใบกำกับนี้เข้าคิวพิมพ์ค้างไว้สำเร็จ! คุณสามารถบันทึกเพิ่มหรือพิมพ์รวมกันที่คิวด้านล่างเพื่อประหยัดกระดาษ');
                      }}
                      style={{
                        flex: '1 1 200px',
                        padding: '0.6rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        backgroundColor: '#6366f1',
                        borderColor: '#4f46e5',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        margin: 0
                      }}
                    >
                      📥 บันทึกเข้าคิวพิมพ์ใบกำกับ
                    </button>
                  </div>
                </div>
              );
            })()}

            {invoiceQueue.length > 0 && (
              <div className="card" style={{
                border: '1.5px solid #6366f1',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.12)',
                background: 'linear-gradient(to bottom right, #ffffff, #fafaff)',
                padding: '1.25rem'
              }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', color: '#4f46e5' }}>
                  <span>🖨️ คิวพิมพ์ใบกำกับเพื่อประหยัดกระดาษ (พิมพ์รวมบน A4 ได้สูงสุด 4 ใบต่อหน้า)</span>
                </h3>
                
                <div style={{ overflowX: 'auto', marginBottom: '1rem', border: '1px solid #e0e7ff', borderRadius: '8px', backgroundColor: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#eef2ff', borderBottom: '1px solid #e0e7ff' }}>
                        <th style={{ padding: '0.5rem 0.75rem', width: '40px', textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={selectedQueueIds.length === invoiceQueue.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQueueIds(invoiceQueue.map(inv => inv.id));
                              } else {
                                setSelectedQueueIds([]);
                              }
                            }}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#3730a3' }}>ผู้สั่งพิมพ์/ผู้จ่ายเงิน</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#3730a3', textAlign: 'center' }}>รายการรายชื่อ</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#3730a3', textAlign: 'right' }}>จำนวนรวม (ใบ)</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#3730a3', textAlign: 'right' }}>ยอดเงินรวม</th>
                        <th style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#3730a3', textAlign: 'center' }}>ลบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceQueue.map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={selectedQueueIds.includes(inv.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedQueueIds(prev => [...prev, inv.id]);
                                } else {
                                  setSelectedQueueIds(prev => prev.filter(id => id !== inv.id));
                                }
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold', color: '#1e1b4b' }}>
                            {inv.payerName}
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal' }}>
                              {new Date(inv.timestamp).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
                            </div>
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                            {inv.records.length} คน
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: '600' }}>
                            {inv.totalQty.toLocaleString()}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#b91c1c' }}>
                            {inv.totalAmount.toLocaleString()}.-
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`คุณต้องการลบใบกำกับของ "${inv.payerName}" ออกจากคิวใช่หรือไม่?`)) {
                                  const nextQueue = invoiceQueue.filter(x => x.id !== inv.id);
                                  saveInvoiceQueue(nextQueue);
                                  setSelectedQueueIds(prev => prev.filter(id => id !== inv.id));
                                }
                              }}
                              style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '4px' }}
                              title="ลบออกจากคิว"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={selectedQueueIds.length === 0}
                    onClick={() => {
                      setIsPrintingQueue(true);
                      setTimeout(() => {
                        window.print();
                        setIsPrintingQueue(false);
                      }, 300);
                    }}
                    style={{
                      flex: '1 1 220px',
                      padding: '0.6rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      backgroundColor: '#4f46e5',
                      borderColor: '#4338ca',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      cursor: selectedQueueIds.length > 0 ? 'pointer' : 'not-allowed',
                      opacity: selectedQueueIds.length > 0 ? 1 : 0.6,
                      margin: 0
                    }}
                  >
                    🖨️ พิมพ์ใบกำกับที่เลือกพร้อมกัน (A4 แบ่ง 4) ({selectedQueueIds.length} ใบกำกับ)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (window.confirm('คุณต้องการล้างคิวพิมพ์ใบกำกับทั้งหมดใช่หรือไม่?')) {
                        saveInvoiceQueue([]);
                        setSelectedQueueIds([]);
                      }
                    }}
                    style={{
                      padding: '0.6rem 1rem',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                      margin: 0
                    }}
                  >
                    🗑️ ล้างคิวทั้งหมด
                  </button>
                </div>
              </div>
            )}

            <div className="card" id="history-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, flexWrap: 'wrap' }}>
                  <History size={20} />
                  <span>ประวัติการพิมพ์ (เครื่องนี้)</span>
                  <span style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 'bold', marginLeft: '0.5rem', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                    💡 ติ๊กถูกเลือกรายการด้านล่าง เพื่อเปิดใช้งานระบบสรุปการเก็บเงินและพิมพ์บิล A4
                  </span>
                </h3>
                {history.length > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                      type="checkbox"
                      checked={selectedIds.length === history.length}
                      onChange={toggleSelectAll}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                    <span>เลือกทั้งหมด</span>
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => exportHistory('download')} 
                  className="btn btn-secondary" 
                  style={{ flex: '1 1 180px', padding: '0.5rem', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', borderColor: selectedIds.length > 0 ? 'var(--primary)' : 'var(--border)', backgroundColor: selectedIds.length > 0 ? '#fff1f2' : '' }}
                  title="ดาวน์โหลดประวัติเป็นไฟล์ลงเครื่องคอมพิวเตอร์"
                >
                  💾 บันทึกลงเครื่อง {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                </button>
                <label 
                  className="btn btn-secondary" 
                  style={{ flex: '1 1 150px', padding: '0.5rem', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0 }}
                  title="เลือกไฟล์ข้อมูลที่ส่งออกมาเพื่อนำเข้าในเครื่องนี้"
                >
                  <Download size={14} /> นำเข้าข้อมูล (.json)
                  <input type="file" accept=".json" onChange={importHistory} style={{ display: 'none' }} />
                </label>
                <div style={{ display: 'flex', alignItems: 'stretch', flex: '1 1 200px' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    onClick={() => refreshFromDirectoryHandles(directoryHandles)}
                    disabled={isRefreshingFolder || directoryHandles.length === 0}
                    style={{ 
                      padding: '0.5rem', 
                      fontSize: '0.825rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: directoryHandles.length > 0 ? 'pointer' : 'default', 
                      margin: 0, 
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      borderRight: 'none',
                      opacity: directoryHandles.length === 0 ? 0.4 : (isRefreshingFolder ? 0.7 : 1)
                    }}
                    title={directoryHandles.length > 0 ? `ดึงข้อมูลล่าสุดจาก ${directoryHandles.length} โฟลเดอร์` : "กรุณาเชื่อมต่อโฟลเดอร์ก่อน"}
                  >
                    <RefreshCw size={14} style={{ animation: isRefreshingFolder ? 'spin 1s linear infinite' : 'none' }} />
                  </button>
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    onClick={handleFolderPickerClick}
                    style={{ 
                      flex: 1,
                      padding: '0.5rem', 
                      fontSize: '0.825rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '0.35rem', 
                      cursor: 'pointer', 
                      margin: 0, 
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0
                    }}
                    title="เลือกหรือเพิ่มโฟลเดอร์สำหรับดึงข้อมูลสั่งพิมพ์"
                  >
                    <FolderOpen size={14} /> โฟล์เดอร์เก็บข้อมูลสั่งพิมพ์ {directoryHandles.length > 0 ? `(${directoryHandles.length})` : ''}
                  </button>
                </div>
              </div>

              {/* Segmented Filter Tabs for History */}
              <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryFilter('pending');
                    setSelectedIds([]);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: historyFilter === 'pending' ? '#fff' : 'transparent',
                    color: historyFilter === 'pending' ? '#b45309' : 'var(--text-muted)',
                    boxShadow: historyFilter === 'pending' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  ⏳ รอพิมพ์ ({history.filter(r => !r.printed).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryFilter('printed');
                    setSelectedIds([]);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: historyFilter === 'printed' ? '#fff' : 'transparent',
                    color: historyFilter === 'printed' ? '#15803d' : 'var(--text-muted)',
                    boxShadow: historyFilter === 'printed' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  ✅ พิมพ์แล้ว ({history.filter(r => r.printed).length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryFilter('all');
                    setSelectedIds([]);
                  }}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: historyFilter === 'all' ? '#fff' : 'transparent',
                    color: historyFilter === 'all' ? 'var(--text-main)' : 'var(--text-muted)',
                    boxShadow: historyFilter === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  ทั้งหมด ({history.length})
                </button>
              </div>

              {/* Filter Panel */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ fontWeight: 'bold', color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  🔍 ค้นหาและกรองข้อมูล
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>ผู้สั่งพิมพ์</label>
                    <select
                      value={filterSender}
                      onChange={(e) => setFilterSender(e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    >
                      <option value="">ทั้งหมด</option>
                      {Array.from(new Set(history.map(r => r.senderNickname || r.sn).filter(Boolean))).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>วันที่บันทึก (Staff)</label>
                    <input
                      type="date"
                      value={filterSavedDate}
                      onChange={(e) => setFilterSavedDate(e.target.value)}
                      style={{ width: '100%', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>วันที่สั่งจอง (การ์ด)</label>
                    <input
                      type="date"
                      value={filterOrderDate}
                      onChange={(e) => setFilterOrderDate(e.target.value)}
                      style={{ width: '100%', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>ไฟล์ Backup / แหล่งที่มา</label>
                    <select
                      value={filterImportSource}
                      onChange={(e) => setFilterImportSource(e.target.value)}
                      style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    >
                      <option value="">ทั้งหมด</option>
                      {Array.from(new Set(history.map(r => r.importSource).filter(Boolean))).map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {(filterSender || filterSavedDate || filterOrderDate || filterImportSource) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterSender('');
                        setFilterSavedDate('');
                        setFilterOrderDate('');
                        setFilterImportSource('');
                      }}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        color: '#ef4444',
                        background: '#fef2f2',
                        border: '1px solid #fca5a5',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ล้างตัวกรอง
                    </button>
                  </div>
                )}
              </div>

              {selectedIds.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="btn btn-secondary"
                    style={{
                      flex: 1,
                      padding: '0.6rem 1rem',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      backgroundColor: '#fff1f2',
                      borderColor: '#fecdd3',
                      color: '#e11d48',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      margin: 0
                    }}
                  >
                    🗑️ ลบรายการที่เลือกทั้งหมด ({selectedIds.length} รายการ)
                  </button>
                </div>
              )}

              {(() => {
                const displayedHistory = history.filter(record => {
                  if (historyFilter === 'pending') {
                    if (record.printed) return false;
                  } else if (historyFilter === 'printed') {
                    if (!record.printed) return false;
                  }

                  if (filterSender) {
                    const sn = record.senderNickname || record.sn;
                    if (sn !== filterSender) return false;
                  }

                  if (filterSavedDate) {
                    const savedDate = getSavedDate(record);
                    if (savedDate !== filterSavedDate) return false;
                  }

                  if (filterOrderDate) {
                    const od = record.orderDate || record.d;
                    if (od !== filterOrderDate) return false;
                  }

                  if (filterImportSource) {
                    if (record.importSource !== filterImportSource) return false;
                  }

                  return true;
                });

                if (displayedHistory.length === 0) {
                  return (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                      {historyFilter === 'pending' ? 'ไม่มีรายการรอพิมพ์ในขณะนี้' : historyFilter === 'printed' ? 'ยังไม่มีประวัติการพิมพ์สำเร็จ' : 'ยังไม่มีข้อมูลในระบบประวัติ'}
                    </p>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '2px' }}>
                    {displayedHistory.map((record) => (
                    <div 
                      key={record.id}
                      id={`record-row-${record.id}`}
                      style={{ 
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0.65rem 0.85rem', 
                        border: '1px solid var(--border)', 
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: record.printed ? '#f8fafc' : '#fff',
                        position: 'relative',
                        scrollMargin: '100px'
                      }}
                    >
                      {/* Checkbox */}
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(record.id)}
                        onChange={() => toggleSelectRecord(record.id)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }}
                      />

                      {/* Info block - takes remaining space */}
                      <div 
                        style={{ flex: '1', minWidth: '0', cursor: 'pointer' }} 
                        onClick={() => setSelectedDetailRecord(record)}
                        title="คลิกเพื่อดูรายละเอียดข้อมูลลูกค้า"
                      >
                        {/* Name and badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                            {record.name}
                          </span>
                          {record.printed ? (
                            <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#15803d', backgroundColor: '#dcfce7', padding: '0.1rem 0.35rem', borderRadius: '10px', border: '1px solid #bbf7d0', whiteSpace: 'nowrap', flexShrink: 0 }}>✅ พิมพ์แล้ว</span>
                          ) : (
                            <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fef3c7', padding: '0.1rem 0.35rem', borderRadius: '10px', border: '1px solid #fde68a', whiteSpace: 'nowrap', flexShrink: 0 }}>⏳ รอพิมพ์</span>
                          )}
                        </div>
                        {/* Subtitle */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                          {record.phone && <div>โทร: {record.phone}</div>}
                          {record.quantity !== undefined && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                              <span>จำนวน: {record.quantity} ใบ</span>
                              {record.paid ? (
                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#15803d', backgroundColor: '#dcfce7', padding: '0.05rem 0.35rem', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                                  💰 จ่ายแล้ว {record.paidDate && `(${new Date(record.paidDate).toLocaleDateString('th-TH')})`}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#ef4444', backgroundColor: '#fef2f2', padding: '0.05rem 0.35rem', borderRadius: '4px', border: '1px solid #fecdd3' }}>
                                  ⏳ ยังไม่จ่าย
                                </span>
                              )}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {new Date(record.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                generateAndDownloadCard(record);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                border: '1px solid #10b981',
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                outline: 'none'
                              }}
                              title="ดาวน์โหลดรูปภาพการ์ดสั่งจอง (ไฟล์รูปภาพแบบเดียวกับของลูกค้า)"
                            >
                              🖼️ บันทึก
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Sender / Order info block on the right, if available */}
                      {(record.senderNickname || record.sn || record.orderCode || record.oc) && (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'flex-end', 
                          justifyContent: 'center',
                          fontSize: '0.75rem', 
                          color: '#475569', 
                          textAlign: 'right',
                          marginRight: '0.75rem',
                          paddingRight: '0.75rem',
                          borderRight: '1px dashed #e2e8f0',
                          flexShrink: 0,
                          lineHeight: '1.4'
                        }}>
                          {(record.senderNickname || record.sn) && (
                            <div>
                              <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>ผู้สั่งพิมพ์:</span>{' '}
                              <strong style={{ color: '#334155' }}>{record.senderNickname || record.sn}</strong>
                            </div>
                          )}
                          {(record.orderCode || record.oc) && (
                            <div>
                              <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>รหัสสั่งพิมพ์:</span>{' '}
                              <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{record.orderCode || record.oc}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Control buttons - always right, never wrap */}
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, alignItems: 'center' }}>
                        <button 
                          onClick={() => handlePrintHistory(record)} 
                          className="btn btn-secondary" 
                          style={{ 
                            width: '32px',
                            height: '32px',
                            padding: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: 0,
                            borderColor: record.printed ? '#cbd5e1' : '#b45309',
                            color: record.printed ? 'var(--text-main)' : '#b45309',
                            backgroundColor: record.printed ? '' : '#fffbeb',
                            cursor: 'pointer'
                          }}
                          title={record.printed ? 'พิมพ์ซ้ำ' : 'สั่งพิมพ์'}
                        >
                          <Printer size={15} />
                        </button>
                        <button 
                          onClick={() => {
                            populateFromScan(record);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          className="btn" 
                          style={{ 
                            width: '32px',
                            height: '32px',
                            padding: 0, 
                            borderColor: '#3b82f6', 
                            color: '#1d4ed8', 
                            backgroundColor: '#eff6ff', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: 0, 
                            cursor: 'pointer'
                          }}
                          title="แก้ไข"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDeleteRecord(record.id)} 
                          className="btn" 
                          style={{ 
                            width: '32px',
                            height: '32px',
                            padding: 0, 
                            borderColor: '#ef4444', 
                            color: '#ef4444', 
                            backgroundColor: '#fef2f2', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: 0, 
                            cursor: 'pointer'
                          }}
                          title="ลบ"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                );

              })()}
            </div>
          </div>
        </div>

        {/* Section 2 & 1 moved to the bottom of the page */}
        <div className="staff-settings-container-row" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '2rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div className="staff-settings-bar" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#fff', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: '1.5 1 auto', minWidth: '130px', maxWidth: '220px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>ชื่อที่ทำการ:</span>
              <input 
                type="text" 
                className="form-control" 
                value={branchName} 
                onChange={handleBranchChange} 
                placeholder="เช่น ไปรษณีย์กลาง"
                style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }} 
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: '1 1 auto', minWidth: '95px', maxWidth: '140px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>รหัส:</span>
              <input 
                type="text" 
                className="form-control" 
                value={branchCode} 
                onChange={handleBranchCodeChange} 
                placeholder="5 หลัก"
                style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.85rem', borderColor: (!branchCode || branchCode.length < 5) ? 'var(--primary)' : 'var(--border)' }} 
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: '0 0 auto', flexWrap: 'wrap' }}>
              <select
                className="form-control"
                value={selectedProfileId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedProfileId(id);
                  if (id) {
                    const prof = staffProfiles.find(p => String(p.id) === String(id));
                    if (prof) {
                      setStaffName(prof.name);
                      setStaffPhone(prof.phone);
                      setIsSettingsDirty(true);
                    }
                  } else {
                    setStaffName('');
                    setStaffPhone('');
                  }
                }}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', backgroundColor: '#f1f5f9', cursor: 'pointer', minWidth: '120px', margin: 0 }}
              >
                <option value="">-- เลือกเจ้าหน้าที่ --</option>
                {staffProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (!staffName || !staffName.trim()) {
                    alert('กรุณากรอกชื่อเจ้าหน้าที่ก่อนบันทึกโปรไฟล์');
                    return;
                  }
                  const nameTrim = staffName.trim();
                  const phoneTrim = (staffPhone || '').trim();
                  
                  const existing = staffProfiles.find(p => p.name === nameTrim);
                  let updated;
                  if (existing) {
                    if (window.confirm(`มีโปรไฟล์ชื่อ "${nameTrim}" อยู่แล้ว ต้องการอัปเดตเบอร์โทรเป็น "${phoneTrim}" ใช่หรือไม่?`)) {
                      updated = staffProfiles.map(p => p.name === nameTrim ? { ...p, phone: phoneTrim } : p);
                    } else {
                      return;
                    }
                  } else {
                    const newProfile = {
                      id: Date.now(),
                      name: nameTrim,
                      phone: phoneTrim
                    };
                    updated = [...staffProfiles, newProfile];
                    setSelectedProfileId(newProfile.id);
                  }
                  saveStaffProfiles(updated);
                  alert('💾 บันทึกโปรไฟล์เจ้าหน้าที่เรียบร้อย!');
                }}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', margin: 0, cursor: 'pointer', borderColor: '#6366f1', color: '#4f46e5', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center' }}
                title="บันทึกชื่อและเบอร์โทรนี้ลงในรายการโปรไฟล์"
              >
                💾 เก็บ
              </button>
              
              {selectedProfileId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const prof = staffProfiles.find(p => String(p.id) === String(selectedProfileId));
                    if (prof && window.confirm(`คุณต้องการลบโปรไฟล์ของ "${prof.name}" ใช่หรือไม่?`)) {
                      const updated = staffProfiles.filter(p => String(p.id) !== String(selectedProfileId));
                      saveStaffProfiles(updated);
                      setSelectedProfileId('');
                      setStaffName('');
                      setStaffPhone('');
                    }
                  }}
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', margin: 0, cursor: 'pointer', borderColor: '#ef4444', color: '#b91c1c', backgroundColor: '#fee2e2' }}
                  title="ลบโปรไฟล์เจ้าหน้าที่นี้"
                >
                  🗑️
                </button>
              )}
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
            
            <Link to="/worldcup" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#3b82f6', color: '#1d4ed8', backgroundColor: '#eff6ff' }}>
              พิมพ์ชื่อแชมป์ <span role="img" aria-label="globe">🌍</span>
            </Link>
            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={() => navigate('/print-blank-forms', { state: { branchName, branchCode, staffName, staffPhone } })}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: '#f59e0b', color: '#d97706', backgroundColor: '#fffbeb', cursor: 'pointer', margin: 0 }}
              title="พิมพ์ใบกรอกการสั่งพิมพ์ (A4) สำหรับให้ลูกค้าเขียนด้วยมือ"
            >
              <FileText size={16} /> พิมพ์ใบกรอกการสั่งพิมพ์ (A4)
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
            💡 <strong>เคล็ดลับสำหรับสาขา:</strong> ลูกค้าสามารถกรอกข้อมูลล่วงหน้าจากบ้านได้ โดยท่านสามารถส่งลิงก์ระบบของลูกค้าที่มีชื่อสาขาของท่านต่อท้ายโดยอัตโนมัติ เพื่อให้เมื่อลูกค้ากดบันทึก ข้อมูลใบสั่งพิมพ์ จะระบุเป็นรหัสไปรษณีย์ของที่ทำการท่านทันที
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
                <div style={{ display: 'none' }}>
                  <QRCodeCanvas id="branch-qr-canvas-large" value={generatedCustomerUrl} size={512} level="H" includeMargin={false} />
                </div>
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

      {printDataList && printDataList.length > 0 && (
        <div className="print-only">
          {printSettings.paperSize === 'A4' ? (
            (() => {
              const chunks = [];
              for (let i = 0; i < printDataList.length; i += 4) {
                chunks.push(printDataList.slice(i, i + 4));
              }
              return chunks.map((chunk, chunkIdx) => (
                <div 
                  key={chunkIdx} 
                  className="print-a4-page"
                  style={{
                    pageBreakAfter: chunkIdx === chunks.length - 1 ? 'auto' : 'always',
                    breakAfter: chunkIdx === chunks.length - 1 ? 'auto' : 'page',
                  }}
                >
                  {chunk.map((printItem, cellIdx) => (
                    <div 
                      key={cellIdx} 
                      className="print-a4-cell" 
                      style={{ 
                        paddingTop: `${printSettings.top + (printSettings.calY || 0)}cm`,
                        paddingLeft: `${printSettings.left + (printSettings.calX || 0)}cm`,
                        paddingRight: '1cm',
                        fontSize: `${printSettings.fontSize}pt`, 
                        lineHeight: '1.4', 
                        fontFamily: 'Sarabun, Inter, sans-serif'
                      }}
                    >
                      {printItem.did && printSettings.didPrintMode !== 'address' ? (
                        <div>
                          <div style={{ fontWeight: printSettings.isNameBold ? 'bold' : 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, marginBottom: '0.2em' }}>
                            {printItem.name}
                          </div>
                          <div style={{ fontSize: `${printSettings.fontSize}pt`, marginBottom: '0.4em' }}>
                            โทร. <span style={{ fontWeight: printSettings.isPhoneBold ? 'bold' : 'normal' }}>{printItem.phone}</span>
                          </div>
                          {!(printItem.did && printItem.did.trim().length === 6) && (
                            <div style={{ fontSize: `${Math.max(4, printSettings.fontSize - 1)}pt`, color: '#111', lineHeight: '1.3', marginBottom: '0.4em' }}>
                              {printItem.address} {printItem.zipcode}{printSettings.printCountry && ` ${printSettings.countryName}`}
                            </div>
                          )}
                          <div style={{ fontSize: `${printSettings.fontSize * 1.5}pt`, fontWeight: 'bold', letterSpacing: '0.05em', color: '#000', marginTop: '0.4em' }}>
                            {printItem.did}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: printSettings.isNameBold ? 'bold' : 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, marginBottom: '0.2em' }}>
                            {printItem.name}
                          </div>
                          <div style={{ fontSize: `${printSettings.fontSize}pt`, marginBottom: '0.4em' }}>
                            โทร. <span style={{ fontWeight: printSettings.isPhoneBold ? 'bold' : 'normal' }}>{printItem.phone}</span>
                          </div>
                          <div style={{ fontSize: `${printSettings.fontSize}pt`, lineHeight: '1.3' }}>
                            {printItem.address}
                          </div>
                          <div style={{ marginTop: '0.2em', fontWeight: 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, letterSpacing: '0.05em' }}>
                            {printItem.zipcode}{printSettings.printCountry && ` ${printSettings.countryName}`}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {/* Empty cells to complete the 2x2 grid if chunk has < 4 items */}
                  {Array.from({ length: 4 - chunk.length }).map((_, emptyIdx) => (
                    <div key={`empty-${emptyIdx}`} className="print-a4-cell" />
                  ))}
                </div>
              ));
            })()
          ) : (
            printDataList.map((printItem, idx) => (
              <div 
                key={idx} 
                className="print-area" 
                style={{ 
                  fontSize: `${printSettings.fontSize}pt`, 
                  lineHeight: '1.4', 
                  fontFamily: 'Sarabun, Inter, sans-serif',
                  pageBreakAfter: idx === printDataList.length - 1 ? 'auto' : 'always',
                  breakAfter: idx === printDataList.length - 1 ? 'auto' : 'page',
                  paddingTop: `${printSettings.top + (printSettings.calY || 0)}cm`,
                  paddingLeft: `${printSettings.left + (printSettings.calX || 0)}cm`,
                  height: '10.5cm',
                  width: '14.8cm',
                  boxSizing: 'border-box'
                }}
              >
                {printItem.did && printSettings.didPrintMode !== 'address' ? (
                  <div>
                    <div style={{ fontWeight: printSettings.isNameBold ? 'bold' : 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, marginBottom: '0.2em' }}>
                      {printItem.name}
                    </div>
                    <div style={{ fontSize: `${printSettings.fontSize}pt`, marginBottom: '0.4em' }}>
                      โทร. <span style={{ fontWeight: printSettings.isPhoneBold ? 'bold' : 'normal' }}>{printItem.phone}</span>
                    </div>
                    {!(printItem.did && printItem.did.trim().length === 6) && (
                      <div style={{ fontSize: `${Math.max(4, printSettings.fontSize - 1)}pt`, color: '#111', lineHeight: '1.3', marginBottom: '0.4em' }}>
                        {printItem.address} {printItem.zipcode}{printSettings.printCountry && ` ${printSettings.countryName}`}
                      </div>
                    )}
                    <div style={{ fontSize: `${printSettings.fontSize * 1.5}pt`, fontWeight: 'bold', letterSpacing: '0.05em', color: '#000', marginTop: '0.4em' }}>
                      {printItem.did}
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontWeight: printSettings.isNameBold ? 'bold' : 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, marginBottom: '0.2em' }}>
                      {printItem.name}
                    </div>
                    <div style={{ fontSize: `${printSettings.fontSize}pt`, marginBottom: '0.4em' }}>
                      โทร. <span style={{ fontWeight: printSettings.isPhoneBold ? 'bold' : 'normal' }}>{printItem.phone}</span>
                    </div>
                    <div style={{ fontSize: `${printSettings.fontSize}pt`, lineHeight: '1.3' }}>
                      {printItem.address}
                    </div>
                    <div style={{ marginTop: '0.2em', fontWeight: 'normal', fontSize: `${printSettings.fontSize + 0.5}pt`, letterSpacing: '0.05em' }}>
                      {printItem.zipcode}{printSettings.printCountry && ` ${printSettings.countryName}`}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Printable A4 Billing Invoice/Receipt (Rendered only on print layout) */}
      {isPrintingInvoice && selectedIds.length > 0 && (() => {
        const selectedRecords = history.filter(r => selectedIds.includes(r.id));
        const totalQty = selectedRecords.reduce((sum, r) => sum + (parseInt(r.quantity, 10) || 0), 0);
        const totalAmount = totalQty * postcardRate;
        const printDate = new Date().toLocaleDateString('th-TH', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        if (printLayoutType === 'grid') {
          // Add a summary slip if printing multiple items
          const renderRecords = [...selectedRecords];
          if (selectedRecords.length > 1) {
            renderRecords.push({
              id: 'summary_total_slip',
              isSummary: true,
              name: payerName || 'ยอดรวมกลุ่มทั้งหมด',
              quantity: totalQty,
              totalAmount: totalAmount
            });
          }

          return (
            <div className="invoice-print-only" style={{
              fontFamily: 'Sarabun, Inter, sans-serif',
              color: '#000',
              padding: '1.2cm 1cm',
              backgroundColor: '#fff',
              boxSizing: 'border-box',
              width: '21cm',
              minHeight: '29.7cm',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.6cm'
            }}>
              {renderRecords.map((r) => {
                if (r.isSummary) {
                  return (
                    <div key={r.id} style={{
                      border: '2px solid #b91c1c',
                      borderRadius: '8px',
                      padding: '0.5cm',
                      boxSizing: 'border-box',
                      width: '9.2cm',
                      height: '13.0cm',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      pageBreakInside: 'avoid',
                      backgroundColor: '#fff5f5'
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #b91c1c', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                          <h1 style={{ margin: '0', fontSize: '11pt', fontWeight: 'bold', color: '#b91c1c' }}>📊 ใบสรุปยอดรวม (สำหรับเก็บเงิน)</h1>
                          <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#7f1d1d' }}>{branchName}</span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '0.3rem', color: '#7f1d1d' }}>
                          {payerName && payerName !== 'ยอดรวมกลุ่ม' && payerName !== 'ยอดรวมกลุ่มทั้งหมด' ? (
                            <div><strong>ผู้ประสานงาน:</strong> {payerName}</div>
                          ) : <div />}
                          <div><strong>พิมพ์:</strong> {printDate}</div>
                        </div>

                        {/* Summary Items List Table */}
                        <div style={{ border: '1px solid #fca5a5', borderRadius: '4px', overflow: 'hidden', marginTop: '0.3cm', backgroundColor: '#fff' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#fee2e2', borderBottom: '1.5px solid #fca5a5' }}>
                                <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold', color: '#7f1d1d', borderRight: '1px solid #fca5a5' }}>ชื่อผู้รับ</th>
                                <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', color: '#7f1d1d', width: '30%' }}>จำนวน</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRecords.map((sr) => (
                                <tr key={sr.id} style={{ borderBottom: '1px solid #fee2e2' }}>
                                  <td style={{ padding: '4px 6px', fontWeight: 'bold', color: '#7f1d1d', borderRight: '1px solid #fca5a5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '5.2cm' }}>{sr.name}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'right', color: '#7f1d1d' }}>{sr.quantity || 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', borderTop: '2px solid #b91c1c', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#7f1d1d' }}>
                            รวม: {selectedRecords.length} รายชื่อ | ทั้งหมด: {r.quantity.toLocaleString()} ใบ
                          </span>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '20pt', fontWeight: 'bold', color: '#b91c1c' }}>
                              {r.totalAmount.toLocaleString()}.-
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const itemAmount = (parseInt(r.quantity, 10) || 0) * postcardRate;
                return (
                  <div key={r.id} style={{
                    border: '1.5px dashed #000',
                    borderRadius: '8px',
                    padding: '0.5cm',
                    boxSizing: 'border-box',
                    width: '9.2cm',
                    height: '13.0cm',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    pageBreakInside: 'avoid',
                    backgroundColor: '#fff'
                  }}>
                    {/* Header */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                        <h1 style={{ margin: '0', fontSize: '11pt', fontWeight: 'bold' }}>ใบกำกับ งานสั่งพิมพ์ ไปรษณียบัตรฯ</h1>
                        <span style={{ fontSize: '8pt', fontWeight: 'bold', color: '#475569' }}>{branchName}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt', marginBottom: '0.5rem' }}>
                        {payerName && payerName !== 'ยอดรวมกลุ่ม' ? (
                          <div><strong>ผู้ประสานงาน:</strong> {payerName}</div>
                        ) : <div />}
                        <div><strong>วันที่พิมพ์:</strong> {printDate}</div>
                      </div>

                      {/* Item Info */}
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.4cm', backgroundColor: '#f8fafc', marginTop: '0.5cm' }}>
                        <div style={{ fontSize: '12pt', marginBottom: '0.5rem' }}>
                          <strong>ชื่อผู้รับ:</strong> <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{r.name}</span>
                        </div>
                        <div style={{ fontSize: '12pt' }}>
                          <strong>จำนวน:</strong> <span style={{ fontWeight: 'bold' }}>{r.quantity || 0} ใบ</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #000', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                      <div style={{ fontSize: '9.5pt', lineHeight: '1.2', color: '#475569' }}>
                        อัตรา {postcardRate} บาท/ใบ
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '11pt', fontWeight: 'bold', color: '#475569' }}>ราคารวม:</span>
                        <span style={{ fontSize: '22pt', fontWeight: 'bold', color: '#b91c1c' }}>
                          {itemAmount.toLocaleString()}.-
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        // Default 'combined' layout (now styled to fit perfectly on 4-grid A4 layout as well)
        return (
          <div className="invoice-print-only" style={{
            fontFamily: 'Sarabun, Inter, sans-serif',
            color: '#000',
            padding: '1.2cm 1cm',
            backgroundColor: '#fff',
            boxSizing: 'border-box',
            width: '21cm',
            minHeight: '29.7cm',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.6cm'
          }}>
            <div style={{
              border: '1.5px dashed #000',
              borderRadius: '8px',
              padding: '0.5cm',
              boxSizing: 'border-box',
              width: '9.2cm',
              height: '13.0cm',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              pageBreakInside: 'avoid',
              backgroundColor: '#fff'
            }}>
              {/* Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                  <h1 style={{ margin: '0', fontSize: '11pt', fontWeight: 'bold' }}>ใบกำกับ งานสั่งพิมพ์ ไปรษณียบัตรฯ</h1>
                  <span style={{ fontSize: '8pt', fontWeight: 'bold', color: '#475569' }}>{branchName}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt', marginBottom: '0.5rem' }}>
                  {payerName && payerName !== 'ยอดรวมกลุ่ม' ? (
                    <div><strong>ผู้ประสานงาน:</strong> {payerName}</div>
                  ) : <div />}
                  <div><strong>วันที่พิมพ์:</strong> {printDate}</div>
                </div>

                {/* Items List Table */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', marginTop: '0.3cm' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                        <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold', borderRight: '1px solid #cbd5e1' }}>ชื่อผู้รับ</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', width: '30%' }}>จำนวน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecords.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '4px 6px', fontWeight: 'bold', borderRight: '1px solid #cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '5.5cm' }}>{r.name}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right' }}>{r.quantity || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #000', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                <div style={{ fontSize: '8.5pt', color: '#475569' }}>
                  รวม: {selectedIds.length} รายชื่อ | ทั้งหมด: {totalQty.toLocaleString()} ใบ
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '10pt', fontWeight: 'bold', color: '#475569' }}>ราคารวม:</span>
                  <span style={{ fontSize: '20pt', fontWeight: 'bold', color: '#b91c1c' }}>
                    {totalAmount.toLocaleString()}.-
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Overriding style for postcard billing printing */}
      {isPrintingInvoice && (
        <style>
          {`
            @media print {
              @page {
                size: A4 portrait !important;
                margin: 1.5cm 1.2cm !important;
              }
              .staff-no-print {
                display: none !important;
              }
              .print-only {
                display: none !important;
              }
              .invoice-print-only {
                display: ${printLayoutType === 'grid' ? 'grid' : 'block'} !important;
              }
            }
          `}
        </style>
      )}

      {isPrintingQueue && selectedQueueIds.length > 0 && (() => {
        const queuedInvoices = invoiceQueue.filter(inv => selectedQueueIds.includes(inv.id));
        
        // Flatten slips from all selected queued invoices
        const allSlips = [];
        
        queuedInvoices.forEach(inv => {
          const formattedDate = new Date(inv.timestamp).toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          const isMulti = inv.records.length > 1;
          
          // Render a slip for each recipient in the invoice
          inv.records.forEach(r => {
            const itemAmount = (parseInt(r.quantity, 10) || 0) * inv.postcardRate;
            allSlips.push({
              id: `${inv.id}-${r.id}`,
              isSummary: false,
              branchName: inv.branchName,
              payerName: inv.payerName,
              printDate: formattedDate,
              recipient: r,
              itemAmount: itemAmount,
              postcardRate: inv.postcardRate,
              isMulti: isMulti
            });
          });
          
          // Add a summary slip if there are multiple items
          if (isMulti) {
            allSlips.push({
              id: `${inv.id}-summary`,
              isSummary: true,
              branchName: inv.branchName,
              payerName: inv.payerName,
              printDate: formattedDate,
              records: inv.records,
              totalQty: inv.totalQty,
              totalAmount: inv.totalAmount
            });
          }
        });

        // Split allSlips into pages of up to 4 slips each
        const pages = [];
        for (let i = 0; i < allSlips.length; i += 4) {
          pages.push(allSlips.slice(i, i + 4));
        }

        return (
          <div className="invoice-print-only" style={{ display: 'block' }}>
            {pages.map((pageSlips, pageIdx) => (
              <div 
                key={pageIdx} 
                style={{
                  fontFamily: 'Sarabun, Inter, sans-serif',
                  color: '#000',
                  padding: '1.2cm 1cm',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                  width: '21cm',
                  height: '29.7cm',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: '1fr 1fr',
                  gap: '0.6cm',
                  pageBreakAfter: pageIdx === pages.length - 1 ? 'auto' : 'always',
                  breakAfter: pageIdx === pages.length - 1 ? 'auto' : 'page',
                }}
              >
                {pageSlips.map((slip) => {
                  if (slip.isSummary) {
                    return (
                      <div key={slip.id} style={{
                        border: '2px solid #b91c1c',
                        borderRadius: '8px',
                        padding: '0.5cm',
                        boxSizing: 'border-box',
                        width: '9.2cm',
                        height: '13.0cm',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        pageBreakInside: 'avoid',
                        backgroundColor: '#fff'
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #b91c1c', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                            <h1 style={{ margin: '0', fontSize: '11pt', fontWeight: 'bold', color: '#b91c1c' }}>📊 ใบสรุปยอดรวม (สำหรับเก็บเงิน)</h1>
                            <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#7f1d1d' }}>{slip.branchName}</span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '0.3rem', color: '#7f1d1d' }}>
                            {slip.payerName && slip.payerName !== 'ยอดรวมกลุ่ม' && slip.payerName !== 'ยอดรวมกลุ่มทั้งหมด' ? (
                              <div><strong>ผู้ประสานงาน:</strong> {slip.payerName}</div>
                            ) : <div />}
                            <div><strong>พิมพ์:</strong> {slip.printDate}</div>
                          </div>

                          {/* Summary Items List Table */}
                          <div style={{ border: '1px solid #fca5a5', borderRadius: '4px', overflow: 'hidden', marginTop: '0.3cm', backgroundColor: '#fff' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#fee2e2', borderBottom: '1.5px solid #fca5a5' }}>
                                  <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 'bold', color: '#7f1d1d', borderRight: '1px solid #fca5a5' }}>ชื่อผู้รับ</th>
                                  <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', color: '#7f1d1d', width: '30%' }}>จำนวน</th>
                                </tr>
                              </thead>
                              <tbody>
                                {slip.records.map((sr) => (
                                  <tr key={sr.id} style={{ borderBottom: '1px solid #fee2e2' }}>
                                    <td style={{ padding: '4px 6px', fontWeight: 'bold', color: '#7f1d1d', borderRight: '1px solid #fca5a5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '5.2cm' }}>{sr.name}</td>
                                    <td style={{ padding: '4px 6px', textAlign: 'right', color: '#7f1d1d' }}>{sr.quantity || 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '2px solid #b91c1c', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '8.5pt', fontWeight: 'bold', color: '#7f1d1d' }}>
                              รวม: {slip.records.length} รายชื่อ | ทั้งหมด: {slip.totalQty.toLocaleString()} ใบ
                            </span>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '20pt', fontWeight: 'bold', color: '#b91c1c' }}>
                                {slip.totalAmount.toLocaleString()}.-
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Recipient Slip
                  const r = slip.recipient;
                  return (
                    <div key={slip.id} style={{
                      border: '1.5px dashed #000',
                      borderRadius: '8px',
                      padding: '0.5cm',
                      boxSizing: 'border-box',
                      width: '9.2cm',
                      height: '13.0cm',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      pageBreakInside: 'avoid',
                      backgroundColor: '#fff'
                    }}>
                      {/* Header */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '0.2rem', marginBottom: '0.4rem' }}>
                          <h1 style={{ margin: '0', fontSize: '11pt', fontWeight: 'bold' }}>ใบกำกับ งานสั่งพิมพ์ ไปรษณียบัตรฯ</h1>
                          <span style={{ fontSize: '8pt', fontWeight: 'bold', color: '#475569' }}>{slip.branchName}</span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5pt', marginBottom: '0.5rem' }}>
                          {slip.payerName && slip.payerName !== 'ยอดรวมกลุ่ม' ? (
                            <div><strong>ผู้ประสานงาน:</strong> {slip.payerName}</div>
                          ) : <div />}
                          <div><strong>วันที่พิมพ์:</strong> {slip.printDate}</div>
                        </div>

                        {/* Item Info */}
                        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.4cm', backgroundColor: '#f8fafc', marginTop: '0.5cm' }}>
                          <div style={{ fontSize: '12pt', marginBottom: '0.5rem' }}>
                            <strong>ชื่อผู้รับ:</strong> <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>{r.name}</span>
                          </div>
                          <div style={{ fontSize: '12pt' }}>
                            <strong>จำนวน:</strong> <span style={{ fontWeight: 'bold' }}>{r.quantity || 0} ใบ</span>
                          </div>
                        </div>
                      </div>

                      {/* Total Section */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #000', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                        <div style={{ fontSize: '9.5pt', lineHeight: '1.2', color: '#475569' }}>
                          อัตรา {slip.postcardRate} บาท/ใบ
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '11pt', fontWeight: 'bold', color: '#475569' }}>ราคารวม:</span>
                          <span style={{ fontSize: '22pt', fontWeight: 'bold', color: '#b91c1c' }}>
                            {slip.itemAmount.toLocaleString()}.-
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })()}

      {isPrintingQueue && (
        <style>
          {`
            @media print {
              @page {
                size: A4 portrait !important;
                margin: 0 !important;
              }
              .staff-no-print {
                display: none !important;
              }
              .print-only {
                display: none !important;
              }
              .invoice-print-only {
                display: block !important;
              }
            }
          `}
        </style>
      )}



      {showQuickQrModal && (
        <div className="quick-qr-modal-overlay" onClick={() => setShowQuickQrModal(false)}>
          <div className="quick-qr-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 'bold' }}>
              📲 สแกน QR เพื่อกรอกข้อมูล
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              สาขา: <strong style={{ color: 'var(--primary)' }}>{branchName} {branchCode}</strong>
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
              ให้ลูกค้าใช้โทรศัพท์มือถือสแกน QR Code นี้ เพื่อใช้ระบบช่วยรับข้อมูล เพื่อสั่งพิมพ์ไปรษณียบัตร ผ่านพี่ไปร
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
      {selectedDetailRecord && (
        <div className="quick-qr-modal-overlay" onClick={() => setSelectedDetailRecord(null)}>
          <div className="quick-qr-modal-content" style={{ maxWidth: '600px', textAlign: 'left', padding: '2rem' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', fontSize: '1.3rem', fontWeight: 'bold', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔍 รายละเอียดข้อมูลลูกค้าสั่งพิมพ์
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>รหัสสั่งพิมพ์</span>
                <strong style={{ fontSize: '1.05rem', color: '#1d4ed8' }}>{selectedDetailRecord.orderCode || selectedDetailRecord.oc || '-'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>ผู้สั่ง (ชื่อเล่น)</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{selectedDetailRecord.senderNickname || selectedDetailRecord.sn || '-'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>เบอร์โทรผู้สั่ง</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{selectedDetailRecord.senderPhone || selectedDetailRecord.sp || '-'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>ชื่อ-นามสกุลผู้รับ</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{selectedDetailRecord.name}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>เบอร์โทรศัพท์ผู้รับ</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{selectedDetailRecord.phone || '-'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>จำนวนสั่งพิมพ์</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{selectedDetailRecord.quantity} ใบ ({selectedDetailRecord.quantity * 3} บาท)</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>วันที่สั่งจอง</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{selectedDetailRecord.orderDate}</strong>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>ข้อมูลที่อยู่จัดส่ง</strong>
              {selectedDetailRecord.did ? (
                <div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#003399', fontWeight: 'bold' }}>D-ID (ไปรษณีย์ไทย):</span> <strong style={{ fontSize: '1.1rem', color: '#e11d48' }}>{selectedDetailRecord.did}</strong>
                  </div>
                  {selectedDetailRecord.address && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      ที่อยู่สำรอง: {selectedDetailRecord.address} {selectedDetailRecord.zipcode}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
                  {selectedDetailRecord.addressLine1 || selectedDetailRecord.address || '-'}<br />
                  {selectedDetailRecord.subdistrict && `ต./แขวง: ${selectedDetailRecord.subdistrict} `}
                  {selectedDetailRecord.district && `อ./เขต: ${selectedDetailRecord.district} `}
                  {selectedDetailRecord.province && `จ.: ${selectedDetailRecord.province} `}
                  {selectedDetailRecord.zipcode && `รหัสไปรษณีย์: ${selectedDetailRecord.zipcode}`}
                </div>
              )}
            </div>

            {selectedDetailRecord.subBookings && selectedDetailRecord.subBookings.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.5rem' }}>
                  👥 รายชื่อย่อย ({selectedDetailRecord.subBookings.length} รายการ)
                </strong>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.4rem 0.5rem' }}>ชื่อ</th>
                        <th style={{ padding: '0.4rem 0.5rem' }}>เบอร์โทร</th>
                        <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>จำนวน</th>
                        <th style={{ padding: '0.4rem 0.5rem' }}>ที่อยู่</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetailRecord.subBookings.map((sub, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{sub.n || sub.name}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{sub.p || sub.phone || '-'}</td>
                          <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>{sub.q || sub.quantity} ใบ</td>
                          <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-muted)' }}>
                            {sub.m === 1 || sub.useMainAddress ? 'ใช้ที่อยู่เดียวกับหลัก' : (sub.a || sub.address || '-')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button 
                onClick={() => {
                  handlePrintHistory(selectedDetailRecord);
                  setSelectedDetailRecord(null);
                }}
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              >
                <Printer size={16} /> พิมพ์ข้อมูลนี้
              </button>
              <button 
                onClick={() => {
                  populateFromScan(selectedDetailRecord);
                  setSelectedDetailRecord(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn"
                style={{ flex: 1, padding: '0.6rem 1rem', fontSize: '0.9rem', borderColor: '#3b82f6', color: '#1d4ed8', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', cursor: 'pointer' }}
              >
                ✏️ แก้ไขข้อมูล
              </button>
              <button 
                onClick={() => setSelectedDetailRecord(null)}
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {scanResultModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100,
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          <div className="card glass-panel" style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '1.75rem',
            boxSizing: 'border-box',
            textAlign: 'center',
            position: 'relative',
            animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: scanResultModal.isDup ? '#fffbeb' : '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              border: scanResultModal.isDup ? '2px solid #fef3c7' : '2px solid #dcfce7'
            }}>
              {scanResultModal.isDup ? (
                <span style={{ fontSize: '2rem' }}>⚠️</span>
              ) : (
                <span style={{ fontSize: '2.5rem', color: '#22c55e' }}>✓</span>
              )}
            </div>

            <h3 style={{ 
              margin: '0 0 1rem 0', 
              color: scanResultModal.isDup ? '#d97706' : '#16a34a', 
              fontSize: '1.3rem', 
              fontWeight: 700 
            }}>
              {scanResultModal.isDup ? 'ข้อมูลนี้มีในระบบแล้ว' : 'รับข้อมูลสั่งพิมพ์สำเร็จ'}
            </h3>

            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'left',
              fontSize: '0.925rem',
              color: '#334155',
              border: '1px solid #e2e8f0',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#64748b' }}>ชื่อ-สกุล:</span>
                <strong style={{ color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }}>{scanResultModal.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#64748b' }}>จำนวนที่สั่ง:</span>
                <strong style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>{scanResultModal.quantity} ใบ</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: '#64748b' }}>รหัสสั่งพิมพ์:</span>
                <strong style={{ color: '#1e40af', fontFamily: 'monospace' }}>{scanResultModal.orderCode}</strong>
              </div>
              
              {scanResultModal.isDup && (
                <div style={{
                  marginTop: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px dashed #cbd5e1',
                  color: '#b45309',
                  fontSize: '0.825rem',
                  lineHeight: '1.4'
                }}>
                  ℹ️ นำเข้าระบบแล้วเมื่อวันที่:<br/>
                  <strong>📅 {scanResultModal.dupDate}</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {scanResultModal.targetId && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const tid = scanResultModal.targetId;
                    setScanResultModal(null);
                    setHistoryFilter('all');
                    setTimeout(() => {
                      const row = document.getElementById(`record-row-${tid}`);
                      if (row) {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const foreground = row.children[1] || row;
                        const prevShadow = foreground.style.boxShadow;
                        const prevBorder = foreground.style.borderColor;
                        foreground.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.8)';
                        foreground.style.borderColor = '#3b82f6';
                        foreground.style.transition = 'all 0.3s ease';
                        setTimeout(() => {
                          foreground.style.boxShadow = prevShadow;
                          foreground.style.borderColor = prevBorder;
                        }, 2500);
                      }
                    }, 350);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    backgroundColor: scanResultModal.isDup ? '#3b82f6' : '#10b981',
                    border: 'none',
                    color: '#fff'
                  }}
                >
                  🔍 ไปที่รายการสั่งพิมพ์นี้
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setScanResultModal(null)}
                style={{ width: '100%', padding: '0.65rem', fontWeight: 600 }}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Printable A4 Billing Invoice/Receipt (Rendered only on print layout) */}
      {false /* Duplicate block removed */}

      {/* Printable A4 Customer Campaign Guide Sheet */}
      {isPrintingGuide && (
        <div className="guide-print-only" style={{
          fontFamily: 'Sarabun, Inter, sans-serif',
          color: '#000',
          padding: '1.1cm 1.4cm',
          backgroundColor: '#fff',
          boxSizing: 'border-box',
          width: '21cm',
          minHeight: '29.7cm',
          lineHeight: '1.45'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '3px double #000', paddingBottom: '0.75rem' }}>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <h1 style={{ margin: '0 0 0.3rem 0', fontSize: '20pt', fontWeight: 'bold', color: '#b91c1c' }}>คำแนะนำการร่วมลุ้นโชคส่งไปรษณียบัตร</h1>
              <h2 style={{ margin: '0 0 0.3rem 0', fontSize: '12.5pt', fontWeight: 'bold', color: '#1e3a8a' }}>ทายผลแชมป์ฟุตบอลระดับโลก 2026: "เชียร์บอลให้มัน เฮลั่นรับโชค"</h2>
              <p style={{ margin: '0', fontSize: '10pt', color: '#475569' }}>
                บริการพิเศษสั่งพิมพ์ชื่อ-ที่อยู่ผู้ส่ง สะดวก พร้อมลุ้นโชค โดย {branchName}
              </p>
            </div>
            <div style={{ textAlign: 'center', marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <QRCodeCanvas value="https://www.thairath.co.th/sport/worldcup2026/thai-post-campaign-2026" size={80} level="H" includeMargin={true} />
              <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#475569', marginTop: '0.2rem' }}>สแกนอ่านกติกาเพิ่มเติม</span>
            </div>
          </div>

          {/* Section 1: วิธีการส่ง */}
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem', color: '#1e3a8a', margin: '0 0 0.4rem 0' }}>
              📝 ขั้นตอนการร่วมลุ้นโชค ง่ายๆ แค่
            </h3>
            <p style={{ margin: '0', fontSize: '10.5pt', lineHeight: '1.5' }}>
              <strong>เขียนชื่อประเทศ:</strong> ในช่องว่างทายผล <strong>"แชมป์คือ..."</strong> บนไปรษณียบัตร ให้เขียน<strong>ชื่อประเทศที่คุณทายว่าจะได้เป็นแชมป์เพียง 1 ประเทศเท่านั้น</strong>
            </p>
          </div>

          {/* Section 2: วันหมดเขต */}
          <div style={{ marginBottom: '1rem', border: '1.5px solid #b91c1c', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: '#fff5f5' }}>
            <h3 style={{ fontSize: '11.5pt', fontWeight: 'bold', margin: '0 0 0.3rem 0', color: '#b91c1c' }}>
              📮 ส่งชิงโชคได้ทันที (ไม่ต้องติดแสตมป์เพิ่ม)
            </h3>
            <p style={{ margin: '0 0 0.2rem 0', fontSize: '9.5pt', color: '#451a03', lineHeight: '1.4' }}>
              นำไปรษณียบัตรไปหยอดที่ตู้ไปรษณีย์ หรือฝากส่ง ณ ที่ทำการไปรษณีย์ทุกสาขาทั่วประเทศ
            </p>
            <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
              <p style={{ margin: '0', fontSize: '10.5pt', fontWeight: 'bold', color: '#1e3a8a' }}>
                🏆 ส่งลุ้นโชคใหญ่รอบแชมป์โลก ได้ถึง 19 กรกฎาคม 2569
              </p>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '9.5pt', color: '#1e3a8a', lineHeight: '1.4' }}>
                ภายในเวลา 18:00 น. (ยึดตามวันตราประทับประจำวันของไปรษณีย์)
              </p>
            </div>
          </div>

          {/* Section 3: รายละเอียดเงินรางวัล */}
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem', color: '#1e3a8a', margin: '0 0 0.4rem 0' }}>
              🎁 รายละเอียดของรางวัล (สำหรับทายผลแชมป์โลก ส่งภายใน 19 ก.ค. 69)
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 'bold' }}>ประเภทของรางวัล</th>
                  <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', width: '22%' }}>มูลค่าต่อรางวัล</th>
                  <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 'bold', width: '15%' }}>จำนวนรางวัล</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '4px 8px', fontWeight: 'bold', color: '#b91c1c' }}>🏆 รางวัลที่ 1 ทองคำแท่ง</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', color: '#b91c1c' }}>7,000,000 บาท</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 'bold', color: '#b91c1c' }}>1 รางวัล</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '4px 8px' }}>🚗 รางวัลที่ 2 รถกระบะ Toyota Hilux Travo</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>949,000 บาท</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>1 รางวัล</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '4px 8px' }}>🚗 รางวัลที่ 3 รถยนต์ Toyota Yaris ATIV</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>696,000 บาท</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>1 รางวัล</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '4px 8px' }}>🏍️ รางวัลที่ 4 รถจักรยานยนต์ Honda PCX</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>99,510 บาท</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>5 รางวัล</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '4px 8px' }}>📱 รางวัลที่ 5 สมาร์ตโฟน Samsung A17</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>8,999 บาท</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>50 รางวัล</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '4px 8px' }}>💳 รางวัลที่ 6 บัตรกำนัลช้อปปิ้ง Gift Card</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right' }}>5,000 บาท</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center' }}>100 รางวัล</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 4: การติดตามผล */}
          <div style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '11pt', fontWeight: 'bold', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem', color: '#1e3a8a', margin: '0 0 0.4rem 0' }}>
              📢 ช่องทางการติดตามผลประกาศรายชื่อผู้โชคดี
            </h3>
            <p style={{ margin: '0 0 0.4rem 0', fontSize: '9.5pt' }}>
              ท่านสามารถติดตามข้อมูลข่าวสารการจับรางวัลและรายชื่อผู้โชคดีอย่างเป็นทางการได้ทางช่องทางต่อไปนี้:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
              <div style={{ border: '1px solid #e2e8f0', padding: '0.35rem', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '12pt' }}>📰</div>
                <strong style={{ fontSize: '8.5pt', display: 'block', marginTop: '0.1rem' }}>หนังสือพิมพ์ไทยรัฐ</strong>
              </div>
              <div style={{ border: '1px solid #e2e8f0', padding: '0.35rem', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '12pt' }}>🌐</div>
                <strong style={{ fontSize: '8.5pt', display: 'block', marginTop: '0.1rem' }}>ไทยรัฐออนไลน์</strong>
              </div>
              <div style={{ border: '1px solid #e2e8f0', padding: '0.35rem', borderRadius: '6px', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '12pt' }}>📺</div>
                <strong style={{ fontSize: '8.5pt', display: 'block', marginTop: '0.1rem' }}>ไทยรัฐทีวี ช่อง 32</strong>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div style={{ textAlign: 'center', fontSize: '8.5pt', color: '#64748b', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
            ขอขอบพระคุณ ที่ซื้อไปรษณียบัตร ของไปรษณีย์ไทย<br/>
            ขอให้ทุกท่านโชคดีและสนุกไปกับการเชียร์ฟุตบอลระดับโลก 2026!
          </div>
        </div>
      )}

      {/* Overriding style for A4 guide printing */}
      {isPrintingGuide && (
        <style>
          {`
            @media print {
              @page {
                size: A4 portrait !important;
                margin: 0.8cm 1.0cm !important;
              }
              .staff-no-print {
                display: none !important;
              }
              .print-only {
                display: none !important;
              }
              .invoice-print-only {
                display: none !important;
              }
              .guide-print-only {
                display: block !important;
              }
            }
          `}
        </style>
      )}

      {cardRecord && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -10 }}>
          <div 
            id="hidden-capture-card" 
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              padding: '1.25rem', 
              width: '360px', 
              boxSizing: 'border-box',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              color: '#0f172a'
            }}
          >
            <div style={{ textAlign: 'center', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.15rem', fontWeight: 'bold' }}>
                PostcardApp จองพิมพ์ผ่านพี่ไปร
              </h3>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                * สำหรับนำยื่นให้เจ้าหน้าที่สแกนสั่งพิมพ์
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', padding: '1rem', borderRadius: '12px', border: '2px solid var(--primary)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                QR สำหรับสั่งพิมพ์
              </div>
              <QRCodeCanvas 
                value={JSON.stringify({
                  oc: cardRecord.orderCode || cardRecord.oc || '',
                  sn: cardRecord.senderNickname || cardRecord.sn || '',
                  sp: cardRecord.senderPhone || cardRecord.sp || '',
                  d: cardRecord.orderDate || '',
                  q: cardRecord.quantity || 100,
                  n: cardRecord.name || '',
                  p: cardRecord.phone || '',
                  a: cardRecord.addressLine1 || cardRecord.address || '',
                  sd: cardRecord.subdistrict || '',
                  dt: cardRecord.district || '',
                  pv: cardRecord.province || '',
                  zp: cardRecord.zipcode || '',
                  id: cardRecord.did || '',
                  idx: 1,
                  tot: 1,
                  s: cardRecord.subBookings ? cardRecord.subBookings.map(sub => ({
                    n: sub.name,
                    p: sub.phone,
                    q: sub.quantity,
                    m: sub.useMainAddress ? 1 : 0,
                    a: sub.address
                  })) : []
                })} 
                size={220} 
                level="L" 
              />
            </div>

            <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '0.85rem', border: '1px solid #e2e8f0', fontSize: '0.85rem', lineHeight: '1.5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.3rem', marginBottom: '0.3rem' }}>
                <span style={{ color: '#64748b' }}>รหัสสั่งพิมพ์:</span>
                <strong style={{ color: '#1e40af', fontFamily: 'monospace' }}>{cardRecord.orderCode || cardRecord.oc || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>ชื่อผู้รับ:</span>
                <strong>{cardRecord.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>เบอร์โทร:</span>
                <strong>{cardRecord.phone || '-'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>จำนวน:</span>
                <strong style={{ color: 'var(--primary)' }}>{cardRecord.quantity} ใบ</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>วันที่สั่งจอง:</span>
                <strong>{cardRecord.orderDate || ''}</strong>
              </div>
              {cardRecord.did ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', marginTop: '0.3rem', paddingTop: '0.3rem' }}>
                  <span style={{ color: '#64748b' }}>D-ID:</span>
                  <strong style={{ color: '#dc2626' }}>{cardRecord.did}</strong>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', marginTop: '0.3rem', paddingTop: '0.3rem' }}>
                  <span style={{ color: '#64748b' }}>ที่อยู่:</span>
                  <strong style={{ textAlign: 'right', fontSize: '0.8rem', wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '200px' }}>
                    {cardRecord.addressLine1 || cardRecord.address || ''} {cardRecord.zipcode}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
