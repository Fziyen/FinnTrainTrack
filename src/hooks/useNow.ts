import { useEffect, useState } from 'react';

export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => { if (!document.hidden) setNow(Date.now()); };
    const timer = setInterval(update, 15000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  return now;
}
