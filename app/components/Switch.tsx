import { useState } from 'react';

interface SwitchProps {
    onClick: (state: boolean) => void;
    value: boolean;
}

const Switch = ({ onClick, value }: SwitchProps) => {
    const [state, setState] = useState(value);
    const onClickHandler = () =>
        setState((x) => {
            x = !x;
            onClick(x);
            return x;
        });

    return (
        <div
            onClick={onClickHandler}
            className={`pointer-events-auto h-6 w-10 rounded-full p-1 ring-1 ring-inset transition duration-200 ease-in-out ${
                state ? 'bg-indigo-600 ring-black/20' : 'bg-slate-900/10 ring-slate-900/5'
            }`}>
            <div
                className={`h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-slate-700/10 transition duration-200 ease-in-out ${
                    state ? 'translate-x-4' : ''
                }`}></div>
        </div>
    );
};

// <div class="pointer-events-auto h-6 w-10 rounded-full p-1 ring-1 ring-inset transition duration-200 ease-in-out bg-indigo-600 ring-black/20"><div class="h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-slate-700/10 transition duration-200 ease-in-out translate-x-4"></div></div>

export default Switch;
