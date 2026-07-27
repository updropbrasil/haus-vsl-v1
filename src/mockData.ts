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

    let retention: number;
    let segment = 'Gancho Inicial (Hook)';

    if (progress <= 0.1) {
      retention = 100 - progress * 10 * 18;
    } else if (progress <= 0.55) {
      segment = 'Conexão & História de Dor';
      const p = (progress - 0.1) / 0.45;
      retention = 82 - p * 20;
    } else if (progress <= 0.65) {
      segment = 'Apresentação da Solução & Pitch';
      const p = (progress - 0.55) / 0.1;
      retention = 62 - p * 24;
    } else {
      segment = 'Oferta, Garantia & Bônus';
      const p = (progress - 0.65) / 0.35;
      retention = 38 - p * 11;
    }

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

export const INITIAL_VSL_PROJECTS: VslProject[] = [
  {
    id: "vsl-main-001",
    title: "VSL Optima - Vídeo Principal",
    description: "Vídeo VSL de Alta Conversão com Pitch e CTA Automáticos",
    videoUrl: "/api/r2/stream?key=vsl-haus%2FVSL_PRINCIPAL.mp4",
    secondaryVideoUrl: "https://pub-8e2cb656649243e49a2cdd3f4ca9d4c.r2.dev/vsl-haus/VSL_PRINCIPAL.mp4",
    aspectRatio: "16:9",
    durationSeconds: 180,
    createdAt: "2026-07-26T12:00:00.000Z",
    totalViews: 1240,
    plays: 980,
    completionCount: 710,
    avgWatchTimeSeconds: 142,
    pitchConfig: {
      pitchTimeSeconds: 60,
      ctaText: "COMPRAR COM DESCONTO EXCLUSIVO",
      ctaSubtext: "⚡ Desconto exclusivo por tempo limitado",
      ctaUrl: "https://seuempreendimento.com.br/checkout",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true,
    },
    landingPageConfig: {
      slug: "vsl-principal",
      headline: "ASSISTA AO VÍDEO EXCLUSIVO ABAIXO",
      subheadline: "Apresentação especial com condições e informações em tempo real.",
      bgImageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80",
      bgOverlayOpacity: 0.88,
      footerText: "© 2026 VSL Optima. Todos os Direitos Reservados.",
      showSecurityBadges: true,
    },
    retentionData: generateRetentionCurve(180, 1240),
    events: [],
    fileKey: "vsl-haus/VSL_PRINCIPAL.mp4",
  },
];
