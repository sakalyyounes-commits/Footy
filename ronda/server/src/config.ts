export interface ServerConfig {
  port: number;
  host: string;
  /** Dossier des données persistantes (profils). Vide : tout reste en mémoire. */
  dataDir: string;
  /** Dossier de l'application web construite, servie à la racine du site (optionnel). */
  staticDir: string;
  /** Temps de réflexion d'un joueur humain avant que le jeu ne joue pour lui. */
  turnMs: number;
  /** Délai de réflexion simulé des bots [min, max]. */
  botDelayMs: [number, number];
  /** Pause entre deux manches (le temps d'afficher le récapitulatif). */
  roundPauseMs: number;
  /** Multiplicateur appliqué aux durées d'animation des téléphones (0 pour les tests). */
  animationScale: number;
  /** Attente maximale dans la file avant de compléter la table avec des bots (0 = jamais). */
  botFillMs: number;
  /** Nombre de tours passés à l'expiration du temps avant de laisser le bot jouer d'office. */
  maxTimeouts: number;
  /** Nouveaux comptes autorisés par heure et par adresse IP (0 = illimité). */
  accountsPerIpPerHour: number;
  /** Faire confiance à l'en-tête X-Forwarded-For (serveur derrière Render, Fly.io, un proxy…). */
  trustProxy: boolean;
  /** Secret partagé avec RevenueCat pour créditer les achats (vide : webhook désactivé). */
  revenueCatSecret: string;
  /** Adresse publique du jeu (liens d'invitation). */
  publicUrl: string;
  /** Liens vers les stores, utilisés par la page d'invitation. */
  playStoreUrl: string;
  appStoreUrl: string;
  /** Schéma de lien profond de l'application mobile. */
  appScheme: string;
}

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: num(env.PORT, 8080),
    host: env.HOST ?? '0.0.0.0',
    dataDir: env.DATA_DIR ?? './data',
    staticDir: env.STATIC_DIR ?? '',
    turnMs: num(env.TURN_MS, 20_000),
    botDelayMs: [num(env.BOT_DELAY_MIN_MS, 700), num(env.BOT_DELAY_MAX_MS, 1_500)],
    roundPauseMs: num(env.ROUND_PAUSE_MS, 4_500),
    animationScale: num(env.ANIMATION_SCALE, 1),
    botFillMs: num(env.BOT_FILL_MS, 12_000),
    maxTimeouts: num(env.MAX_TIMEOUTS, 2),
    accountsPerIpPerHour: num(env.ACCOUNTS_PER_IP_PER_HOUR, 30),
    trustProxy: env.TRUST_PROXY !== 'false',
    revenueCatSecret: env.REVENUECAT_WEBHOOK_SECRET ?? '',
    publicUrl: env.PUBLIC_URL ?? '',
    playStoreUrl: env.PLAY_STORE_URL ?? '',
    appStoreUrl: env.APP_STORE_URL ?? '',
    appScheme: env.APP_SCHEME ?? 'rondadyalna',
  };
}

/** Réglages rapides pour les tests automatiques. */
export function testConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    port: 0,
    host: '127.0.0.1',
    dataDir: '',
    staticDir: '',
    turnMs: 2_000,
    botDelayMs: [0, 0],
    roundPauseMs: 0,
    animationScale: 0,
    botFillMs: 300,
    maxTimeouts: 2,
    accountsPerIpPerHour: 30,
    trustProxy: false,
    revenueCatSecret: 'test-secret',
    publicUrl: 'http://localhost',
    playStoreUrl: '',
    appStoreUrl: '',
    appScheme: 'rondadyalna',
    ...overrides,
  };
}
