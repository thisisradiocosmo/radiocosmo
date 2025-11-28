// Stars animation
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let w, h, stars = [];

function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    stars = Array.from({ length: 60 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.2,
        alpha: Math.random() * 0.3,
        dAlpha: (Math.random() * 0.01 + 0.003) * (Math.random() < 0.5 ? 1 : -1)
    }));
}

function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'white';
    for (let s of stars) {
        s.alpha += s.dAlpha;
        if (s.alpha <= 0 || s.alpha >= 0.3) s.dAlpha *= -1;
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);
resize();
draw();