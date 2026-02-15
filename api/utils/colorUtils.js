const COLORS = [
    '#fad2e2',
    '#fceecb',
    '#fcc699',
    '#a6c6dd',
    '#fa988a',
    '#cee3cc',
    '#fffdfd',
    '#fccfb7',
    '#d8c4d9',
    '#f59e90',
    '#82c9de',
    '#b7eed8',
    '#80c2dd',
    '#9ddce0',
    '#f5b3d9',
    '#9da1df',
    '#b5e997',
    '#f18783',
    '#ef87e0',
    '#aabae9',
    '#82f9d9',
    '#82cfe4',
    '#b0caf7',
    '#8cf1aa',
    '#e0d59f',
    '#ea8295',
];

// Generate a random color from the predefined palette
function getRandomColor() {
    const randomIndex = Math.floor(Math.random() * COLORS.length);
    return COLORS[randomIndex];
}

module.exports = {
    COLORS,
    getRandomColor
};