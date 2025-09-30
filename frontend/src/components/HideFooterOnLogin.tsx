"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function HideFooterOnLogin() {
  const pathname = usePathname();

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) {
      if (pathname === '/login') {
        footer.style.display = 'none';
      } else {
        footer.style.display = '';
      }
    }
  }, [pathname]);

  return null;
}
