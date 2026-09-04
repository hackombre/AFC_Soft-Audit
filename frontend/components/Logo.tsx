interface LogoProps {
  className?: string;
}

/**
 * Marque AFCsoft Audit — logo fourni par le cabinet (fichier public/logo.png).
 */
export default function Logo({ className }: LogoProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="AFCsoft Audit" className={className} style={{ objectFit: 'contain' }} />;
}
