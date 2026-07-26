import { VslProject, RetentionDataPoint } from './types';

// Helper to generate realistic VSL retention curves with hook drop and pitch drop
function generateRetentionCurve(durationSeconds: number, initialViewers: number = 2450): RetentionDataPoint[] {
  const pointsCount = Math.min(100, Math.max(30, Math.floor(durationSeconds / 5)));
  const points: RetentionDataPoint[] = [];

  for (let i = 0; i <= pointsCount; i++) {
    const progress = i / pointsCount;
    const currentSecond = Math.round(progress * durationSeconds);
    const minutes = Math.floor(currentSecond / 60);
    const secs = currentSecond % 60;
    const timeFormatted = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Realistic retention curve formula:
    // 0-10%: Hook drop (from 100% down to ~82%)
    // 10-60%: Story & Pain retention (~82% down to ~62%)
    // 60-70%: Pitch reveal drop (sharp drop at pitch point, down to ~38%)
    // 70-100%: High intent viewers retention (~38% down to ~28%)
    let retention: number;
    let segment = 'Gancho Inicial (Hook)';

    if (progress <= 0.1) {
      retention = 100 - progress * 10 * 18; // 100% -> 82%
    } else if (progress <= 0.55) {
      segment = 'Conexão & História de Dor';
      const p = (progress - 0.1) / 0.45;
      retention = 82 - p * 20; // 82% -> 62%
    } else if (progress <= 0.65) {
      segment = 'Apresentação da Solução & Pitch';
      const p = (progress - 0.55) / 0.1;
      retention = 62 - p * 24; // 62% -> 38% (fuga no pitch!)
    } else {
      segment = 'Oferta, Garantia & Bônus';
      const p = (progress - 0.65) / 0.35;
      retention = 38 - p * 11; // 38% -> 27%
    }

    // Add tiny realistic variation
    const noise = (Math.sin(i * 0.7) * 0.8);
    const finalRetention = Math.max(5, Math.min(100, Number((retention + noise).toFixed(1))));
    const currentViewers = Math.round((finalRetention / 100) * initialViewers);
    const prevViewers = points.length > 0 ? points[points.length - 1].viewers : initialViewers;
    const dropoffRate = Number((((prevViewers - currentViewers) / prevViewers) * 100).toFixed(1));

    points.push({
      second: currentSecond,
      timeFormatted,
      percentage: Math.round(progress * 100),
      viewers: currentViewers,
      retentionRate: finalRetention,
      dropoffRate: dropoffRate < 0 ? 0 : dropoffRate,
      segmentName: segment,
    });
  }

  return points;
}

export const INITIAL_VSL_PROJECTS: VslProject[] = [];
