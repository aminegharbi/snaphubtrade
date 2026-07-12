import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Next.js App Router convention: apple-icon.tsx is auto-served and linked
// as <link rel="apple-touch-icon"> — the icon iOS uses when someone adds
// SnapHubTrade.com to their home screen.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#C1272D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <span style={{ color: 'white', fontSize: 92, fontWeight: 800 }}>S</span>
      </div>
    ),
    { ...size }
  );
}
