import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, CheckCircle, Clock, Share2 } from 'lucide-react';
import ThaiAddressFields from '../components/ThaiAddressFields';

export default function CustomerForm() {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, dirtyFields, touchedFields } } = useForm({ mode: 'onChange' });

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

  const didValue = watch("did", "");
  const isDidActive = (didValue || "").trim().length === 6;

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

  const [generatedData, setGeneratedData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const cardRef = useRef(null);

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
          setValue(key, data[key]);
        });
      } catch (e) {}
    } else {
      setQuantityFields(100);
    }
  }, [setValue]);

  const formValues = watch();
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('customerFormData', JSON.stringify(formValues));
    }, 500);
    return () => clearTimeout(timeout);
  }, [formValues]);

  const onSubmit = async (data) => {
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
    
    const resolvedQty = data.selectQuantity === "custom" ? (parseInt(data.customQuantity, 10) || 0) : (parseInt(data.selectQuantity, 10) || 0);

    const currentBranch = getBranchFromUrl();

    const processedData = {
      ...data,
      quantity: resolvedQty,
      address: fullAddress,
      isDidActive,
      branch: currentBranch
    };

    // Remove select helper fields from QR payload
    delete processedData.selectQuantity;
    delete processedData.customQuantity;

    // Create a payload string (JSON) for the QR code using compressed format
    const compressedData = {
      d: processedData.orderDate,
      q: processedData.quantity,
      n: processedData.name,
      p: processedData.phone,
      a: processedData.addressLine1 || '',
      sd: processedData.subdistrict || '',
      dt: processedData.district || '',
      pv: processedData.province || '',
      zp: processedData.zipcode || '',
      id: processedData.did || ''
    };
    const payload = JSON.stringify(compressedData);
    setGeneratedData({ ...processedData, payload });
    setIsModalOpen(true);

    // Save to history
    const newRecord = { ...processedData, id: Date.now(), timestamp: new Date().toISOString() };
    const updatedHistory = [newRecord, ...history].slice(0, 10); // Keep last 10
    setHistory(updatedHistory);
    localStorage.setItem('customerHistory', JSON.stringify(updatedHistory));
  };

  const onError = () => {
    // We can still show an alert, but inline errors will also be visible
    alert("กรุณากรอกข้อมูลให้ครบถ้วนในช่องที่จำเป็นก่อนทำการสร้างข้อมูลครับ");
  };

  const getFileName = () => {
    if (!generatedData) return `postcard-${Date.now()}.png`;
    // Remove characters that are not allowed in file names
    const safeName = generatedData.name.replace(/[<>:"/\\|?*]/g, '').trim();
    // Format: ชื่อ-สกุล_จำนวนใบ_วันที่.png
    return `${safeName}_${generatedData.quantity}ใบ_${generatedData.orderDate}.png`;
  };

  const downloadImage = async () => {
    if (cardRef.current) {
      const canvas = await html2canvas(cardRef.current, { scale: 2 });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName();
      a.click();
    }
  };

  const shareToLine = async () => {
    const textToShare = generatedData.isDidActive
      ? `ข้อมูลผู้รับ\nชื่อ: ${generatedData.name}\nเบอร์โทร: ${generatedData.phone}\nD-ID: ${generatedData.did}`
      : `ข้อมูลผู้รับ\nชื่อ: ${generatedData.name}\nเบอร์โทร: ${generatedData.phone}\nที่อยู่: ${generatedData.address} ${generatedData.zipcode}${generatedData.did ? `\nD-ID: ${generatedData.did}` : ''}`;
    
    if (navigator.canShare && cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, { scale: 2 });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const file = new File([blob], getFileName(), { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'ข้อมูลผู้รับ',
              text: 'รูปภาพข้อมูลผู้รับ สำหรับการพิมพ์ไปรษณียบัตร'
            });
            return;
          }
        }
      } catch (e) {
        console.error('Share error:', e);
      }
    }
    
    // Fallback: Share text to LINE app/web directly
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(textToShare)}`;
    window.open(lineUrl, '_blank');
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 400px' }}>
        <div className="card glass-panel">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CheckCircle color="var(--primary)" />
            กรอกข้อมูลเพื่อสั่งพิมพ์ไปรษณียบัตร
          </h2>
          <form onSubmit={handleSubmit(onSubmit, onError)}>
            <div className="form-group">
              <label className="form-label">วันที่สั่งจอง <span style={{color:'red'}}>*</span></label>
              <input type="date" className={`form-control ${getFieldClass('orderDate')}`} required {...register("orderDate", { required: true })} defaultValue={new Date().toISOString().split('T')[0]} />
              {errors.orderDate && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุวันที่สั่งจอง</span>}
            </div>
            <div className="form-group">
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
            </div>

            {selectQty === 'custom' && (
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>จำนวนที่ต้องการระบุเอง <span style={{color:'red'}}>*</span></label>
                <input 
                  type="number" 
                  min="1" 
                  className={`form-control ${getFieldClass('customQuantity')}`} 
                  required 
                  {...register("customQuantity", { required: true, min: 1 })} 
                  placeholder="กรอกจำนวนใบ เช่น 150" 
                />
                {errors.customQuantity && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุจำนวนอย่างน้อย 1 ใบ</span>}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">ชื่อ-นามสกุล <span style={{color:'red'}}>*</span></label>
              <input type="text" className={`form-control ${getFieldClass('name')}`} required {...register("name", { required: true })} placeholder="ระบุชื่อและนามสกุล" />
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
            <ThaiAddressFields register={register} setValue={setValue} errors={errors} dirtyFields={dirtyFields} touchedFields={touchedFields} isAddressRequired={!isDidActive} />
            <div className="form-group">
              <label className="form-label">ที่อยู่ D-ID (ไปรษณีย์ไทย)</label>
              <input type="text" className="form-control" {...register("did")} placeholder="ถ้ามี (ตัวเลือก)" />
            </div>
            <div style={{ marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                สร้างข้อมูล / สร้างรูปภาพ
              </button>
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
                <QRCodeCanvas value={generatedData.payload} size={130} level="Q" />
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
              <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.4rem', paddingRight: '170px' }}>ข้อมูลผู้รับ (สำหรับการพิมพ์)</h2>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
                วันที่สั่งจอง: {generatedData.orderDate} | จำนวน: {generatedData.quantity} ใบ<br/>
                รับจองโดย: {generatedData.branch || 'ไปรษณีย์กลาง 10501'}
              </div>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: '600' }}>
                ชื่อ: {generatedData.name}
              </div>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                เบอร์โทร: {generatedData.phone}
              </div>
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
          <div className="card glass-panel" style={{
            width: '100%',
            maxWidth: '420px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '1.5rem',
            boxSizing: 'border-box',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 700 }}>
              🎟️ ตั๋วจองไปรษณียบัตร
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', fontWeight: 500 }}>
              ยื่นหน้าจอนี้ให้เจ้าหน้าที่สแกนได้ทันที
            </div>

            {/* QR Code Container */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#fff',
              padding: '1.25rem 1rem 1rem 1rem',
              borderRadius: '12px',
              border: '2px solid var(--primary)',
              width: 'fit-content',
              margin: '1rem auto 1.25rem auto',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.15)',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'absolute', 
                top: '-0.75rem', 
                backgroundColor: 'var(--primary)', 
                color: '#fff', 
                fontSize: '0.75rem', 
                fontWeight: 'bold', 
                padding: '0.15rem 0.6rem', 
                borderRadius: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                QR สำหรับสั่งพิมพ์
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <QRCodeCanvas value={generatedData.payload} size={200} level="Q" />
              </div>
            </div>

            {/* Short Details */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'left',
              marginBottom: '1.5rem',
              border: '1px solid #e2e8f0',
              fontSize: '0.95rem',
              lineHeight: '1.6'
            }}>
              <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                📍 รับจองโดย: {generatedData.branch || 'ไปรษณีย์กลาง 10501'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>ชื่อผู้รับ:</span>
                <strong style={{ color: '#0f172a' }}>{generatedData.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>เบอร์โทร:</span>
                <strong style={{ color: '#0f172a' }}>{generatedData.phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>จำนวนที่จอง:</span>
                <strong style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>{generatedData.quantity} ใบ</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>วันที่สั่งจอง:</span>
                <strong style={{ color: '#0f172a' }}>{generatedData.orderDate}</strong>
              </div>
              {generatedData.did && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>D-ID:</span>
                  <strong style={{ color: 'var(--secondary)' }}>{generatedData.did}</strong>
                </div>
              )}
            </div>

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
              
              <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary" style={{ width: '100%', padding: '0.6rem', fontWeight: 600 }}>
                ปิดหน้าจอนี้ (กลับไปแก้ไข)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
