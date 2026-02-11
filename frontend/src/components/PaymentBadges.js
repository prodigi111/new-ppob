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

  const h = size === 'sm' ? 'h-5' : size === 'lg' ? 'h-8' : 'h-6';
  const pad = size === 'sm' ? 'px-1.5 py-1' : size === 'lg' ? 'px-3 py-2' : 'px-2 py-1.5';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {icons.map((ic, i) => (
        <div key={i} className={`bg-white rounded-md ${pad} flex items-center justify-center`}>
          <img src={ic.icon} alt={ic.name} title={ic.name} className={`${h} object-contain`} />
        </div>
      ))}
    </div>
  );
}
