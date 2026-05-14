const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ==================== YOUTUBE HANDLER ====================
async function handleYouTube(url) {
  try {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return { error: 'Invalid YouTube URL' };
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    let title = 'YouTube Video';
    let author = 'Unknown';
    
    try {
      const metaResponse = await fetch(oembedUrl);
      if (metaResponse.ok) {
        const metadata = await metaResponse.json();
        title = metadata.title || title;
        author = metadata.author_name || author;
      }
    } catch (e) {
      console.log('Could not fetch metadata:', e);
    }

    const thumbnails = {
      maxresdefault: {
        url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        quality: 'Maximum Resolution (1920x1080)',
        width: 1920,
        height: 1080
      },
      sddefault: {
        url: `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
        quality: 'Standard Definition (640x480)',
        width: 640,
        height: 480
      },
      hqdefault: {
        url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        quality: 'High Quality (480x360)',
        width: 480,
        height: 360
      },
      mqdefault: {
        url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        quality: 'Medium Quality (320x180)',
        width: 320,
        height: 180
      },
      default: {
        url: `https://i.ytimg.com/vi/${videoId}/default.jpg`,
        quality: 'Default (120x90)',
        width: 120,
        height: 90
      }
    };

    return {
      success: true,
      platform: 'youtube',
      videoId,
      title,
      author,
      thumbnails,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  } catch (error) {
    return { error: error.message || 'Failed to process YouTube URL' };
  }
}

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// ==================== INSTAGRAM HANDLER ====================
async function handleInstagram(url) {
  try {
    const postId = extractInstagramId(url);
    if (!postId) {
      return { error: 'Invalid Instagram URL' };
    }

    const apiUrl = `https://www.instagram.com/p/${postId}/?__a=1&__d=dis`;
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
          'X-IG-App-ID': '936619743392459'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const media = data?.items?.[0];
        
        if (media) {
          const result = {
            success: true,
            platform: 'instagram',
            postId,
            caption: media.caption?.text || '',
            author: media.user?.username || 'Unknown',
            likes: media.like_count || 0,
            media: []
          };

          if (media.carousel_media) {
            for (const item of media.carousel_media) {
              if (item.video_versions) {
                result.media.push({
                  type: 'video',
                  url: item.video_versions[0].url,
                  thumbnail: item.image_versions2?.candidates?.[0]?.url
                });
              } else if (item.image_versions2) {
                result.media.push({
                  type: 'image',
                  url: item.image_versions2.candidates[0].url
                });
              }
            }
          } else {
            if (media.video_versions) {
              result.media.push({
                type: 'video',
                url: media.video_versions[0].url,
                thumbnail: media.image_versions2?.candidates?.[0]?.url
              });
            } else if (media.image_versions2) {
              result.media.push({
                type: 'image',
                url: media.image_versions2.candidates[0].url
              });
            }
          }

          if (result.media.length > 0) {
            return result;
          }
        }
      }
    } catch (e) {
      console.log('API method failed, trying scraping:', e);
    }

    const pageUrl = `https://www.instagram.com/p/${postId}/`;
    const htmlResponse = await fetch(pageUrl, {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    });

    if (!htmlResponse.ok) {
      return { error: 'Could not fetch Instagram post' };
    }

    const html = await htmlResponse.text();

    const videoMatch = html.match(/"video_url":"([^"]+)"/);
    const imageMatch = html.match(/"display_url":"([^"]+)"/);
    const usernameMatch = html.match(/"owner":\{"username":"([^"]+)"/);

    if (videoMatch || imageMatch) {
      return {
        success: true,
        platform: 'instagram',
        postId,
        author: usernameMatch ? usernameMatch[1] : 'Unknown',
        media: [{
          type: videoMatch ? 'video' : 'image',
          url: (videoMatch ? videoMatch[1] : imageMatch[1]).replace(/\\u0026/g, '&')
        }]
      };
    }

    return { error: 'Could not extract media from Instagram post' };
  } catch (error) {
    return { error: error.message || 'Failed to process Instagram URL' };
  }
}

