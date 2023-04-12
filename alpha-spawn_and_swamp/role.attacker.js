import {
    ERR_NOT_IN_RANGE
} from 'game/constants';
import get from './get';
import spawner from './spawner';

const role = "attacker";

const attack = (creep, target) => {
    console.log(`Creep ${creep['memory'].role}-${creep.id} attacking ${target.id}`)
    if (creep.rangedAttack(target) === ERR_NOT_IN_RANGE) {
        console.log(`Creep ${creep['memory'].role}-${creep.id} moving to ${target.id}`)
        creep.moveTo(target);
    }
}

export default {
    spawn(spawn, count, params) {
        const creeps = get.creepsByRole(role);
        spawner.ensure(creeps, spawn, count, params, role);
    },
    run(enemySpawn) {
        const creeps = get.creepsByRole(role);
        const enemies = get.enemies();
        creeps.forEach(creep => {
            if (creep.rangedAttack(enemySpawn) === ERR_NOT_IN_RANGE) {
                creep.moveTo(enemySpawn);
            }
            const nearestEnemy = get.closest(creep, enemies);
            if (!!nearestEnemy) {
                attack(creep, nearestEnemy)
            } else {
                attack(creep, enemySpawn)
            }
        });
    },
}