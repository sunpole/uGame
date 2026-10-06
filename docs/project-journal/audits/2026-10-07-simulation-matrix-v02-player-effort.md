# Audit — Simulation Lab v0.2 MATRIX #20 + Player Effort

Дата: 2026-10-07  
Run: GitHub Actions `uGame Simulation Lab #20`  
Run URL: https://github.com/sunpole/uGame/actions/runs/37534965258  
Commit: `06168198a1dede808eba1a3647459c3b75243114`  
Mode: MATRIX  
Cycles: 100000 per world size  
Seed: 42  
World sizes: 8 / 30 / 50 / 100 external zones

## Статус

Это первый MATRIX после Simulation Lab v0.2, поэтому он заменяет #7 как актуальную базу для анализа rotation/Player Effort. #7 остаётся только историческим сравнением.

## World-size matrix

| Zones | Location T4 | Realized master T4 | T4 candidate suppressed | Mean reward × | Max one-zone high-tier share |
|---:|---:|---:|---:|---:|---:|
| 8 | 1.064% | 2.085% | 11.328% | 1.112 | 15.617% |
| 30 | 2.842% | 1.973% | 40.481% | 1.151 | 4.704% |
| 50 | 3.839% | 1.560% | 58.518% | 1.155 | 3.186% |
| 100 | 5.773% | 0.874% | 81.009% | 1.176 | 1.426% |

Высокий suppression в больших мирах не означает ошибку сам по себе: hard cap T4=1/T3=2/T2=3 намеренно отсекает множество случайных candidate. Это показатель давления caps и его нужно читать вместе с Player Effort/uptime/rotation.

## T4 global availability

| World | Stone uptime | Water uptime | Wood uptime |
|---:|---:|---:|---:|
| 8 | 18.93% | 18.70% | 14.32% |
| 30 | 68.61% | 65.15% | 57.65% |
| 50 | 89.81% | 84.57% | 82.11% |
| 100 | 99.65% | 99.29% | 98.53% |

Это не targetCount. Высокая uptime в большом мире возникает естественно: при большом числе зон почти каждый 30-минутный world tick содержит хотя бы один случайный допустимый T4 candidate.

В маленьком мире T4 может отсутствовать часами. В мире 8 зон median gap для T4: Stone 2h, Water 2h, Wood 2.5h; p95: 7.5h / 8h / 10h.

## Rotation coverage

v0.2 подтвердил работу независимой ротации `resourceDirection + masterTier`.

T4 examples:

| World | Master | Assignments | Unique zones visited | Mean current candidate pool | Max candidate pool |
|---:|---|---:|---:|---:|---:|
| 8 | Stone T4 | 18,929 | 8 | 1.09 | 3 |
| 30 | Stone T4 | 68,611 | 30 | 1.64 | 8 |
| 50 | Stone T4 | 89,811 | 50 | 2.47 | 12 |
| 100 | Stone T4 | 99,648 | 100 | 5.52 | 18 |

Water/Wood посещают только зоны, где их biome/resource eligibility вообще возможен (например, 75 из 100 synthetic zones в текущем world generator).

## Expected clicks to find T4 master

Первая модель клика:

- city exit = 1 action;
- NPC interaction/dialogue = 1;
- search/next NPC = 1;
- expected total ≈ 2 × NPC checks.

### 8-zone world

| Search only inside | T4 probability per checked NPC | Expected NPC checks | Expected clicks | Median clicks | P95 clicks |
|---|---:|---:|---:|---:|---:|
| T1 Location | 1.372% | 72.9 | 145.8 | 102 | 434 |
| T2 Location | 3.608% | 27.7 | 55.4 | 38 | 164 |
| T3 Location | 7.553% | 13.2 | 26.5 | 18 | 78 |
| T4 Location | 13.747% | 7.3 | 14.5 | 10 | 42 |

### 100-zone world

