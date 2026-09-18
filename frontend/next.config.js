/** @type {import('next').NextConfig} */

/*
 * En-têtes de sécurité
 * --------------------
 *
 * C'est Next.js qui sert les pages HTML : la Content-Security-Policy
 * se pose donc ici, et non sur l'API.
 *
 * La CSP est la principale défense résiduelle contre le XSS. Le jeton
 * étant désormais dans un cookie httpOnly, un script injecté ne peut
 * plus le lire ; la CSP vise à l'empêcher de s'exécuter tout court.
 *
 * 'unsafe-inline' sur style-src est nécessaire : l'application utilise
 * des styles en ligne (attributs style={{...}}) et Tailwind injecte du
 * CSS inline.
 *
 * 'unsafe-eval' n'est requis que par le runtime de Next.js en mode
 * développement.
 */

const isDev = process.env.NODE_ENV !== 'production';

const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // L'API est appelée en relatif via les rewrites : same-origin suffit.
  "connect-src 'self'",
  // Les documents téléchargés sont ouverts en blob:.
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Empêche l'inclusion de l'application dans une iframe tierce
  // (clickjacking).
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
  {
    // Empêche l'interprétation d'un fichier comme un autre type MIME.
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Doublon volontaire de frame-ancestors, pour les navigateurs
    // anciens qui ignorent la CSP.
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
];

const nextConfig = {
  reactStrictMode: true,

  // Masque la version de Next.js dans les réponses.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;