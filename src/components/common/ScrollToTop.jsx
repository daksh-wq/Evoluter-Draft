import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Simply mount this below BrowserRouter to ensure every new route explicitly
 * scrolls the window back to the top of the page.
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        const resetScroll = () => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant' // Overrides CSS scroll-behavior: smooth
            });
        };

        // Scroll immediately
        resetScroll();

        // Fallback for slow rendering due to React.lazy/Suspense 
        const timeoutId1 = setTimeout(resetScroll, 50);
        const timeoutId2 = setTimeout(resetScroll, 150);

        return () => {
            clearTimeout(timeoutId1);
            clearTimeout(timeoutId2);
        };
    }, [pathname]);

    return null;
};

export default ScrollToTop;
