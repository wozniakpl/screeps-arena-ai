import {
  createConstructionSite,
  getObjectsByPrototype,
  getTerrainAt,
} from "game/utils";
import {
  Creep,
  StructureSpawn,
  StructureContainer,
  ConstructionSite,
  StructureTower,
} from "game/prototypes";
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
  WORK,
  TERRAIN_WALL,
  BOTTOM_RIGHT,
  TOP_RIGHT,
  RIGHT,
  TOP,
  BOTTOM,
  TOP_LEFT,
  LEFT,
  BOTTOM_LEFT,
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

const isAvailableToBuild = (position) => {
  const terrain = getTerrainAt(position);
  const containers = getObjectsByPrototype(StructureContainer);
  const spawns = getObjectsByPrototype(StructureSpawn);
  const constructionSites = getObjectsByPrototype(ConstructionSite);
  const objectsPositions = [...containers, ...spawns, ...constructionSites].map(
    (i) => ({ x: i.x, y: i.y })
  );
  const occupied = objectsPositions.some(
    (i) => i.x === position.x && i.y === position.y
  );
  return terrain !== TERRAIN_WALL && !occupied;
};

const getPlaceToBuild = (spawn) => {
  const x = spawn.x;
  const y = spawn.y;
  const positions = [];
  for (let i = 2; i <= 4; i++) {
    positions.push({ x: x + i, y: y });
    positions.push({ x: x - i, y: y });
    positions.push({ x: x, y: y + i });
    positions.push({ x: x, y: y - i });
  }
  const freePositions = positions.filter((i) => isAvailableToBuild(i));
  return freePositions[Math.floor(Math.random() * freePositions.length)];
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

const spawnDefenderUnit = (spawn, params) => {
  return spawnFighterUnit(["defender"], spawn, params);
};

const spawnBuilderUnit = (spawn, params) => {
  return spawnUnit(["builder"], spawn, params);
};

const getDistance = (a, b) => {
  // return findPath(a, b).length; // CPU heavy
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

const getDirectionTo = (to, from) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    x: dx > 0 ? 1 : dx < 0 ? -1 : 0,
    y: dy > 0 ? 1 : dy < 0 ? -1 : 0,
  };
};

const getOppositeDirection = (direction) => {
  return {
    x: direction.x * -1,
    y: direction.y * -1,
  };
};

