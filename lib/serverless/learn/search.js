import { allowMethods, safeServerError } from '../../api-utils.js';

const LANGUAGE_MAP = {
  english: { label: 'English', token: 'English', code: 'en' },
  hindi: { label: 'Hindi', token: 'Hindi', code: 'hi' },
  spanish: { label: 'Spanish', token: 'Spanish', code: 'es' },
  french: { label: 'French', token: 'French', code: 'fr' },
  arabic: { label: 'Arabic', token: 'Arabic', code: 'ar' }
};

const EDUCATIONAL_HINTS = [
  'chemistry',
  'titration',
  'lecture',
  'tutorial',
  'explained',
  'class',
  'education',
  'exam',
  'revision',
  'lesson',
  'practical'
];

const TRUSTED_CHANNEL_HINTS = [
  'khan academy',
  'crash course',
  'the organic chemistry tutor',
  'vedantu',
  'byjus',
  'unacademy',
  'chemistry'
];

const NEGATIVE_HINTS = [
  'shorts',
  'meme',
  'prank',
  'status',
  'edit'
];

const PREFERRED_CHANNEL = {
  name: 'Dr. Harish M. Shinde',
  handle: '@Dr.HarishM.Shinde',
  url: 'https://www.youtube.com/@Dr.HarishM.Shinde'
};

const PREFERRED_CHANNEL_KEYWORDS = [
  'dr. harish m. shinde',
  'dr harish m shinde',
  'harish m shinde',
  'dr. harish shinde',
  'dr harish shinde',
  'harish shinde'
];

function clampTopic(value) {
  const clean = String(value || '').trim().slice(0, 120);
  return clean || 'General Chemistry';
}

function getLanguageConfig(value) {
  const key = String(value || '').trim().toLowerCase();
  const config = LANGUAGE_MAP[key] || LANGUAGE_MAP.english;
  return { value: key in LANGUAGE_MAP ? key : 'english', ...config };
}

function buildSearchQuery(topic, language) {
  return `${topic} chemistry ${language.token} explained lecture tutorial`;
}

function buildRelaxedSearchQuery(topic, language) {
  return `${topic} chemistry ${language.token}`;
}

function buildTrendingQuery(language) {
  return `popular chemistry experiments ${language.token} lecture tutorial`;
}

function textFromRuns(value) {
  if (!value) return '';
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (Array.isArray(value.runs)) return value.runs.map((item) => item?.text || '').join('').trim();
  return '';
}

