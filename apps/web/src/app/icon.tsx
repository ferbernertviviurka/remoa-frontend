import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', background: '#6D5BD0', color: '#fff', fontSize: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>R</div>,
    { ...size },
  );
}
