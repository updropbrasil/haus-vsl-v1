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
    id: "vsl-r2-1785080336016-enwqa",
    title: "Img 1524",
    description: "Vídeo importado automaticamente do Cloudflare R2 (1784928562811-img-1524.mov)",
    videoUrl: "/api/r2/stream?key=vsl-haus%2F1784928562811-img-1524.mov",
    secondaryVideoUrl: "/api/r2/stream?key=vsl-haus%2F1784928562811-img-1524.mov",
    aspectRatio: "16:9",
    durationSeconds: 180,
    createdAt: "2026-07-24T21:29:24.863Z",
    totalViews: 0,
    plays: 1,
    completionCount: 10,
    avgWatchTimeSeconds: 0,
    pitchConfig: {
      pitchTimeSeconds: 60,
      ctaText: "COMPRAR COM DESCONTO EXCLUSIVO",
      ctaUrl: "https://seuempreendimento.com.br/checkout",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true
    },
    retentionData: [],
    events: [],
    fileKey: "vsl-haus/1784928562811-img-1524.mov"
  },
  {
    id: "vsl-r2-1785080336018-zxfg5",
    title: "Img 1522",
    description: "Vídeo importado automaticamente do Cloudflare R2 (1785005407507-img-1522.mov)",
    videoUrl: "/api/r2/stream?key=vsl-haus%2F1785005407507-img-1522.mov",
    secondaryVideoUrl: "/api/r2/stream?key=vsl-haus%2F1785005407507-img-1522.mov",
    aspectRatio: "16:9",
    durationSeconds: 180,
    createdAt: "2026-07-25T18:50:09.844Z",
    totalViews: 0,
    plays: 0,
    completionCount: 0,
    avgWatchTimeSeconds: 0,
    pitchConfig: {
      pitchTimeSeconds: 60,
      ctaText: "COMPRAR COM DESCONTO EXCLUSIVO",
      ctaUrl: "https://seuempreendimento.com.br/checkout",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true
    },
    retentionData: [],
    events: [],
    fileKey: "vsl-haus/1785005407507-img-1522.mov"
  },
  {
    id: "vsl-r2-1785080336019-zf2mh",
    title: "E1a0ef5d c34e 59d3 29f8 3f5698154cdc",
    description: "Vídeo importado automaticamente do Cloudflare R2 (1785014944687-e1a0ef5d-c34e-59d3-29f8-3f5698154cdc.mp4)",
    videoUrl: "/api/r2/stream?key=vsl-haus%2F1785014944687-e1a0ef5d-c34e-59d3-29f8-3f5698154cdc.mp4",
    secondaryVideoUrl: "/api/r2/stream?key=vsl-haus%2F1785014944687-e1a0ef5d-c34e-59d3-29f8-3f5698154cdc.mp4",
    aspectRatio: "16:9",
    durationSeconds: 180,
    createdAt: "2026-07-25T21:29:45.230Z",
    totalViews: 0,
    plays: 0,
    completionCount: 0,
    avgWatchTimeSeconds: 0,
    pitchConfig: {
      pitchTimeSeconds: 60,
      ctaText: "COMPRAR COM DESCONTO EXCLUSIVO",
      ctaUrl: "https://seuempreendimento.com.br/checkout",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true
    },
    retentionData: [],
    events: [],
    fileKey: "vsl-haus/1785014944687-e1a0ef5d-c34e-59d3-29f8-3f5698154cdc.mp4"
  },
  {
    id: "vsl-r2-1785080336021-qqk7c",
    title: "E1a0ef5d c34e 59d3 29f8 3f5698154cdc",
    description: "Vídeo importado automaticamente do Cloudflare R2 (1785015153246-e1a0ef5d-c34e-59d3-29f8-3f5698154cdc.mp4)",
    videoUrl: "/api/r2/stream?key=vsl-haus%2F1785015153246-e1a0ef5d-c34e-59d3-29f8-3f5698154cdc.mp4",
    secondaryVideoUrl: "/api/r2/stream?key=vsl-haus%2F1785015153246-e1a0ef5d-c34e-59d3-29f8-3f5698154cdc.mp4",
    aspectRatio: "16:9",
    durationSeconds: 180,
    createdAt: "2026-07-25T21:32:34.176Z",
    totalViews: 0,
    plays: 0,
    completionCount: 0,
    avgWatchTimeSeconds: 0,
    pitchConfig: {
      pitchTimeSeconds: 60,
      ctaText: "COMPRAR COM DESCONTO EXCLUSIVO",
      ctaUrl: "https://seuempreendimento.com.br/checkout",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true
    },
    retentionData: [],
    events: [],
    fileKey: "vsl-haus/1785015153246-e1a0ef5d-c34e-59d3-29f8-3f5698154cdc.mp4"
  },
  {
    id: "vsl-r2-1785080336022-5rllc",
    title: "Img 1522",
    description: "Vídeo importado automaticamente do Cloudflare R2 (1785029937241-img-1522.mov)",
    videoUrl: "/api/r2/stream?key=vsl-haus%2F1785029937241-img-1522.mov",
    secondaryVideoUrl: "/api/r2/stream?key=vsl-haus%2F1785029937241-img-1522.mov",
    aspectRatio: "16:9",
    durationSeconds: 180,
    createdAt: "2026-07-26T01:39:01.923Z",
    totalViews: 0,
    plays: 0,
    completionCount: 0,
    avgWatchTimeSeconds: 0,
    pitchConfig: {
      pitchTimeSeconds: 60,
      ctaText: "COMPRAR COM DESCONTO EXCLUSIVO",
      ctaUrl: "https://seuempreendimento.com.br/checkout",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true
    },
    retentionData: [],
    events: [],
    fileKey: "vsl-haus/1785029937241-img-1522.mov"
  },
  {
    id: "vsl-r2-1785080336023-xayp9",
    title: "Img 1522",
    description: "Vídeo importado automaticamente do Cloudflare R2 (1785030542433-img-1522.mov)",
    videoUrl: "/api/r2/stream?key=vsl-haus%2F1785030542433-img-1522.mov",
    secondaryVideoUrl: "/api/r2/stream?key=vsl-haus%2F1785030542433-img-1522.mov",
    aspectRatio: "16:9",
    durationSeconds: 180,
    createdAt: "2026-07-26T01:49:04.323Z",
    totalViews: 0,
    plays: 0,
    completionCount: 0,
    avgWatchTimeSeconds: 0,
    pitchConfig: {
      pitchTimeSeconds: 60,
      ctaText: "COMPRAR COM DESCONTO EXCLUSIVO",
      ctaUrl: "https://seuempreendimento.com.br/checkout",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true
    },
    retentionData: [],
    events: [],
    fileKey: "vsl-haus/1785030542433-img-1522.mov"
  },
  {
    id: "vsl-r2-1785080336025-jf000",
    title: "Img 1522",
    description: "Vídeo importado automaticamente do Cloudflare R2 (1785030557251-img-1522.mov)",
    videoUrl: "/api/r2/stream?key=vsl-haus%2F1785030557251-img-1522.mov",
    secondaryVideoUrl: "/api/r2/stream?key=vsl-haus%2F1785030557251-img-1522.mov",
    aspectRatio: "16:9",
    durationSeconds: 180,
    createdAt: "2026-07-26T01:49:19.578Z",
    totalViews: 0,
    plays: 0,
    completionCount: 0,
    avgWatchTimeSeconds: 0,
    pitchConfig: {
      pitchTimeSeconds: 60,
      ctaText: "COMPRAR COM DESCONTO EXCLUSIVO",
      ctaUrl: "https://seuempreendimento.com.br/checkout",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true
    },
    retentionData: [],
    events: [],
    fileKey: "vsl-haus/1785030557251-img-1522.mov"
  },
  {
    id: "vsl-r2-1785080336026-wx5hh",
    title: "Img 1522",
    description: "Vídeo importado automaticamente do Cloudflare R2 (1785033851867-img-1522.mov)",
    videoUrl: "/api/r2/stream?key=vsl-haus%2F1785033851867-img-1522.mov",
    secondaryVideoUrl: "/api/r2/stream?key=vsl-haus%2F1785033851867-img-1522.mov",
    aspectRatio: "16:9",
    durationSeconds: 180,
    createdAt: "2026-07-26T02:44:14.107Z",
    totalViews: 0,
    plays: 0,
    completionCount: 0,
    avgWatchTimeSeconds: 0,
    pitchConfig: {
      pitchTimeSeconds: 60,
      ctaText: "COMPRAR COM DESCONTO EXCLUSIVO",
      ctaUrl: "https://seuempreendimento.com.br/checkout",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true
    },
    retentionData: [],
    events: [],
    fileKey: "vsl-haus/1785033851867-img-1522.mov"
  },
  {
    id: "vsl-r2-1785080336028-7hb2b",
    title: "Img 1523",
    description: "Vídeo importado automaticamente do Cloudflare R2 (1785076195890-img-1523.mov)",
    videoUrl: "/api/r2/stream?key=vsl-haus%2F1785076195890-img-1523.mov",
    secondaryVideoUrl: "/api/r2/stream?key=vsl-haus%2F1785076195890-img-1523.mov",
    aspectRatio: "16:9",
    durationSeconds: 180,
    createdAt: "2026-07-26T14:29:57.230Z",
    totalViews: 0,
    plays: 0,
    completionCount: 2,
    avgWatchTimeSeconds: 0,
    pitchConfig: {
      pitchTimeSeconds: 60,
      ctaText: "COMPRAR COM DESCONTO EXCLUSIVO",
      ctaUrl: "https://seuempreendimento.com.br/checkout",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true
    },
    retentionData: [],
    events: [],
    fileKey: "vsl-haus/1785076195890-img-1523.mov"
  },
  {
    id: "vsl-1785076209062",
    title: "teste 2",
    description: "Vídeo VSL cadastrado para acompanhamento de retenção real.",
    videoUrl: "/api/r2/stream?key=vsl-haus%2F1785076195890-img-1523.mov",
    aspectRatio: "9:16",
    durationSeconds: 21,
    createdAt: "2026-07-26T14:30:09.062Z",
    totalViews: 0,
    plays: 0,
    completionCount: 0,
    avgWatchTimeSeconds: 0,
    pitchConfig: {
      pitchTimeSeconds: 90,
      ctaText: "QUERO GARANTIR MINHA VAGA COM DESCONTO",
      ctaSubtext: "⚡ Desconto exclusivo liberado pelo tempo do vídeo",
      ctaUrl: "https://checkout.exemplo.com/vsl-oferta",
      ctaButtonColor: "#059669",
      pulseEffect: true,
      showCountdown: true
    },
    landingPageConfig: {
      slug: "teste-2",
      headline: "ASSISTA AO VÍDEO EXCLUSIVO: teste 2",
      subheadline: "Apresentação especial com condições e informações em tempo real.",
      bgImageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80",
      bgOverlayOpacity: 0.88,
      footerText: "© 2026 teste 2. Todos os Direitos Reservados.",
      showSecurityBadges: true
    },
    retentionData: [],
    events: [],
    secondaryVideoUrl: "/api/r2/stream?key=vsl-haus%2F1785076195890-img-1523.mov"
  }
];
