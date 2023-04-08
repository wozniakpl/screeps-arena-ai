import { getObjectsByPrototype } from "game/utils";
import { Creep, StructureSpawn, StructureContainer } from "game/prototypes";
import {
  MOVE,
  CARRY,
  RESOURCE_ENERGY,
  ERR_NOT_IN_RANGE,
  BODYPART_COST,
  RANGED_ATTACK,
  TOUGH,
  ATTACK,
  HEAL,
} from "game/constants";

const getMyCreeps = () => {
  return getObjectsByPrototype(Creep).filter((i) => i.my);
};

const filterByRole = (creeps, role) => {
  return creeps.filter(
    (i) => i["memory"] !== undefined && i["memory"].roles.includes(role)
  );
};

const filterByCompany = (creeps, company) => {
  return creeps.filter(
    (i) => i["memory"] !== undefined && i["memory"].company === company
  );
};

const getCreepsByRole = (role) => {
  return filterByRole(getMyCreeps(), role);
};

const getCreepsByCompany = (company) => {
  return filterByCompany(getMyCreeps(), company);
};

const getCreepsByRoleInCompany = (role, company) => {
  return filterByRole(getCreepsByCompany(company), role);
};

const getClosestTo = (creep, container) => {
  return container.reduce((acc, element) => {
    if (getDistance(creep, element) < getDistance(creep, acc)) {
      return element;
    }
    return acc;
  }, container[0]);
};

var spawning = false;
const spawnUnit = (roles, spawn, params) => {
  if (spawning) {
    return;
  }
  const cost = params.reduce((acc, part) => acc + BODYPART_COST[part], 0);
  if (spawn.store[RESOURCE_ENERGY] < cost) {
    return;
  }

  console.log("Spawning", roles, params);
  var creep = spawn.spawnCreep(params).object;
  creep.memory = {};
  creep.memory.roles = roles;
  spawning = true;
  return creep;
};

const spawnFighterUnit = (roles, spawn, params) => {
  return spawnUnit(roles.concat(["fighter"]), spawn, params);
};

const getDistance = (a, b) => {
  // return findPath(a, b).length; // CPU heavy
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

const maintainGatherers = (spawn, count, params) => {
  const gathererCreeps = getCreepsByRole("gatherer");
  if (gathererCreeps.length < count && !spawn.spawning) {
    spawnUnit(["gatherer"], spawn, params);
  }
  const containers = getObjectsByPrototype(StructureContainer);
  const nonEmptyContainers = containers.filter(
    (i) => i.store[RESOURCE_ENERGY] > 0
  );
  const nearestNonEmptyContainer = getClosestTo(spawn, nonEmptyContainers);
  for (const creep of getCreepsByRole("gatherer")) {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
      if (
        creep.withdraw(nearestNonEmptyContainer, RESOURCE_ENERGY) ==
        ERR_NOT_IN_RANGE
      ) {
        creep.moveTo(nearestNonEmptyContainer);
      }
    } else {
      if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(spawn);
      }
    }
  }
};

