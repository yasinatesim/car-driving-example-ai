export const Utils = {
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),
    lerp: (start, end, t) => start + (end - start) * t,
    smoothStep: (t) => t * t * (3 - 2 * t),
    randomRange: (min, max) => Math.random() * (max - min) + min,
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    formatNumber: (num) => Math.floor(num).toLocaleString()
};