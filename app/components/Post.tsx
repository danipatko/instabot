import type { Source } from '@prisma/client';

interface PostProps {
    src: Source;
}

export default function Post({ src }: PostProps) {
    return (
        <div className="p-4 mt-4 border border-gray-300 shadow-sm">
            <h3>{src.title}</h3>
        </div>
    );
}
