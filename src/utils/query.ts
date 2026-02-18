export const getSingleQueryParam = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : undefined;
  }
  return typeof value === 'string' ? value : undefined;
};