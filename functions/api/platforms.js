const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet() {
  return new Response(JSON.stringify({
    platforms: [
      { id: 'youtube', name: 'YouTube', features: ['thumbnails', 'metadata'] },
      { id: 'instagram', name: 'Instagram', features: ['images', 'videos', 'carousel'] },
      { id: 'twitter', name: 'Twitter/X', features: ['images', 'videos'] },
      { id: 'tiktok', name: 'TikTok', features: ['videos'] },
      { id: 'facebook', name: 'Facebook', features: ['limited'] },
      { id: 'pinterest', name: 'Pinterest', features: ['images', 'videos'] }
    ]
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}
