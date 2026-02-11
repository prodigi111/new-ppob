import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function PaymentBadges({ size = 'md' }) {
  const [icons, setIcons] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/payment-icons`)
      .then(r => r.json())
      .then(d => setIcons((d.icons || []).filter(ic => ic.icon)))
      .catch(() => {});
  }, []);

  if (!icons.length) return null;

  const dims = size === 'sm' 
    ? 'h-8 min-w-[80px]' 
    : size === 'lg' 
    ? 'h-12 min-w-[110px]' 
    : 'h-10 min-w-[90px]';

  const imgH = size === 'sm' ? 'h-5' : size === 'lg' ? 'h-8' : 'h-6';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {icons.map((ic, i) => (
        <div key={i} className={`bg-white rounded-md ${dims} px-3 flex items-center justify-center`}>
          <img src={ic.icon} alt={ic.name} title={ic.name} className={`${imgH} max-w-full object-contain`} />
        </div>
      ))}
    </div>
  );
}
