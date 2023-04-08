import { getObjectsByPrototype } from 'game/utils';
import { Creep, StructureSpawn, Source, StructureContainer} from 'game/prototypes';
import { MOVE, CARRY, WORK, RESOURCE_ENERGY, ERR_NOT_IN_RANGE, BODYPART_COST, RANGED_ATTACK, TOUGH, ATTACK, HEAL } from 'game/constants';

const getMyCreeps = () => {
    return getObjectsByPrototype(Creep).filter(i => i.my);
}

const getCreepsByRole = (role) => {
    return getMyCreeps().filter(i => i["memory"] !== undefined && i["memory"].roles.includes(role));
}

const getCreepsByCompany = (company) => {
    return getMyCreeps().filter(i => i["memory"] !== undefined && i["memory"].company === company && i["memory"].roles.includes("fighter"));
}

const getCreepsUnassignedToCompany = () => {
    return getCreepsByCompany(undefined);
}


var spawning = false;
const spawnUnit = (roles, spawn, params) => {
    if (spawning) {
        return;
    }
    const cost = params.reduce((acc, part) => acc + BODYPART_COST[part], 0);
    if (spawn.store[RESOURCE_ENERGY] < cost) {
        return;
    }

    console.log('Spawning', roles, params);
    var creep = spawn.spawnCreep(params).object;
    creep.memory = {};
    creep.memory.roles = roles;
    spawning = true;
}

const spawnFighterUnit = (roles, spawn, params) => {
    return spawnUnit(roles.concat(["fighter"]), spawn, params);
}

const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}


const maintainGatherers = (spawn, count, params) => {
    const gathererCreeps = getCreepsByRole('gatherer');
    if (gathererCreeps.length < count && !spawn.spawning) {
        spawnUnit(["gatherer"], spawn, params)
    }
    const containerNearestSpawn = getObjectsByPrototype(StructureContainer).reduce((acc, container) => {
        if (getDistance(spawn.x, spawn.y, container.x, container.y) < getDistance(spawn.x, spawn.y, acc.x, acc.y)) {
            return container;
        }
        return acc;
    })
    for (const creep of getCreepsByRole('gatherer')) {
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
            if (creep.withdraw(containerNearestSpawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(containerNearestSpawn);
            }
        } else {
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn);
            }
        }
    }
}

const maintainCompany = (companyId) => {
    const company = getCreepsByCompany(companyId);

    if (company.length === 0) {
        return;
    }
    
    var leader = company.find(i => i["memory"].roles.includes("leader"));
    if (leader === undefined) {
        const melee = company.find(i => i["memory"].roles.includes("meleeAttacker"));
        if (melee !== undefined) {
            melee["memory"].roles.push("leader");
        } else {
            const ranged = company.find(i => i["memory"].roles.includes("rangedAttacker"));
            if (ranged !== undefined) {
                ranged["memory"].roles.push("leader");
            } else {
                const healers = company.filter(i => i["memory"].roles.includes("healer"));
                for (const healer of healers) {
                    healer["memory"].company = undefined;
                }
            }
        }
    }

    leader = company.find(i => i["memory"].roles.includes("leader"));

    const enemies = getObjectsByPrototype(Creep).filter(i => !i.my);
    const nonHealers = company.filter(i => !i["memory"].roles.includes("healer"));
    if (enemies.length > 0) {
        const nearestEnemy = enemies.reduce((acc, enemy) => {
            if (getDistance(leader.x, leader.y, enemy.x, enemy.y) < getDistance(leader.x, leader.y, acc.x, acc.y)) {
                return enemy;
            }
            return acc;
        })
        if (getDistance(leader.x, leader.y, nearestEnemy.x, nearestEnemy.y) < 10) {
            for (const creep of nonHealers) {
                if (creep.attack(nearestEnemy) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(nearestEnemy);
                }
            }
        }
    }

    const healers = company.filter(i => i["memory"].roles.includes("healer"));
    for (const creep of healers) {
        const needsHealing = nonHealers.reduce((acc, creep) => {
            if (creep.hits < acc.hits) {
                return creep;
            }
            return acc;
        })
        if (creep.heal(needsHealing) == ERR_NOT_IN_RANGE) {
            creep.moveTo(needsHealing);
        }
    }

    const followers = company.filter(i => !i["memory"].roles.includes("leader"));
    const enemySpawn = getObjectsByPrototype(StructureSpawn).find(i => !i.my);
    if (leader.attack(enemySpawn) == ERR_NOT_IN_RANGE) {
        const isNotToofar = followers.reduce((acc, follower) => {
            if (getDistance(leader.x, leader.y, follower.x, follower.y) > 6) {
                return false;
            }
            return acc;
        }, true);
        if (isNotToofar) {
            leader.moveTo(enemySpawn);
        }
        for (const follower of followers) {
            follower.moveTo(leader);
        }
    } else {
        for (const nonHealer of nonHealers) {
            if (nonHealer.attack(enemySpawn) == ERR_NOT_IN_RANGE) {
                nonHealer.moveTo(enemySpawn);
            }
        }
    }

}

var companies = 0;
const maintainAttackers = (spawn, meleeCount, rangedCount, healCount) => {
    const meleeAttackerCreeps = getCreepsByRole('meleeAttacker');
    if (meleeAttackerCreeps.length < meleeCount && !spawn.spawning) {
        spawnFighterUnit(["meleeAttacker"], spawn, [MOVE, MOVE, ATTACK, ATTACK, TOUGH, TOUGH, TOUGH, TOUGH])
    }
    const rangedAttackerCreeps = getCreepsByRole('rangedAttacker');
    if (rangedAttackerCreeps.length < rangedCount && !spawn.spawning) {
        spawnFighterUnit(["rangedAttacker"], spawn, [MOVE, MOVE, RANGED_ATTACK, RANGED_ATTACK])
    }
    const healerCreeps = getCreepsByRole('healer');
    if (healerCreeps.length < healCount && !spawn.spawning) {
        spawnFighterUnit(["healer"], spawn, [MOVE, MOVE, HEAL, HEAL])
    }
    const allNotInCompany = getCreepsUnassignedToCompany();
    if (allNotInCompany.length === meleeCount + rangedCount + healCount) {
        for (const creep of allNotInCompany) {
            creep["memory"].company = companies;
        }
        companies++;
    }

    for (var companyId=0; companyId<companies; companyId++) {
        maintainCompany(companyId);   
    }
}

export function loop() {
    const spawn = getObjectsByPrototype(StructureSpawn)[0];
    spawning = spawn.spawning !== undefined;

    maintainGatherers(spawn, 3, [MOVE, MOVE, CARRY, CARRY]);
    maintainAttackers(spawn, 2, 2, 1);
}
