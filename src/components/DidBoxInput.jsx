import React, { useRef } from 'react';

export default function DidBoxInput({ value, onChange }) {
  // Ensure value is a string of length 6
  const valString = String(value || '').padEnd(6, ' ').substring(0, 6);
  const inputsRef = useRef([]);

  const handleCharChange = (index, char) => {
    const cleanChar = char.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const arr = valString.split('');
    arr[index] = cleanChar || ' ';
    const newVal = arr.join('').trimEnd();
    onChange(newVal);

    // Auto-focus next box if a character is entered
    if (cleanChar && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const arr = valString.split('');
      if (!arr[index] || arr[index] === ' ') {
        // If current box is empty, move focus to previous and clear it
        if (index > 0) {
          e.preventDefault();
          arr[index - 1] = ' ';
          onChange(arr.join('').trimEnd());
          inputsRef.current[index - 1]?.focus();
        }
      } else {
        // Clear current box
        arr[index] = ' ';
        onChange(arr.join('').trimEnd());
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
    if (pastedText) {
      onChange(pastedText);
      // Focus the last input or next empty input
      const nextFocusIdx = Math.min(5, pastedText.length);
      inputsRef.current[nextFocusIdx]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '1rem 0' }}>
      <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
        หมายเลข D/ID
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const char = valString[idx] === ' ' ? '' : valString[idx];
          return (
            <input
              key={idx}
              ref={(el) => (inputsRef.current[idx] = el)}
              type="text"
              maxLength={1}
              value={char}
              onChange={(e) => handleCharChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              style={{
                width: '45px',
                height: '45px',
                textAlign: 'center',
                fontSize: '1.25rem',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                outline: 'none',
                transition: 'border-color 0.2s',
                textTransform: 'uppercase',
                backgroundColor: '#fff',
                color: '#1e293b'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 3px rgba(225, 29, 72, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
