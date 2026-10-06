from __future__ import annotations

import random
from collections import Counter, defaultdict
from typing import Any

TIERS = ("T1", "T2", "T3", "T4")
HIGH_TIERS = ("T4", "T3", "T2")
TIER_RANK = {tier: index + 1 for index, tier in enumerate(TIERS)}


class MasterRotationAllocator:
    """Allocate high-tier master instances with caps and per-master rotation coverage."""

    def __init__(self, rng: random.Random, caps: dict[str, Any]) -> None:
        self.rng = rng
        self.caps = {tier: int(caps[tier]) for tier in ("T2", "T3", "T4")}
        self.visited_by_master: dict[tuple[str, str], set[str]] = defaultdict(set)
        self.completed_rounds: Counter[tuple[str, str]] = Counter()
        self.assignments_by_master_zone: Counter[tuple[str, str, str]] = Counter()
        self.candidate_pool_sum: Counter[tuple[str, str]] = Counter()
        self.candidate_pool_samples: Counter[tuple[str, str]] = Counter()
        self.candidate_pool_max: Counter[tuple[str, str]] = Counter()

    def _eligible_indices(
        self,
        spawns: list[dict[str, Any]],
        remaining: set[int],
        *,
        resource: str,
        tier: str,
        zone_high: set[tuple[str, str]],
    ) -> list[int]:
        minimum_rank = TIER_RANK[tier]
        return [
            index
            for index in remaining
            if spawns[index]["resource"] == resource
            and TIER_RANK[spawns[index]["desiredTier"]] >= minimum_rank
            and (spawns[index]["zoneId"], resource) not in zone_high
        ]

    def _pick_index_for_zone(
        self,
        spawns: list[dict[str, Any]],
        indices: list[int],
    ) -> int:
        best_rank = max(TIER_RANK[spawns[index]["desiredTier"]] for index in indices)
        best = [index for index in indices if TIER_RANK[spawns[index]["desiredTier"]] == best_rank]
        return self.rng.choice(best)

    def allocate(
        self,
        spawns: list[dict[str, Any]],
    ) -> dict[str, Any]:
        realized = ["T1"] * len(spawns)
        remaining = set(range(len(spawns)))
        zone_high: set[tuple[str, str]] = set()
        active_counts: dict[str, Counter[str]] = defaultdict(Counter)
        blocked = Counter()
        downgrades = Counter()
        resources = sorted({spawn["resource"] for spawn in spawns})

        for tier in HIGH_TIERS:
            for resource in resources:
                cap = self.caps[tier]
                if cap <= 0:
                    continue

                key = (resource, tier)
                selected_this_tier = 0

                while selected_this_tier < cap:
                    candidates = self._eligible_indices(
                        spawns,
                        remaining,
                        resource=resource,
                        tier=tier,
                        zone_high=zone_high,
                    )
                    if not candidates:
                        break

                    by_zone: dict[str, list[int]] = defaultdict(list)
                    for index in candidates:
                        by_zone[spawns[index]["zoneId"]].append(index)

                    zones = sorted(by_zone)
                    self.candidate_pool_sum[key] += len(zones)
                    self.candidate_pool_samples[key] += 1
                    self.candidate_pool_max[key] = max(self.candidate_pool_max[key], len(zones))

                    visited = self.visited_by_master[key]
                    unvisited = [zone_id for zone_id in zones if zone_id not in visited]

                    if not unvisited:
                        visited.clear()
                        self.completed_rounds[key] += 1
                        unvisited = zones

                    zone_id = self.rng.choice(unvisited)
                    index = self._pick_index_for_zone(spawns, by_zone[zone_id])

                    realized[index] = tier
                    remaining.remove(index)
                    zone_high.add((zone_id, resource))
                    active_counts[resource][tier] += 1
                    selected_this_tier += 1
                    visited.add(zone_id)
                    self.assignments_by_master_zone[(resource, tier, zone_id)] += 1

        for index, spawn in enumerate(spawns):
            desired = spawn["desiredTier"]
            actual = realized[index]
            if desired == actual:
                continue

            if TIER_RANK[desired] > TIER_RANK[actual]:
                downgrades[f"{desired}->{actual}"] += 1

                zone_resource = (spawn["zoneId"], spawn["resource"])
                if actual == "T1" and zone_resource in zone_high:
                    blocked["perLocationResourceCap"] += 1
                else:
                    blocked["worldCapOrHigherTier"] += 1

        return {
            "realized": realized,
            "activeCounts": active_counts,
            "zoneHigh": zone_high,
            "blocked": blocked,
            "downgrades": downgrades,
        }

    def rotation_summary(self) -> dict[str, Any]:
        keys = set(self.candidate_pool_samples) | set(self.completed_rounds) | {
            (resource, tier)
            for resource, tier, _zone in self.assignments_by_master_zone
        }
        rows = []
        for resource, tier in sorted(keys):
            key = (resource, tier)
            samples = self.candidate_pool_samples[key]
            assignments = sum(
                count
                for (r, t, _zone), count in self.assignments_by_master_zone.items()
                if r == resource and t == tier
            )
            unique_zones = {
                zone
                for (r, t, zone), count in self.assignments_by_master_zone.items()
                if r == resource and t == tier and count > 0
            }
            rows.append(
                {
                    "resource": resource,
                    "masterTier": tier,
                    "assignments": assignments,
                    "uniqueZonesVisited": len(unique_zones),
                    "completedRounds": self.completed_rounds[key],
                    "currentRoundVisited": len(self.visited_by_master[key]),
                    "meanCandidatePool": 0.0
                    if samples == 0
                    else round(self.candidate_pool_sum[key] / samples, 6),
                    "maxCandidatePool": self.candidate_pool_max[key],
                }
            )
        return {"masters": rows}