function extractInstagramId(url) {
  const patterns = [
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// ==================== TWITTER/X HANDLER ====================
async function handleTwitter(url) {
  try {
    const tweetId = extractTwitterId(url);
    if (!tweetId) {
      return { error: 'Invalid Twitter/X URL' };
    }

    const apiUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=0`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    });

    if (!response.ok) {
      return { error: 'Could not fetch tweet data' };
    }

    const data = await response.json();

    const result = {
      success: true,
      platform: 'twitter',
      tweetId,
      text: data.text || '',
      author: data.user?.screen_name || 'Unknown',
      media: []
    };

    if (data.video?.variants) {
      const mp4Videos = data.video.variants
        .filter(v => v.type === 'video/mp4')
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (mp4Videos.length > 0) {
        result.media.push({
          type: 'video',
          url: mp4Videos[0].src,
          quality: mp4Videos[0].bitrate ? `${Math.round(mp4Videos[0].bitrate / 1000)}kbps` : 'Unknown',
          variants: mp4Videos.map(v => ({
            url: v.src,
            quality: v.bitrate ? `${Math.round(v.bitrate / 1000)}kbps` : 'Unknown'
          }))
        });
      }
    }

    if (data.photos) {
      for (const photo of data.photos) {
        result.media.push({
          type: 'image',
          url: photo.url
        });
      }
    }

    if (result.media.length === 0) {
      return { error: 'No media found in this tweet' };
    }

    return result;
  } catch (error) {
    return { error: error.message || 'Failed to process Twitter URL' };
  }
}

function extractTwitterId(url) {
  const patterns = [
    /twitter\.com\/\w+\/status\/(\d+)/,
    /x\.com\/\w+\/status\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// ==================== TIKTOK HANDLER ====================
async function handleTikTok(url) {
  try {
    let finalUrl = url;
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': getRandomUserAgent()
        }
      });
      finalUrl = response.url;
    }

    const videoId = extractTikTokId(finalUrl);
    if (!videoId) {
      return { error: 'Invalid TikTok URL' };
    }

    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(finalUrl)}`;
      const response = await fetch(oembedUrl);
      
      if (response.ok) {
        const data = await response.json();
        
        return {
          success: true,
          platform: 'tiktok',
          videoId,
          title: data.title || '',
          author: data.author_name || 'Unknown',
          thumbnail: data.thumbnail_url,
          embedHtml: data.html,
          message: 'TikTok requires scraping for direct download. Use the embed or visit the URL.'
        };
      }
    } catch (e) {
      console.log('oEmbed failed:', e);
    }

    const pageResponse = await fetch(finalUrl, {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    });

    if (!pageResponse.ok) {
      return { error: 'Could not fetch TikTok video' };
    }

    const html = await pageResponse.text();

    const videoMatch = html.match(/"downloadAddr":"([^"]+)"/);
    const playMatch = html.match(/"playAddr":"([^"]+)"/);
    
    let videoUrl = null;
    if (videoMatch) {
      videoUrl = videoMatch[1].replace(/\\u0026/g, '&');
    } else if (playMatch) {
      videoUrl = playMatch[1].replace(/\\u0026/g, '&');
    }

    if (videoUrl) {
      return {
        success: true,
        platform: 'tiktok',
        videoId,
        media: [{
          type: 'video',
          url: videoUrl,
          note: 'Direct download may have watermark. TikTok restricts watermark-free downloads.'
        }]
      };
    }

    return { 
      error: 'Could not extract video URL. TikTok may have updated their page structure.',
      suggestion: 'Try using the TikTok app or a third-party service.'
    };
  } catch (error) {
    return { error: error.message || 'Failed to process TikTok URL' };
  }
}

function extractTikTokId(url) {
  const patterns = [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /tiktok\.com\/v\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// ==================== FACEBOOK HANDLER ====================
async function handleFacebook(url) {
  try {
    let videoId = null;
    
    const patterns = [
      /facebook\.com\/.*\/videos\/(\d+)/,
      /fb\.watch\/([a-zA-Z0-9_-]+)/,
      /facebook\.com\/watch\/\?v=(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        videoId = match[1];
        break;
      }
    }

    if (!videoId) {
      return { error: 'Invalid Facebook URL' };
    }

    return {
      success: false,
      platform: 'facebook',
      message: 'Facebook videos require authentication and are protected by CORS policies.',
      suggestion: 'Use Facebook\'s built-in download feature or a browser extension.',
      videoId
    };
  } catch (error) {
    return { error: error.message || 'Failed to process Facebook URL' };
  }
}

// ==================== PINTEREST HANDLER ====================
async function handlePinterest(url) {
  try {
    const pinId = extractPinterestId(url);
    if (!pinId) {
      return { error: 'Invalid Pinterest URL' };
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    });

    if (!response.ok) {
      return { error: 'Could not fetch Pinterest pin' };
    }

    const html = await response.text();

    const imageMatch = html.match(/"og:image"\s+content="([^"]+)"/);
    const videoMatch = html.match(/"og:video"\s+content="([^"]+)"/);
    
    const result = {
      success: true,
      platform: 'pinterest',
      pinId,
      media: []
    };

    if (videoMatch) {
      result.media.push({
        type: 'video',
        url: videoMatch[1]
      });
    }
    
    if (imageMatch) {
      result.media.push({
        type: 'image',
        url: imageMatch[1]
      });
    }

    if (result.media.length === 0) {
      return { error: 'Could not extract media from Pinterest pin' };
    }

    return result;
  } catch (error) {
    return { error: error.message || 'Failed to process Pinterest URL' };
  }
}

function extractPinterestId(url) {
  const match = url.match(/pin\/(\d+)/);
  return match ? match[1] : null;
}

// ==================== PAGES FUNCTION EXPORTS ====================
export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);

  const mediaUrl = url.searchParams.get('url');
  const platform = url.searchParams.get('platform');

  if (!mediaUrl) {
    return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  let handler = null;
  let detectedPlatform = platform;

  if (!detectedPlatform || detectedPlatform === 'auto') {
    if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
      detectedPlatform = 'youtube';
    } else if (mediaUrl.includes('instagram.com')) {
      detectedPlatform = 'instagram';
    } else if (mediaUrl.includes('twitter.com') || mediaUrl.includes('x.com')) {
      detectedPlatform = 'twitter';
    } else if (mediaUrl.includes('tiktok.com')) {
      detectedPlatform = 'tiktok';
    } else if (mediaUrl.includes('facebook.com') || mediaUrl.includes('fb.watch')) {
      detectedPlatform = 'facebook';
    } else if (mediaUrl.includes('pinterest.com')) {
      detectedPlatform = 'pinterest';
    }
  }

  switch (detectedPlatform) {
    case 'youtube':
      handler = handleYouTube;
      break;
    case 'instagram':
      handler = handleInstagram;
      break;
    case 'twitter':
    case 'x':
      handler = handleTwitter;
      break;
    case 'tiktok':
      handler = handleTikTok;
      break;
    case 'facebook':
      handler = handleFacebook;
      break;
    case 'pinterest':
      handler = handlePinterest;
      break;
    default:
      return new Response(JSON.stringify({ error: 'Unsupported or undetectable platform' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
  }

  try {
    const result = await handler(mediaUrl);
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        ...CORS_HEADERS
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}
