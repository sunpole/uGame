# uGame — 25-location Diamond World

Current implementation: **v0.1.10**

## Geometry

The prototype world contains **25 locations** arranged as a logical 5×5 grid and presented on the World Map as a square rotated by 45°.

- center = starting safe city;
- outer tips = North / East / South / West safe cities;
- remaining 20 locations = field zones.

## Local-map size

Each location is a **1920×1080 world**, while the normal visible camera is approximately the old 960×540 screen.

- width ×2;
- height ×2;
- area ×4;
- camera follows the player;
- entering from left/right/top/bottom places the character near that corresponding edge.

## Safe cities

| ID | Temporary name | Direction | Biome | Service NPC |
|---|---|---|---|---|
| loc-00001 | Белый Венец | north | snow | Борис Хранильщик · Астэр Звездочёт · Северин Белый Щит |
| loc-00005 | Дубовый Престол | east | forest | Борис Хранильщик · Астэр Звездочёт · Рейнар Дубовый Страж |
| loc-00013 | Каменный Перекрёсток | start | stone | Борис Хранильщик · Астэр Звездочёт · Маршал Гранит |
| loc-00021 | Золотой Оазис | west | sand | Борис Хранильщик · Астэр Звездочёт · Хасим Песчаный Венец |
| loc-00025 | Беломраморный Двор | south | south | Борис Хранильщик · Астэр Звездочёт · Аврелий Белый Легат |

Safe-city invariants:

- full vision;
- darkness 0;
- no Dynamic Event;
- no Event Spot;
- no resource Master encounter;
- only city/service NPC and city infrastructure.

## City NPC model

Every city currently has three static service NPC.

- **Борис Хранильщик** — shared banker persona; every copy opens the same existing Bank.
- **Астэр Звездочёт** — shared teleporter persona; every copy opens the same five-city teleport network.
- the third NPC is a unique biome city guide/guard.

Unique guides:

- North — Северин Белый Щит / snow knight;
- East — Рейнар Дубовый Страж / forest ranger;
- Center — Маршал Гранит / stone marshal;
- West — Хасим Песчаный Венец / sand pharaoh;
- South — Аврелий Белый Легат / marble legatus.

City NPC movement is deferred; they are static in this stage.

## World-map compass

World Map displays `N / NE / E / SE / S / SW / W / NW`.

- N / NW — blue;
- NE / E — green;
- SE / S — red;
- SW / W — gold.

## Location registry

Names are temporary and may be replaced when lore is written.

| # | ID | Temporary name | Type | Biome | Grid row,col |
|---:|---|---|---|---|---|
| 01 | loc-00001 | Белый Венец | CITY | snow | 1,1 |
| 02 | loc-00002 | Инейный Предел | FIELD | snow | 1,2 |
| 03 | loc-00003 | Серебряная Гряда | FIELD | snow | 1,3 |
| 04 | loc-00004 | Зелёный Перевал | FIELD | forest | 1,4 |
| 05 | loc-00005 | Дубовый Престол | CITY | forest | 1,5 |
| 06 | loc-00006 | Морозные Врата | FIELD | snow | 2,1 |
| 07 | loc-00007 | Хрустальная Низина | FIELD | snow | 2,2 |
| 08 | loc-00008 | Снежный Рубеж | FIELD | snow | 2,3 |
| 09 | loc-00009 | Мшистая Балка | FIELD | forest | 2,4 |
| 10 | loc-00010 | Роща Стражей | FIELD | forest | 2,5 |
| 11 | loc-00011 | Песчаный Просвет | FIELD | sand | 3,1 |
| 12 | loc-00012 | Белая Тропа | FIELD | snow | 3,2 |
| 13 | loc-00013 | Каменный Перекрёсток | CITY | stone | 3,3 |
| 14 | loc-00014 | Ледяной Карниз | FIELD | snow | 3,4 |
| 15 | loc-00015 | Лесной Разлом | FIELD | forest | 3,5 |
| 16 | loc-00016 | Барханный Порог | FIELD | sand | 4,1 |
| 17 | loc-00017 | Сухая Лощина | FIELD | sand | 4,2 |
| 18 | loc-00018 | Морозная Кромка | FIELD | snow | 4,3 |
| 19 | loc-00019 | Красная Степь | FIELD | south | 4,4 |
| 20 | loc-00020 | Мраморный Путь | FIELD | south | 4,5 |
| 21 | loc-00021 | Золотой Оазис | CITY | sand | 5,1 |
| 22 | loc-00022 | Дюны Хасима | FIELD | sand | 5,2 |
| 23 | loc-00023 | Пепельные Пески | FIELD | south | 5,3 |
| 24 | loc-00024 | Южный Тракт | FIELD | south | 5,4 |
| 25 | loc-00025 | Беломраморный Двор | CITY | south | 5,5 |

## Biome placement baseline

- four field zones directly around the central city are snow;
- near North city: snow;
- near East city: forest;
- near West city: sand;
- near South city: south;
- transition zones use the current prototype distribution and can be changed later without changing stable location IDs.

## Event Spots

Every **field** location has 12 candidate Event Spots spread across the full 1920×1080 area.

Every **city** has 0 Event Spots.

Existing rules remain:

- Location Tier controls simultaneous active capacity, not candidate-spot count;
- one spotId = one active occupant;
- generic Event and Master share capacity;
- weighted anti-repeat reduces immediate spot reuse without forbidding repeats.

## Ground textures

The runtime exposes 12 biome/city slots.

- south field = dedicated brown sandy/stone prototype texture;
- south city = dedicated white marble prototype texture;
- forest and stone currently reuse existing art as explicit prototype fallbacks.

## First Playable migration

The earlier «Три фрагмента» slice remains playable after the world expansion.

- start-city Marshal uses the stable `guide_first_playable` dialogue signal;
- blue / amber / violet fragments live in field locations;
- forgotten cache and extinguished core live in field locations;
- stable interactable IDs were retained for save compatibility.

## Deferred

- final lore/location names;
- final city/biome art;
- city NPC roaming routes;
- production-quality NPC animation;
- world-map roads/route art;
- final biome distribution tuning.
