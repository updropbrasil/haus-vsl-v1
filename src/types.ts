export interface VslEvent {
  id: string;
  vslId: string;
  eventType: 'play' | 'pause' | 'milestone_10' | 'milestone_25' | 'milestone_50' | 'milestone_75' | 'milestone_100' | 'abandon' | 'pitch_reached' | 'cta_clicked';
  timestampSeconds: number;
  percentage: number;
  createdAt: string;
  userIp?: string;
  device?: 'Mobile' | 'Desktop' | 'Tablet';
}

export interface RetentionDataPoint {
  second: number;
  timeFormatted: string;
  percentage: number; // 0 to 100% of video length
  viewers: number;
  retentionRate: number; // 0 to 100%
  dropoffRate: number; // % drop from previous point
  segmentName?: string; // e.g., "Gancho (Hook)", "História", "Pitch de Vendas"
}

export interface PitchConfig {
  pitchTimeSeconds: number; // When CTA unlocks (e.g. 180s = 03:00)
  ctaText: string;
  ctaSubtext?: string;
  ctaUrl: string;
  ctaButtonColor: string;
  pulseEffect: boolean;
  showCountdown: boolean;
}

export interface CloudflareR2Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string; // e.g., https://pub-xxx.r2.dev ou https://media.meuimovel.com.br
  isConfigured: boolean;
}

export interface LandingPageConfig {
  slug: string;
  headline: string;
  headlineColor?: string;
  subheadline?: string;
  subheadlineColor?: string;
  bgImageUrl?: string;
  bgOverlayOpacity: number; // 0 to 1
  primaryColor?: string;
  headerBgColor?: string;
  footerText?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  showSecurityBadges: boolean;
  customBadges?: string[];
}

export interface VslProject {
  id: string;
  userId?: string;
  title: string;
  description: string;
  videoUrl: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
  thumbnailUrl?: string;
  durationSeconds: number;
  createdAt: string;
  totalViews: number;
  plays: number;
  completionCount: number;
  avgWatchTimeSeconds: number;
  pitchConfig: PitchConfig;
  landingPageConfig?: LandingPageConfig;
  retentionData: RetentionDataPoint[];
  events: VslEvent[];
}

export interface UserSession {
  id: string;
  email: string;
  name?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'vsls'
  | 'analytics'
  | 'player_builder'
  | 'events'
  | 'supabase'
  | 'cloudflare_r2'
  | 'landing_customizer'
  | 'public_landing';
