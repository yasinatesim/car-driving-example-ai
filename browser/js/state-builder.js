import { Utils } from './utils.js';

export class StateBuilder {
    constructor() {
        this.maxDistance = 100;
    }

    build(car, obstacles, fuzzyAssessment, cooldown, speed) {
        const laneDistances = [100, 100, 100];

        for (const obs of obstacles) {
            if (obs.distance > 0 && obs.distance < laneDistances[obs.laneIndex]) {
                laneDistances[obs.laneIndex] = obs.distance;
            }
        }

        const normDist = laneDistances.map(d => Utils.clamp(d / this.maxDistance, 0, 1));
        const minTTC = Math.min(...laneDistances) / (speed * 60 + 1);
        const normTTC = Utils.clamp(minTTC / 3, 0, 1);
        const currentLaneNorm = car.currentLane / 2;

        return [
            normDist[0], fuzzyAssessment.laneRisks[0],
            normDist[1], fuzzyAssessment.laneRisks[1],
            normDist[2], fuzzyAssessment.laneRisks[2],
            currentLaneNorm,
            Utils.clamp(cooldown / 30, 0, 1),
            normTTC,
            Utils.clamp(speed, 0, 1)
        ];
    }
}