const maintainCompany = (companyId) => {
  const company = getCreepsByCompany(companyId);

  if (company.length === 0) {
    return;
  }

  var leader = company.find((i) => i["memory"].roles.includes("leader"));
  if (leader === undefined) {
    const melee = company.find((i) =>
      i["memory"].roles.includes("meleeAttacker")
    );
    if (melee !== undefined) {
      melee["memory"].roles.push("leader");
    } else {
      const ranged = company.find((i) =>
        i["memory"].roles.includes("rangedAttacker")
      );
      if (ranged !== undefined) {
        ranged["memory"].roles.push("leader");
      } else {
        const healers = company.filter((i) =>
          i["memory"].roles.includes("healer")
        );
        for (const healer of healers) {
          healer["memory"].company = undefined;
        }
      }
    }
  }

  leader = company.find((i) => i["memory"].roles.includes("leader"));

  const enemies = getObjectsByPrototype(Creep).filter((i) => !i.my);
  const nonHealers = company.filter(
    (i) => !i["memory"].roles.includes("healer")
  );
  if (enemies.length > 0) {
    const nearestEnemy = getClosestTo(leader, enemies);
    if (getDistance(leader, nearestEnemy) < 10) {
      for (const creep of nonHealers) {
        if (
          creep.rangedAttack(nearestEnemy) == ERR_NOT_IN_RANGE ||
          creep.attack(nearestEnemy) == ERR_NOT_IN_RANGE
        ) {
          creep.moveTo(nearestEnemy);
        }
      }
    }
  }

  const healers = company.filter((i) => i["memory"].roles.includes("healer"));
  const needsHealing = nonHealers.find((i) => i.hits < i.hitsMax);
  if (needsHealing !== undefined) {
    const lowestHits = needsHealing.reduce((acc, creep) => {
      if (creep.hits < acc.hits) {
        return creep;
      }
      return acc;
    });
    for (const creep of healers) {
      if (creep.heal(lowestHits) == ERR_NOT_IN_RANGE) {
        creep.moveTo(lowestHits);
      }
    }
  }

  const followers = company.filter(
    (i) => !i["memory"].roles.includes("leader")
  );
  const enemySpawn = getObjectsByPrototype(StructureSpawn).find((i) => !i.my);
  if (
    leader.rangedAttack(enemySpawn) == ERR_NOT_IN_RANGE ||
    leader.attack(enemySpawn) == ERR_NOT_IN_RANGE
  ) {
    const isNotToofar = followers.reduce((acc, follower) => {
      if (getDistance(leader, follower) > 6) {
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
      if (
        nonHealer.rangedAttack(enemySpawn) == ERR_NOT_IN_RANGE ||
        nonHealer.attack(enemySpawn) == ERR_NOT_IN_RANGE
      ) {
        nonHealer.moveTo(enemySpawn);
      }
    }
  }
};

var companies = 0;
const maintainAttackers = (
  spawn,
  maxCompanies,
  meleeCount,
  rangedCount,
  healCount
) => {
  // if it's <=, the creeps will start to move from the very beginning
  // and not wait for the others to spawn
  for (var companyId = 0; companyId < companies; companyId++) {
    maintainCompany(companyId);
  }

  const allInCompany = getCreepsByRoleInCompany("fighter", companies);
  if (allInCompany.length === meleeCount + rangedCount + healCount) {
    companies++;
  }

  const fullCompanies = Array.from(Array(companies + 1).keys()).filter(
    (i) => getCreepsByCompany(i).length >= meleeCount + rangedCount + healCount
  );
  if (fullCompanies.length >= maxCompanies) {
    console.log("Max companies reached");
    return;
  }

  const meleeAttackerCreeps = getCreepsByRoleInCompany(
    "meleeAttacker",
    companies
  );
  if (meleeAttackerCreeps.length < meleeCount && !spawn.spawning) {
    var fighter = spawnFighterUnit(["meleeAttacker"], spawn, [
      MOVE,
      MOVE,
      ATTACK,
      ATTACK,
      TOUGH,
      TOUGH,
      TOUGH,
      TOUGH,
    ]);
    if (fighter !== undefined) {
      fighter["memory"].company = companies;
    }
  }
  const rangedAttackerCreeps = getCreepsByRoleInCompany(
    "rangedAttacker",
    companies
  );
  if (rangedAttackerCreeps.length < rangedCount && !spawn.spawning) {
    var ranger = spawnFighterUnit(["rangedAttacker"], spawn, [
      MOVE,
      MOVE,
      RANGED_ATTACK,
      RANGED_ATTACK,
    ]);
    if (ranger !== undefined) {
      ranger["memory"].company = companies;
    }
  }
  const healerCreeps = getCreepsByRoleInCompany("healer", companies);
  if (healerCreeps.length < healCount && !spawn.spawning) {
    var healer = spawnFighterUnit(["healer"], spawn, [MOVE, MOVE, HEAL, HEAL]);
    if (healer !== undefined) {
      healer["memory"].company = companies;
    }
  }
};

export function loop() {
  const spawn = getObjectsByPrototype(StructureSpawn).find((i) => i.my);
  spawning = spawn.spawning !== undefined;

  maintainGatherers(spawn, 3, [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY]);
  maintainAttackers(spawn, 2, 1, 1, 1);
}
