export class ActionLogger {
    constructor(maxHistory = 20) {
        this.history = [];
        this.maxHistory = maxHistory;
        this.actionNames = ['LEFT', 'STAY', 'RIGHT'];
        this.actionIcons = ['←', '●', '→'];
    }

    log(action) {
        const entry = {
            action,
            name: this.actionNames[action],
            icon: this.actionIcons[action],
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        this.history.unshift(entry);
        if (this.history.length > this.maxHistory) this.history.pop();
        return entry;
    }

    getHistory() {
        return this.history;
    }

    reset() {
        this.history = [];
    }
}