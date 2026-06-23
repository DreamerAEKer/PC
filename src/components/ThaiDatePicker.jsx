import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

export const formatThaiDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parts[1];
    const day = parts[2];
    const beYear = year + 543;
    return `${day}/${month}/${beYear}`;
  }
  return dateStr;
};

const ThaiDatePicker = React.forwardRef(({ watchValue, className, ...rest }, ref) => {
  const dateInputRef = useRef(null);

  const handleRef = (e) => {
    dateInputRef.current = e;
    if (typeof ref === 'function') ref(e);
    else if (ref) ref.current = e;
  };

  const handleClick = (e) => {
    // Only open picker if clicked on the visible container, not the hidden input
    if (dateInputRef.current && dateInputRef.current.showPicker) {
      try {
        dateInputRef.current.showPicker();
      } catch (err) {
        // Fallback for browsers that don't support showPicker (e.g., Safari on iOS might just focus)
        dateInputRef.current.focus();
      }
    } else if (dateInputRef.current) {
      dateInputRef.current.focus();
    }
  };

  return (
    <div 
      style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', cursor: 'pointer' }}
    >
      <input
        type="text"
        className={className}
        value={formatThaiDate(watchValue)}
        readOnly
        style={{ cursor: 'pointer', backgroundColor: '#fff', width: '100%' }}
        onClick={handleClick}
        placeholder="วว/ดด/ปปปป"
      />
      <Calendar size={18} style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: '#64748b' }} />
      <input
        type="date"
        ref={handleRef}
        {...rest}
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          opacity: 0, 
          cursor: 'pointer' 
        }}
      />
    </div>
  );
});

ThaiDatePicker.displayName = 'ThaiDatePicker';

export default ThaiDatePicker;
