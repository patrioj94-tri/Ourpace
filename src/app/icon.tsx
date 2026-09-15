import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/** The home-screen icon: a buoy-orange ground and the two initials. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#d64f17',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 260,
          fontWeight: 800,
          letterSpacing: '-0.06em',
        }}
      >
        OP
      </div>
    ),
    size,
  );
}
