import { useEffect, useState } from 'react';

export const useDebounce = (value, wait = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), wait);
    return () => clearTimeout(timer);
  }, [value, wait]);

  return debounced;
};
