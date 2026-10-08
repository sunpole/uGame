# Audit — v0.2.0–v0.2.6 Steps Economy

Дата: 2026-10-08

## Manual QA

1. Pre-flight: Steps Economy and Mass-resources rows must be green.
2. New/legacy save starts with positive Steps around the 10,000 reserve baseline.
3. Walk inside a safe city: Steps do not decrease.
4. Enter a field and walk: Steps decrease according to actual movement.
5. Hold Dash: movement feels ×2 and same distance costs about ×2 Steps.
6. Use DEV 6402 repeatedly until balance reaches 0: StepDebt begins; movement remains possible.
7. With debt active, stay in city: free city regen must not reduce debt.
8. Use 1 Attention → 10M Steps: debt is paid first and remainder enters balance.
9. Reverse exchange requires zero debt and 100M positive Steps.
10. Open Teleporter: center→outer current baseline should show 2,400 Steps.
11. Teleport cannot be selected with debt or insufficient positive Steps.
12. Collect Master reward: UI shows kg and Master Tier, not count.
13. Reload before claiming pending reward: same kg/Tier result remains.
14. Verify Water/Wood/Stone/Clay ranges.
15. Inventory resource cell never exceeds 50.0 kg.
16. T1 and T2 of same material occupy separate cells.
17. Resource Pouch tab remains disabled.
18. Equipment shows empty Bag slot.
19. Clay Master can appear in sand/south resource-direction zones.
20. Stable rollback point remains release/v0.1.28-stable.
