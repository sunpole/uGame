# uGame — Steps / Resource Economy

Current implementation: **v0.2.6**

## Stable checkpoint before economy

The working pre-economy state is preserved as branch:

`release/v0.1.28-stable`

Commit:

`3b7d1126b6c9d62f2e443e05d6055337ad2f0145`

## Steps

Steps / «Шаги» are the basic movement/activity resource.

Accepted baseline:

- natural city reserve target = **10,000 Steps**;
- reserve target is not a hard maximum;
- exchange/trading/rewards may push balance above 10,000;
- movement inside safe cities is free;
- field movement is paid from actual travelled world distance;
- calibration = **1 Step ≈ 1.2 world px**.

The current opposite diagonal entries are about 1,141 px apart, so a direct crossing is about 951 Steps before obstacle detours. This intentionally targets about 1,000+ Steps for a normal field crossing.

## Dash

Accepted:

- movement speed = ×2;
- Step spend rate per second = ×4;
- therefore the same travelled distance costs about ×2 Steps.

## StepDebt

Movement is never blocked by lack of Steps.

When positive balance reaches zero:

- balance stays at 0;
- further walk/dash cost increases StepDebt;
- the first debt transition displays an explanation;
- city regeneration does not pay debt;
- ordinary future Step rewards must not automatically pay debt.

Debt may be repaid only through special economy actions:

1. Attention → Steps exchange;
2. future Trader sale of physical resources → Steps.

Special payment always clears debt first; only the remainder enters positive balance.

## City regeneration

While the character is in a safe city:

- debt must be 0;
- positive Steps must be below 10,000;
- recovery = **+1% of reserve target per REAL TIME minute**;
- baseline = +100 Steps/minute.

Above 10,000 there is no free regeneration.

## Attention exchange

Accepted rates:

- **1 Attention → 10,000,000 Steps**;
- **100,000,000 Steps → 1 Attention**.

Attention → Steps is a special payment and clears debt first.

Steps → Attention:

- requires zero debt;
- uses only positive Steps;
- reverse rate is intentionally 10× worse.

The Steps header button opens this exchange at any convenient moment.

## City teleport

Teleport is a paid service and cannot create debt.

Formula:

`shortest WorldGraph transitions × 1,000 walking Steps × 0.60`

The current center city is four transitions from each outer city, so the current baseline center→outer price is **2,400 Steps**.

Walking remains strategically useful because the route contains Masters, events, resources and quests.

## Physical materials

Physical resources are stored as mass rather than item counts.

Visible measurement: **kg only**.

Internal precision: **0.1 kg**.

| Resource | Reward range |
|---|---:|
| Water | 0.1–5.0 kg |
| Wood | 0.2–10.0 kg |
| Stone | 0.5–25.0 kg |
| Clay | 0.3–15.0 kg |

Storage baseline:

- one resource cell = **50.0 kg**;
- different resourceId values never mix;
- different Tiers never mix;
- T1/T2/T3/T4 are distinct storage identities.

Old prototype count-stacks migrate into T1 by preserving approximate previous physical mass.

## Master relationship

Current Master lines:

- Stone T1–T4;
- Water T1–T4;
- Forest/Wood T1–T4;
- Clay T1–T4.

Master Tier determines the Tier of the extracted material.

Random kg result is fixed at Process start and persists into pending reward, so reload cannot reroll the amount.

## Belt / Bag

Equipment architecture reserves:

- `belt`;
- `bag`.

Resource Pouch is currently disabled because a real gameplay belt is not equipped.

Future:

- belt may increase resource-cell capacity;
- bag may increase total carried mass.

Current backpack total mass baseline (600 kg) is a technical prototype value derived from 12×50 kg cells and is **not final balance**.

## Future Trader

A city Trader will later:

- buy Stone / Wood / Water / Clay;
- pay Steps;
- be an allowed special mechanism for StepDebt repayment.

No Trader price table is accepted yet.

## Deferred Step rewards

Resource collection may later award random Steps alongside material rewards.

The amount/range is intentionally not implemented yet because no accepted balance range exists.
