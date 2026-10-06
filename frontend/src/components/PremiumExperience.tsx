import React, { useEffect } from 'react';

const PremiumExperience: React.FC = () => {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;

    const updateScroll = () => {
      raf = 0;
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      root.style.setProperty('--navigo-scroll-progress', String(Math.min(1, Math.max(0, window.scrollY / scrollable))));
    };

    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(updateScroll);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (window.matchMedia('(hover: none)').matches) return;
      root.style.setProperty('--navigo-pointer-x', event.clientX + 'px');
      root.style.setProperty('--navigo-pointer-y', event.clientY + 'px');
    };

    updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!nodes.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      nodes.forEach(node => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  });

  return <div className="navigo-pointer-aura" aria-hidden="true" />;
};

export default PremiumExperience;
