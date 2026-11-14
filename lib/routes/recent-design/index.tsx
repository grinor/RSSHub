import { load } from 'cheerio';
import { renderToString } from 'hono/jsx/dom/server';

import type { Data, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const rootUrl = 'https://recent.design';

export const route: Route = {
    path: '/',
    categories: ['design'],
    example: '/recent-design',
    name: 'All Recent',
    maintainers: ['grinor'],
    radar: [{ source: ['recent.design'], target: '/' }],
    handler,
};

async function handler(): Promise<Data> {
    const response = await ofetch(rootUrl);
    const $ = load(response);
    const links = $('a[href^="/i/"]')
        .toArray()
        .map((element) => new URL($(element).attr('href')!, rootUrl).href);

    const items = await Promise.all(links.map((link) => cache.tryGet(link, () => fetchItem(link))));

    return {
        title: 'Recent — Design Inspiration',
        link: rootUrl,
        item: items,
    };
}

async function fetchItem(link: string) {
    const response = await ofetch(link);
    const $ = load(response);
    const title = $('meta[property="og:title"]').attr('content')!;
    const description = $('meta[property="og:description"]').attr('content')!;
    const image = $('meta[property="og:image"]').attr('content')!;
    const video = $('video[src]').attr('src');
    const poster = $('video[poster]').attr('poster');
    const publishedAt = $('time[datetime]').attr('datetime')!;

    return {
        title,
        link,
        description: renderToString(
            <>
                {video ? <video controls poster={poster} src={video} /> : <img src={image} alt={title} />}
                <p>{description}</p>
            </>
        ),
        pubDate: parseDate(publishedAt),
    };
}
