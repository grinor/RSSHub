import crypto from 'node:crypto';

import { raw } from 'hono/html';
import { renderToString } from 'hono/jsx/dom/server';

export const getBehanceHeaders = () => {
    const uuid = crypto.randomUUID();

    return {
        Cookie: `gk_suid=${Math.random().toString().slice(2, 10)}, gki=; originalReferrer=; bcp=${uuid}`,
        'X-BCP': uuid,
        'X-Requested-With': 'XMLHttpRequest',
    };
};

export const renderDescription = (description, modules) =>
    renderToString(
        <>
            {description?.length ? (
                <>
                    {description}
                    <br />
                </>
            ) : null}
            {modules?.map((module) => {
                if (module.__typename === 'ImageModule') {
                    return (
                        <>
                            <figure>
                                <img src={module.imageSizes?.allAvailable?.[0]?.url} alt={module.altText ?? undefined} />
                                {module.caption?.length ? <figcaption>{module.caption}</figcaption> : null}
                            </figure>
                            <br />
                        </>
                    );
                }
                if (module.__typename === 'TextModule') {
                    return (
                        <>
                            {module.text ? raw(module.text) : null}
                            <br />
                        </>
                    );
                }
                if (module.__typename === 'MediaCollectionModule') {
                    return (
                        <>
                            {module.components?.map((comp) => (
                                <img src={`https://mir-s3-cdn-cf.behance.net/project_modules/source/${comp.filename}`} alt="" />
                            ))}
                            <br />
                        </>
                    );
                }
                if (module.__typename === 'EmbedModule' || module.__typename === 'VideoModule') {
                    const embed = module.fluidEmbed || module.originalEmbed || module.embed;
                    return (
                        <>
                            {embed ? raw(embed) : null}
                            <br />
                        </>
                    );
                }

                return (
                    <>
                        UNHANDLED MODULE: {module.__typename}
                        <br />
                    </>
                );
            })}
        </>
    );
