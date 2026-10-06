import React, { useEffect } from 'react';

const PremiumExperience: React.FC = () => {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;

    const updateScroll = () => {
      raf = 0;
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      root.style.setProperty(
        '--navigo-scroll-progress',
        String(Math.min(1, Math.max(0, window.scrollY / scrollable)))
      );
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

  // Enhance reveal elements without touching Ionic Router/page visibility.
  useEffect(() => {
    const revealAll = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach(node => {
        node.classList.add('is-visible');
      });
    };

    revealAll();

    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches('[data-reveal]')) node.classList.add('is-visible');
          revealAll(node);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <div className="navigo-pointer-aura" aria-hidden="true" />;
};

export default PremiumExperience;
