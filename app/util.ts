const normalizeHours = (hours: number): string => {
    const hrs = Math.floor(hours);
    const mins = Math.floor((hours % 1) * 60);
    return hrs < 1 && mins < 1 ? 'less than a minute' : `${hrs} hour${hrs == 1 ? '' : 's'} ${mins} minute${mins == 1 ? '' : 's'}`;
};

export { normalizeHours };
