import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Download, CheckCircle, Clock, Share2 } from 'lucide-react';
import ThaiAddressFields from '../components/ThaiAddressFields';

export default function CustomerForm() {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, dirtyFields, touchedFields } } = useForm({ mode: 'onChange' });

  const quantity = watch("quantity", 1);
  const totalPrice = (parseInt(quantity, 10) || 0) * 3;

  const getFieldClass = (fieldName) => {
    if (errors[fieldName]) return 'input-error';
    if (dirtyFields[fieldName] || touchedFields[fieldName]) return 'input-success';
    return '';
  };
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
    // Process address into a single string for display and old-compatibility
    const isBKK = data.province === 'กรุงเทพมหานคร';
    const subTitle = isBKK ? `แขวง${data.subdistrict}` : `ต.${data.subdistrict}`;
    const distTitle = isBKK ? `เขต${data.district}` : `อ.${data.district}`;
    const provTitle = isBKK ? data.province : `จ.${data.province}`;
    
    const fullAddress = `${data.addressLine1} ${subTitle} ${distTitle} ${provTitle}`;
    const processedData = {
      ...data,
      address: fullAddress
    };

    // Create a payload string (JSON) for the QR code
    const payload = JSON.stringify(processedData);
    setGeneratedData({ ...processedData, payload });

    // Save to history
    const newRecord = { ...data, address: fullAddress, id: Date.now(), timestamp: new Date().toISOString() };
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
    const textToShare = `ข้อมูลผู้รับ\nชื่อ: ${generatedData.name}\nเบอร์โทร: ${generatedData.phone}\nที่อยู่: ${generatedData.address} ${generatedData.zipcode}${generatedData.did ? `\nD-ID: ${generatedData.did}` : ''}`;
    
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
            <ThaiAddressFields register={register} setValue={setValue} errors={errors} dirtyFields={dirtyFields} touchedFields={touchedFields} />
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
                    const payload = JSON.stringify({
                      orderDate: record.orderDate,
                      quantity: record.quantity,
                      name: record.name,
                      phone: record.phone,
                      address: record.address,
                      addressLine1: record.addressLine1,
                      subdistrict: record.subdistrict,
                      district: record.district,
                      province: record.province,
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
