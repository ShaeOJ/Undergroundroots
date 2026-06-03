// main.js — Undergroundroots site interactions

// ── Scroll reveal ─────────────────────────────────────────
(function () {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    observer.unobserve(e.target);
                }
            });
        },
        { threshold: 0.12 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
})();

// ── Nav background on scroll ─────────────────────────────
(function () {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;

    window.addEventListener('scroll', () => {
        nav.style.background = window.scrollY > 60
            ? 'rgba(13,10,7,0.97)'
            : '';
    }, { passive: true });
})();

// ── Stagger note cards on load ────────────────────────────
(function () {
    document.querySelectorAll('.note-card').forEach((card, i) => {
        card.style.transitionDelay = `${i * 0.1}s`;
    });

    document.querySelectorAll('.stack-item').forEach((item, i) => {
        item.style.transitionDelay = `${i * 0.04}s`;
    });
})();
