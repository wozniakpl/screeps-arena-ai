import {
    BODYPART_COST,
    RESOURCE_ENERGY
} from "game/constants";

const createCreep = (spawn, params, role) => {
    var creep = spawn.spawnCreep(params).object;
    if (!creep) {
        return;
    }
    creep.memory = {};
    creep.memory.role = role;
    return creep;
}

export default {
    ensure(creeps, spawn, count, params, role) {
        if (count === null || creeps.length < count) {
            const cost = params.reduce((sum, part) => sum + BODYPART_COST[part], 0);
            if (spawn.store[RESOURCE_ENERGY] < cost) {
                return;
            }
            console.log(`Registering spawn of ${role} with ${params} (cost: ${cost})`)
            createCreep(spawn, params, role);
        }
    },
}