function extractInitialData(html) {
  const marker = html.includes('var ytInitialData = ') ? 'var ytInitialData = ' : 'ytInitialData = ';
  const startIndex = html.indexOf(marker);
  if (startIndex < 0) return null;

  const jsonStart = startIndex + marker.length;
  let depth = 0;
  let endIndex = jsonStart;
  let started = false;

  for (let i = jsonStart; i < html.length; i += 1) {
    const char = html[i];
    if (char === '{') {
      depth += 1;
      started = true;
    } else if (char === '}') {
      depth -= 1;
      if (started && depth === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (!started || endIndex <= jsonStart) return null;
  return JSON.parse(html.slice(jsonStart, endIndex));
}

function collectRenderers(tree, key, output = []) {
  if (!tree || typeof tree !== 'object') return output;
  if (Array.isArray(tree)) {
    tree.forEach((item) => collectRenderers(item, key, output));
    return output;
  }
  if (tree[key]) output.push(tree[key]);
  Object.values(tree).forEach((value) => collectRenderers(value, key, output));
  return output;
}

function toAbsoluteThumbnail(value) {
  const items = Array.isArray(value) ? value : [];
  const selected = items[items.length - 1]?.url || items[0]?.url || '';
  return selected.startsWith('//') ? `https:${selected}` : selected;
}

function parseViewCount(value) {
  const raw = String(value || '').replace(/,/g, '');
  const match = raw.match(/([\d.]+)\s*([KMB])?/i);
  if (!match) return 0;
  const base = Number(match[1]);
  const unit = String(match[2] || '').toUpperCase();
  if (!Number.isFinite(base)) return 0;
  if (unit === 'K') return base * 1_000;
  if (unit === 'M') return base * 1_000_000;
  if (unit === 'B') return base * 1_000_000_000;
  return base;
}

function formatViews(value) {
  const views = Number(value || 0);
  if (!Number.isFinite(views) || views <= 0) return 'Popular';
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B views`;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

function summarizeVideo(topic, title, channel, language) {
  return `This ${language.label.toLowerCase()} chemistry video explains ${topic.toLowerCase()} through ${title.toLowerCase()} on ${channel}.`;
}

function isPreferredChannel(value) {
  const text = String(value || '').toLowerCase();
  if (!text) return false;
  if (text.includes(PREFERRED_CHANNEL.handle.toLowerCase())) return true;
  return PREFERRED_CHANNEL_KEYWORDS.some((keyword) => text.includes(keyword));
}

function scoreVideo(video, topic) {
  const title = `${video.title} ${video.channel}`.toLowerCase();
  const topicTerms = String(topic || '').toLowerCase().split(/\s+/).filter(Boolean);
  let score = Math.log10((video.viewCount || 0) + 10);

  EDUCATIONAL_HINTS.forEach((keyword) => {
    if (title.includes(keyword)) score += 1.6;
  });
  TRUSTED_CHANNEL_HINTS.forEach((keyword) => {
    if (title.includes(keyword)) score += 2.3;
  });
  NEGATIVE_HINTS.forEach((keyword) => {
    if (title.includes(keyword)) score -= 5;
  });
  if (isPreferredChannel(title)) score += 6;
  topicTerms.forEach((term) => {
    if (title.includes(term)) score += 0.8;
  });

  if ((video.durationSeconds || 0) >= 240) score += 1.4;
  if ((video.durationSeconds || 0) > 3600) score -= 1;
  return score;
}

function parseDurationToSeconds(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  return raw.split(':').reduce((total, part) => total * 60 + Number(part || 0), 0);
}

function extractDurationFromOverlays(renderer) {
  const overlays = Array.isArray(renderer?.thumbnailOverlays) ? renderer.thumbnailOverlays : [];
  const match = overlays.find((item) => item?.thumbnailOverlayTimeStatusRenderer?.text);
  return textFromRuns(match?.thumbnailOverlayTimeStatusRenderer?.text);
}

function parseRendererToVideo(renderer, topic, language, channelOverride = '') {
  if (!renderer || typeof renderer !== 'object') return null;
  const title = textFromRuns(renderer.title);
  const channel = channelOverride
    || textFromRuns(renderer.ownerText)
    || textFromRuns(renderer.longBylineText);
  const rawViews = textFromRuns(renderer.viewCountText) || textFromRuns(renderer.shortViewCountText);
  const duration = extractDurationFromOverlays(renderer) || textFromRuns(renderer.lengthText);
  const description = textFromRuns(renderer.descriptionSnippet) || textFromRuns(renderer.detailedMetadataSnippets?.[0]?.snippetText);
  const videoId = renderer.videoId;
  if (!videoId || !title) return null;
  const viewCount = parseViewCount(rawViews);
  return {
    videoId,
    title,
    channel: channel || PREFERRED_CHANNEL.name,
    thumbnail: toAbsoluteThumbnail(renderer.thumbnail?.thumbnails),
    duration: duration || 'Watch',
    durationSeconds: parseDurationToSeconds(duration),
    viewCount,
    views: formatViews(viewCount),
    uploadedAt: textFromRuns(renderer.publishedTimeText) || 'Recently popular',
    description,
    summary: summarizeVideo(topic, title, channel || PREFERRED_CHANNEL.name, language)
  };
}

async function fetchYoutubeSearchHtml(query, params = '') {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}${params ? `&${params}` : ''}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  if (!response.ok) {
    throw new Error(`YouTube search failed with status ${response.status}.`);
  }

  return response.text();
}

async function fetchYoutubeChannelHtml(path) {
  const url = `https://www.youtube.com/${path}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  if (!response.ok) {
    throw new Error(`YouTube channel fetch failed with status ${response.status}.`);
  }
  return response.text();
}

async function searchYoutubeVideos(topic, language, query) {
  const html = await fetchYoutubeSearchHtml(query);
  const initialData = extractInitialData(await html);
  const renderers = collectRenderers(initialData, 'videoRenderer');

  const videos = renderers
    .map((renderer) => parseRendererToVideo(renderer, topic, language, ''))
    .filter(Boolean)
    .map((video) => ({ ...video, score: scoreVideo(video, topic) }))
    .filter((video) => video.score > 1)
    .sort((a, b) => (b.score - a.score) || (b.viewCount - a.viewCount))
    .slice(0, 9)
    .map(({ score, viewCount, durationSeconds, ...video }) => video);

  return videos;
}

async function fetchPreferredChannelVideos(topic, language) {
  const html = await fetchYoutubeChannelHtml(`${PREFERRED_CHANNEL.handle}/videos`);
  const initialData = extractInitialData(await html);
  const gridVideos = collectRenderers(initialData, 'gridVideoRenderer');
  const richVideos = collectRenderers(initialData, 'videoRenderer');
  const renderers = [...gridVideos, ...richVideos];
  return renderers
    .map((renderer) => parseRendererToVideo(renderer, topic, language, PREFERRED_CHANNEL.name))
    .filter(Boolean)
    .slice(0, 9);
}

async function safeFetchPreferredChannelVideos(topic, language) {
  try {
    return await fetchPreferredChannelVideos(topic, language);
  } catch (error) {
    return [];
  }
}

function mergeVideos(...lists) {
  const seen = new Set();
  const merged = [];
  lists.forEach((list) => {
    (list || []).forEach((video) => {
      if (!video || seen.has(video.videoId)) return;
      seen.add(video.videoId);
      merged.push(video);
    });
  });
  return merged;
}

function buildPlaylistCards(topic, language) {
  const topicSlug = encodeURIComponent(`${topic} chemistry ${language.token}`);
  return [
    {
      playlistId: `search-playlist-${topicSlug}`,
      title: `${topic} Master Playlist`,
      channel: 'YouTube Chemistry Search',
      thumbnail: `https://i.ytimg.com/vi/LgRZRHW9-14/hqdefault.jpg`,
      summary: `Open playlist-focused YouTube results for ${topic.toLowerCase()} in ${language.label.toLowerCase()}.`,
      url: `https://www.youtube.com/results?search_query=${topicSlug}&sp=EgIQAw%253D%253D`
    },
    {
      playlistId: `search-practical-${topicSlug}`,
      title: `${topic} Practicals and Lectures`,
      channel: 'YouTube Chemistry Search',
      thumbnail: `https://i.ytimg.com/vi/HJvALCcKYAc/hqdefault.jpg`,
      summary: `Browse longer practical and lecture playlists related to ${topic.toLowerCase()}.`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} chemistry practical lecture ${language.token}`)}&sp=EgIQAw%253D%253D`
    }
  ];
}

function buildRelatedTopics(topic) {
  const value = String(topic || '').toLowerCase();
  const common = ['Chemical Bonding', 'Reaction Mechanism', 'Stoichiometry', 'Laboratory Technique'];
  if (value.includes('acid') || value.includes('base') || value.includes('titration')) {
    return ['pH Scale', 'Strong vs Weak Acids', 'Neutralization Reaction', 'Indicators'];
  }
  if (value.includes('electrolysis') || value.includes('electrochem')) {
    return ['Redox Reaction', 'Galvanic Cell', 'Electrode Potential', 'Faraday Law'];
  }
  if (value.includes('organic')) {
    return ['Hydrocarbons', 'Functional Groups', 'Isomerism', 'Esterification'];
  }
  if (value.includes('hardness') || value.includes('water')) {
    return ['EDTA Titration', 'Complexometric Titration', 'Ammonia Buffer', 'Eriochrome Black T'];
  }
  if (value.includes('periodic')) {
    return ['Atomic Structure', 'Periodic Trends', 'Valency', 'Electronic Configuration'];
  }
  return common;
}

async function fetchTrendingVideos(language) {
  const videos = await searchYoutubeVideos('Trending Chemistry', language, buildTrendingQuery(language));
  return videos.slice(0, 6);
}

function buildFallbackVideos(topic, language) {
  const baseTopic = clampTopic(topic);
  return [
    {
      videoId: 'LgRZRHW9-14',
      title: `${baseTopic} | Chemistry Lecture`,
      channel: 'Chemistry Education',
      thumbnail: 'https://i.ytimg.com/vi/LgRZRHW9-14/hqdefault.jpg',
      duration: '10:49',
      views: '480.0K views',
      uploadedAt: 'Popular chemistry lesson',
      description: `A chemistry lesson covering ${baseTopic.toLowerCase()} in ${language.label.toLowerCase()}.`,
      summary: summarizeVideo(baseTopic, `${baseTopic} | Chemistry Lecture`, 'Chemistry Education', language)
    },
    {
      videoId: 'HJvALCcKYAc',
      title: `${baseTopic} Problems and Calculations`,
      channel: 'The Organic Chemistry Tutor',
      thumbnail: 'https://i.ytimg.com/vi/HJvALCcKYAc/hqdefault.jpg',
      duration: '18:35',
      views: '1.5M views',
      uploadedAt: 'High-view chemistry tutorial',
      description: `A worked-problem chemistry video for ${baseTopic.toLowerCase()}.`,
      summary: summarizeVideo(baseTopic, `${baseTopic} Problems and Calculations`, 'The Organic Chemistry Tutor', language)
    }
  ];
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;

  const topic = clampTopic(req.query?.topic);
  const language = getLanguageConfig(req.query?.language);
  const query = buildSearchQuery(topic, language);
  const relaxedQuery = buildRelaxedSearchQuery(topic, language);

  try {
    const [primaryVideos, trending, channelVideos] = await Promise.all([
      searchYoutubeVideos(topic, language, query),
      fetchTrendingVideos(language),
      safeFetchPreferredChannelVideos(topic, language)
    ]);
    const videos = primaryVideos.length ? primaryVideos : await searchYoutubeVideos(topic, language, relaxedQuery);
    const mergedVideos = mergeVideos(channelVideos, videos);

    const safeVideos = mergedVideos.length ? mergedVideos : buildFallbackVideos(topic, language);
    const hasLiveResults = mergedVideos.length > 0;

    return res.status(200).json({
      topic,
      language: language.value,
      query: videos.length ? (primaryVideos.length ? query : relaxedQuery) : query,
      source: hasLiveResults ? 'youtube' : 'fallback',
      notice: hasLiveResults ? '' : 'Live YouTube results were limited, so fallback chemistry videos were returned.',
      videos: safeVideos,
      featuredChannel: PREFERRED_CHANNEL,
      featuredVideos: (channelVideos || []).slice(0, 6),
      playlists: buildPlaylistCards(topic, language),
      trending: trending.length ? trending : buildFallbackVideos('Trending Chemistry', language),
      relatedTopics: buildRelatedTopics(topic)
    });
  } catch (error) {
    try {
      return res.status(200).json({
        topic,
        language: language.value,
        query,
        source: 'fallback',
        notice: 'YouTube search is temporarily unavailable. Showing fallback chemistry learning content.',
        videos: buildFallbackVideos(topic, language),
        featuredChannel: PREFERRED_CHANNEL,
        featuredVideos: [],
        playlists: buildPlaylistCards(topic, language),
        trending: buildFallbackVideos('Trending Chemistry', language),
        relatedTopics: buildRelatedTopics(topic)
      });
    } catch (fallbackError) {
      return safeServerError(res, fallbackError, 'learn/search');
    }
  }
}
