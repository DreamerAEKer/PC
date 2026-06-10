import React, { useState, useEffect, useRef } from 'react';
import { useThaiAddress } from 'use-thai-address';
import { Info } from 'lucide-react';

export default function ThaiAddressFields({ register, setValue, errors, defaultValues, dirtyFields, touchedFields, isAddressRequired = true }) {
  const { filteredData, searchByField, reset } = useThaiAddress();
  const [activeField, setActiveField] = useState(null); // 'subdistrict', 'district', 'province', 'zipcode'
  const containerRef = useRef(null);

  useEffect(() => {
    // Handle click outside to close suggestions
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setActiveField(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    setValue('subdistrict', item.subDistrict, { shouldValidate: true });
    setValue('district', item.district, { shouldValidate: true });
    setValue('province', item.province, { shouldValidate: true });
    setValue('zipcode', item.zipCode, { shouldValidate: true });
    setActiveField(null);
    reset();
  };

  const handleInput = (field, value) => {
    if (value.length > 0) {
      searchByField(field, value);
      if (field === 'subDistrict') setActiveField('subdistrict');
      else if (field === 'district') setActiveField('district');
      else if (field === 'province') setActiveField('province');
      else if (field === 'zipCode') setActiveField('zipcode');
    } else {
      setActiveField(null);
      reset();
    }
  };

  // Setup register handlers manually so we can intercept onChange
  const subdistrictReg = register("subdistrict", { required: isAddressRequired });
  const districtReg = register("district", { required: isAddressRequired });
  const provinceReg = register("province", { required: isAddressRequired });
  const zipcodeReg = register("zipcode", { required: isAddressRequired });

  const getFieldClass = (fieldName) => {
    if (!dirtyFields || !touchedFields) return errors[fieldName] ? 'input-error' : '';
    if (errors[fieldName]) return 'input-error';
    if (dirtyFields[fieldName] || touchedFields[fieldName]) return 'input-success';
    return '';
  };

  const renderSuggestionsDropdown = (fieldName) => {
    if (activeField !== fieldName || !filteredData || filteredData.length === 0) return null;

    return (
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        maxHeight: '200px',
        overflowY: 'auto',
        zIndex: 1000,
        boxShadow: 'var(--shadow-lg)',
        marginTop: '2px'
      }}>
        {filteredData.map((item, idx) => {
          const isBKK = item.province === 'กรุงเทพมหานคร';
          const subTitle = isBKK ? `แขวง${item.subDistrict}` : `ต.${item.subDistrict}`;
          const distTitle = isBKK ? `เขต${item.district}` : `อ.${item.district}`;
          const provTitle = isBKK ? item.province : `จ.${item.province}`;
          
          return (
            <div key={idx} 
                 style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', color: '#1e293b', textAlign: 'left' }}
                 onClick={() => handleSelect(item)}
                 onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                 onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {subTitle} {distTitle} {provTitle} {item.zipCode}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef}>
      <div className="form-group">
        <label className="form-label">ที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน) {isAddressRequired && <span style={{color:'red'}}>*</span>}</label>
        <input type="text" className={`form-control ${getFieldClass('addressLine1')}`} required={isAddressRequired} {...register("addressLine1", { required: isAddressRequired })} placeholder="ระบุบ้านเลขที่ หมู่ ซอย ถนน" defaultValue={defaultValues?.addressLine1 || ''} />
        {errors.addressLine1 && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุที่อยู่</span>}
      </div>

      <div style={{ 
        display: 'flex', gap: '0.5rem', alignItems: 'flex-start', 
        padding: '0.75rem', backgroundColor: '#eff6ff', 
        borderLeft: '4px solid var(--secondary)', borderRadius: '4px',
        marginBottom: '1rem', fontSize: '0.9rem', color: '#1e3a8a'
      }}>
        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>ตัวช่วยพิมพ์:</strong> พิมพ์ค้นหาที่ช่อง <strong>ตำบล, อำเภอ, จังหวัด หรือ รหัสไปรษณีย์</strong> ช่องใดช่องหนึ่ง ระบบจะแสดงตัวเลือก และเติมข้อมูลช่องอื่นให้อัตโนมัติ 🪄
        </div>
      </div>
      
      {/* รหัสไปรษณีย์ */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <label className="form-label">รหัสไปรษณีย์ {isAddressRequired && <span style={{color:'red'}}>*</span>}</label>
          <input type="text" className={`form-control ${getFieldClass('zipcode')}`} required={isAddressRequired} 
            name={zipcodeReg.name}
            ref={zipcodeReg.ref}
            onBlur={zipcodeReg.onBlur}
            onChange={(e) => {
              zipcodeReg.onChange(e);
              handleInput('zipCode', e.target.value);
            }}
            autoComplete="off"
            placeholder="รหัสไปรษณีย์"
            defaultValue={defaultValues?.zipcode || ''}
          />
          {errors.zipcode && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุรหัสไปรษณีย์</span>}
          {renderSuggestionsDropdown('zipcode')}
        </div>
      </div>

      {/* ตำบล / แขวง & อำเภอ / เขต */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <label className="form-label">ตำบล / แขวง {isAddressRequired && <span style={{color:'red'}}>*</span>}</label>
          <input type="text" className={`form-control ${getFieldClass('subdistrict')}`} required={isAddressRequired} 
            name={subdistrictReg.name}
            ref={subdistrictReg.ref}
            onBlur={subdistrictReg.onBlur}
            onChange={(e) => {
              subdistrictReg.onChange(e);
              handleInput('subDistrict', e.target.value);
            }}
            autoComplete="off"
            placeholder="ชื่อตำบล"
            defaultValue={defaultValues?.subdistrict || ''}
          />
          {errors.subdistrict && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุตำบล</span>}
          {renderSuggestionsDropdown('subdistrict')}
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <label className="form-label">อำเภอ / เขต {isAddressRequired && <span style={{color:'red'}}>*</span>}</label>
          <input type="text" className={`form-control ${getFieldClass('district')}`} required={isAddressRequired} 
            name={districtReg.name}
            ref={districtReg.ref}
            onBlur={districtReg.onBlur}
            onChange={(e) => {
              districtReg.onChange(e);
              handleInput('district', e.target.value);
            }}
            autoComplete="off"
            placeholder="ชื่ออำเภอ"
            defaultValue={defaultValues?.district || ''}
          />
          {errors.district && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุอำเภอ</span>}
          {renderSuggestionsDropdown('district')}
        </div>
      </div>

      {/* จังหวัด */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <label className="form-label">จังหวัด {isAddressRequired && <span style={{color:'red'}}>*</span>}</label>
          <input type="text" className={`form-control ${getFieldClass('province')}`} required={isAddressRequired} 
            name={provinceReg.name}
            ref={provinceReg.ref}
            onBlur={provinceReg.onBlur}
            onChange={(e) => {
              provinceReg.onChange(e);
              handleInput('province', e.target.value);
            }}
            autoComplete="off"
            placeholder="ชื่อจังหวัด"
            defaultValue={defaultValues?.province || ''}
          />
          {errors.province && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุจังหวัด</span>}
          {renderSuggestionsDropdown('province')}
        </div>
      </div>
    </div>
  );
}
