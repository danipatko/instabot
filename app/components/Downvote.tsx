interface DownvoteProps {
    onClick: React.MouseEventHandler<HTMLButtonElement>;
}

const Downvote = ({ onClick }: DownvoteProps) => {
    return <button onClick={onClick}></button>;
};

export default Downvote;