| Search only inside | T4 probability per checked NPC | Expected NPC checks | Expected clicks | Median clicks | P95 clicks |
|---|---:|---:|---:|---:|---:|
| T1 Location | 0.354% | 282.2 | 564.4 | 392 | 1688 |
| T2 Location | 0.833% | 120.0 | 240.0 | 166 | 718 |
| T3 Location | 1.693% | 59.1 | 118.1 | 82 | 352 |
| T4 Location | 2.854% | 35.0 | 70.1 | 48 | 208 |

Ключевой эффект: при большом мире один глобальный T4 resource master становится почти всегда существующим где-то, но **случайно найти его в конкретной зоне становится труднее**, потому что уникальный instance распределяется среди намного большего числа candidate/обычных NPC. Это соответствует идее «мастер есть где-то в мире, но его нужно найти».

## 1 Attention-equivalent

Аналитическая единица из текущего `resources.json`:

```text
1 Attention-equivalent = 5000 Stone-value
```

Это НЕ игровой обмен.

Candidate добыча:

- 1–10 Stone-value per reward action;
- mean = 5.5;
- one reward action every 3 minutes;
- NPC lifetime = 30 minutes;
- fresh encounter = до 10 reward-actions.

### Current small world: 8 zones

| Location Tier only | Mean reward/action | Reward actions | Interaction time | Fresh NPC encounters | Fresh total clicks |
|---|---:|---:|---:|---:|---:|
| T1 | 5.76 | 867.7 | 43.38 h | 86.8 | 1041.2 |
| T2 | 7.21 | 693.5 | 34.67 h | 69.3 | 832.2 |
| T3 | 8.76 | 570.6 | 28.53 h | 57.1 | 684.7 |
| T4 | 10.29 | 486.0 | 24.30 h | 48.6 | 583.2 |

### Scale case: 100 zones

| Location Tier only | Mean reward/action | Reward actions | Interaction time | Fresh NPC encounters | Fresh total clicks |
|---|---:|---:|---:|---:|---:|
| T1 | 5.56 | 899.7 | 44.99 h | 90.0 | 1079.7 |
| T2 | 6.72 | 743.6 | 37.18 h | 74.4 | 892.3 |
| T3 | 7.93 | 630.4 | 31.52 h | 63.0 | 756.5 |
| T4 | 9.15 | 546.6 | 27.33 h | 54.7 | 656.0 |

Random arrival (NPC уже частично прожил свои 30 минут) повышает click cost ещё примерно на 12–14%.

## Главный балансировочный вывод

Location Tier работает: T4-зона заметно уменьшает Player Effort относительно T1.

Но candidate `5000 Stone-value / 1..10 reward / 3 min` даёт **24–45 часов чистого interaction cadence** до одного Attention-equivalent. Это огромная величина, если Attention должен быть достижимым результатом короткой игровой прогрессии.

Пока нельзя автоматически заключать, что баланс плох, потому что 5000 — текущий resource baseValue, а не подтверждённый gameplay conversion. Нужно отдельно определить смысл Attention-equivalent:

1. это действительно желаемый объём ресурса за 1 Attention;
2. это только сравнительная бухгалтерская value;
3. или награда/resource cadence должны быть другими.

До этого числа 24–45h используются как диагностический сигнал, не как принятый gameplay target.

## Ограничение click-search модели

Поиск master сейчас считается как Bernoulli/expected checks по realized distribution внутри конкретного Location Tier. Это полезная оценка UX-нагрузки, но ещё не полноценный маршрут игрока.

Не входят:

- реальное время движения по зоне;
- путь между зонами;
- знание игроком текущего мира/разведданные;
- телепорты;
- party/guild sharing;
- направление к уже известному active master;
- стоимость/время открытия карты.

Для точной player-search simulation позже нужен WorldGraph route layer.

## Следующий вопрос

Архитектура/caps/rotation после #20 не требуют нового смыслового решения.

Следующий блокирующий вопрос именно экономический:

**что должно означать 1 Attention в реальном игровом времени?**

Пока этот target не определён, менять 5000/1–10/3min по результату симуляции нельзя.
