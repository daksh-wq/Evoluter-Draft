import React, { useEffect, useState } from 'react';
import { Clock, BookOpen, Bookmark, Share2, RefreshCw } from 'lucide-react';
import { fetchNews } from '../../services/newsService';
import { doc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks';
import { handleError, ErrorSeverity, ErrorCategory } from '../../utils/errorHandler';
import logger from '../../utils/logger';


const NEWS_FEED = []; // Initial empty state

/**
 * NewsView Component
 * Displays Real-time current affairs feed
 */
const NewsView = () => {
    const [newsFeed, setNewsFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const [savedArticles, setSavedArticles] = useState(new Set());
    const [savingArticle, setSavingArticle] = useState({});

    useEffect(() => {
        const loadNews = async () => {
            try {
                const liveNews = await fetchNews();
                if (liveNews && liveNews.length > 0) {
                    setNewsFeed(liveNews);
                } else {
                    // Fallback if API fails (rare)
                    setNewsFeed([
                        {
                            id: 'fallback-1',
                            title: 'Unable to load live news',
                            summary: 'Please check your internet connection or try again later.',
                            tag: 'System',
                            date: 'Now',
                            link: '#'
                        }
                    ]);
                }
            } catch (err) {
                logger.error("Failed to load news", err);
            } finally {
                setLoading(false);
            }
        };
        loadNews();
    }, []);

    // Fetch saved articles
    useEffect(() => {
        const fetchSavedArticles = async () => {
            if (!user) return;

            try {
                const savedRef = collection(db, 'users', user.uid, 'saved_articles');
                const snapshot = await getDocs(savedRef);
                const saved = new Set(snapshot.docs.map(doc => doc.id));
                setSavedArticles(saved);
            } catch (error) {
                handleError(error, 'Failed to load saved articles', ErrorSeverity.SILENT, ErrorCategory.DATABASE);
            }
        };

        if (user) fetchSavedArticles();
    }, [user]);

    const handleSaveArticle = async (article) => {
        if (!user) {
            handleError(
                new Error('Not authenticated'),
                'Please log in to save articles',
                ErrorSeverity.USER_FACING,
                ErrorCategory.AUTH
            );
            return;
        }

        const articleId = `article_${article.id}`;
        setSavingArticle(prev => ({ ...prev, [article.id]: true }));

        try {
            const savedRef = doc(db, 'users', user.uid, 'saved_articles', articleId);

            if (savedArticles.has(articleId)) {
                // Unsave
                await deleteDoc(savedRef);
                setSavedArticles(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(articleId);
                    return newSet;
                });
            } else {
                // Save
                await setDoc(savedRef, {
                    ...article,
                    savedAt: serverTimestamp()
                });
                setSavedArticles(prev => new Set([...prev, articleId]));
            }
        } catch (error) {
            handleError(
                error,
                'Failed to save article',
                ErrorSeverity.USER_FACING,
                ErrorCategory.DATABASE
            );
        } finally {
            setSavingArticle(prev => ({ ...prev, [article.id]: false }));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 animate-in fade-in">
                <RefreshCw className="animate-spin text-blue-500 mb-4" size={32} />
                <p className="text-slate-500 font-bold">Curating Today's Headlines...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <header className="border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-extrabold text-indigo-950 tracking-tight">
                    Current Affairs
                </h1>
                <p className="text-slate-500 mt-1">
                    AI-curated news feed relevant for exams.
                </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {newsFeed.map((news) => (
                    <div
                        key={news.id}
                        className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 group-hover:bg-[#2278B0]/5 group-hover:text-[#2278B0] transition-colors">
                                {news.tag}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                {news.source && <span className="font-semibold text-slate-500 mr-2">{news.source} •</span>}
                                <Clock size={12} /> {news.date}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-indigo-950 mb-2 group-hover:text-[#2278B0] transition-colors">
                            {news.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4">
                            {news.summary}
                        </p>

                        <div className="flex gap-4 border-t border-slate-100 pt-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (news.link && news.link !== '#') {
                                        window.open(news.link, '_blank');
                                    }
                                }}
                                className="text-xs font-bold text-slate-500 hover:text-[#2278B0] flex items-center gap-1"
                            >
                                <BookOpen size={14} /> Read Full
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveArticle(news);
                                }}
                                disabled={savingArticle[news.id]}
                                className={`text-xs font-bold flex items-center gap-1 transition-colors ${savedArticles.has(`article_${news.id}`)
                                    ? 'text-[#2278B0]'
                                    : 'text-slate-500 hover:text-[#2278B0]'
                                    }`}
                            >
                                <Bookmark
                                    size={14}
                                    fill={savedArticles.has(`article_${news.id}`) ? 'currentColor' : 'none'}
                                />
                                {savedArticles.has(`article_${news.id}`) ? 'Saved' : 'Save'}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const shareData = {
                                        title: news.title,
                                        text: `${news.title}\n${news.summary}`,
                                        url: news.link
                                    };
                                    if (navigator.share) {
                                        navigator.share(shareData).catch(err => logger.error('Share failed:', err));
                                    } else {
                                        navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
                                        alert("Link copied to clipboard!");
                                    }
                                }}
                                className="text-xs font-bold text-slate-500 hover:text-[#2278B0] flex items-center gap-1 ml-auto"
                            >
                                <Share2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NewsView;
