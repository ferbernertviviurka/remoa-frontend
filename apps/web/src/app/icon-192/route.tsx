import { ImageResponse } from 'next/og';

export function GET() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', background: '#6D5BD0', color: '#fff', fontSize: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>R</div>,
    { width: 192, height: 192 },
  );
}
