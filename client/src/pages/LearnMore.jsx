import React, { useEffect, useMemo, useState } from 'react';
import {
    Bookmark,
    ExternalLink,
    Flame,
    GraduationCap,
    Languages,
    PlayCircle,
    Search,
    Sparkles,
    X
} from 'lucide-react';
import { safeLocalStorage } from '../utils/safeStorage';

const LANGUAGE_OPTIONS = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'arabic', label: 'Arabic' }
];

const QUICK_TOPICS = [
    'Acid Base Titration',
    'Hardness of Water',
    'pH Scale',
    'Electrolysis',
    'Organic Chemistry',
    'Periodic Table'
];

const SAVED_VIDEOS_KEY = 'c-lab-learn-more-saved-videos';

function loadSavedVideos() {
    try {
        const raw = safeLocalStorage.getItem(SAVED_VIDEOS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveSavedVideos(videos) {
    try {
        safeLocalStorage.setItem(SAVED_VIDEOS_KEY, JSON.stringify(videos.slice(0, 30)));
    } catch {
        // best effort only
    }
}

function VideoCard({ video, onWatch, onToggleSave, isSaved }) {
    return (
        <article className="group overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/65 shadow-[0_20px_60px_rgba(2,6,23,0.4)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_24px_70px_rgba(6,182,212,0.12)]">
            <button type="button" className="relative block w-full overflow-hidden" onClick={() => onWatch(video)}>
                <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="h-48 w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/15 to-transparent" />
                <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white">
                    <PlayCircle className="h-4 w-4 text-cyan-300" />
                    {video.duration || 'Watch'}
                </div>
            </button>
            <div className="space-y-4 p-5">
                <div>
                    <h3 className="line-clamp-2 text-base font-bold text-white">{video.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{video.channel}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">{video.views || 'Popular'}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-slate-300">{video.uploadedAt || 'Educational'}</span>
                    {video.summary && <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2.5 py-1 text-fuchsia-100">AI Summary</span>}
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-slate-300">{video.summary || video.description || 'Chemistry learning video.'}</p>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onWatch(video)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
                    >
                        <PlayCircle className="h-4 w-4" />
                        Watch Video
                    </button>
                    <button
                        type="button"
                        onClick={() => onToggleSave(video)}
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border transition ${isSaved
                            ? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-400/30 hover:text-cyan-200'
                            }`}
                        aria-label={isSaved ? 'Remove saved video' : 'Save video'}
                    >
                        <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>
        </article>
    );
}

function PlaylistCard({ playlist }) {
    return (
        <a
            href={playlist.url}
            target="_blank"
            rel="noreferrer"
            className="group flex overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/65 shadow-[0_20px_60px_rgba(2,6,23,0.34)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/30"
        >
            <img src={playlist.thumbnail} alt={playlist.title} className="h-32 w-40 object-cover" />
            <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                    <h3 className="line-clamp-2 text-base font-bold text-white">{playlist.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{playlist.channel}</p>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-300">{playlist.summary || 'Playlist of chemistry videos selected for study.'}</p>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
                    Open Playlist
                    <ExternalLink className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
            </div>
        </a>
    );
}

function VideoModal({ video, onClose }) {
    if (!video) return null;

    return (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md" onClick={onClose}>
            <div
                className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-slate-950 shadow-[0_30px_80px_rgba(2,6,23,0.7)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Learn More</p>
                        <h2 className="mt-1 text-xl font-black text-white">{video.title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="grid gap-0 lg:grid-cols-[1.45fr_0.85fr]">
                    <div className="aspect-video w-full bg-black">
                        <iframe
                            title={video.title}
                            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto border-l border-white/10 p-5">
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">{video.channel}</span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-slate-300">{video.views || 'Popular'}</span>
                                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-slate-300">{video.uploadedAt || 'Educational'}</span>
                            </div>
                            <p className="text-sm leading-7 text-slate-300">{video.description || 'No detailed description available.'}</p>
                            <div className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-200">AI Summary</p>
                                <p className="mt-2 text-sm leading-6 text-fuchsia-50">{video.summary || 'This video explains the selected chemistry topic clearly with a step-by-step breakdown.'}</p>
                            </div>
                            <a
                                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition hover:bg-red-500/20"
                            >
                                Open on YouTube
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LearnMore() {
    const [searchInput, setSearchInput] = useState('Acid Base Titration');
    const [language, setLanguage] = useState('english');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeVideo, setActiveVideo] = useState(null);
    const [savedVideos, setSavedVideos] = useState(() => loadSavedVideos());
    const [result, setResult] = useState({
        topic: '',
        query: '',
        source: 'fallback',
        videos: [],
        featuredChannel: null,
        featuredVideos: [],
        playlists: [],
        trending: [],
        relatedTopics: [],
        notice: ''
    });

    const savedVideoIds = useMemo(() => new Set(savedVideos.map((item) => item.videoId)), [savedVideos]);

    const runSearch = async (topic = searchInput, selectedLanguage = language) => {
        const cleanTopic = String(topic || '').trim() || 'General Chemistry';
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/learn/search?topic=${encodeURIComponent(cleanTopic)}&language=${encodeURIComponent(selectedLanguage)}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || 'Unable to load learning videos.');
            setResult({
                topic: data.topic || cleanTopic,
                query: data.query || cleanTopic,
                source: data.source || 'fallback',
                videos: Array.isArray(data.videos) ? data.videos : [],
                featuredChannel: data.featuredChannel || null,
                featuredVideos: Array.isArray(data.featuredVideos) ? data.featuredVideos : [],
                playlists: Array.isArray(data.playlists) ? data.playlists : [],
                trending: Array.isArray(data.trending) ? data.trending : [],
                relatedTopics: Array.isArray(data.relatedTopics) ? data.relatedTopics : [],
                notice: data.notice || ''
            });
            setSearchInput(cleanTopic);
        } catch (searchError) {
            setError(searchError.message || 'Unable to load learning videos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runSearch('Acid Base Titration', 'english');
    }, []);

    useEffect(() => {
        saveSavedVideos(savedVideos);
    }, [savedVideos]);

    const toggleSaveVideo = (video) => {
        setSavedVideos((current) => {
            const exists = current.some((item) => item.videoId === video.videoId);
            if (exists) return current.filter((item) => item.videoId !== video.videoId);
            return [video, ...current].slice(0, 20);
        });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        runSearch(searchInput, language);
    };

    return (
        <>
            <div className="space-y-6">
                <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_26%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] p-6 shadow-[0_24px_70px_rgba(2,6,23,0.45)] sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                                <GraduationCap className="h-4 w-4" />
                                Learn More
                            </div>
                            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Chemistry video learning hub</h1>
                            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                                Search chemistry topics, surface strong educational videos, open recommended playlists, and learn visually without leaving the platform.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Topic</p>
                                <strong className="mt-1 block text-sm text-white">{result.topic || 'General Chemistry'}</strong>
                            </div>
                            <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Language</p>
                                <strong className="mt-1 block text-sm text-white">{LANGUAGE_OPTIONS.find((item) => item.value === language)?.label || 'English'}</strong>
                            </div>
                            <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Source</p>
                                <strong className="mt-1 block text-sm text-white">{result.source === 'youtube' ? 'Live YouTube' : 'Curated Fallback'}</strong>
                            </div>
                        </div>
                    </div>

                    <form className="mt-8 grid gap-3 lg:grid-cols-[1fr_220px_160px]" onSubmit={handleSubmit}>
                        <label className="group flex items-center gap-3 rounded-[26px] border border-white/10 bg-slate-950/55 px-4 py-4 transition focus-within:border-cyan-400/35">
                            <Search className="h-5 w-5 text-slate-500 transition group-focus-within:text-cyan-300" />
                            <input
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                                placeholder="Search Chemistry Topic..."
                                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                            />
                        </label>
                        <label className="flex items-center gap-3 rounded-[26px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm text-white">
                            <Languages className="h-5 w-5 text-cyan-300" />
                            <select
                                value={language}
                                onChange={(event) => setLanguage(event.target.value)}
                                className="w-full bg-transparent outline-none"
                            >
                                {LANGUAGE_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value} className="bg-slate-950 text-white">
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 rounded-[26px] bg-cyan-400 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
                        >
                            <Sparkles className="h-4 w-4" />
                            Search
                        </button>
                    </form>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {QUICK_TOPICS.map((topic) => (
                            <button
                                key={topic}
                                type="button"
                                onClick={() => runSearch(topic, language)}
                                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/30 hover:text-cyan-100"
                            >
                                {topic}
                            </button>
                        ))}
                    </div>

                    {(result.notice || result.source === 'fallback') && (
                        <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
                            {result.notice || 'Using the built-in chemistry learning set. Add YOUTUBE_API_KEY on the server for live YouTube search results.'}
                        </div>
                    )}
                </section>

                {error && (
                    <div className="rounded-3xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
                        {error}
                    </div>
                )}

                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-black text-white">From {result.featuredChannel?.name || 'Featured Channel'}</h2>
                            <p className="mt-1 text-sm text-slate-400">Latest picks from the recommended YouTube channel.</p>
                        </div>
                        {result.featuredChannel?.url && (
                            <a
                                href={result.featuredChannel.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-500/20"
                            >
                                Visit Channel
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        )}
                    </div>
                    <div className="grid gap-5 xl:grid-cols-3">
                        {result.featuredVideos.map((video) => (
                            <VideoCard
                                key={`featured-${video.videoId}`}
                                video={video}
                                onWatch={setActiveVideo}
                                onToggleSave={toggleSaveVideo}
                                isSaved={savedVideoIds.has(video.videoId)}
                            />
                        ))}
                        {!loading && !result.featuredVideos.length && (
                            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">
                                Channel videos are not available right now. Check your internet connection and try again.
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-white">Top Videos</h2>
                            <p className="mt-1 text-sm text-slate-400">Popular educational chemistry videos for {result.topic || 'your topic'}.</p>
                        </div>
                    </div>
                    <div className="grid gap-5 xl:grid-cols-3">
                        {(loading ? Array.from({ length: 6 }).map((_, index) => ({ videoId: `loading-${index}` })) : result.videos).map((video) => (
                            loading ? (
                                <div key={video.videoId} className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/60">
                                    <div className="h-48 animate-pulse bg-white/[0.05]" />
                                    <div className="space-y-3 p-5">
                                        <div className="h-5 animate-pulse rounded bg-white/[0.06]" />
                                        <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.05]" />
                                        <div className="h-16 animate-pulse rounded bg-white/[0.04]" />
                                    </div>
                                </div>
                            ) : (
                                <VideoCard
                                    key={video.videoId}
                                    video={video}
                                    onWatch={setActiveVideo}
                                    onToggleSave={toggleSaveVideo}
                                    isSaved={savedVideoIds.has(video.videoId)}
                                />
                            )
                        ))}
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-black text-white">Recommended Playlists</h2>
                            <p className="mt-1 text-sm text-slate-400">Multi-video study paths for deeper chemistry revision.</p>
                        </div>
                        <div className="grid gap-4">
                            {result.playlists.map((playlist) => (
                                <PlaylistCard key={playlist.playlistId} playlist={playlist} />
                            ))}
                            {!loading && !result.playlists.length && (
                                <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">
                                    No playlists found for this topic yet.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[30px] border border-white/10 bg-slate-900/65 p-5 shadow-[0_18px_50px_rgba(2,6,23,0.3)] backdrop-blur-xl">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-fuchsia-300" />
                                <h2 className="text-xl font-black text-white">Related Topics</h2>
                            </div>
                            <p className="mt-2 text-sm text-slate-400">Expand from the current topic into connected chemistry concepts.</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {result.relatedTopics.map((topic) => (
                                    <button
                                        key={topic}
                                        type="button"
                                        onClick={() => runSearch(topic, language)}
                                        className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-100 transition hover:border-fuchsia-300/40"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[30px] border border-white/10 bg-slate-900/65 p-5 shadow-[0_18px_50px_rgba(2,6,23,0.3)] backdrop-blur-xl">
                            <div className="flex items-center gap-2">
                                <Bookmark className="h-5 w-5 text-amber-300" />
                                <h2 className="text-xl font-black text-white">Saved for Later</h2>
                            </div>
                            <div className="mt-4 space-y-3">
                                {savedVideos.slice(0, 4).map((video) => (
                                    <button
                                        key={video.videoId}
                                        type="button"
                                        onClick={() => setActiveVideo(video)}
                                        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-cyan-400/30"
                                    >
                                        <img src={video.thumbnail} alt={video.title} className="h-16 w-24 rounded-xl object-cover" />
                                        <div className="min-w-0">
                                            <p className="line-clamp-2 text-sm font-semibold text-white">{video.title}</p>
                                            <p className="mt-1 text-xs text-slate-400">{video.channel}</p>
                                        </div>
                                    </button>
                                ))}
                                {!savedVideos.length && <p className="text-sm text-slate-400">Save video cards here for later revision.</p>}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-300" />
                        <h2 className="text-2xl font-black text-white">Trending Chemistry Videos</h2>
                    </div>
                    <div className="grid gap-5 xl:grid-cols-3">
                        {result.trending.map((video) => (
                            <VideoCard
                                key={`trending-${video.videoId}`}
                                video={video}
                                onWatch={setActiveVideo}
                                onToggleSave={toggleSaveVideo}
                                isSaved={savedVideoIds.has(video.videoId)}
                            />
                        ))}
                        {!loading && !result.trending.length && (
                            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 text-sm text-slate-400">
                                Trending chemistry videos are not available right now.
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
        </>
    );
}
