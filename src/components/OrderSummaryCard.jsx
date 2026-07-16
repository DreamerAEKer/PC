import React from 'react';
import { Package, Calendar, Phone, MapPin, Hash, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import generatePayload from 'promptpay-qr';

export default function OrderSummaryCard({ record, indexInfo = null }) {
  if (!record) return null;

  // Fallback defaults
  const orderCode = record.orderCode || record.oc || '-';
  const name = record.name || record.n || '-';
  const phone = record.phone || record.p || '-';
  const quantity = record.quantity || record.q || 100;
  const orderDate = record.orderDate || record.d || new Date().toISOString().split('T')[0];
  const finalPrediction = record.finalPrediction || record.pr || null;
  
  // Format Address
  let addressDisplay = record.address || record.a || '-';
  if (record.addressLine1 || record.province || record.pv) {
    const addr1 = record.addressLine1 || record.a || '';
    const sd = record.subdistrict || record.sd || '';
    const dt = record.district || record.dt || '';
    const pv = record.province || record.pv || '';
    const zip = record.zipcode || record.zp || '';
    addressDisplay = (
      <>
        {addr1} {sd} <br />
        {dt} {pv} <br />
        <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{zip}</span>
      </>
    );
  }

  return (
    <div 
      className="order-summary-card"
      style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '16px', 
        padding: '1.5rem', 
        width: '100%', 
        maxWidth: '380px', 
        margin: '0 auto',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#0f172a',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
        border: '1px solid #f1f5f9',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', backgroundColor: 'var(--primary, #e11d48)' }} />
      
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px dashed #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0.5rem 0 0 0', color: 'var(--primary, #e11d48)', fontSize: '1.25rem', fontWeight: '800' }}>
          📝 สรุปการสั่งพิมพ์
        </h3>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
          PostcardApp ไปรษณียบัตรทายผล
        </div>
        {indexInfo && (
          <div style={{ 
            display: 'inline-block',
            marginTop: '0.75rem',
            backgroundColor: '#fff1f2',
            color: '#be123c',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>
            {indexInfo}
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem' }}>
        
        {/* Order Code */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: '90px' }}>
            <Hash size={14} /> รหัสสั่งพิมพ์
          </div>
          <div style={{ fontWeight: 'bold', color: 'var(--primary, #e11d48)', textAlign: 'right', wordBreak: 'break-word' }}>
            {orderCode}
          </div>
        </div>
        
        {/* Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: '90px' }}>
            <Calendar size={14} /> วันที่สั่งจอง
          </div>
          <div style={{ fontWeight: '600', textAlign: 'right' }}>
            {orderDate}
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.25rem 0' }} />

        {/* Name */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: '90px' }}>
            <User size={14} /> ชื่อผู้รับ
          </div>
          <div style={{ fontWeight: 'bold', textAlign: 'right', fontSize: '1rem' }}>
            {name}
          </div>
        </div>
        
        {/* Phone */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: '90px' }}>
            <Phone size={14} /> เบอร์โทร
          </div>
          <div style={{ fontWeight: '600', textAlign: 'right' }}>
            {phone}
          </div>
        </div>
        
        {/* Address */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: '90px', marginTop: '0.15rem' }}>
            <MapPin size={14} /> ที่อยู่
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', lineHeight: '1.5', color: '#334155' }}>
            {addressDisplay}
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.25rem 0' }} />

        {/* Quantity */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
          <div style={{ color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}>
            <Package size={16} color="var(--primary, #e11d48)" /> จำนวน
          </div>
          <div style={{ fontWeight: '900', color: 'var(--primary, #e11d48)', fontSize: '1.25rem' }}>
            {quantity} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'normal' }}>ใบ</span>
          </div>
        </div>

        {finalPrediction && (
          <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div style={{ fontWeight: '800', color: '#1e3a8a', marginBottom: '0.4rem' }}>⚽ ทายผลคู่ชิง</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', color: '#1e293b' }}>
              <span>{finalPrediction.firstCountry || 'สเปน'} <strong>{finalPrediction.spain || 0} ใบ</strong></span>
              <span>{finalPrediction.secondCountry || 'อาร์เจนตินา'} <strong>{finalPrediction.argentina || 0} ใบ</strong></span>
            </div>
          </div>
        )}

        {/* Payment QR Section */}
        <div style={{ marginTop: '1rem', padding: '0.75rem', border: '2px dashed #0369a1', borderRadius: '12px', backgroundColor: '#f0f9ff', textAlign: 'center' }}>
          <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '8px', display: 'inline-block', marginBottom: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <QRCodeSVG value={generatePayload("3102200272042", { amount: quantity * 3 })} size={140} />
          </div>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem', color: '#0c4a6e', lineHeight: '1.4' }}>โปรดส่งสลิปในไลน์<br/>พร้อมการ์ดสั่งพิมพ์</p>
        </div>

      </div>
    </div>
  );
}
