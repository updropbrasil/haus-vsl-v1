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

export const INITIAL_VSL_PROJECTS: VslProject[] = [
  {
    id: 'vsl-001',
    title: 'VSL Oferta Principal - Protocolo Alta Conversão 67%',
    description: 'Vídeo de vendas principal para produto Digital. Pitch desbloqueia o botão aos 01:30.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
    durationSeconds: 596, // ~9m56s
    createdAt: '2026-07-20T10:30:00Z',
    totalViews: 3840,
    plays: 3120,
    completionCount: 890,
    avgWatchTimeSeconds: 274,
    pitchConfig: {
      pitchTimeSeconds: 90, // 01:30
      ctaText: 'QUERO GARANTIR MINHA VAGA COM 50% OFF',
      ctaSubtext: '⚡ Oferta por tempo limitado. Garantia incondicional de 7 dias.',
      ctaUrl: 'https://checkout.exemplo.com/vsl-oferta',
      ctaButtonColor: '#22c55e', // Emerald green
      pulseEffect: true,
      showCountdown: true,
    },
    retentionData: generateRetentionCurve(596, 3840),
    events: [
      {
        id: 'evt-101',
        vslId: 'vsl-001',
        eventType: 'play',
        timestampSeconds: 0,
        percentage: 0,
        createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        device: 'Desktop',
      },
      {
        id: 'evt-102',
        vslId: 'vsl-001',
        eventType: 'milestone_10',
        timestampSeconds: 60,
        percentage: 10,
        createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        device: 'Mobile',
      },
      {
        id: 'evt-103',
        vslId: 'vsl-001',
        eventType: 'pitch_reached',
        timestampSeconds: 90,
        percentage: 15,
        createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
        device: 'Desktop',
      },
      {
        id: 'evt-104',
        vslId: 'vsl-001',
        eventType: 'cta_clicked',
        timestampSeconds: 112,
        percentage: 18,
        createdAt: new Date(Date.now() - 1000 * 30).toISOString(),
        device: 'Desktop',
      },
    ],
  },
  {
    id: 'vsl-002',
    title: 'VSL Upsell - Mentoria Direct Sales Executiva',
    description: 'Vídeo rápido de 3 minutos para a página de pós-compra. Pitch abre no segundo 45.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    durationSeconds: 180, // 3m
    createdAt: '2026-07-22T14:15:00Z',
    totalViews: 1290,
    plays: 1150,
    completionCount: 520,
    avgWatchTimeSeconds: 110,
    pitchConfig: {
      pitchTimeSeconds: 45,
      ctaText: 'SIM! ADICIONAR MENTORIA AO MEU PEDIDO',
      ctaSubtext: 'Acesso imediato ao grupo VIP e acompanhamento individual',
      ctaUrl: 'https://checkout.exemplo.com/upsell-mentoria',
      ctaButtonColor: '#3b82f6', // Blue
      pulseEffect: true,
      showCountdown: false,
    },
    retentionData: generateRetentionCurve(180, 1290),
    events: [],
  },
  {
    id: 'vsl-003',
    title: 'VSL Replay Webinar - Estratégia de Escala 2026',
    description: 'Vídeo longo de alta conversão para tráfego pago frio no Instagram / Facebook Ads.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    durationSeconds: 900, // 15m
    createdAt: '2026-07-23T09:00:00Z',
    totalViews: 5400,
    plays: 4200,
    completionCount: 1100,
    avgWatchTimeSeconds: 410,
    pitchConfig: {
      pitchTimeSeconds: 300, // 05:00
      ctaText: 'GARANTIR ACESSO COM BÔNUS EXCLUSIVO',
      ctaSubtext: 'Inscrições se encerram hoje à meia-noite',
      ctaUrl: 'https://checkout.exemplo.com/webinar-escala',
      ctaButtonColor: '#8b5cf6', // Purple
      pulseEffect: true,
      showCountdown: true,
    },
    retentionData: generateRetentionCurve(900, 5400),
    events: [],
  }
];
