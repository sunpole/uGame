# uGame character asset guide

The current `CharacterView` is a temporary vector top-down character. Its job is to prove direction, movement animation and layering before final art exists.

## First authored character target

Use one square frame size for every layer. Recommended working frame: **64×64 px**.

Create four directions:

- up
- right
- down
- left

For the first authored set, use **4 frames per direction**:

1. idle / contact
2. left step
3. idle / passing
4. right step

That gives 16 frames for one layer.

## Layer plan

Keep the same frame grid for every layer so they can be stacked exactly:

- `body`
- `hair`
- `clothes`
- `armor`
- `weapon`
- `accessory`

Transparent PNG is the simplest first format. Every layer must have identical canvas size, frame order and character anchor.

## Anchor

Use the character's ground contact point as the shared anchor. In a 64×64 frame, keep the feet/ground center close to `x=32`, `y=46–50` and leave transparent space around the character for equipment.

## Art rules

- Camera is top-down / high top-down, so the head and facing direction must remain readable.
- Silhouette matters more than small facial details.
- Arms and legs should move enough to read at game scale, but not so much that equipment layers stop matching.
- Do not change body proportions between animation frames.
- Equipment must follow the exact same animation timing as the body.

## File naming example

```text
assets/characters/base/body.png
assets/characters/base/hair.png
assets/characters/base/clothes.png
```

Later `CharacterView` can swap its temporary vector parts for these sprite layers without changing player collision, movement, classes or game rules.
