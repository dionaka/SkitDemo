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
    default:
      break;
  }
}