const convertDirectionToConstant = (direction) => {
  return {
    1: {
      1: TOP_RIGHT,
      0: RIGHT,
      "-1": BOTTOM_RIGHT,
    },
    0: {
      1: TOP,
      0: undefined,
      "-1": BOTTOM,
    },
    "-1": {
      1: TOP_LEFT,
      0: LEFT,
      "-1": BOTTOM_LEFT,
    },
  }[direction.x][direction.y];
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
      console.log(`Assigning meelee leader to company ${companyId}`);
    } else {
      const ranged = company.find((i) =>
        i["memory"].roles.includes("rangedAttacker")
      );
      if (ranged !== undefined) {
        ranged["memory"].roles.push("leader");
        console.log(`Assigning ranged leader to company ${companyId}`);
      } else {
        const healers = company.filter((i) =>
          i["memory"].roles.includes("healer")
        );
        for (const healer of healers) {
          healer["memory"].company = undefined;
          console.log(`Removing healer from company ${companyId}`);
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
    if (leader === undefined) {
      console.log(`No leader in company ${companyId}!`);
    } else {
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
  }

  const healers = company.filter((i) => i["memory"].roles.includes("healer"));
  const needsHealing = nonHealers.filter((i) => i.hits < i.hitsMax);
  if (needsHealing !== undefined) {
    const lowestHits = needsHealing.reduce((acc, creep) => {
      if (creep.hits < acc.hits) {
        return creep;
      }
      return acc;
    }, needsHealing[0]);
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
  if (!!leader) {
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

const maintainTowers = (spawn, maxTowers, maxBuilders) => {
  const builders = getCreepsByRole("builder");
  if (builders.length < maxBuilders) {
    spawnBuilderUnit(spawn, [MOVE, CARRY, CARRY, WORK, WORK]);
  }

  const towersBuilt = getObjectsByPrototype(StructureTower);
  const containers = getObjectsByPrototype(StructureContainer);
  const availablePlacesWithEnergy = [...containers, spawn].filter(
    (i) => i.store[RESOURCE_ENERGY] > 0
  );
  for (const builder of builders) {
    if (!builder.store[RESOURCE_ENERGY]) {
      const nearestEnergy = getClosestTo(builder, availablePlacesWithEnergy);
      if (
        builder.withdraw(nearestEnergy, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE
      ) {
        builder.moveTo(nearestEnergy);
      }
    } else {
      const towersWithoutEnergy = towersBuilt.find(
        (i) => i.store[RESOURCE_ENERGY] < 50
      );
      if (towersWithoutEnergy) {
        if (
          builder.transfer(towersWithoutEnergy, RESOURCE_ENERGY) ==
          ERR_NOT_IN_RANGE
        ) {
          builder.moveTo(towersWithoutEnergy);
        }
      } else if (towersBuilt.length < maxTowers) {
        const constructionSite = getObjectsByPrototype(ConstructionSite).find(
          (i) => i.my
        );
        if (!constructionSite) {
          const placeToBuild = getPlaceToBuild(spawn);
          createConstructionSite(placeToBuild, StructureTower);
        } else {
          if (builder.build(constructionSite) == ERR_NOT_IN_RANGE) {
            builder.moveTo(constructionSite);
          }
        }
      }
    }
  }

  const enemies = getObjectsByPrototype(Creep).filter((i) => !i.my);
  for (const tower of towersBuilt) {
    const enemy = getClosestTo(tower, enemies);
    if (!!enemy && getDistance(tower, enemy) <= 20) {
      tower.attack(enemy);
    }
  }

  const hurtDefenders = getCreepsByRole("defender").filter(
    (i) => i.hits < i.hitsMax
  );
  if (!!hurtDefenders) {
    for (const tower of towersBuilt) {
      const nearestHurtDefender = getClosestTo(tower, hurtDefenders);
      if (
        !!nearestHurtDefender &&
        getDistance(tower, nearestHurtDefender) <= 20
      ) {
        tower.heal(nearestHurtDefender);
      }
    }
  }
};

const maintainDefenders = (spawn, maxDefenders) => {
  const defenders = getCreepsByRole("defender");
  if (defenders.length < maxDefenders) {
    spawnDefenderUnit(spawn, [
      MOVE,
      RANGED_ATTACK,
      RANGED_ATTACK,
      TOUGH,
      TOUGH,
      TOUGH,
    ]);
  }

  const enemyCreeps = getObjectsByPrototype(Creep).filter((i) => !i.my);
  for (const defender of getCreepsByRole("defender")) {
    const enemyCreep = getClosestTo(defender, enemyCreeps);
    if (!!enemyCreep && getDistance(defender, enemyCreep) <= 15) {
      if (defender.rangedAttack(enemyCreep) == ERR_NOT_IN_RANGE) {
        defender.moveTo(enemyCreep);
      }
    } else {
      if (getDistance(defender, spawn) > 3) {
        defender.moveTo(spawn);
      } else {
        const directionToSpawn = getDirectionTo(spawn, defender);
        const oppositeDirection = getOppositeDirection(directionToSpawn);
        const direction = convertDirectionToConstant(oppositeDirection);
        if (direction !== undefined) {
          defender.move(direction);
        }
      }
    }
  }
};

export function loop() {
  const spawn = getObjectsByPrototype(StructureSpawn).find((i) => i.my);
  spawning = spawn.spawning !== undefined;

  maintainGatherers(spawn, 3, [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY]);
  maintainTowers(spawn, 2, 1);
  maintainDefenders(spawn, 4);
  maintainAttackers(spawn, 10, 0, 2, 1);
}
