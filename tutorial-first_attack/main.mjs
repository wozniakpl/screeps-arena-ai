import { getObjectsByPrototype } from 'game/utils';
import { Creep } from 'game/prototypes';
import { ERR_NOT_IN_RANGE } from 'game/constants';

export function loop() {
    var myCreep = getObjectsByPrototype(Creep).find(creep => creep.my);
    var enemyCreep = getObjectsByPrototype(Creep).find(creep => !creep.my);
    if(myCreep.attack(enemyCreep) == ERR_NOT_IN_RANGE) {
        myCreep.moveTo(enemyCreep);
    }
}