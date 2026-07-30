export function normalizeNavigationStepIndex(value, maximum = 500) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return 0;
  return Math.min(number, maximum);
}
