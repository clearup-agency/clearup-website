import { LOGO_ARROW, LOGO_BACK, LOGO_FRONT } from '@/lib/logo';

const I = (d: string) =>
  function Icon() {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    );
  };
export const IcEdit = I('M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4');
export const IcCopy = I('M9 9h11v11H9zM5 15H4V4h11v1');
export const IcTrash = I('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3');
export const IcUp = I('M12 19V5M6 11l6-6 6 6');
export const IcDown = I('M12 5v14M6 13l6 6 6-6');
export const IcGrip = I('M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01');
export const IcPlus = I('M12 5v14M5 12h14');
export const IcEye = I('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z');
export const IcLayers = I('M12 3 2 8l10 5 10-5-10-5zM2 16l10 5 10-5M2 12l10 5 10-5');
export const IcCog = I('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z');
export const IcSave = I('M5 3h11l3 3v15H5zM8 3v5h7M8 21v-7h8v7');
export const IcDownload = I('M12 3v12M7 10l5 5 5-5M4 21h16');
export const IcUpload = I('M12 21V9M7 14l5-5 5 5M4 3h16');
export const IcOut = I('M15 4h4v16h-4M10 17l-5-5 5-5M5 12h11');
export const IcImage = I('M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01');
export const IcBack = I('M9 6l6 6-6 6');
export const IcUser = I('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0');
export const IcEyeOff = I('M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2');
export const IcDesktop = I('M3 4h18v12H3zM8 20h8M12 16v4');
export const IcPhone = I('M7 2h10v20H7zM11 18h2');
export const IcUndo = I('M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3');
export const IcRedo = I('M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3');
export const IcMore = I('M5 12h.01M12 12h.01M19 12h.01');
export const IcHistory = I('M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2');

/** The ClearUp mark in light colours, for the purple top bar. */
export function MarkLight({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 131 131" aria-hidden="true">
      <path d={LOGO_BACK} fill="#D1ADF6" />
      <path d={LOGO_FRONT} fill="#fff" />
      <path d={LOGO_ARROW} fill="#5B2096" />
    </svg>
  );
}
