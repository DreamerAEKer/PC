export const FINALIST_COUNTRIES = [
  { key: 'spain', label: 'สเปน' },
  { key: 'argentina', label: 'อาร์เจนตินา' },
];

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
