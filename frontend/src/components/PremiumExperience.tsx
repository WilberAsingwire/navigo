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
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let observer: IntersectionObserver | null = null;

    const reveal = (node: Element) => {
      if (reduced) {
        node.classList.add('is-visible');
        return;
      }
      observer?.observe(node);
    };

    if (!reduced) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    }

    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(reveal);

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches('[data-reveal]')) reveal(node);
          node.querySelectorAll<HTMLElement>('[data-reveal]').forEach(reveal);
        });
      }
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer?.disconnect();
    };
  }, []);

  return <div className="navigo-pointer-aura" aria-hidden="true" />;
};

export default PremiumExperience;
