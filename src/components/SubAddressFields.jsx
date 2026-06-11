import React, { useState, useEffect, useRef } from 'react';
import { useThaiAddress } from 'use-thai-address';
import { Info } from 'lucide-react';

export default function SubAddressFields({ value, onChange }) {
  const { filteredData, searchByField, reset } = useThaiAddress();
  const [activeField, setActiveField] = useState(null);
  const containerRef = useRef(null);

  const [fields, setFields] = useState({
    addressLine1: value?.addressLine1 || '',
    subdistrict: value?.subdistrict || '',
    district: value?.district || '',
    province: value?.province || '',
    zipcode: value?.zipcode || ''
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActiveField(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateField = (name, val) => {
    const updated = { ...fields, [name]: val };
    setFields(updated);
    onChange(updated);
  };

  const handleSelect = (item) => {
    const updated = {
      ...fields,
      subdistrict: item.subDistrict,
      district: item.district,
      province: item.province,
      zipcode: item.zipCode
    };
    setFields(updated);
    onChange(updated);
    setActiveField(null);
    reset();
  };

  const handleInput = (field, val) => {
    if (val.length > 0) {
      searchByField(field, val);
      if (field === 'subDistrict') setActiveField('subdistrict');
      else if (field === 'district') setActiveField('district');
      else if (field === 'province') setActiveField('province');
      else if (field === 'zipCode') setActiveField('zipcode');
    } else {
      setActiveField(null);
      reset();
    }
  };

  const renderDropdown = (fieldName) => {
    if (activeField !== fieldName || !filteredData || filteredData.length === 0) return null;
    return (
      <div style={{
        position: 'absolute', top: '100%', left: 0, right: 0,
        background: 'white', border: '1px solid #fde047',
        borderRadius: '8px', maxHeight: '180px', overflowY: 'auto',
        zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', marginTop: '2px'
      }}>
        {filteredData.map((item, idx) => {
          const isBKK = item.province === 'กรุงเทพมหานคร';
          const subTitle = isBKK ? `แขวง${item.subDistrict}` : `ต.${item.subDistrict}`;
          const distTitle = isBKK ? `เขต${item.district}` : `อ.${item.district}`;
          const provTitle = isBKK ? item.province : `จ.${item.province}`;
          return (
            <div key={idx}
              style={{ padding: '0.55rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #fef9c3', fontSize: '0.82rem', color: '#1e293b', textAlign: 'left' }}
              onClick={() => handleSelect(item)}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef9c3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {subTitle} {distTitle} {provTitle} {item.zipCode}
            </div>
          );
        })}
      </div>
    );
  };

  const inputStyle = {
    width: '100%',
    padding: '0.4rem 0.55rem',
    fontSize: '0.88rem',
    border: '1.5px solid #fde047',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    backgroundColor: '#fff'
  };

  const labelStyle = {
    fontSize: '0.78rem',
    fontWeight: 'bold',
    display: 'block',
    marginBottom: '0.2rem',
    color: '#78350f'
  };

  return (
    <div ref={containerRef} style={{ marginTop: '0.75rem' }}>
      {/* Helper hint */}
      <div style={{
        display: 'flex', gap: '0.4rem', alignItems: 'flex-start',
        padding: '0.45rem 0.65rem',
        backgroundColor: '#fef9c3',
        borderLeft: '3px solid #f59e0b',
        borderRadius: '4px',
        marginBottom: '0.65rem',
        fontSize: '0.78rem',
        color: '#78350f'
      }}>
        <Info size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>ตัวช่วยพิมพ์:</strong> พิมพ์ค้นหาที่ช่อง <strong>ตำบล, อำเภอ, จังหวัด หรือ รหัสไปรษณีย์</strong> ระบบจะเติมข้อมูลช่องอื่นให้อัตโนมัติ 🪄
        </div>
      </div>

      {/* บ้านเลขที่ */}
      <div style={{ marginBottom: '0.45rem' }}>
        <label style={labelStyle}>ที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน) <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          style={inputStyle}
          value={fields.addressLine1}
          onChange={(e) => updateField('addressLine1', e.target.value)}
          placeholder="ระบุบ้านเลขที่ หมู่ ซอย ถนน"
        />
      </div>

      {/* รหัสไปรษณีย์ */}
      <div style={{ marginBottom: '0.45rem', position: 'relative' }}>
        <label style={labelStyle}>รหัสไปรษณีย์ <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          style={inputStyle}
          value={fields.zipcode}
          onChange={(e) => { updateField('zipcode', e.target.value); handleInput('zipCode', e.target.value); }}
          autoComplete="off"
          placeholder="รหัสไปรษณีย์"
        />
        {renderDropdown('zipcode')}
      </div>

      {/* ตำบล + อำเภอ */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.45rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <label style={labelStyle}>ตำบล / แขวง <span style={{ color: 'red' }}>*</span></label>
          <input
            type="text"
            style={inputStyle}
            value={fields.subdistrict}
            onChange={(e) => { updateField('subdistrict', e.target.value); handleInput('subDistrict', e.target.value); }}
            autoComplete="off"
            placeholder="ชื่อตำบล"
          />
          {renderDropdown('subdistrict')}
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <label style={labelStyle}>อำเภอ / เขต <span style={{ color: 'red' }}>*</span></label>
          <input
            type="text"
            style={inputStyle}
            value={fields.district}
            onChange={(e) => { updateField('district', e.target.value); handleInput('district', e.target.value); }}
            autoComplete="off"
            placeholder="ชื่ออำเภอ"
          />
          {renderDropdown('district')}
        </div>
      </div>

      {/* จังหวัด */}
      <div style={{ position: 'relative' }}>
        <label style={labelStyle}>จังหวัด <span style={{ color: 'red' }}>*</span></label>
        <input
          type="text"
          style={inputStyle}
          value={fields.province}
          onChange={(e) => { updateField('province', e.target.value); handleInput('province', e.target.value); }}
          autoComplete="off"
          placeholder="ชื่อจังหวัด"
        />
        {renderDropdown('province')}
      </div>
    </div>
  );
}
