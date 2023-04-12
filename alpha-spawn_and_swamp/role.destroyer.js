import {
    ERR_NOT_IN_RANGE,
    MOVE
} from 'game/constants';
import get from './get';
import spawner from './spawner';
import go from './go';

const role = "destroyer";

export default {
    spawn(spawn, count, params) {
        const creeps = get.creepsByRole(role);
        spawner.ensure(creeps, spawn, count, params, role);
    },
    run(enemySpawn) {
        const creeps = get.creepsByRole(role);
        const enemies = get.enemies();
        creeps.forEach(creep => {
            console.log(`Creep ${creep['memory'].role}-${creep.id} attacking ${enemySpawn.id}`)
            if (creep.attack(enemySpawn) === ERR_NOT_IN_RANGE) {
                go.to(creep, enemySpawn);
            }
            const nearestEnemy = get.closest(creep, enemies);
            if (!!nearestEnemy && get.distance(creep, nearestEnemy) < 3) {
                console.log(`Creep ${creep['memory'].role}-${creep.id} attacking ${nearestEnemy.id}`)
                if (creep.attack(nearestEnemy) === ERR_NOT_IN_RANGE) {
                    if (nearestEnemy.body.filter(part => part.type === MOVE).length < creep.body.filter(part => part.type === MOVE).length) {
                        go.to(creep, nearestEnemy)
                    }
                }
            }
        });
    },
}