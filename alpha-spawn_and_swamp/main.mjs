import {
  CARRY,
  MOVE,
  RANGED_ATTACK,
  TOUGH,
  WORK
} from "game/constants";
import get from "./get";
import harvesters from "./role.harvester";
import attackers from "./role.attacker";
import builders from "./role.builder";
import towers from "./role.tower";

export function loop() {
  const spawn = get.mySpawn();
  const enemySpawn = get.enemySpawn();

  attackers.spawn(spawn, null, Array(6).fill(MOVE).concat(Array(3).fill(RANGED_ATTACK).concat(Array(5).fill(TOUGH))))
  builders.spawn(spawn, 2, Array(3).fill(MOVE).concat(Array(2).fill(CARRY)).concat(Array(2).fill(WORK)))
  harvesters.spawn(spawn, 3, Array(4).fill(MOVE).concat(Array(6).fill(CARRY)))

  harvesters.run(spawn);
  attackers.run(enemySpawn);
  builders.run(spawn, 2);
  towers.run();
}