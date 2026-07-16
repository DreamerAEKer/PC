export const DEFAULT_FINALIST_SETTINGS = {
  firstCountry: 'สเปน',
  secondCountry: 'อาร์เจนตินา',
};

export const normalizeFinalistSettings = (settings = {}) => ({
  firstCountry: String(settings.firstCountry || '').trim() || DEFAULT_FINALIST_SETTINGS.firstCountry,
  secondCountry: String(settings.secondCountry || '').trim() || DEFAULT_FINALIST_SETTINGS.secondCountry,
});

export const getFinalistSettingsDocId = (branchCode) => `finalists-${String(branchCode || '10501').replace(/[^0-9A-Za-z_-]/g, '') || '10501'}`;

export const getFinalistCountries = (settings) => {
  const normalized = normalizeFinalistSettings(settings);
  return [
    { key: 'spain', label: normalized.firstCountry },
    { key: 'argentina', label: normalized.secondCountry },
  ];
};

export const normalizeFinalPrediction = (spain, argentina) => ({
  spain: Math.max(0, Number.parseInt(spain, 10) || 0),
  argentina: Math.max(0, Number.parseInt(argentina, 10) || 0),
});

export const validateFinalPrediction = (prediction, orderQuantity) => {
  const normalized = normalizeFinalPrediction(prediction?.spain, prediction?.argentina);
  const total = normalized.spain + normalized.argentina;
  return {
    ...normalized,
    total,
    isValid: total === (Number.parseInt(orderQuantity, 10) || 0),
  };
};
