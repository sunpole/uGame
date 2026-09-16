# UGD-0001 — «Внимание» ⚠ и «Импульс»

- Date: 2026-09-16
- Status: discussing
- Flags: needs-calculation, needs-test
- Tags: economy, attention, impulse, progression, philosophy

## Source / context

This record summarizes the design discussion about a resource tied to real active player time and a second recoverable state that should make short, meaningful sessions more efficient than long grind sessions.

## Idea

Working name **«Внимание» ⚠**: an account-bound, non-transferable value associated with real active human presence in the game rather than automation.

Working name **«Импульс»**: a recoverable account resource/state that regulates how efficiently active play converts into valuable progression, rewards and/or «Внимание».

All names and numeric examples are temporary.

## Why it matters

uGame should avoid making multi-hour daily grind the optimal or mandatory strategy. The system should value real attention while still allowing a player to stay in the world longer if they simply enjoy doing so.

## Current working model

- Impulse has a base capacity; `100` is only an example.
- Time away from active play restores Impulse.
- Different break durations may restore different amounts.
- A long continuous session may reduce the quality/rate of later recovery.
- Recovery should happen during a real break, not instantly on logout, to avoid relog exploits.
- Very short disconnects/relogs should not reset the session.
- A special weekly rest cycle may temporarily increase Impulse capacity far above the normal daily reserve.
- Daily spending/throughput may be capped so the whole weekly reserve cannot trivially be consumed in one marathon session.
- Improvements to the system should preferably give scheduling freedom rather than force more total weekly play.

## Accepted parts

- «Внимание» is account-bound / non-transferable.
- The name «Внимание» is a working name, not final lore terminology.

## Benefits

- Makes short sessions competitive with long grind sessions.
- Gives rest outside the game positive mechanical value.
- Can separate real player participation from idle automation.
- Creates a future balance lever for rewards without simply banning long play.
- Can support a marketing/philosophy message: the game respects player time.

## Risks / contradictions

- If numbers are too strong, the system may feel like an energy/mobile-game restriction.
- If bonuses are described as penalties after a threshold, players may feel punished for enjoying the game.
- If weekly reserves expire, the system can recreate FOMO.
- If a larger maximum also multiplies percentage-based recovery, the system may accidentally over-scale recovery.
- If logout immediately refunds spent Impulse, optimal play becomes relog abuse.
- If Impulse directly multiplies all loot, economy inflation may be hard to control.

## Alternatives considered

- Daily first-login rewards.
- Fixed five-session weekly charges.
- A weekly pool of efficient minutes.
- Diminishing returns by repeated activity rather than by session time.
- Rested bonus that only affects selected rewards rather than all progression.

These alternatives are not rejected and may be combined with the Impulse model.

## Current direction

Prefer a positive-rest framing: time away restores capacity; long play gradually becomes less efficient rather than being prohibited. Preserve a baseline level of normal play after bonuses are exhausted.

The exact relationship between Impulse, «Внимание», loot, XP and other rewards remains unresolved.

## What to test / calculate later

- Desired average useful session duration.
- Recovery curve by break length.
- Session-duration penalty curve for later recovery.
- Daily throughput vs weekly capacity.
- Whether Impulse affects creation of «Внимание», use of «Внимание», loot efficiency, or a combination.
- Anti-AFK / anti-automation definition of "active human presence".
- Whether unused weekly reserve carries forward and under what cap.

## Relations

- related: UGD-0002, UGD-0005, UGD-0006
- depends_on: future economy and progression design

## Change history

### 2026-09-16
Initial record created from planning discussion. No final balance numbers accepted.
