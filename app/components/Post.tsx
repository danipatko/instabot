import type { Source } from '@prisma/client';

interface PostProps {
    src: Source;
    children: React.ReactFragment;
    inline: boolean;
}

export default function Post({ src, children, inline = true }: PostProps) {
    return (
        <div className="px-5 py-3 mt-3 border border-gray-200 shadow-sm rounded-md">
            <div className="pb-2">
                <div className="font-semibold text-black text-base">{src.title}</div>
                <div className="-mt-1 text-gray-600 text-xs">by {src.author}</div>
            </div>
            {src.dash_url ? <video data-dashjs-player src={src.dash_url} controls /> : <img src={src.url} alt={src.title} />}
            <div className="-mt-5 ml-2 z-20 text-xs font-semibold text-orange-600">#{src.name}</div>
            <div className="p-2 flex justify-between items-center">
                <div className="mt-1 text-sm text-gray-500 sm:mt-0 sm:col-span-2">
                    <span className="text-orange-600 font-semibold">{src.ups}&#8593;</span>{' '}
                    <span className="text-indigo-500 font-semibold">{src.downs}&#8595;</span> ({src.upvote_ratio}%{', '}
                    {src.num_comments} comment{src.num_comments != 1 ? 's' : ''})
                </div>
                {inline && children}
            </div>
            {!inline && children}
        </div>
    );
}
