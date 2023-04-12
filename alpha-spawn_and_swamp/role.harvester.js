import {
    ERR_NOT_IN_RANGE,
    RESOURCE_ENERGY
} from 'game/constants';
import get from './get';
import spawner from './spawner';

const role = "harvester";

export default {
    spawn(spawn, count, params) {
        const creeps = get.creepsByRole(role);
        spawner.ensure(creeps, spawn, count, params, role);
    },
    run(spawn) {
        const creeps = get.creepsByRole(role);
        const containers = get.nonEmptyContainers();
        creeps.forEach(creep => {
            const nearestNonEmptyContainer = get.closest(creep, containers);
            if (creep.store.getFreeCapacity() > 0) {
                if (creep.withdraw(nearestNonEmptyContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(nearestNonEmptyContainer);
                }
            } else {
                if (creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(spawn);
                }
            }
        });
    },
}