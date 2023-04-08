import { getObjectsByPrototype } from 'game/utils';
import { Creep, Flag } from 'game/prototypes';

export function loop() {
    var creeps = getObjectsByPrototype(Creep).filter(i => i.my);
    var flags = getObjectsByPrototype(Flag);
    for(var creep of creeps) {
        var flag = creep.findClosestByPath(flags);
        creep.moveTo(flag);
    }
}