import { getObjectsByPrototype } from 'game/utils';
import { Creep, StructureSpawn, Source} from 'game/prototypes';
import { MOVE, CARRY, WORK, RESOURCE_ENERGY, ERR_NOT_IN_RANGE, BODYPART_COST, RANGED_ATTACK, TOUGH } from 'game/constants';

const getCreeps = (role) => {
    return getObjectsByPrototype(Creep).filter(i => i.my && i["memory"] !== undefined && i["memory"].role === role);
}

var spawning = false;
const spawnUnit = (role, spawn, params) => {
    if (spawning) {
        return;
    }
    const cost = params.reduce((acc, part) => acc + BODYPART_COST[part], 0);
    if (spawn.store[RESOURCE_ENERGY] < cost) {
        return;
    }

    console.log('Spawning', role, params);
    var creep = spawn.spawnCreep(params).object;
    creep.memory = {};
    creep.memory.role = role;
    spawning = true;
}

const maintainGatherers = (source, spawn, count, params) => {
    const gathererCreeps = getCreeps('gatherer');
    if (gathererCreeps.length < count && !spawn.spawning) {
        spawnUnit("gatherer", spawn, params)
    }
    for (const creep of getCreeps('gatherer')) {
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
        } else {
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn);
            }
        }
    }
}

const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

const maintainRangedDefenders = (spawn, count, params) => {
    const rangedDefenderCreeps = getCreeps('rangedDefender');
    if (rangedDefenderCreeps.length < count && !spawn.spawning) {
        spawnUnit("rangedDefender", spawn, params)
    }
    const enemies = getObjectsByPrototype(Creep).filter(i => !i.my);
    if (enemies.length > 0) {
        const closestEnemy = enemies.reduce((acc, enemy) => {
            if (getDistance(spawn.x, spawn.y, enemy.x, enemy.y) < getDistance(spawn.x, spawn.y, acc.x, acc.y)) {
                return enemy;
            }
            return acc;
        })
        if (getDistance(spawn.x, spawn.y, closestEnemy.x, closestEnemy.y) < 15) {
            for (const creep of getCreeps('rangedDefender')) {
                if (creep.rangedAttack(closestEnemy) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(closestEnemy);
                }
            }
        }
    }
}

export function loop() {
    const source = getObjectsByPrototype(Source)[0];
    const spawn = getObjectsByPrototype(StructureSpawn)[0];
    spawning = spawn.spawning !== undefined;

    maintainGatherers(source, spawn, 2, [MOVE, CARRY, WORK, WORK]);
    maintainRangedDefenders(spawn, 5, [MOVE, MOVE, RANGED_ATTACK, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH])
}
