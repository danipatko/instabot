interface ButtonProps {
    children?: React.ReactFragment;
    primary: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const Button = ({ onClick, children }: ButtonProps) => {
    return <button onClick={onClick}>{children ?? 'Ok'}</button>;
};

export default Button;
