import confetti from 'canvas-confetti';

function fire(opts) {
  try {
    confetti({ disableForReducedMotion: true, ...opts });
  } catch {
    /* 低版本 WebView 降级为无粒子 */
  }
}

export function runParticleEffect(particleType, config = {}) {
  const intensity = Math.min(1, Math.max(0.3, Number(config.intensity) || 1));

  switch (particleType) {
    case 'none':
      break;
    case 'confetti':
      fire({
        particleCount: Math.round(60 * intensity),
        spread: 65,
        origin: { y: 0.65 },
        colors: ['#ffd166', '#ffffff', '#74c0fc'],
      });
      break;
    case 'confetti_burst':
      fire({
        particleCount: Math.round(120 * intensity),
        spread: 100,
        startVelocity: 45,
        origin: { y: 0.5 },
      });
      setTimeout(() => {
        fire({
          particleCount: Math.round(60 * intensity),
          spread: 120,
          origin: { x: 0.2, y: 0.55 },
        });
        fire({
          particleCount: Math.round(60 * intensity),
          spread: 120,
          origin: { x: 0.8, y: 0.55 },
        });
      }, 180);
      break;
    case 'hearts_confetti':
      fire({
        particleCount: Math.round(40 * intensity),
        spread: 55,
        origin: { y: 0.7 },
        colors: ['#ff6b81', '#ffa8b4', '#ffd166'],
        ticks: 200,
      });
      break;
    case 'suspense_mist':
      fire({
        particleCount: Math.round(35 * intensity),
        spread: 80,
        startVelocity: 18,
        gravity: 0.6,
        origin: { y: 0.55 },
        colors: ['#7c3aed', '#a78bfa', '#1e1b4b'],
        ticks: 220,
      });
      break;
    case 'funny_pop':
      fire({
        particleCount: Math.round(50 * intensity),
        spread: 360,
        startVelocity: 28,
        origin: { y: 0.72 },
        colors: ['#ffc048', '#ffe066', '#ffffff'],
        scalar: 0.9,
      });
      break;
    case 'touch_sparkle':
      fire({
        particleCount: Math.round(45 * intensity),
        spread: 50,
        startVelocity: 22,
        origin: { y: 0.65 },
        colors: ['#74c0fc', '#a5d8ff', '#ffffff'],
        ticks: 240,
      });
      break;
    case 'fire_burst':
      fire({
        particleCount: Math.round(80 * intensity),
        spread: 85,
        startVelocity: 42,
        origin: { y: 0.75 },
        colors: ['#ff6348', '#ffa502', '#ffd166'],
      });
      break;
    case 'shock_flash':
      fire({
        particleCount: Math.round(70 * intensity),
        spread: 110,
        startVelocity: 38,
        origin: { y: 0.45 },
        colors: ['#ffffff', '#ffd166', '#ffe066'],
        ticks: 120,
      });
      break;
    case 'quote_sparkle':
      fire({
        particleCount: Math.round(55 * intensity),
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#20c997', '#63e6be', '#ffd166'],
      });
      break;
    default:
      break;
  }
}
