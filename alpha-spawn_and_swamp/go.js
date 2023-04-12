export default {
    to(creep, target, options) {
        console.log(`Creep ${creep['memory'].role}-${creep.id} moving to ${target.id}`)
        creep.moveTo(target, options || {});
    },
}