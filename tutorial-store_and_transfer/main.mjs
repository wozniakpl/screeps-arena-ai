import { prototypes, utils, constants } from 'game';

export function loop() {
    const tower = utils.getObjectsByPrototype(prototypes.StructureTower)[0];
    if(tower.store[constants.RESOURCE_ENERGY] < 10) {
        var myCreep = utils.getObjectsByPrototype(prototypes.Creep).find(creep => creep.my);
        if(myCreep.store[constants.RESOURCE_ENERGY] == 0) {
            var container = utils.getObjectsByPrototype(prototypes.StructureContainer)[0];
            myCreep.withdraw(container, constants.RESOURCE_ENERGY);
        } else {
            myCreep.transfer(tower, constants.RESOURCE_ENERGY);
        }
    } else {
        var target = utils.getObjectsByPrototype(prototypes.Creep).find(creep => !creep.my);
        tower.attack(target);
    }
}