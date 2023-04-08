import { getTicks } from "game/utils";

export function loop() {
    console.log('Current tick:', getTicks());
}
