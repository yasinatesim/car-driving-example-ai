import { Utils } from './utils.js';
import { GameConfig } from './config.js';

export class FuzzyController {
    constructor() {
        this.distanceSets = {
            veryClose: [0, 0, 10, 20],
            close: [15, 25, 35, 45],
            medium: [40, 50, 60, 70],
            far: [65, 80, 100, 100]
        };

        this.speedSets = {
            slow: [0, 0, 0.3, 0.5],
            normal: [0.4, 0.5, 0.6, 0.7],
            fast: [0.6, 0.8, 1, 1]
        };

        this.riskValues = {
            veryLow: 0.1,
            low: 0.3,
            medium: 0.5,
            high: 0.7,
            veryHigh: 0.9,
            critical: 1.0
        };

        this.obstacleRisk = { car: 1.0, truck: 1.3, barrier: 1.5 };
    }

    trapezoid(x, a, b, c, d) {
        if (x <= a || x >= d) return 0;
        if (x >= b && x <= c) return 1;
        if (x < b) return (x - a) / (b - a);
        return (d - x) / (d - c);
    }

    getMembership(value, sets) {
        const result = {};
        for (const [name, params] of Object.entries(sets)) {
            result[name] = this.trapezoid(value, ...params);
        }
        return result;
    }

    applyRules(distMem, speedMem, obstacleType) {
        const mult = this.obstacleRisk[obstacleType] || 1.0;
        return [
            { activation: distMem.veryClose, risk: this.riskValues.critical * mult },
            { activation: Math.min(distMem.close, speedMem.fast), risk: this.riskValues.veryHigh * mult },
            { activation: Math.min(distMem.close, speedMem.normal), risk: this.riskValues.high * mult },
            { activation: Math.min(distMem.close, speedMem.slow), risk: this.riskValues.medium * mult },
            { activation: Math.min(distMem.medium, speedMem.fast), risk: this.riskValues.high * mult },
            { activation: Math.min(distMem.medium, speedMem.normal), risk: this.riskValues.medium * mult },
            { activation: Math.min(distMem.medium, speedMem.slow), risk: this.riskValues.low * mult },
            { activation: distMem.far, risk: this.riskValues.veryLow }
        ];
    }

    defuzzify(rules) {
        let num = 0, den = 0;
        for (const rule of rules) {
            num += rule.activation * rule.risk;
            den += rule.activation;
        }
        return den > 0 ? num / den : 0;
    }

    calculateLaneRisk(obstacles, laneIndex, speed) {
        let maxRisk = 0;
        for (const obs of obstacles) {
            if (obs.laneIndex !== laneIndex || obs.distance < 0) continue;

            const normDist = Utils.clamp(obs.distance, 0, 100);
            const normSpeed = Utils.clamp(speed + (obs.relativeSpeed || 0), 0, 1);

            const distMem = this.getMembership(normDist, this.distanceSets);
            const speedMem = this.getMembership(normSpeed, this.speedSets);
            const rules = this.applyRules(distMem, speedMem, obs.type);
            const risk = this.defuzzify(rules);

            maxRisk = Math.max(maxRisk, risk);
        }
        return Utils.clamp(maxRisk, 0, 1);
    }

    assess(obstacles, speed) {
        const laneRisks = [0, 1, 2].map(i => this.calculateLaneRisk(obstacles, i, speed));
        const maxRisk = Math.max(...laneRisks);

        let threatLevel = 'LOW';
        if (maxRisk > 0.8) threatLevel = 'CRITICAL';
        else if (maxRisk > 0.6) threatLevel = 'HIGH';
        else if (maxRisk > 0.3) threatLevel = 'MEDIUM';

        const minRisk = Math.min(...laneRisks);
        const safestLaneIndex = laneRisks.indexOf(minRisk);

        return {
            laneRisks,
            threatLevel,
            safestLane: GameConfig.LANES.NAMES[safestLaneIndex],
            safestLaneIndex
        };
    }
}