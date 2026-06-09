import React, { useState, useEffect, useRef } from 'react';
import { useThaiAddress } from 'use-thai-address';

export default function ThaiAddressFields({ register, setValue, errors, defaultValues }) {
  const { filteredData, searchByField, reset } = useThaiAddress();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Handle click outside to close suggestions
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
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
    setShowSuggestions(false);
    reset();
  };

  const handleInput = (field, value) => {
    if (value.length > 0) {
      searchByField(field, value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      reset();
    }
  };

  // Setup register handlers manually so we can intercept onChange
  const subdistrictReg = register("subdistrict", { required: true });
  const districtReg = register("district", { required: true });
  const provinceReg = register("province", { required: true });
  const zipcodeReg = register("zipcode", { required: true });

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <div className="form-group">
        <label className="form-label">ที่อยู่ (บ้านเลขที่, หมู่, ซอย, ถนน) <span style={{color:'red'}}>*</span></label>
        <input type="text" className={`form-control ${errors.addressLine1 ? 'input-error' : ''}`} required {...register("addressLine1", { required: true })} placeholder="ระบุบ้านเลขที่ หมู่ ซอย ถนน" defaultValue={defaultValues?.addressLine1 || ''} />
        {errors.addressLine1 && <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>กรุณาระบุที่อยู่</span>}
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">ตำบล / แขวง <span style={{color:'red'}}>*</span></label>
          <input type="text" className={`form-control ${errors.subdistrict ? 'input-error' : ''}`} required 
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
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label">อำเภอ / เขต <span style={{color:'red'}}>*</span></label>
          <input type="text" className={`form-control ${errors.district ? 'input-error' : ''}`} required 
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
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <label className="form-label">จังหวัด <span style={{color:'red'}}>*</span></label>
          <input type="text" className={`form-control ${errors.province ? 'input-error' : ''}`} required 
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
        </div>
        <div style={{ flex: 1 }}>
          <label className="form-label">รหัสไปรษณีย์ <span style={{color:'red'}}>*</span></label>
          <input type="text" className={`form-control ${errors.zipcode ? 'input-error' : ''}`} required 
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
        </div>
      </div>

      {showSuggestions && filteredData && filteredData.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'white', border: '1px solid var(--border)', borderRadius: '8px',
          maxHeight: '200px', overflowY: 'auto', zIndex: 100, boxShadow: 'var(--shadow-lg)'
        }}>
          {filteredData.map((item, idx) => (
            <div key={idx} 
                 style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                 onClick={() => handleSelect(item)}
                 onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                 onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ต.{item.subDistrict} อ.{item.district} จ.{item.province} {item.zipCode}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
