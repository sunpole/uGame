# UGD-0032 — Steps, debt and mass-resource economy

Дата: 2026-10-08  
Тип: economy / movement / inventory  
Статус: accepted  
Flags: needs-test  
Теги: steps, debt, attention, teleport, kg, tiers, clay, belt, bag

## Accepted

- Steps are consumed by real movement outside safe cities.
- 1 Step ≈ 1.2 world px baseline.
- safe-city walking is free.
- reserve target = 10,000, not a hard cap.
- city REAL TIME regeneration = 1% reserve/min only while debt=0.
- dash = ×2 speed / ×4 spend rate.
- walking/dash may create StepDebt and never become blocked.
- normal regeneration/rewards do not repay StepDebt.
- debt repayment channels: Attention exchange and future Trader resource sale.
- 1 Attention → 10,000,000 Steps.
- 100,000,000 Steps → 1 Attention.
- city teleport = shortest transitions ×1000 ×0.60 and cannot create debt.
- Stone/Wood/Water/Clay are physical kg materials.
- internal mass precision = 0.1 kg; UI = kg only.
- one resource cell = 50.0 kg.
- resource type and Tier never mix in one stack.
- Master Tier determines material Tier.
- Water 0.1–5.0 kg; Wood 0.2–10.0; Stone 0.5–25.0; Clay 0.3–15.0.
- equipment reserves belt and bag future hooks; resource pouch currently inactive.

## Implemented series

- v0.2.0 — Steps/StepDebt core + city regen.
- v0.2.1 — movement distance spending + dash economics.
- v0.2.2 — Attention exchange + paid city teleport.
- v0.2.3 — kg/Tier storage foundation + Clay data + belt/bag hooks.
- v0.2.4 — persistent Master kg/Tier extraction rewards.
- v0.2.5 — Clay Master T1–T4 and clay biome direction.
- v0.2.6 — documentation + economy Pre-flight validation.

## Deferred

- Trader NPC and price table.
- random Steps awarded together with resource extraction.
- final carry-weight/bag balance.
- final belt capacity bonuses.
- final Steps-per-location calibration after manual movement QA.
