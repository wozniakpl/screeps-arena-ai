import {
    ERR_NOT_IN_RANGE,
    RESOURCE_ENERGY
} from 'game/constants';
import get from './get';
import spawner from './spawner';
import {
    createConstructionSite
} from 'game/utils';
import {
    StructureTower
} from 'game/prototypes';

const role = "builder";

export default {
    spawn(spawn, count, params) {
        const creeps = get.creepsByRole(role);
        spawner.ensure(creeps, spawn, count, params, role);
    },
    run(spawn, towersCount) {
        const creeps = get.creepsByRole(role);
        const towers = get.towers();
        const containers = get.nonEmptyContainers();
        const energySources = [spawn, ...containers].filter(source => source.store[RESOURCE_ENERGY] > 0);
        creeps.forEach(creep => {
            if (!creep.store[RESOURCE_ENERGY]) {
                const nearestEnergy = get.closest(creep, energySources);
                console.log(`Creep ${creep.id} is going to withdraw energy from ${nearestEnergy.id}`)
                if (creep.withdraw(nearestEnergy, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    console.log(`Creep ${creep['memory'].role}-${creep.id} is moving to ${nearestEnergy.id}`)
                    creep.moveTo(nearestEnergy);
                }
            } else {
                const towersWithoutEnergy = towers.filter(tower => tower.store[RESOURCE_ENERGY] < tower.store.getCapacity(RESOURCE_ENERGY));
                if (towersWithoutEnergy.length > 0) {
                    const nearestTowerWithoutEnergy = get.closest(creep, towersWithoutEnergy);
                    console.log(`Creep ${creep.id} is going to transfer energy to ${nearestTowerWithoutEnergy.id}`)
                    if (creep.transfer(nearestTowerWithoutEnergy, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        console.log(`Creep ${creep['memory'].role}-${creep.id} is moving to ${nearestTowerWithoutEnergy.id}`)
                        creep.moveTo(nearestTowerWithoutEnergy);
                    }
                } else if (towers.length < towersCount) {
                    const constructionSites = get.constructionSites();
                    if (constructionSites.length > 0) {
                        const nearestConstructionSite = get.closest(creep, constructionSites);
                        console.log(`Creep ${creep.id} is going to build ${nearestConstructionSite.id}`)
                        if (creep.build(nearestConstructionSite) === ERR_NOT_IN_RANGE) {
                            console.log(`Creep ${creep['memory'].role}-${creep.id} is moving to ${nearestConstructionSite.id}`)
                            creep.moveTo(nearestConstructionSite);
                        }
                    } else {
                        const placeToBuild = get.placeToBuildTower(spawn);
                        console.log(`Creating construction site for tower at (${placeToBuild.x}, ${placeToBuild.y})`)
                        createConstructionSite(placeToBuild, StructureTower);
                    }
                }
            }
        });
    },
}