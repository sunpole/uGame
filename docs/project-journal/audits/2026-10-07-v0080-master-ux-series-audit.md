# Audit — v0.0.73–v0.0.80 Master UX / Spawn Zone series

Дата: 2026-10-07

## Проверено статически

- серия v0.0.73–v0.0.79 существует отдельными Git-коммитами;
- JSON-конфиги Project Hub / biome textures / version metadata остаются валидными;
- save schema не менялась;
- probability/caps/rotation balance не менялись;
- Game Clock остаётся display-only;
- T4 contradiction в UGD-0016 исправлен: candidate first, cap second, cap не targetCount.

Browser runtime этим audit **не объявляется автоматически проверенным** — нужен ручной QA.

## Ручной QA

1. Сравнить таймер над Master и в InteractionPanel минимум 10 секунд.
2. Проверить 40/40 texture baseline без deliberate local override.
3. Project Hub → Tools → Spawn Zone Debug: ON/OFF, centers, radius.
4. Проверить humanoid shell и очень медленный facing.
5. Наблюдать wandering: паузы, ~5 px/s, граница radius.
6. Проверить известные стены: Master не должен проходить сквозь них.
7. Открыть InteractionPanel во время движения: translation pause, countdown продолжает идти.
8. World Analyzer teleport — рядом с текущей позицией Master.
9. F5: Encounter/modules/timer сохраняются; walking position может reset без reroll Encounter.
10. Перепроверить 8300 / 8312–8314 / 8399 и суммарную Event/NPC capacity.

## Открытые долги

- отдельно проверить риск вытеснения уже существующего generic Event, когда новый Master занимает его Event Spot;
- выполнить manual browser QA этой серии;
- затем функциональный Stone Extraction / Process.
