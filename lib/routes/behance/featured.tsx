import pMap from 'p-map';

import { config } from '@/config';
import type { Data, DataItem, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import logger from '@/utils/logger';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import parser from '@/utils/rss-parser';

import { getProjectPageQuery } from './queries';
import { getBehanceHeaders, renderDescription } from './utils';

const feedUrl = 'https://www.behance.net/feeds/projects';

export const route: Route = {
    path: '/featured',
    categories: ['design'],
    view: ViewType.Pictures,
    example: '/behance/featured',
    name: 'Featured Projects',
    maintainers: ['grinor'],
    radar: [{ source: ['www.behance.net/feeds/projects'], target: '/featured' }],
    features: {
        antiCrawler: true,
    },
    handler,
};

async function handler(): Promise<Data> {
    const feed = await parser.parseString(
        await ofetch<string, 'text'>(feedUrl, {
            responseType: 'text',
            headers: {
                'User-Agent': config.ua,
            },
        })
    );
    const headers = getBehanceHeaders();
    const sourceItems = feed.items
        .filter((item): item is typeof item & { title: string; link: string } => Boolean(item.title && item.link))
        .map((item) => ({
            projectId: item.link.match(/\/gallery\/(\d+)\//)![1],
            item: {
                title: item.title,
                link: item.link,
                description: item.description,
                pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
            },
        }));

    const items = await pMap(
        sourceItems,
        ({ projectId, item }) =>
            cache.tryGet<DataItem>(`behance:featured:${projectId}`, async () => {
                try {
                    const response = await ofetch('https://www.behance.net/v3/graphql', {
                        method: 'POST',
                        headers,
                        body: {
                            query: getProjectPageQuery,
                            variables: { projectId },
                        },
                    });
                    const project = response.data.project;

                    return {
                        ...item,
                        author: project.owners.map((owner) => owner.displayName).join(', '),
                        category: project.tags?.map((tag) => tag.title.toLowerCase()),
                        description: renderDescription(project.description, project.allModules),
                        pubDate: project.publishedOn ? parseDate(project.publishedOn, 'X') : item.pubDate,
                    };
                } catch (error) {
                    logger.warn(`Unable to retrieve Behance project ${projectId}: ${error}`);
                    return item;
                }
            }),
        { concurrency: 3 }
    );

    return {
        title: feed.title ?? 'Behance Featured Projects',
        description: feed.description,
        link: 'https://www.behance.net/featured',
        language: 'en-us',
        item: items,
    };
}
