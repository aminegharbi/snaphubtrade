import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// Next.js App Router convention: a file named icon.tsx in src/app/ is
// automatically rendered and served as the site favicon, with the
// appropriate <link rel="icon"> tag injected into every page — no manual
// metadata wiring needed. Matches the brand mark used everywhere else in
// the app (red rounded square, white "S").
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 7,
          background: '#C1272D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <span style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>S</span>
      </div>
    ),
    { ...size }
  );
}
