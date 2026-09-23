/* ================= MAPA TIPO -> DESENHO =================
   Toda chave do EDEF cai em alguma função daqui. As variantes (_veteran,
   _abissal) reusam o desenho da base via o campo `art` do EDEF, então não
   precisam de entrada própria. */

import {
  artGrunter, artRunner, artShooter, artTank, artSplitter,
  artOrbiter, artHealer, artCharger, artSniper,
  artBoss, artBoss2, artBoss3, artBoss4,
} from "./art.js";
import {
  artBomber, artWeaver, artWarden, artSpitter,
  artBoss5, artBoss6, artBossElite, artBossFinal,
  artLeech, artBreaker, artBossPlague, artBossTyrant,
} from "./art2.js";

export const ARTFN = {
  grunter: artGrunter,
  runner: artRunner,
  shooter: artShooter,
  tank: artTank,
  splitter: artSplitter,
  orbiter: artOrbiter,
  healer: artHealer,
  charger: artCharger,
  sniper: artSniper,
  bomber: artBomber,
  weaver: artWeaver,
  warden: artWarden,
  spitter: artSpitter,
  leech: artLeech,
  breaker: artBreaker,
  boss: artBoss,
  boss2: artBoss2,
  boss3: artBoss3,
  boss4: artBoss4,
  boss5: artBoss5,
  boss6: artBoss6,
  boss_elite: artBossElite,
  boss_plague: artBossPlague,
  boss_tyrant: artBossTyrant,
  boss_final: artBossFinal,
};

/** Desenho de um tipo. `def.art` cobre as variantes; o fallback nunca some. */
export function artFor(def, type) {
  return ARTFN[(def && def.art) || type] || artGrunter;
}
