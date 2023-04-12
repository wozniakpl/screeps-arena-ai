import {
    RESOURCE_ENERGY,
    TERRAIN_WALL
} from 'game/constants';
import {
    ConstructionSite,
    Creep,
    StructureContainer,
    StructureSpawn,
    StructureTower
} from 'game/prototypes';
import {
    findPath,
    getObjectsByPrototype,
    getTerrainAt
} from 'game/utils';

const myCreeps = () => getObjectsByPrototype(Creep).filter(creep => creep.my);
const containers = () => getObjectsByPrototype(StructureContainer);

// TODO: by findpath maybe?
const distance = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
// const distance = (a, b) => findPath(a, b).length;

const isAvailableToBuild = (position) => {
    const terrain = getTerrainAt(position);
    const containers = getObjectsByPrototype(StructureContainer);
    const spawns = getObjectsByPrototype(StructureSpawn);
    const constructionSites = getObjectsByPrototype(ConstructionSite);
    const objectsPositions = [...containers, ...spawns, ...constructionSites].map(
        (i) => ({
            x: i.x,
            y: i.y
        })
    );
    const occupied = objectsPositions.some(
        (i) => i.x === position.x && i.y === position.y
    );
    return terrain !== TERRAIN_WALL && !occupied;
};

export default {
    mySpawn() {
        return getObjectsByPrototype(StructureSpawn).find(spawn => spawn.my);
    },
    enemySpawn() {
        return getObjectsByPrototype(StructureSpawn).find(spawn => !spawn.my);
    },
    myCreeps() {
        return myCreeps();
    },
    enemies() {
        return getObjectsByPrototype(Creep).filter(creep => !creep.my);
    },
    creepsByRole(role) {
        return myCreeps().filter(creep => creep["memory"].role === role);
    },
    nonEmptyContainers() {
        return containers().filter(container => container.store[RESOURCE_ENERGY] > 0);
    },
    closest(creep, objects) {
        return objects.reduce((acc, element) => {
            if (distance(creep, element) < distance(creep, acc)) {
                return element;
            }
            return acc;
        }, objects[0]);
    },
    distance(creep, target) {
        return distance(creep, target);
    },
    towers() {
        return getObjectsByPrototype(StructureTower);
    },
    constructionSites() {
        return getObjectsByPrototype(ConstructionSite).filter(site => site.my);
    },
    placeToBuildTower(spawn) {
        const x = spawn.x;
        const y = spawn.y;
        const positions = [];
        for (let i = 2; i <= 4; i++) {
            positions.push({
                x: x + i,
                y: y
            });
            positions.push({
                x: x - i,
                y: y
            });
            positions.push({
                x: x,
                y: y + i
            });
            positions.push({
                x: x,
                y: y - i
            });
        }
        const freePositions = positions.filter((i) => isAvailableToBuild(i));
        return freePositions[Math.floor(Math.random() * freePositions.length)];
    },
}