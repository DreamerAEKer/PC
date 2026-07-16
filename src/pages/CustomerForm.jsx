import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, CheckCircle, Clock, Share2 } from 'lucide-react';
import { DEFAULT_FINALIST_SETTINGS, getFinalistCountries, getFinalistSettingsDocId, normalizeFinalistSettings, validateFinalPrediction } from '../utils/finalPrediction';
import { hasPhoneValue } from '../utils/contact';
import generatePayload from 'promptpay-qr';
import ThaiAddressFields from '../components/ThaiAddressFields';
import SubAddressFields from '../components/SubAddressFields';
import DidBoxInput from '../components/DidBoxInput';
import ThaiDatePicker, { formatThaiDate } from '../components/ThaiDatePicker';
import OrderSummaryCard from '../components/OrderSummaryCard';
import { useThaiAddress } from 'use-thai-address';
import { db } from '../firebase';
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const checkPhoneStatus = (val) => {
  if (!val || typeof val !== 'string' || val.trim() === '') return 'empty';
  const digits = val.replace(/\D/g, '');
  if (digits.length >= 9 && digits.length <= 10 && digits.startsWith('0')) return 'valid';
  if (digits.length === 11 && digits.startsWith('66')) return 'valid';
  return 'invalid';
};

export default function CustomerForm() {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, dirtyFields, touchedFields } } = useForm({ 
    mode: 'onChange',
    defaultValues: {
      customQuantity: "100",
      predictionSpain: "",
      predictionArgentina: "",
      orderDate: new Date().toISOString().split('T')[0],
      senderNickname: localStorage.getItem('customerSenderNickname') || '',
      senderPhone: localStorage.getItem('customerSenderPhone') || ''
    }
  });

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [finalistSettings, setFinalistSettings] = useState(DEFAULT_FINALIST_SETTINGS);
  const [rulesActiveTab, setRulesActiveTab] = useState(0);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideActiveTab, setGuideActiveTab] = useState(0);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [subBookings, setSubBookings] = useState([]);
  const [subPhoneErrors, setSubPhoneErrors] = useState({});
  const longPressTimerRef = useRef(null);
  const advancedSectionRef = useRef(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3000);
  };

  const startLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setIsAdvancedMode(prev => {
        const next = !prev;
        showToast(next
          ? '👥 เปิดโหมดรายชื่อย่อยแล้ว กด "เพิ่มรายชื่อย่อย" ด้านล่างได้เลย'
          : '🔒 ปิดโหมดรายชื่อย่อยแล้ว'
        );
        return next;
      });
    }, 3000);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const customQty = watch("customQuantity", "100");
  const quantity = parseInt(customQty, 10) || 0;
  const totalPrice = quantity * 3;

  const subSum = subBookings.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
  const mainQty = Math.max(0, quantity - subSum);

  const setQuantityFields = (qtyVal) => {
    setValue("customQuantity", String(qtyVal || 100), { shouldValidate: true, shouldDirty: true });
  };

  const validateSubPhone = (id, value) => {
    const status = checkPhoneStatus(value);
    setSubPhoneErrors(prev => ({ 
      ...prev, 
      [id]: status === 'invalid' ? '⚠️ อาจเป็นเบอร์โทรที่ไม่สมบูรณ์ (ปกติจะมี 9-10 หลัก)' : null 
    }));
  };

  const didValue = watch("did", "");
  const isDidActive = (didValue || "").trim().length === 6;
  const [showDidInput, setShowDidInput] = useState(false);

  useEffect(() => {
    if (didValue && didValue.trim().length > 0) {
      setShowDidInput(true);
    }
  }, [didValue]);

  const getFieldClass = (fieldName) => {
    if (errors[fieldName]) return 'input-error';
    if (dirtyFields[fieldName] || touchedFields[fieldName]) return 'input-success';
    return '';
  };
  const getBranchFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const branchParam = params.get('branch') || params.get('b');
      if (branchParam) {
        return decodeURIComponent(branchParam).trim();
      }
    } catch (e) {
      console.error(e);
    }
    return "ไปรษณีย์กลาง 10501";
  };

  const { filteredData, searchByField } = useThaiAddress();
  const [resolvedBranchDisplay, setResolvedBranchDisplay] = useState('ไปรษณีย์กลาง 10501');

  useEffect(() => {
    const branchMatch = getBranchFromUrl().match(/\d{5}/);
    const settingsDoc = doc(db, 'publicSettings', getFinalistSettingsDocId(branchMatch?.[0] || '10501'));
    return onSnapshot(settingsDoc, (snapshot) => {
      setFinalistSettings(normalizeFinalistSettings(snapshot.exists() ? snapshot.data() : {}));
    }, () => setFinalistSettings(DEFAULT_FINALIST_SETTINGS));
  }, []);

  useEffect(() => {
    const branchParam = getBranchFromUrl();
    if (branchParam) {
      if (/^\d{5}$/.test(branchParam)) {
        searchByField('zipCode', branchParam);
      } else {
        setResolvedBranchDisplay(branchParam);
      }
    }
  }, []);

  useEffect(() => {
    const branchParam = getBranchFromUrl();
    if (branchParam && /^\d{5}$/.test(branchParam) && filteredData && filteredData.length > 0) {
      const item = filteredData[0];
      if (item && item.district) {
        let name = `ไปรษณีย์${item.district}`;
        if (branchParam === '10501') {
          name = 'ไปรษณีย์กลาง';
        }
        setResolvedBranchDisplay(`${name} ${branchParam}`);
      } else {
        setResolvedBranchDisplay(branchParam);
      }
    }
  }, [filteredData]);

  const [generatedData, setGeneratedData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const cardRef = useRef(null);
  const captureRef = useRef(null); // ref เฉพาะส่วน QR + ข้อมูล (ไม่รวมปุ่ม)

  // States for history selection & delete holding
  const [selectedIds, setSelectedIds] = useState([]);
  const [longPressRecord, setLongPressRecord] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const pressTimerRef = useRef(null);

  // States for sequential bulk QR display
  const [bulkRecords, setBulkRecords] = useState([]);
  const [bulkIndex, setBulkIndex] = useState(0);

  useEffect(() => {
    // Load history from local storage
    const saved = localStorage.getItem('customerHistory');
    if (saved) {
      setHistory(JSON.parse(saved));
    }

    const savedForm = localStorage.getItem('customerFormData');
    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        Object.keys(data).forEach(key => {
          if (key === 'customQuantity' && (!data[key] || String(data[key]).trim() === '')) {
            setValue(key, "100");
          } else {
            setValue(key, data[key]);
          }
        });
        if (!data.hasOwnProperty('customQuantity') || !data.customQuantity || String(data.customQuantity).trim() === '') {
          setValue("customQuantity", "100");
        }
      } catch (e) {}
    } else {
      setQuantityFields(100);
    }
    // Always enforce today's date on initial load/refresh
    setValue("orderDate", new Date().toISOString().split('T')[0]);
  }, [setValue]);

  const formValues = watch();
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('customerFormData', JSON.stringify(formValues));
    }, 500);
    return () => clearTimeout(timeout);
  }, [formValues]);

  // Scroll to advanced section when it opens
  useEffect(() => {
    if (isAdvancedMode && advancedSectionRef.current) {
      const timer = setTimeout(() => {
        const el = advancedSectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = scrollTop + rect.top - 24; // 24px breathing room above section
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }, 120); // wait for React to render the section
      return () => clearTimeout(timer);
    }
  }, [isAdvancedMode]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setBulkRecords([]);
    
    // Clear recipient-specific fields in form
    setValue("name", "");
    setValue("phone", "");
    setValue("did", "");
    setValue("addressLine1", "");
    setValue("subdistrict", "");
    setValue("district", "");
    setValue("province", "");
    setValue("zipcode", "");
    
    // Reset sub-bookings and advanced mode
    setSubBookings([]);
    setIsAdvancedMode(false);
    
    // Clean up localStorage to retain only sender info & customQuantity
    const savedForm = localStorage.getItem('customerFormData');
    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        const cleaned = {
          senderNickname: data.senderNickname || "",
          senderPhone: data.senderPhone || "",
          customQuantity: data.customQuantity || "100"
        };
        localStorage.setItem('customerFormData', JSON.stringify(cleaned));
      } catch (e) {}
    }
  };

  // Global keydown handler for Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseModal();
        setShowRulesModal(false);
        setShowGuideModal(false);
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const onSubmit = async (data) => {
    // Check if phone (for printing on postcard) is missing
    const hasPhone = hasPhoneValue(data.phone);
    
    if (!hasPhone) showToast('ไม่ได้ระบุเบอร์โทร ระบบจะดำเนินการต่อและไม่แสดงบรรทัดเบอร์โทร');

    const isDidActive = data.did && data.did.trim().length === 6;
    let fullAddress = "";
    if (data.addressLine1 || data.subdistrict || data.district || data.province) {
      // Process address into a single string for display and old-compatibility
      const isBKK = data.province === 'กรุงเทพมหานคร';
      const subTitle = isBKK ? (data.subdistrict ? `แขวง${data.subdistrict}` : '') : (data.subdistrict ? `ต.${data.subdistrict}` : '');
      const distTitle = isBKK ? (data.district ? `เขต${data.district}` : '') : (data.district ? `อ.${data.district}` : '');
      const provTitle = isBKK ? (data.province || '') : (data.province ? `จ.${data.province}` : '');
      fullAddress = `${data.addressLine1 || ''} ${subTitle} ${distTitle} ${provTitle}`.replace(/\s+/g, ' ').trim();
    }
    
    const resolvedQty = parseInt(data.customQuantity, 10) || 0;
    const finalPrediction = validateFinalPrediction({
      spain: data.predictionSpain,
      argentina: data.predictionArgentina,
    }, resolvedQty);

    if (!finalPrediction.isValid) {
      alert(`กรุณาระบุจำนวนที่ทายให้ครบ ${resolvedQty} ใบ (${finalistSettings.firstCountry} + ${finalistSettings.secondCountry})`);
      return;
    }

    // Advanced mode validations
    if (isAdvancedMode && subBookings.length > 0) {
      const subSumVal = subBookings.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
      const mainQtyVal = resolvedQty - subSumVal;
      
      if (subSumVal > resolvedQty) {
        alert("ขออภัยครับ: จำนวนที่ระบุให้ผู้รับย่อยรวมกัน เกินกว่าจำนวนสั่งซื้อทั้งหมดที่คุณกรอกไว้");
        return;
      }
      
      if (mainQtyVal < 20 && mainQtyVal > 0) {
        alert("ขออภัยครับ: จำนวนที่เหลือสำหรับผู้รับหลัก ต้องไม่น้อยกว่า 20 ใบ (หรือหักออกจนเป็น 0 ใบ)");
        return;
      }
      
      for (let i = 0; i < subBookings.length; i++) {
        const sub = subBookings[i];
        if (!sub.name.trim() || !sub.phone.trim()) {
          alert(`กรุณากรอกชื่อและเบอร์โทรศัพท์ของรายชื่อย่อยที่ ${i + 1} ให้ครบถ้วนด้วยครับ`);
          return;
        }
        if (sub.quantity < 20) {
          alert(`ขออภัยครับ: จำนวนขั้นต่ำของรายชื่อย่อยที่ ${i + 1} ต้องไม่น้อยกว่า 20 ใบ`);
          return;
        }
        if (!sub.useMainAddress && !(sub.addressLine1 || '').trim()) {
          alert(`กรุณากรอกที่อยู่สำหรับรายชื่อย่อยที่ ${i + 1} หรือติ๊กเลือกใช้ที่อยู่เดียวกันครับ`);
          return;
        }
      }
    }

    // Compose structured sub-booking addresses into display strings
    const processedSubBookings = isAdvancedMode ? subBookings.map(sub => {
      const subIsBKK = sub.province === 'กรุงเทพมหานคร';
      const subAddr = sub.useMainAddress ? '' : [
        sub.addressLine1,
        subIsBKK ? (sub.subdistrict ? `แขวง${sub.subdistrict}` : '') : (sub.subdistrict ? `ต.${sub.subdistrict}` : ''),
        subIsBKK ? (sub.district ? `เขต${sub.district}` : '') : (sub.district ? `อ.${sub.district}` : ''),
        subIsBKK ? (sub.province || '') : (sub.province ? `จ.${sub.province}` : ''),
        sub.zipcode || ''
      ].filter(s => s && s.trim()).join(' ');
      return { ...sub, address: subAddr };
    }) : [];

     const branchStr = getBranchFromUrl();
     const match = branchStr.match(/\d{5}/);
     const branchCode = match ? match[0] : '10501';
     const now = new Date();
     const yy = String(now.getFullYear()).slice(-2);
     const mm = String(now.getMonth() + 1).padStart(2, '0');
     const dd = String(now.getDate()).padStart(2, '0');
     const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
     let rand = '';
     for (let i = 0; i < 4; i++) {
       rand += chars.charAt(Math.floor(Math.random() * chars.length));
     }
     const generatedOrderCode = `PC-${yy}${mm}${dd}-${branchCode}-${rand}`;

     const processedData = {
       ...data,
       quantity: resolvedQty,
       finalPrediction: {
         spain: finalPrediction.spain,
         argentina: finalPrediction.argentina,
         firstCountry: finalistSettings.firstCountry,
         secondCountry: finalistSettings.secondCountry,
       },
       address: fullAddress,
       isDidActive,
       branch: resolvedBranchDisplay,
       isAdvancedMode,
       subBookings: processedSubBookings,
       orderCode: generatedOrderCode
     };
 
     // Remove select helper fields from QR payload
     delete processedData.customQuantity;
 

     // Save addressLine1 suggestion to local storage
     try {
       const savedSuggestions = JSON.parse(localStorage.getItem('customerAddressSuggestions') || '[]');
       if (processedData.addressLine1 && !savedSuggestions.includes(processedData.addressLine1)) {
         const updatedSuggestions = [processedData.addressLine1, ...savedSuggestions].slice(0, 100);
         localStorage.setItem('customerAddressSuggestions', JSON.stringify(updatedSuggestions));
       }
     } catch (e) {
       console.error("Error saving address suggestions", e);
     }
 
     // Create a payload string (JSON) for the QR code using compressed format
     const compressedData = {
       oc: generatedOrderCode,
       sn: processedData.senderNickname || '',
       sp: processedData.senderPhone || '',
       d: processedData.orderDate,
       q: processedData.quantity,
       pr: processedData.finalPrediction,
       n: processedData.name,
       p: processedData.phone,
       a: processedData.addressLine1 || '',
       sd: processedData.subdistrict || '',
       dt: processedData.district || '',
       pv: processedData.province || '',
       zp: processedData.zipcode || '',
       id: processedData.did || '',
       idx: 1,
       tot: 1,
       s: processedSubBookings.map(sub => ({
         n: sub.name,
         p: sub.phone,
         q: sub.quantity,
         m: sub.useMainAddress ? 1 : 0,
         a: sub.address
       }))
     };
     const payload = JSON.stringify(compressedData);
     setGeneratedData({ ...processedData, payload });
     setIsModalOpen(true);
 
     // Save to history
     const newRecord = { ...processedData, id: Date.now(), timestamp: new Date().toISOString() };
     const updatedHistory = [newRecord, ...history].slice(0, 10); // Keep last 10
     setHistory(updatedHistory);
     localStorage.setItem('customerHistory', JSON.stringify(updatedHistory));

     // --- Firebase Integration ---
     try {
       const urlParams = new URLSearchParams(window.location.search);
       const deptCode = urlParams.get('staff') || urlParams.get('branch') || '10501';
       
       await addDoc(collection(db, "orders"), {
         ...newRecord,
         createdAt: serverTimestamp(),
         printed: false,
         status: 'pending',
         importSource: 'customer_app',
         dept: deptCode
       });
       console.log("Order saved to Firebase successfully");
     } catch (e) {
       console.error("Error adding document to Firebase: ", e);
     }
     // ---------------------------

     // Reset form but retain sender's name and phone
     reset({
       senderNickname: processedData.senderNickname || '',
       senderPhone: processedData.senderPhone || '',
       name: '',
       phone: '',
       did: '',
       addressLine1: '',
       subdistrict: '',
       district: '',
       province: '',
       zipcode: ''
     });
     setValue("did", "");
     setShowDidInput(false);
   };

  const onError = () => {
    // We can still show an alert, but inline errors will also be visible
    alert("กรุณากรอกข้อมูลให้ครบถ้วนในช่องที่จำเป็นก่อนทำการสร้างข้อมูลครับ");
  };

  const getFileName = () => {
    if (!generatedData) return `postcard-${Date.now()}.png`;
    const safeName = generatedData.name.replace(/[<>:"/\\|?*]/g, '').trim();
    const code = generatedData.orderCode || generatedData.oc || '';
    const suffix = code ? `_${code}` : '';
    return `${safeName}_${generatedData.quantity}ใบ_${generatedData.orderDate}${suffix}.png`;
  };

  const downloadImage = async () => {
    const el = captureRef.current || cardRef.current;
    if (!el) return;
    // Temporarily remove scroll/height constraints so html2canvas captures full content
    const prevMaxHeight = el.style.maxHeight;
    const prevOverflow = el.style.overflowY;
    el.style.maxHeight = 'none';
    el.style.overflowY = 'visible';
    try {
      const canvas = await html2canvas(el, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        onclone: (clonedDoc) => {
          const animatedElements = clonedDoc.querySelectorAll('.qr-card-bounce');
          animatedElements.forEach(item => {
            item.style.animation = 'none';
            item.style.opacity = '1';
            item.style.transform = 'none';
          });
        }
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      el.style.maxHeight = prevMaxHeight;
      el.style.overflowY = prevOverflow;
    }
  };

  const shareToLine = async () => {
    const el = captureRef.current || cardRef.current;
    if (!el) return;

    // Temporarily remove scroll/height constraints for full capture
    const prevMaxHeight = el.style.maxHeight;
    const prevOverflow = el.style.overflowY;
    el.style.maxHeight = 'none';
    el.style.overflowY = 'visible';

    let imageFile = null;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        onclone: (clonedDoc) => {
          const animatedElements = clonedDoc.querySelectorAll('.qr-card-bounce');
          animatedElements.forEach(item => {
            item.style.animation = 'none';
            item.style.opacity = '1';
            item.style.transform = 'none';
          });
        }
      });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        imageFile = new File([blob], getFileName(), { type: 'image/png' });
      }
    } catch (e) {
      console.error('Canvas capture error:', e);
    } finally {
      el.style.maxHeight = prevMaxHeight;
      el.style.overflowY = prevOverflow;
    }

    // Try native share with image file first (works on mobile iOS/Android)
    if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({
          files: [imageFile]
        });
        return;
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('Share error:', e);
        } else {
          return; // user cancelled — do nothing
        }
      }
    }

    // Fallback for desktop: download the image and open LINE
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      // Also open LINE after short delay
      setTimeout(() => {
        window.open('https://line.me', '_blank');
      }, 800);
    }
  };

  const uniqueNames = Array.from(new Set(history.map(r => r.name).filter(Boolean)));
  const uniquePhones = Array.from(new Set(history.map(r => r.phone).filter(Boolean)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`
        .modal-tab-bar::-webkit-scrollbar {
          display: none;
        }
        .modal-tab-bar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .no-callout {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }
        @keyframes floatGold {
          0% {
            transform: translateY(15px) rotate(0deg) scale(0.7);
            opacity: 0;
          }
          30% {
            opacity: 0.5;
          }
          70% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-40px) rotate(25deg) scale(1.1);
            opacity: 0;
          }
        }
        @keyframes pulseGold {
          0% { transform: skewX(-15deg) scale(1); }
          50% { transform: skewX(-15deg) scale(1.08); }
          100% { transform: skewX(-15deg) scale(1); }
        }
        @keyframes floatBgItem1 {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(15deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes floatBgItem2 {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(-20deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes spinTyping {
          0% { transform: translateY(0) rotate(0deg) scale(1); }
          50% { transform: translateY(-25px) rotate(180deg) scale(1.3); opacity: 0.95; }
          100% { transform: translateY(0) rotate(360deg) scale(1); }
        }
        .bg-coin-3d {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #ffe066 0%, #f5b041 50%, #d35400 100%);
          border: 2px solid #b7950b;
          border-radius: 50%;
          box-shadow: 0 3px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 900;
          text-shadow: 1px 1px 1px rgba(146, 64, 14, 0.6);
          position: absolute;
          opacity: 0.45;
          z-index: 1;
          pointer-events: none;
          transition: all 0.2s ease;
        }
        .bg-coin-3d::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          right: 2px;
          bottom: 2px;
          border: 1px dashed rgba(255, 255, 255, 0.4);
          border-radius: 50%;
        }
        .bg-postcard-3d {
          width: 44px;
          height: 28px;
          background: linear-gradient(135deg, #fff3b0 0%, #ca8a04 100%);
          border: 1.5px solid #a16207;
          border-radius: 4px;
          box-shadow: 0 4px 8px rgba(161, 98, 7, 0.25), inset 0 1px 0 rgba(255,255,255,0.5);
          position: absolute;
          opacity: 0.5;
          z-index: 1;
          pointer-events: none;
          transition: all 0.2s ease;
        }
        .bg-postcard-3d::before {
          content: '';
          position: absolute;
          top: 3px;
          right: 3px;
          width: 8px;
          height: 10px;
          border: 0.8px dashed #a16207;
          background: #fef08a;
          border-radius: 1px;
        }
        .bg-postcard-3d::after {
          content: '';
          position: absolute;
          bottom: 4px;
          right: 3px;
          width: 18px;
          height: 8px;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            #a16207 2px,
            #a16207 3px
          );
        }
        .bg-float-1 {
          animation: floatBgItem1 3s infinite ease-in-out;
        }
        .bg-float-2 {
          animation: floatBgItem2 3.8s infinite ease-in-out;
        }
        .typing-active {
          animation: spinTyping 0.6s cubic-bezier(0.25, 0.8, 0.25, 1) infinite !important;
        }
        .floating-gold-item {
          position: absolute;
          pointer-events: none;
          animation: floatGold 4s infinite ease-in-out;
          font-size: 1.4rem;
          line-height: 1;
          z-index: 1;
        }
        @media (max-width: 768px) {
          .card-header-responsive {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
          }
          .card-header-responsive h2 {
            font-size: 1.15rem !important;
          }
          .card-header-responsive .btn-group-responsive {
            width: 100% !important;
            display: flex !important;
            gap: 0.5rem !important;
            justify-content: space-between !important;
          }
          .card-header-responsive .btn-group-responsive button {
            flex: 1 !important;
            justify-content: center !important;
            padding: 0.5rem 0.25rem !important;
            font-size: 0.75rem !important;
          }
        }
      `}</style>
      {/* Non-clickable Banner commented out for security review */}
      {/*
      <div 
        style={{ 
          width: '100%', 
          borderRadius: '16px', 
          overflow: 'hidden', 
          boxShadow: 'var(--shadow)',
        }}
      >
        <img 
          src="banner.jpg" 
          alt="เชียร์บอลให้มัน เฮลั่นรับโชค" 
          style={{ width: '100%', height: 'auto', display: 'block' }} 
        />
      </div>
      */}

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px' }}>
          <div className="card glass-panel">
          <div className="card-header-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '0.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', margin: 0, fontSize: '1.2rem', lineHeight: '1.4' }}>
              <CheckCircle color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>กรอกข้อมูลเพื่อสั่งพิมพ์ไปรษณียบัตร</span>
            </h2>
            {/* Rules and Guide buttons commented out to prevent loading sensitive brand images */}
            {/*
            <div className="btn-group-responsive" style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  borderColor: '#e11d48',
                  color: '#e11d48',
                  backgroundColor: '#fff1f2',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.75rem',
                  margin: 0,
                  cursor: 'pointer',
                  borderRadius: '8px',
                  border: '1.5px solid #fecdd3',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                🏆 กติกาการลุ้นโชค
              </button>
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  borderColor: '#3b82f6',
                  color: '#1d4ed8',
                  backgroundColor: '#eff6ff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  padding: '0.35rem 0.75rem',
                  margin: 0,
                  cursor: 'pointer',
                  borderRadius: '8px',
                  border: '1.5px solid #bfdbfe',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                📱 วิธีโหวตผ่านแอป
              </button>
            </div>
            */}
          </div>
          <form onSubmit={handleSubmit(onSubmit, onError)}>
            <div className="form-group">
              <label className="form-label">วันที่สั่งจอง <span style={{color:'red'}}>*</span></label>
              <ThaiDatePicker 
                className={`form-control ${getFieldClass('orderDate')}`} 
                required 
                {...register("orderDate", { required: true })} 
                watchValue={watch("orderDate")} 
                defaultValue={new Date().toISOString().split('T')[0]} 
              />
              {errors.orderDate && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุวันที่สั่งจอง</span>}
            </div>
            <div className="form-group">
              <label className="form-label">จำนวน (ใบ) <span style={{color:'red'}}>*</span></label>
              <div style={{ 
                padding: '0.85rem 1rem', 
                background: 'linear-gradient(135deg, #fffdf6 0%, #fffbeb 100%)', 
                border: '3px solid #f59e0b', 
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '68px'
              }}>
                {/* Floating 3D Background Coins and Postcards */}
                <div className={`bg-coin-3d bg-float-1 ${isTyping ? 'typing-active' : ''}`} style={{ left: '8%', top: '15%' }}>฿</div>
                <div className={`bg-postcard-3d bg-float-2 ${isTyping ? 'typing-active' : ''}`} style={{ left: '22%', bottom: '8%' }} />
                <div className={`bg-coin-3d bg-float-2 ${isTyping ? 'typing-active' : ''}`} style={{ right: '8%', top: '20%' }}>฿</div>
                <div className={`bg-postcard-3d bg-float-1 ${isTyping ? 'typing-active' : ''}`} style={{ right: '22%', bottom: '12%' }} />

                {/* Sparkle and Text controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
                  <span style={{ 
                    fontSize: '1.05rem', 
                    fontWeight: 'bold', 
                    color: '#b45309', 
                    whiteSpace: 'nowrap',
                    position: 'relative'
                  }}>
                    โปรดระบุจำนวน
                    <span style={{ 
                      position: 'absolute',
                      top: '-15px',
                      left: '70px',
                      fontSize: '0.9rem'
                    }}>
                      ✨
                    </span>
                  </span>
                  {(() => {
                    const { onChange: rfhOnChange, ...restRegister } = register("customQuantity", { required: true, min: 50 });
                    return (
                      <input 
                        type="number" 
                        min="50" 
                        className={`form-control ${getFieldClass('customQuantity')}`} 
                        required 
                        {...restRegister}
                        onChange={(e) => {
                          rfhOnChange(e);
                          setIsTyping(true);
                          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                          typingTimeoutRef.current = setTimeout(() => {
                            setIsTyping(false);
                          }, 650);
                        }}
                        placeholder="เช่น 100" 
                        style={{ 
                          width: '155px', 
                          display: 'inline-block', 
                          margin: '0 0.25rem', 
                          padding: '0.35rem 0.5rem', 
                          textAlign: 'center', 
                          borderColor: '#f59e0b', 
                          borderWidth: '2px', 
                          fontSize: '1.25rem',
                          fontWeight: '800',
                          color: '#b45309',
                          backgroundColor: '#ffffff',
                          borderRadius: '10px',
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                          height: '38px'
                        }}
                      />
                    );
                  })()}
                  <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#b45309', whiteSpace: 'nowrap' }}>
                    ใบ <span style={{ color: 'red' }}>*</span>
                  </span>
                </div>
              </div>
              {errors.customQuantity && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem', fontWeight: 600 }}>กรุณาระบุจำนวนอย่างน้อย 50 ใบ</span>}
            </div>
            <div className="form-group" style={{ padding: '1rem', border: '2px solid #2563eb', borderRadius: '14px', background: '#eff6ff' }}>
              <div className="form-label" style={{ color: '#1e3a8a', fontWeight: 800, marginBottom: '0.35rem' }}>
                ทายผลคู่ชิง: เลือกประเทศและระบุจำนวนใบ
              </div>
              <div style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                จำนวนของ {finalistSettings.firstCountry} และ {finalistSettings.secondCountry} รวมกันต้องเท่ากับจำนวนที่สั่ง {quantity.toLocaleString()} ใบ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                {getFinalistCountries(finalistSettings).map((country) => {
                  const fieldName = country.key === 'spain' ? 'predictionSpain' : 'predictionArgentina';
                  return (
                    <label key={country.key} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 700, color: '#0f172a' }}>
                      <span style={{ minWidth: '82px' }}>{country.label}</span>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        {...register(fieldName, { min: 0 })}
                        placeholder="0"
                        style={{ textAlign: 'center', fontWeight: 800 }}
                      />
                      <span>ใบ</span>
                    </label>
                  );
                })}
              </div>
            </div>
            {/* ข้อมูลผู้สั่ง (Sender Profile) */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ flex: '1 1 180px' }}>
                <label className="form-label" style={{ fontWeight: '700', color: '#1e293b' }}>ชื่อเล่นผู้สั่ง <span style={{color:'red'}}>*</span></label>
                <input type="text" className={`form-control ${getFieldClass('senderNickname')}`} required {...register("senderNickname", { required: "กรุณาระบุชื่อเล่นผู้สั่ง" })} placeholder="ระบุชื่อเล่นของคุณ" />
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
                })} placeholder="ระบุเบอร์โทรศัพท์ของคุณ (ถ้ามี)" />
                {errors.senderPhone && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>{errors.senderPhone.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <label 
                className="form-label no-callout"
                onMouseDown={startLongPress} 
                onMouseUp={cancelLongPress} 
                onMouseLeave={cancelLongPress} 
                onTouchStart={startLongPress} 
                onTouchEnd={cancelLongPress}
                onContextMenu={(e) => e.preventDefault()}
                style={{ cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
              >
                ชื่อ-นามสกุล <span style={{color:'red'}}>*</span>
              </label>
              <input type="text" list="recipient-names-list" className={`form-control ${getFieldClass('name')}`} required {...register("name", { required: true })} placeholder="ระบุชื่อและนามสกุล" />
              {errors.name && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุชื่อ-นามสกุล</span>}
            </div>
            <div className="form-group">
              <label className="form-label">เบอร์โทรศัพท์</label>
              <input type="text" list="recipient-phones-list" className={`form-control ${checkPhoneStatus(watch("phone")) === 'valid' ? 'input-success' : getFieldClass('phone')}`} {...register("phone", { 
                required: false
              })} placeholder="เช่น นิกกี้ 08X-XXX-XXXX" />
              {errors.phone && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>{errors.phone.message}</span>}
              {!errors.phone && checkPhoneStatus(watch("phone")) === 'invalid' && (
                <span style={{ color: '#d97706', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                  ⚠️ อาจเป็นเบอร์โทรที่ไม่สมบูรณ์ (ปกติจะมี 9-10 หลัก) แต่สามารถบันทึกได้
                </span>
              )}
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

            <ThaiAddressFields 
              register={register} 
              setValue={setValue} 
              errors={errors} 
              dirtyFields={dirtyFields} 
              touchedFields={touchedFields} 
              isAddressRequired={!isDidActive}
              onAddressLabelEvents={{
                onMouseDown: startLongPress,
                onMouseUp: cancelLongPress,
                onMouseLeave: cancelLongPress,
                onTouchStart: startLongPress,
                onTouchEnd: cancelLongPress,
                onContextMenu: (e) => e.preventDefault()
              }}
            />

            {isAdvancedMode && (
              <div ref={advancedSectionRef} style={{
                marginTop: '1.5rem',
                padding: '1.25rem',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)',
                border: '2px solid #f59e0b',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.15)',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: '#b45309', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    👥 แบ่งสัดส่วนจัดส่ง / พิมพ์แยกรายชื่อ
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setIsAdvancedMode(false); setSubBookings([]); showToast('🔒 ปิดโหมดผู้รับย่อยแล้ว'); }}
                    style={{ border: 'none', background: '#fef3c7', color: '#92400e', fontSize: '0.78rem', fontWeight: 'bold', padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    ✕ ปิดโหมดนี้
                  </button>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#78350f', marginBottom: '0.75rem' }}>
                  แต่ละรายชื่อระบุจำนวนขั้นต่ำ 20 ใบ | ติ๊ก <strong>"ใช้ที่อยู่เดียวกัน"</strong> หรือระบุที่อยู่ใหม่ได้
                </p>
                <div style={{ padding: '0.5rem 0.75rem', background: '#fef9c3', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', color: '#78350f', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span>📦 รวมทั้งหมด: {quantity} ใบ</span>
                  <span>✅ แบ่งแล้ว: {subSum} ใบ</span>
                  <span style={{ color: mainQty < 20 && mainQty > 0 ? '#dc2626' : '#16a34a' }}>
                    👤 รายชื่อหลักคงเหลือ: {mainQty} ใบ
                    {mainQty < 20 && mainQty > 0 && ' ⚠️'}
                  </span>
                </div>

                {subBookings.map((sub, idx) => (
                  <div key={sub.id} style={{
                    padding: '1rem',
                    background: '#ffffff',
                    border: '1.5px solid #fde047',
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    position: 'relative'
                  }}>
                    <button
                      type="button"
                      onClick={() => setSubBookings(subBookings.filter(s => s.id !== sub.id))}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        border: 'none',
                        background: 'none',
                        color: '#dc2626',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      ❌ ลบรายชื่อย่อย
                    </button>
                    
                    <h4 style={{ fontSize: '0.9rem', color: '#b45309', marginBottom: '0.75rem', fontWeight: 'bold' }}>รายชื่อย่อยที่ {idx + 1}</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', color: '#78350f' }}>ชื่อ-นามสกุล <span style={{color:'red'}}>*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.45rem 0.6rem', fontSize: '0.9rem', borderColor: '#fde047' }}
                          value={sub.name}
                          onChange={(e) => {
                            const updated = subBookings.map(s => s.id === sub.id ? { ...s, name: e.target.value } : s);
                            setSubBookings(updated);
                          }}
                          placeholder="ชื่อ-นามสกุล"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', color: '#78350f' }}>เบอร์โทรศัพท์ <span style={{color:'red'}}>*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ padding: '0.45rem 0.6rem', fontSize: '0.9rem', borderColor: subPhoneErrors[sub.id] ? '#dc2626' : '#fde047' }}
                          value={sub.phone}
                          onChange={(e) => {
                            const updated = subBookings.map(s => s.id === sub.id ? { ...s, phone: e.target.value } : s);
                            setSubBookings(updated);
                            validateSubPhone(sub.id, e.target.value);
                          }}
                          placeholder="เช่น 08X-XXX-XXXX"
                        />
                        {subPhoneErrors[sub.id] && (
                          <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: '600', display: 'block', marginTop: '0.2rem' }}>
                            {subPhoneErrors[sub.id]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', color: '#78350f' }}>จำนวนพิมพ์ (ใบ) <span style={{color:'red'}}>*</span></label>
                        <input
                          type="number"
                          min="20"
                          className="form-control"
                          style={{ padding: '0.45rem 0.6rem', fontSize: '0.9rem', borderColor: '#fde047' }}
                          value={sub.quantity}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value, 10) || 0;
                            const updated = subBookings.map(s => s.id === sub.id ? { ...s, quantity: qty } : s);
                            setSubBookings(updated);
                          }}
                          placeholder="ขั้นต่ำ 20 ใบ"
                        />
                        {sub.quantity < 20 && <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 'bold' }}>ขั้นต่ำ 20 ใบ</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', color: '#78350f', fontWeight: 'bold', marginTop: '0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={sub.useMainAddress}
                            onChange={(e) => {
                              const updated = subBookings.map(s => s.id === sub.id ? { ...s, useMainAddress: e.target.checked } : s);
                              setSubBookings(updated);
                            }}
                          />
                          ใช้ที่อยู่เดียวกับรายชื่อหลัก
                        </label>
                      </div>
                    </div>

                    {!sub.useMainAddress && (
                      <SubAddressFields
                        value={{ addressLine1: sub.addressLine1, subdistrict: sub.subdistrict, district: sub.district, province: sub.province, zipcode: sub.zipcode }}
                        onChange={(updatedAddr) => {
                          const updated = subBookings.map(s => s.id === sub.id ? { ...s, ...updatedAddr } : s);
                          setSubBookings(updated);
                        }}
                      />
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const remaining = quantity - subSum;
                    const newQty = Math.max(20, Math.floor(remaining / 2));
                    setSubBookings([...subBookings, {
                      id: Date.now(),
                      name: '',
                      phone: '',
                      quantity: newQty,
                      useMainAddress: true,
                      addressLine1: '',
                      subdistrict: '',
                      district: '',
                      province: '',
                      zipcode: ''
                    }]);
                  }}
                  className="btn"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    fontSize: '0.9rem',
                    padding: '0.6rem 1rem',
                    width: '100%',
                    borderRadius: '10px',
                    boxShadow: '0 2px 5px rgba(217, 119, 6, 0.2)'
                  }}
                  disabled={quantity - subSum < 20}
                >
                  ➕ เพิ่มรายชื่อย่อย
                </button>
              </div>
            )}

            {/* Toast Notification */}
            {toastMsg && (
              <div style={{
                position: 'fixed',
                bottom: '1.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#1e293b',
                color: '#fff',
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 500,
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                zIndex: 9999,
                maxWidth: '90vw',
                textAlign: 'center',
                lineHeight: '1.5',
                animation: 'fadeInUp 0.3s ease'
              }}>
                {toastMsg}
              </div>
            )}

            <div style={{ marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.1rem', fontWeight: 'bold' }}>
                ตกลงสั่งพิมพ์
              </button>
            </div>

            {quantity > 0 && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                backgroundColor: '#f0fdf4',
                border: '2px dashed #22c55e',
                borderRadius: '12px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#166534', marginBottom: '0.25rem' }}>ราคาไปรษณียบัตร (ใบละ 3 บาท)</div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#15803d' }}>จำนวน {quantity} ใบ</span>
                    <span style={{ fontSize: '1.1rem', color: '#15803d' }}>=</span>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a' }}>{totalPrice.toLocaleString()} บาท</span>
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#1e3a8a', marginBottom: '0.5rem' }}>QR ชำระเงิน (พร้อมเพย์)</div>
                  <QRCodeSVG 
                    value={generatePayload("3102200272042", { amount: totalPrice })} 
                    size={160} 
                  />
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                    สแกนเพื่อชำระเงิน {totalPrice.toLocaleString()} บาท
                  </div>
                </div>
              </div>
            )}
          </form>

          <datalist id="recipient-names-list">
            {uniqueNames.map(val => <option key={val} value={val} />)}
          </datalist>
          <datalist id="recipient-phones-list">
            {uniquePhones.map(val => <option key={val} value={val} />)}
          </datalist>
        </div>
      </div>

      <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {generatedData && (
          <div className="card" style={{ background: '#fff', border: '2px dashed var(--primary)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>สำหรับส่งให้ เจ้าหน้าที่ไปรษณีย์</h3>
            
            {/* The actual card to be converted to Image */}
            <div 
              ref={captureRef} 
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
              <div style={{ 
                position: 'absolute', 
                top: '1.5rem', 
                right: '1.5rem', 
                background: '#fff', 
                padding: '0.5rem', 
                borderRadius: '8px', 
                border: '2px solid var(--primary)', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                boxShadow: '0 2px 8px rgba(225, 29, 72, 0.1)'
              }}>
                <QRCodeCanvas value={generatedData.payload} size={180} level="L" />
                <div style={{ 
                  fontSize: '0.65rem', 
                  color: 'var(--primary)', 
                  fontWeight: 'bold', 
                  marginTop: '0.35rem', 
                  textAlign: 'center',
                  lineHeight: '1'
                }}>
                  QR สำหรับสั่งพิมพ์
                </div>
              </div>
              <div style={{ paddingRight: '215px', boxSizing: 'border-box' }}>
                <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.4rem' }}>ข้อมูลผู้รับ (สำหรับการพิมพ์)</h2>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
                  วันที่สั่งจอง: {formatThaiDate(generatedData.orderDate)} | จำนวน: {generatedData.quantity} ใบ<br/>
                  รับพิมพ์โดย: {generatedData.branch || 'ไปรษณีย์กลาง 10501'}
                </div>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: '600' }}>
                  ชื่อ: {generatedData.name}
                </div>
                {hasPhoneValue(generatedData.phone) && (
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                    เบอร์โทร: {generatedData.phone}
                  </div>
                )}
                {generatedData.address && (
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.75rem', lineHeight: '1.6' }}>
                    ที่อยู่: {generatedData.address} {generatedData.zipcode}
                  </div>
                )}
                {generatedData.did && (
                  <div style={{ fontSize: '1.1rem', marginTop: '1rem', padding: '0.5rem', background: '#f8fafc', borderLeft: '4px solid var(--secondary)' }}>
                    <strong>D-ID:</strong> {generatedData.did}
                  </div>
                )}
              </div>

              {generatedData.isAdvancedMode && generatedData.subBookings && generatedData.subBookings.length > 0 && (
                <div style={{ 
                  marginTop: '1.25rem', 
                  padding: '0.75rem 1rem', 
                  background: '#fffbeb', 
                  border: '1.5px solid #fde047', 
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  textAlign: 'left'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#b45309', borderBottom: '1.5px dashed #fde047', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
                    📋 รายละเอียดการพิมพ์แยกรายชื่อย่อย:
                  </div>
                  {(() => {
                    const subSumVal = generatedData.subBookings.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
                    const mainQtyVal = generatedData.quantity - subSumVal;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {mainQtyVal > 0 && (
                          <div style={{ borderBottom: '1px solid #fef9c3', paddingBottom: '0.25rem' }}>
                            • <strong>{generatedData.name}</strong> ({generatedData.phone}) — <strong>{mainQtyVal} ใบ</strong><br/>
                            <span style={{ fontSize: '0.8rem', color: '#78350f' }}>ที่อยู่จัดส่ง: ส่งที่อยู่หลัก</span>
                          </div>
                        )}
                        {generatedData.subBookings.map((sub, idx) => (
                          <div key={sub.id} style={{ borderBottom: idx < generatedData.subBookings.length - 1 ? '1px solid #fef9c3' : 'none', paddingBottom: idx < generatedData.subBookings.length - 1 ? '0.25rem' : 0 }}>
                            • <strong>{sub.name}</strong> ({sub.phone}) — <strong>{sub.quantity} ใบ</strong><br/>
                            <span style={{ fontSize: '0.8rem', color: '#78350f' }}>
                              ที่อยู่จัดส่ง: {sub.useMainAddress ? 'ส่งที่อยู่หลัก' : sub.address}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
              <button onClick={downloadImage} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <Download size={18} />
                บันทึกเป็นรูปภาพ (ส่งให้ ปณ.)
              </button>
              <button onClick={shareToLine} className="btn" style={{ width: '100%', backgroundColor: '#00B900', color: 'white', display: 'flex', justifyContent: 'center', gap: '0.5rem', border: 'none' }}>
                <Share2 size={18} />
                แชร์ไป LINE
              </button>
            </div>
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
              {/* Send Selected Button */}
              {(() => {
                const handleSelectToggle = (id, e) => {
                  e.stopPropagation();
                  setSelectedIds(prev =>
                    prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
                  );
                };

                 const handleSendToPost = () => {
                  if (selectedIds.length === 0) {
                    alert("กรุณาเลือกข้อมูลที่ต้องการส่งอย่างน้อย 1 รายการ");
                    return;
                  }
                  

                  const selectedRecords = history.filter(r => selectedIds.includes(r.id));
                  
                  // Save selected records to state to display them as a sequence of single QR codes
                  setBulkRecords(selectedRecords);
                  setBulkIndex(0);
                  setSelectedIds([]);
                  
                  // Setup generatedData for the first record in sequence
                  const firstRecord = selectedRecords[0];
                  const compressedData = {
                    oc: firstRecord.orderCode || firstRecord.oc || '',
                    sn: firstRecord.senderNickname || firstRecord.sn || '',
                    sp: firstRecord.senderPhone || firstRecord.sp || '',
                    d: firstRecord.orderDate,
                    q: firstRecord.quantity,
                    n: firstRecord.name,
                    p: firstRecord.phone,
                    a: firstRecord.addressLine1 || firstRecord.address || '',
                    sd: firstRecord.subdistrict || '',
                    dt: firstRecord.district || '',
                    pv: firstRecord.province || '',
                    zp: firstRecord.zipcode || '',
                    id: firstRecord.did || '',
                    idx: 1,
                    tot: selectedRecords.length,
                    s: firstRecord.subBookings ? firstRecord.subBookings.map(sub => ({
                      n: sub.name,
                      p: sub.phone,
                      q: sub.quantity,
                      m: sub.useMainAddress ? 1 : 0,
                      a: sub.address
                    })) : []
                  };
                  const payload = JSON.stringify(compressedData);
                  setGeneratedData({ ...firstRecord, payload });
                  setIsModalOpen(true);
                };

                const startHistoryLongPress = (record) => {
                  if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
                  pressTimerRef.current = setTimeout(() => {
                    setLongPressRecord(record);
                    setShowDeleteModal(true);
                  }, 5000); // 5 seconds long press
                };

                const cancelHistoryLongPress = () => {
                  if (pressTimerRef.current) {
                    clearTimeout(pressTimerRef.current);
                    pressTimerRef.current = null;
                  }
                };

                const executeDelete = () => {
                  if (longPressRecord) {
                    const updated = history.filter(r => r.id !== longPressRecord.id);
                    setHistory(updated);
                    localStorage.setItem('customerHistory', JSON.stringify(updated));
                    setSelectedIds(prev => prev.filter(id => id !== longPressRecord.id));
                    showToast("🗑️ ลบข้อมูลเรียบร้อยแล้ว");
                  }
                  setShowDeleteModal(false);
                  setLongPressRecord(null);
                };

                return (
                  <>
                    {history.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                          <input 
                            type="checkbox"
                            checked={selectedIds.length === history.length}
                            onChange={() => {
                              if (selectedIds.length === history.length) {
                                setSelectedIds([]);
                              } else {
                                setSelectedIds(history.map(r => r.id));
                              }
                            }}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                          <span>เลือกทั้งหมด</span>
                        </label>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleSendToPost}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      📤 ส่งข้อมูลที่เลือกให้ไปรษณีย์ ({selectedIds.length})
                    </button>

                    {history.map((record) => (
                      <div 
                        key={record.id} 
                        style={{ 
                          padding: '0.75rem', 
                          border: '1px solid var(--border)', 
                          borderRadius: '8px',
                          transition: 'background 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          position: 'relative',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          WebkitTouchCallout: 'none'
                        }}
                        onMouseDown={() => startHistoryLongPress(record)}
                        onMouseUp={cancelHistoryLongPress}
                        onMouseLeave={cancelHistoryLongPress}
                        onTouchStart={() => startHistoryLongPress(record)}
                        onTouchEnd={cancelHistoryLongPress}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div 
                          onClick={(e) => handleSelectToggle(record.id, e)} 
                          style={{ display: 'flex', alignItems: 'center', padding: '0.25rem', cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(record.id)}
                            onChange={() => {}} // Controlled by onClick wrapper
                            style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                          />
                        </div>
                        
                        <div 
                          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                          onClick={() => {
                            const recordToSet = {
                              ...record,
                              addressLine1: record.addressLine1 || record.address,
                              subdistrict: record.subdistrict || '',
                              district: record.district || '',
                              province: record.province || '',
                              zipcode: record.zipcode || ''
                            };
                            reset(recordToSet);
                            setQuantityFields(record.quantity);
                            const compressedData = {
                              oc: record.orderCode || record.oc || '',
                              sn: record.senderNickname || record.sn || '',
                              sp: record.senderPhone || record.sp || '',
                              d: record.orderDate,
                              q: record.quantity,
                              n: record.name,
                              p: record.phone,
                              a: record.addressLine1 || record.address || '',
                              sd: record.subdistrict || '',
                              dt: record.district || '',
                              pv: record.province || '',
                              zp: record.zipcode || '',
                              id: record.did || ''
                            };
                            const payload = JSON.stringify(compressedData);
                            setGeneratedData({ ...record, payload });
                            setIsModalOpen(true);
                          }}
                        >
                          <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem', wordBreak: 'break-word' }}>{record.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span>📅 {new Date(record.timestamp).toLocaleDateString('th-TH')}</span>
                            <span>•</span>
                            <span>📦 <strong>{record.quantity} ใบ</strong></span>
                          </div>
                          
                          {/* Expanded Quick Details */}
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.35rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.35rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                              <span>📞 เบอร์: {record.phone}</span>
                              {record.did && <span style={{ padding: '0.1rem 0.35rem', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>D-ID: {record.did}</span>}
                            </div>
                            {record.address && (
                              <div style={{ 
                                color: '#64748b',
                                marginTop: '0.25rem',
                                lineHeight: '1.4',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'break-word'
                              }}>
                                📍 ที่อยู่: {record.address}
                              </div>
                            )}
                            {record.isAdvancedMode && record.subBookings && record.subBookings.length > 0 && (
                              <div style={{ 
                                marginTop: '0.5rem', 
                                padding: '0.4rem 0.6rem', 
                                backgroundColor: '#fffbeb', 
                                border: '1px solid #fde047', 
                                borderRadius: '6px',
                                color: '#b45309',
                                fontSize: '0.75rem',
                                lineHeight: '1.4'
                              }}>
                                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>👥 รายชื่อย่อย ({record.subBookings.length} ท่าน):</strong>
                                {(() => {
                                  const subSumVal = record.subBookings.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
                                  const mainQtyVal = record.quantity - subSumVal;
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                      {mainQtyVal > 0 && (
                                        <div>• {record.name} (หลัก) — {mainQtyVal} ใบ</div>
                                      )}
                                      {record.subBookings.map((sub, sIdx) => (
                                        <div key={sub.id || sIdx}>
                                          • {sub.name} — {sub.quantity} ใบ
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Delete Confirmation Modal */}
                    {showDeleteModal && longPressRecord && (
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
                        zIndex: 10000,
                        padding: '1rem',
                        boxSizing: 'border-box'
                      }}>
                        <div className="card glass-panel" style={{
                          width: '100%',
                          maxWidth: '360px',
                          backgroundColor: '#ffffff',
                          borderRadius: '16px',
                          padding: '1.5rem',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}>
                          <h3 style={{ margin: '0 0 1rem 0', color: '#dc2626', fontSize: '1.2rem', fontWeight: 700 }}>
                            🗑️ ยืนยันการลบข้อมูล?
                          </h3>
                          <p style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            คุณต้องการลบข้อมูลของ <strong>{longPressRecord.name}</strong> ใช่หรือไม่?
                          </p>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeleteModal(false);
                                setLongPressRecord(null);
                              }}
                              className="btn btn-secondary"
                              style={{ flex: 1 }}
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="button"
                              onClick={executeDelete}
                              className="btn btn-primary"
                              style={{ flex: 1, backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                            >
                              ใช่, ลบข้อมูล
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Focused Booking Ticket Modal */}
      {isModalOpen && generatedData && (
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
          zIndex: 1000,
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          <div ref={cardRef} className="card glass-panel" style={{
            width: '100%',
            maxWidth: '420px',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '1.5rem',
            boxSizing: 'border-box',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 700 }}>
              📄 ใบสั่งพิมพ์ ชื่อ-ที่อยู่
            </h3>
            {bulkRecords.length > 0 ? (
              <div style={{ 
                backgroundColor: '#fef3c7', 
                color: '#d97706', 
                fontSize: '0.9rem', 
                fontWeight: 'bold', 
                padding: '0.4rem', 
                borderRadius: '8px', 
                marginBottom: '0.75rem' 
              }}>
                📂 ส่งออกข้อมูลกลุ่ม (รายการที่ {bulkIndex + 1} จาก {bulkRecords.length})
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', fontWeight: 500 }}>
                ยื่นหน้าจอนี้ให้เจ้าหน้าที่สแกนได้ทันที
              </div>
            )}

            {/* Capture area: QR + info only (no buttons) */}
            {/* Capture area: Order Summary Card */}
            <div ref={captureRef} style={{ padding: '0.5rem 0.5rem 0', overflow: 'visible', backgroundColor: 'transparent' }}>
              <OrderSummaryCard 
                record={generatedData} 
                indexInfo={bulkRecords.length > 1 ? `รายการที่ ${bulkIndex + 1} / ${bulkRecords.length}` : null} 
              />
            </div>{/* end captureRef */}

            {/* Stepper Buttons for Bulk Send */}
            {bulkRecords.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  disabled={bulkIndex === 0}
                  onClick={() => {
                    const prevIdx = bulkIndex - 1;
                    setBulkIndex(prevIdx);
                    const prevRec = bulkRecords[prevIdx];
                    const compData = {
                      oc: prevRec.orderCode || prevRec.oc || '',
                      sn: prevRec.senderNickname || prevRec.sn || '',
                      sp: prevRec.senderPhone || prevRec.sp || '',
                      d: prevRec.orderDate,
                      q: prevRec.quantity,
                      n: prevRec.name,
                      p: prevRec.phone,
                      a: prevRec.addressLine1 || prevRec.address || '',
                      sd: prevRec.subdistrict || '',
                      dt: prevRec.district || '',
                      pv: prevRec.province || '',
                      zp: prevRec.zipcode || '',
                      id: prevRec.did || '',
                      idx: prevIdx + 1,
                      tot: bulkRecords.length,
                      s: prevRec.subBookings ? prevRec.subBookings.map(sub => ({
                        n: sub.name,
                        p: sub.phone,
                        q: sub.quantity,
                        m: sub.useMainAddress ? 1 : 0,
                        a: sub.address
                      })) : []
                    };
                    setGeneratedData({ ...prevRec, payload: JSON.stringify(compData) });
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.25rem',
                    opacity: bulkIndex === 0 ? 0.5 : 1
                  }}
                >
                  ◀️ รายการก่อนหน้า
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  disabled={bulkIndex === bulkRecords.length - 1}
                  onClick={() => {
                    const nextIdx = bulkIndex + 1;
                    setBulkIndex(nextIdx);
                    const nextRec = bulkRecords[nextIdx];
                    const compData = {
                      oc: nextRec.orderCode || nextRec.oc || '',
                      sn: nextRec.senderNickname || nextRec.sn || '',
                      sp: nextRec.senderPhone || nextRec.sp || '',
                      d: nextRec.orderDate,
                      q: nextRec.quantity,
                      n: nextRec.name,
                      p: nextRec.phone,
                      a: nextRec.addressLine1 || nextRec.address || '',
                      sd: nextRec.subdistrict || '',
                      dt: nextRec.district || '',
                      pv: nextRec.province || '',
                      zp: nextRec.zipcode || '',
                      id: nextRec.did || '',
                      idx: nextIdx + 1,
                      tot: bulkRecords.length,
                      s: nextRec.subBookings ? nextRec.subBookings.map(sub => ({
                        n: sub.name,
                        p: sub.phone,
                        q: sub.quantity,
                        m: sub.useMainAddress ? 1 : 0,
                        a: sub.address
                      })) : []
                    };
                    setGeneratedData({ ...nextRec, payload: JSON.stringify(compData) });
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem', 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                    border: 'none',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.25rem',
                    opacity: bulkIndex === bulkRecords.length - 1 ? 0.5 : 1
                  }}
                >
                  รายการถัดไป ▶️
                </button>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={downloadImage} className="btn btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.25rem', fontSize: '0.85rem' }}>
                  <Download size={14} /> บันทึกรูปภาพ
                </button>
                <button onClick={shareToLine} className="btn" style={{ flex: 1, backgroundColor: '#00B900', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', border: 'none', padding: '0.5rem 0.25rem', fontSize: '0.85rem' }}>
                  <Share2 size={14} /> แชร์ไป LINE
                </button>
              </div>
              
              <button onClick={handleCloseModal} className="btn btn-secondary" style={{ width: '100%', padding: '0.6rem', fontWeight: 600 }}>
                ปิดหน้าจอนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
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
          zIndex: 9999,
          padding: '1rem',
          boxSizing: 'border-box'
        }} onClick={() => setShowRulesModal(false)}>
          <div className="card glass-panel" style={{
            width: '100%',
            maxWidth: '650px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '1.5rem',
            boxSizing: 'border-box',
            textAlign: 'center',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                🏆 กติกาและเงื่อนไขการร่วมลุ้นรางวัล
              </h3>
              <button 
                type="button" 
                onClick={() => setShowRulesModal(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="modal-tab-bar" style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px', overflowX: 'auto' }}>
              <button
                type="button"
                onClick={() => setRulesActiveTab(0)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  margin: 0,
                  borderRadius: '6px',
                  backgroundColor: rulesActiveTab === 0 ? '#fff' : 'transparent',
                  color: rulesActiveTab === 0 ? 'var(--primary)' : '#475569',
                  border: 'none',
                  fontWeight: rulesActiveTab === 0 ? 'bold' : 'normal',
                  boxShadow: rulesActiveTab === 0 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                🎁 ของรางวัล
              </button>
              <button
                type="button"
                onClick={() => setRulesActiveTab(1)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  margin: 0,
                  borderRadius: '6px',
                  backgroundColor: rulesActiveTab === 1 ? '#fff' : 'transparent',
                  color: rulesActiveTab === 1 ? 'var(--primary)' : '#475569',
                  border: 'none',
                  fontWeight: rulesActiveTab === 1 ? 'bold' : 'normal',
                  boxShadow: rulesActiveTab === 1 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                ❓ คำถาม & เงื่อนไข
              </button>
              <button
                type="button"
                onClick={() => setRulesActiveTab(2)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  margin: 0,
                  borderRadius: '6px',
                  backgroundColor: rulesActiveTab === 2 ? '#fff' : 'transparent',
                  color: rulesActiveTab === 2 ? 'var(--primary)' : '#475569',
                  border: 'none',
                  fontWeight: rulesActiveTab === 2 ? 'bold' : 'normal',
                  boxShadow: rulesActiveTab === 2 ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                📝 วิธีเขียนที่ถูกต้อง
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {rulesActiveTab === 0 && (
                <img src="rules_2.jpg" alt="รายการของรางวัล" style={{ maxWidth: '100%', maxHeight: '60vh', width: 'auto', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              )}
              {rulesActiveTab === 1 && (
                <img src="rules_1.jpg" alt="FAQ และ เงื่อนไข" style={{ maxWidth: '100%', maxHeight: '60vh', width: 'auto', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              )}
              {rulesActiveTab === 2 && (
                <img src="rules_3.jpg" alt="วิธีเขียนที่ถูกต้อง" style={{ maxWidth: '100%', maxHeight: '60vh', width: 'auto', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              )}
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowRulesModal(false)}
                style={{ width: '100%', padding: '0.6rem', fontWeight: 600, cursor: 'pointer' }}
              >
                ปิดหน้าจอนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {showGuideModal && (
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
          zIndex: 9999,
          padding: '1rem',
          boxSizing: 'border-box'
        }} onClick={() => setShowGuideModal(false)}>
          <div className="card glass-panel" style={{
            width: '100%',
            maxWidth: '650px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '1.5rem',
            boxSizing: 'border-box',
            textAlign: 'center',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: 'var(--secondary)', fontSize: '1.25rem', fontWeight: 700 }}>
                📱 ขั้นตอนโหวตเชียร์บอลโลกผ่านแอป Prompt Post
              </h3>
              <button 
                type="button" 
                onClick={() => setShowGuideModal(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Combined Steps Layout */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
              {/* Top Pair Overview/Rounds Images */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'center', 
                alignItems: 'center', 
                width: '100%', 
                maxWidth: '560px',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: '1 1 240px', maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--secondary)', marginBottom: '0.35rem' }}>⚽ ภาพรวม 4 ขั้นตอน</span>
                  <img src="guide_step4.jpg" alt="ภาพรวม 4 ขั้นตอน" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                </div>
                <div style={{ flex: '1 1 240px', maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--secondary)', marginBottom: '0.35rem' }}>🎁 ลุ้นรับโชค 2 รอบใหญ่</span>
                  <img src="guide_rounds.jpg" alt="ลุ้นรับโชค 2 รอบใหญ่" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                </div>
              </div>
              
              {/* 2x2 Grid for Step Detail Images */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '1rem', 
                width: '100%', 
                maxWidth: '560px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.35rem' }}>1. โหลด & สมัคร</span>
                  <img src="guide_step3.jpg" alt="ขั้นตอนโหลดและลงทะเบียน" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.35rem' }}>2. เข้าเมนูโหวต</span>
                  <img src="guide_step5.jpg" alt="ขั้นตอนคลิกเมนูโหวต" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.35rem' }}>3. เลือกทีม & จำนวน</span>
                  <img src="guide_step2.jpg" alt="ขั้นตอนการเลือกประเทศและจำนวน" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.35rem' }}>4. รอลุ้นโชคใหญ่</span>
                  <img src="guide_step1.jpg" alt="ขั้นตอนรอร่วมลุ้นโชค" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowGuideModal(false)}
                style={{ width: '100%', padding: '0.6rem', fontWeight: 600, cursor: 'pointer' }}
              >
                ปิดหน้าจอนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
