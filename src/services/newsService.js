import logger from '../utils/logger';

// RSS to JSON API (Public Bridge)
const RSS_API_BASE = 'https://api.rss2json.com/v1/api.json?rss_url=';

// Feed Sources
const FEEDS = [
    {
        name: 'The Hindu',
        url: 'https://www.thehindu.com/news/national/feeder/default.rss',
        tag: 'National'
    },
    {
        name: 'Indian Express',
        url: 'https://indianexpress.com/section/india/feed/',
        tag: 'India'
    },
    {
        name: 'Science Daily',
        url: 'https://www.sciencedaily.com/rss/top/science.xml',
        tag: 'Science'
    }
];

/**
 * Fetch and normalize news from multiple RSS feeds
 * @returns {Promise<Array>} Array of news items
 */
export async function fetchNews() {
    try {
        const feedPromises = FEEDS.map(async (source) => {
            try {
                const response = await fetch(`${RSS_API_BASE}${encodeURIComponent(source.url)}`);
                const data = await response.json();

                if (data.status !== 'ok') return [];

                return data.items.map(item => ({
                    id: btoa(item.guid || item.link).replace(/[/+=]/g, ''), // Safe ID for Firestore
                    title: item.title,
                    summary: stripHtml(item.description || item.content).substring(0, 150) + '...',
                    link: item.link,
                    tag: source.tag,
                    source: source.name,
                    date: timeAgo(item.pubDate),
                    image: item.thumbnail || item.enclosure?.link || null
                }));
            } catch (err) {
                logger.warn(`Failed to fetch feed: ${source.name}`, err);
                return [];
            }
        });

        const results = await Promise.all(feedPromises);

        // Flatten and sort by date (roughly, since RSS date formats vary, we just shuffle or take top)
        // Ideally we'd parse pubDate, but for simplicity let's interleave them
        const allNews = results.flat();

        // Return top 20 items
        return allNews.slice(0, 20);

    } catch (error) {
        logger.error('Error fetching news:', error);
        return [];
    }
}

// Helper: Strip HTML tags for summary
function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
}

// Helper: Time ago formatter
function timeAgo(dateString) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}
