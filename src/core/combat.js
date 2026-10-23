// Политики цели и виды попадания — варианты поведения заменой узла (П8), а не флагами в башне.
// Политика отвечает на вопрос «в кого стрелять» и ничего не меняет (П14). null — «целей в радиусе нет»:
// мгновенный внутренний ответ, не выходящий за кадр, поэтому без отдельного типа (предохранитель П38).

export class FirstOnRoad {
  pick(x, y, range, creeps) {
    let best = null;
    const r2 = range * range;
    for (let i = 0; i < creeps.all.length; i++) {
      const c = creeps.all[i];
      if (c.walking && (c.x - x) ** 2 + (c.y - y) ** 2 <= r2 && (!best || c.distance > best.distance)) best = c;
    }
    return best;
  }
}

// Ледяная башня бьёт первого ещё не замедленного; все замедлены — первого на дороге.
export class FirstUnchilled {
  #fallback = new FirstOnRoad();

  pick(x, y, range, creeps, now) {
    let best = null;
    const r2 = range * range;
    for (let i = 0; i < creeps.all.length; i++) {
      const c = creeps.all[i];
      if (c.walking && !c.isChilled(now) && (c.x - x) ** 2 + (c.y - y) ** 2 <= r2 && (!best || c.distance > best.distance)) best = c;
    }
    return best ?? this.#fallback.pick(x, y, range, creeps);
  }
}

// Попадание: кому и сколько. Факт «убит» уходит в onKill — награду и вехи решает родитель (П2).
export class SingleHit {
  apply(x, y, target, stats, creeps, now, onKill) {
    if (target.hit(stats.damage)) onKill(target);
  }
}

export class SplashHit {
  apply(x, y, target, stats, creeps, now, onKill) {
    const r2 = stats.splash * stats.splash;
    for (let i = 0; i < creeps.all.length; i++) {
      const c = creeps.all[i];
      if (c.walking && (c.x - x) ** 2 + (c.y - y) ** 2 <= r2 && c.hit(stats.damage)) onKill(c);
    }
  }
}

export class ChillHit {
  apply(x, y, target, stats, creeps, now, onKill) {
    target.chill(stats.chill, now + stats.chillFor);
    if (target.hit(stats.damage)) onKill(target);
  }
}
