interface UpvoteProps {
    onClick: React.MouseEventHandler<HTMLButtonElement>;
}

const Upvote = ({ onClick }: UpvoteProps) => {
    return <button onClick={onClick}></button>;
};

export default Upvote;
