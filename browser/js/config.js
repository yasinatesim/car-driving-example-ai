export const GameConfig = {
    LANES: {
        POSITIONS: [-4, 0, 4],
        NAMES: ['LEFT', 'CENTER', 'RIGHT'],
        COUNT: 3
    },
    CAR: {
        SPEED: 0.5,
        LANE_CHANGE_DURATION: 0.33,
        WIDTH: 2,
        LENGTH: 4
    },
    OBSTACLES: {
        SPAWN_DISTANCE: 120,
        MIN_SPAWN_GAP: 30,
        TYPES: ['car', 'car', 'car', 'truck', 'barrier'],
        PROPERTIES: {
            car: { width: 2, length: 3.5, risk: 0.7, color: 0xff3344 },
            truck: { width: 2.2, length: 5, risk: 0.85, color: 0xffaa00 },
            barrier: { width: 2.5, length: 1, risk: 1.0, color: 0xff0044 }
        }
    },
    AI: {
        ACTION_INTERVAL: 200,
        LANE_CHANGE_COOLDOWN: 30
    },
    VISUALS: {
        BACKGROUND_COLOR: 0x0a0a1a,
        FOG_NEAR: 50,
        FOG_FAR: 150,
        CYAN: 0x00f0ff,
        MAGENTA: 0xff00aa
    }
};