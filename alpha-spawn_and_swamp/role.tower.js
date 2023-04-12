import get from "./get";

export default {
    run() {
        const towers = get.towers();
        towers.forEach(tower => {
            const enemies = get.enemies();
            if (enemies.length > 0) {
                const nearest = get.closest(tower, enemies);
                if (get.distance(tower, nearest) <= 7) {
                    tower.attack(nearest);
                }
            }
        });
    },
}