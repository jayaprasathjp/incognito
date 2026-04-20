import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_SITE_NAME = 'INCØGNITØ';
const DEFAULT_SITE_URL = import.meta.env.VITE_SITE_URL || 'https://www.playincognito.ng';
const DEFAULT_IMAGE = `${DEFAULT_SITE_URL}/web-icon.png`;

function ensureMeta(selector, attributes) {
    let element = document.head.querySelector(selector);

    if (!element) {
        element = document.createElement('meta');
        document.head.appendChild(element);
    }

    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            element.setAttribute(key, value);
        }
    });

    return element;
}

function ensureLink(rel) {
    let element = document.head.querySelector(`link[rel="${rel}"]`);

    if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
    }

    return element;
}

const SEO = ({
    title,
    description,
    image,
    type = 'website',
    noindex = false,
    keywords,
    structuredData,
}) => {
    const location = useLocation();

    useEffect(() => {
        const resolvedTitle = title ? `${title} | ${DEFAULT_SITE_NAME}` : DEFAULT_SITE_NAME;
        const resolvedDescription = description || 'INCØGNITØ is a Nigerian university esports platform for anonymous eFootball tournaments, competitive match play, rankings, and player updates.';
        const resolvedImage = image || DEFAULT_IMAGE;
        const origin = typeof window !== 'undefined' ? window.location.origin : DEFAULT_SITE_URL;
        const canonicalUrl = `${origin}${location.pathname}${location.search || ''}`;

        document.title = resolvedTitle;

        ensureMeta('meta[name="description"]', { name: 'description', content: resolvedDescription });
        ensureMeta('meta[name="robots"]', { name: 'robots', content: noindex ? 'noindex, nofollow' : 'index, follow' });
        ensureMeta('meta[name="keywords"]', {
            name: 'keywords',
            content: keywords || 'INCØGNITØ, Nigerian university esports, eFootball tournament, campus gaming, esports Nigeria',
        });
        ensureMeta('meta[property="og:title"]', { property: 'og:title', content: resolvedTitle });
        ensureMeta('meta[property="og:description"]', { property: 'og:description', content: resolvedDescription });
        ensureMeta('meta[property="og:type"]', { property: 'og:type', content: type });
        ensureMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
        ensureMeta('meta[property="og:image"]', { property: 'og:image', content: resolvedImage });
        ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: DEFAULT_SITE_NAME });
        ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
        ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: resolvedTitle });
        ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: resolvedDescription });
        ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: resolvedImage });

        const canonicalLink = ensureLink('canonical');
        canonicalLink.setAttribute('href', canonicalUrl);

        let structuredDataScript = document.head.querySelector('script[data-seo="structured-data"]');

        if (structuredData) {
            if (!structuredDataScript) {
                structuredDataScript = document.createElement('script');
                structuredDataScript.setAttribute('type', 'application/ld+json');
                structuredDataScript.setAttribute('data-seo', 'structured-data');
                document.head.appendChild(structuredDataScript);
            }

            structuredDataScript.textContent = JSON.stringify(structuredData);
        } else if (structuredDataScript) {
            structuredDataScript.remove();
        }
    }, [description, image, keywords, location.pathname, location.search, noindex, structuredData, title, type]);

    return null;
};

export default SEO;