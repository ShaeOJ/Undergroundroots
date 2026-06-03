// roots.js — Mycelium network canvas animation
(function () {
    const canvas = document.getElementById('root-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, roots = [], frame = 0, raf;

    // ── helpers ──────────────────────────────────────────────────────────────
    function lerp(a, b, t) { return a + (b - a) * t; }
    function rand(min, max) { return min + Math.random() * (max - min); }

    // ── generate one root branch (a series of noisy waypoints) ───────────────
    function makeRoot(x, y, angle, depth) {
        const steps = Math.floor(rand(24, 48));
        const pts = [{ x, y }];
        let cx = x, cy = y, a = angle;
        const stepLen = rand(5, 10) + depth * 1.2;

        for (let i = 0; i < steps; i++) {
            a += rand(-0.22, 0.22);
            // very slight upward bias so roots drift toward surface
            const bias = -0.015;
            cx += Math.cos(a) * stepLen;
            cy += Math.sin(a + bias) * stepLen;
            pts.push({ x: cx, y: cy });
        }

        return {
            pts,
            depth,
            progress: 0,
            speed: rand(0.003, 0.007),
            opacity: 0,
            fadeSpeed: rand(0.012, 0.025),
            dying: false,
            deathAge: 0,
            startAge: Math.floor(rand(0, 80)),
            age: 0,
            branched: false,
            branches: []
        };
    }

    // ── seed the initial network ──────────────────────────────────────────────
    function seedRoots() {
        roots = [];
        const count = Math.max(4, Math.floor(W / 220));
        for (let i = 0; i < count; i++) {
            const x = rand(W * 0.05, W * 0.95);
            const y = rand(H * 0.55, H * 0.92);
            const a = rand(-Math.PI * 0.85, -Math.PI * 0.15); // mostly upward
            roots.push(makeRoot(x, y, a, Math.floor(rand(5, 8))));
        }
    }

    // ── advance one root's state ──────────────────────────────────────────────
    function updateRoot(r) {
        r.age++;
        if (r.age < r.startAge) return;

        // fade in
        if (r.opacity < 1) r.opacity = Math.min(1, r.opacity + r.fadeSpeed);

        // grow
        if (!r.dying && r.progress < 1) {
            r.progress = Math.min(1, r.progress + r.speed);

            // branch when ~40-70% grown
            if (!r.branched && r.progress > rand(0.35, 0.55) && r.depth > 1) {
                r.branched = true;
                const numBranches = r.depth > 4 ? 2 : 1;
                for (let i = 0; i < numBranches; i++) {
                    const bIdx = Math.floor(r.pts.length * rand(0.35, 0.65));
                    const bp = r.pts[Math.min(bIdx, r.pts.length - 1)];
                    const prev = r.pts[Math.max(0, bIdx - 4)];
                    const baseAngle = Math.atan2(bp.y - prev.y, bp.x - prev.x);
                    const side = Math.random() > 0.5 ? 1 : -1;
                    const branchAngle = baseAngle + side * rand(0.35, 0.75);
                    const child = makeRoot(bp.x, bp.y, branchAngle, r.depth - 1);
                    child.startAge = r.age + Math.floor(rand(10, 40));
                    r.branches.push(child);
                }
            }
        }

        // begin dying after fully grown + dwell time
        if (!r.dying && r.progress >= 1) {
            r.dying = true;
            r.deathAge = r.age + Math.floor(rand(180, 400));
        }

        if (r.dying && r.age > r.deathAge) {
            r.opacity = Math.max(0, r.opacity - 0.004);
        }

        r.branches.forEach(updateRoot);
    }

    // ── paint one root branch ─────────────────────────────────────────────────
    function drawRoot(r) {
        if (r.pts.length < 2 || r.opacity < 0.01) return;

        const visible = Math.floor(r.progress * (r.pts.length - 1));
        if (visible < 1) return;

        // colour: deep = warm brown, tips = muted bioluminescent gold-green
        const t = Math.min(1, r.depth / 7);
        const red   = Math.floor(lerp(110, 88, t));
        const green = Math.floor(lerp(185, 58, t));
        const blue  = Math.floor(lerp(70, 28, t));
        const alpha = r.opacity * lerp(0.38, 0.62, t);

        ctx.strokeStyle = `rgba(${red},${green},${blue},${alpha})`;
        ctx.lineWidth = Math.max(0.4, r.depth * 0.35);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(r.pts[0].x, r.pts[0].y);
        for (let i = 1; i <= visible; i++) {
            ctx.lineTo(r.pts[i].x, r.pts[i].y);
        }
        ctx.stroke();

        // growing tip — soft bioluminescent glow
        if (!r.dying && r.opacity > 0.4 && visible < r.pts.length - 1) {
            const tip = r.pts[visible];
            const glow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 8);
            glow.addColorStop(0, `rgba(140, 255, 100, ${r.opacity * 0.55})`);
            glow.addColorStop(1, `rgba(140, 255, 100, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        r.branches.forEach(drawRoot);
    }

    // ── check if a root tree is fully invisible ───────────────────────────────
    function allFaded(r) {
        if (r.opacity > 0.02) return false;
        return r.branches.every(allFaded);
    }

    // ── main loop ─────────────────────────────────────────────────────────────
    function loop() {
        ctx.clearRect(0, 0, W, H);

        roots.forEach(updateRoot);
        roots.forEach(drawRoot);

        // prune dead roots
        roots = roots.filter(r => !allFaded(r));

        // occasionally sprout a new root
        frame++;
        if (frame % 90 === 0 && roots.length < 14) {
            const x = rand(W * 0.05, W * 0.95);
            const y = rand(H * 0.55, H * 0.95);
            const a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
            roots.push(makeRoot(x, y, a, Math.floor(rand(4, 7))));
        }

        raf = requestAnimationFrame(loop);
    }

    // ── init + resize ─────────────────────────────────────────────────────────
    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', () => {
        cancelAnimationFrame(raf);
        resize();
        seedRoots();
        loop();
    });

    resize();
    seedRoots();
    loop();
})();
