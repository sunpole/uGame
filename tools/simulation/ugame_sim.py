#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import math
import os
import random
import statistics
import subprocess
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from tools.simulation.effort import build_attention_effort
    from tools.simulation.rotation import MasterRotationAllocator
except ModuleNotFoundError:
    from effort import build_attention_effort
    from rotation import MasterRotationAllocator

TIERS = ("T1", "T2", "T3", "T4")
HIGH_TIERS = ("T4", "T3", "T2")
TIER_RANK = {tier: index + 1 for index, tier in enumerate(TIERS)}
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = ROOT / "data" / "simulation" / "simulation-defaults.json"
DEFAULT_RESOURCES = ROOT / "data" / "resources.json"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def canonical_hash(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def git_sha() -> str:
    env_sha = os.environ.get("GITHUB_SHA")
    if env_sha:
        return env_sha
    try:
        completed = subprocess.run(
            ["git", "-C", str(ROOT), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
            timeout=5,
        )
        return completed.stdout.strip()
    except Exception:
        return "unknown"


def validate_probability_row(name: str, row: dict[str, Any], errors: list[str]) -> None:
    missing = [tier for tier in TIERS if tier not in row]
    if missing:
        errors.append(f"{name}: missing tiers {', '.join(missing)}")
        return
    try:
        values = [float(row[tier]) for tier in TIERS]
    except (TypeError, ValueError):
        errors.append(f"{name}: probability values must be numeric")
        return
    if any(value < 0 for value in values):
        errors.append(f"{name}: probabilities cannot be negative")
    total = sum(values)
    if abs(total - 100.0) > 1e-9:
        errors.append(f"{name}: probabilities sum to {total:.6f}, expected 100")


def validate_config(config: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if int(config.get("schemaVersion", 0)) != 1:
        errors.append("schemaVersion must be 1")

    location_tiers = config.get("locationTiers", {})
    for tier in TIERS:
        data = location_tiers.get(tier)
        if not isinstance(data, dict):
            errors.append(f"locationTiers.{tier} is missing")
            continue
        try:
            spawn_min = int(data["spawnMin"])
            spawn_max = int(data["spawnMax"])
            life_min = float(data["lifetimeHoursMin"])
            life_max = float(data["lifetimeHoursMax"])
            bonus = float(data["locationBonus"])
        except (KeyError, TypeError, ValueError):
            errors.append(f"locationTiers.{tier}: invalid numeric fields")
            continue
        if spawn_min < 0 or spawn_max < spawn_min:
            errors.append(f"locationTiers.{tier}: invalid spawn range")
        if life_min <= 0 or life_max < life_min:
            errors.append(f"locationTiers.{tier}: invalid lifetime range")
        if bonus < 0:
            errors.append(f"locationTiers.{tier}: locationBonus cannot be negative")

    bands = config.get("distanceBands", [])
    if not isinstance(bands, list) or not bands:
        errors.append("distanceBands must be a non-empty array")
    else:
        for index, band in enumerate(bands):
            try:
                if int(band["min"]) < 1 or int(band["max"]) < int(band["min"]):
                    errors.append(f"distanceBands[{index}]: invalid min/max")
            except (KeyError, TypeError, ValueError):
                errors.append(f"distanceBands[{index}]: invalid min/max")
            validate_probability_row(
                f"distanceBands[{index}].locationTierWeights",
                band.get("locationTierWeights", {}),
                errors,
            )

    matrix = config.get("masterTierByLocationTier", {})
    for tier in TIERS:
        validate_probability_row(f"masterTierByLocationTier.{tier}", matrix.get(tier, {}), errors)

    caps = config.get("worldCapsPerResource", {})
    for tier in ("T2", "T3", "T4"):
        try:
            value = int(caps[tier])
            if value < 0:
                raise ValueError
        except (KeyError, TypeError, ValueError):
            errors.append(f"worldCapsPerResource.{tier} must be a non-negative integer")

    multipliers = config.get("masterMultipliers", {})
    for tier in TIERS:
        try:
            if float(multipliers[tier]) <= 0:
                raise ValueError
        except (KeyError, TypeError, ValueError):
            errors.append(f"masterMultipliers.{tier} must be positive")

    biomes = config.get("biomes", {})
    if not isinstance(biomes, dict) or not biomes:
        errors.append("biomes must be a non-empty object")
    else:
        for biome_id, weights in biomes.items():
            if not weights:
                errors.append(f"biomes.{biome_id}: no resources")
                continue
            try:
                values = [float(value) for value in weights.values()]
            except (TypeError, ValueError):
                errors.append(f"biomes.{biome_id}: weights must be numeric")
                continue
            if any(value < 0 for value in values) or sum(values) <= 0:
                errors.append(f"biomes.{biome_id}: invalid weights")

    try:
        if int(config.get("tickMinutes", 0)) <= 0:
            errors.append("tickMinutes must be positive")
    except (TypeError, ValueError):
        errors.append("tickMinutes must be an integer")

    effort = config.get("effortModel", {})
    required_effort = [
        "sourceResourceId",
        "targetValueResourceId",
        "rewardPerActionMin",
        "rewardPerActionMax",
        "rewardActionIntervalMinutes",
        "encounterLifetimeMinutes",
        "initialCityExitActions",
        "dialogueActionsPerEncounter",
        "searchNextNpcActions",
    ]
    for key in required_effort:
        if key not in effort:
            errors.append(f"effortModel.{key} is required")
    try:
        reward_min = float(effort.get("rewardPerActionMin", 0))
        reward_max = float(effort.get("rewardPerActionMax", 0))
        interval = float(effort.get("rewardActionIntervalMinutes", 0))
        lifetime = float(effort.get("encounterLifetimeMinutes", 0))
        if reward_min <= 0 or reward_max < reward_min:
            errors.append("effortModel reward range is invalid")
        if interval <= 0 or lifetime < interval:
            errors.append("effortModel timing is invalid")
    except (TypeError, ValueError):
        errors.append("effortModel numeric values are invalid")

    return errors


def weighted_choice(rng: random.Random, weights: dict[str, Any]) -> str:
    total = sum(float(value) for value in weights.values())
    if total <= 0:
        raise ValueError("weighted_choice requires a positive total")
    target = rng.random() * total
    cumulative = 0.0
    last_key = None
    for key, value in weights.items():
        last_key = key
        cumulative += float(value)
        if target < cumulative:
            return key
    if last_key is None:
        raise ValueError("weighted_choice received an empty mapping")
    return last_key


def percentile(values: list[float], probability: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * probability
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1.0 - weight) + ordered[upper] * weight


def pct(part: float, total: float) -> float:
    return 0.0 if total <= 0 else part * 100.0 / total


def normalized_percentages(counter: Counter[str]) -> dict[str, float]:
    total = sum(counter.values())
    return {tier: round(pct(counter.get(tier, 0), total), 6) for tier in TIERS}


def reward_factor(
    config: dict[str, Any],
    location_tier: str,
    master_tier: str,
    other_additive_bonus: float = 0.0,
) -> float:
    location_bonus = float(config["locationTiers"][location_tier]["locationBonus"])
    master_multiplier = float(config["masterMultipliers"][master_tier])
    return (1.0 + location_bonus + float(other_additive_bonus)) * master_multiplier


def distance_band_for(config: dict[str, Any], distance: int) -> dict[str, Any]:
    for band in config["distanceBands"]:
        if int(band["min"]) <= distance <= int(band["max"]):
            return band
    raise ValueError(f"No distance band configured for distance {distance}")


def build_synthetic_world(config: dict[str, Any], external_zones: int) -> list[dict[str, Any]]:
    preset = config.get("syntheticWorlds", {}).get(str(external_zones), {})
    max_distance = int(preset.get("maxDistance") or max(2, round(math.sqrt(max(1, external_zones)))))
    biome_ids = list(config["biomes"].keys())
    zones: list[dict[str, Any]] = []
    for index in range(external_zones):
        distance = 1 + (index % max_distance)
        biome_id = biome_ids[index % len(biome_ids)]
        zones.append(
            {
                "id": f"zone-{index + 1:03d}",
                "distance": distance,
                "biomeId": biome_id,
            }
        )
    return zones


class Simulation:
    def __init__(
        self,
        config: dict[str, Any],
        *,
        cycles: int,
        world_size: int,
        seed: int,
        trace: bool = False,
        resources_data: dict[str, Any] | None = None,
    ) -> None:
        self.config = config
        self.resources_data = resources_data or load_json(DEFAULT_RESOURCES)
        self.cycles = cycles
        self.world_size = world_size
        self.seed = seed
        self.trace_enabled = trace
        self.rng = random.Random(seed)
        self.tick_minutes = int(config["tickMinutes"])
        self.zones = build_synthetic_world(config, world_size)
        self.zone_states: dict[str, dict[str, Any]] = {}
        self.rotation_allocator = MasterRotationAllocator(self.rng, config["worldCapsPerResource"])
        self.last_t4_presence_tick: dict[str, int] = {}
        self.t4_wait_hours: dict[str, list[float]] = defaultdict(list)
        self.trace_lines: list[str] = []

        self.location_total = Counter()
        self.location_by_distance: dict[int, Counter[str]] = defaultdict(Counter)
        self.location_rerolls = Counter()
        self.nominal_master_total = Counter()
        self.realized_master_total = Counter()
        self.nominal_master_by_location: dict[str, Counter[str]] = defaultdict(Counter)
        self.realized_master_by_location: dict[str, Counter[str]] = defaultdict(Counter)
        self.resource_total = Counter()
        self.blocked = Counter()
        self.downgrades = Counter()
        self.high_by_zone = Counter()
        self.high_by_zone_resource = Counter()
        self.t4_presence_ticks = Counter()
        self.reward_factor_hist = Counter()
        self.reward_factor_sum = 0.0
        self.reward_factor_count = 0
        self.cap_violation_count = 0
        self.max_seen_caps: dict[str, Counter[str]] = defaultdict(Counter)

    def roll_zone_state(self, zone: dict[str, Any], tick: int) -> dict[str, Any]:
        band = distance_band_for(self.config, int(zone["distance"]))
        tier = weighted_choice(self.rng, band["locationTierWeights"])
        rules = self.config["locationTiers"][tier]
        lifetime_hours = self.rng.uniform(float(rules["lifetimeHoursMin"]), float(rules["lifetimeHoursMax"]))
        lifetime_ticks = max(1, math.ceil(lifetime_hours * 60.0 / self.tick_minutes))
        active_spawns = self.rng.randint(int(rules["spawnMin"]), int(rules["spawnMax"]))
        state = {
            "tier": tier,
            "expiresTick": tick + lifetime_ticks,
            "activeSpawns": active_spawns,
            "rolledLifetimeHours": lifetime_hours,
        }
        self.location_rerolls[tier] += 1
        if self.trace_enabled:
            self.trace_lines.append(
                f"[tick {tick:06d}] LOCATION {zone['id']} distance={zone['distance']} biome={zone['biomeId']} "
                f"-> {tier} spawns={active_spawns} lifetime={lifetime_hours:.2f}h"
            )
        return state

    def run(self) -> dict[str, Any]:
        start = time.perf_counter()
        resources = list({resource for weights in self.config["biomes"].values() for resource in weights})

        for tick in range(self.cycles):
            spawns: list[dict[str, Any]] = []

            for zone in self.zones:
                state = self.zone_states.get(zone["id"])
                if state is None or int(state["expiresTick"]) <= tick:
                    state = self.roll_zone_state(zone, tick)
                    self.zone_states[zone["id"]] = state

                location_tier = state["tier"]
                self.location_total[location_tier] += 1
                self.location_by_distance[int(zone["distance"])][location_tier] += 1
                biome_weights = self.config["biomes"][zone["biomeId"]]

                for slot_index in range(int(state["activeSpawns"])):
                    resource = weighted_choice(self.rng, biome_weights)
                    desired_tier = weighted_choice(
                        self.rng,
                        self.config["masterTierByLocationTier"][location_tier],
                    )
                    self.resource_total[resource] += 1
                    self.nominal_master_total[desired_tier] += 1
                    self.nominal_master_by_location[location_tier][desired_tier] += 1
                    spawns.append(
                        {
                            "zoneId": zone["id"],
                            "distance": zone["distance"],
                            "resource": resource,
                            "slotIndex": slot_index,
                            "locationTier": location_tier,
                            "desiredTier": desired_tier,
                        }
                    )

            allocation = self.rotation_allocator.allocate(spawns)
            active_counts = allocation["activeCounts"]
            self.blocked.update(allocation["blocked"])
            self.downgrades.update(allocation["downgrades"])
            t4_resources_this_tick: set[str] = set()

            for index, spawn in enumerate(spawns):
                realized = allocation["realized"][index]
                location_tier = spawn["locationTier"]
                resource = spawn["resource"]
                self.realized_master_total[realized] += 1
                self.realized_master_by_location[location_tier][realized] += 1

                if realized != "T1":
                    self.high_by_zone[spawn["zoneId"]] += 1
                    self.high_by_zone_resource[f"{spawn['zoneId']}::{resource}"] += 1
                if realized == "T4":
                    t4_resources_this_tick.add(resource)

                factor = reward_factor(self.config, location_tier, realized)
                self.reward_factor_hist[f"{factor:.2f}"] += 1
                self.reward_factor_sum += factor
                self.reward_factor_count += 1

                if self.trace_enabled:
                    self.trace_lines.append(
                        f"[tick {tick:06d}] SPAWN {spawn['zoneId']} slot={spawn['slotIndex']} "
                        f"resource={resource} location={location_tier} desired={spawn['desiredTier']} "
                        f"realized={realized} rewardFactor={factor:.2f}"
                    )

            for resource in resources:
                counts = active_counts[resource]
                for tier in ("T2", "T3", "T4"):
                    self.max_seen_caps[resource][tier] = max(self.max_seen_caps[resource][tier], counts[tier])
                    if counts[tier] > int(self.config["worldCapsPerResource"][tier]):
                        self.cap_violation_count += 1

                if resource in t4_resources_this_tick:
                    self.t4_presence_ticks[resource] += 1
                    previous = self.last_t4_presence_tick.get(resource)
                    if previous is not None:
                        self.t4_wait_hours[resource].append((tick - previous) * self.tick_minutes / 60.0)
                    self.last_t4_presence_tick[resource] = tick

        simulation_seconds = time.perf_counter() - start
        return self.build_summary(simulation_seconds)

    def build_summary(self, simulation_seconds: float) -> dict[str, Any]:
        total_master = sum(self.realized_master_total.values())
        nominal_total = sum(self.nominal_master_total.values())
        block_total = sum(self.blocked.values())
        high_total = sum(self.high_by_zone.values())
        reward_mean = self.reward_factor_sum / self.reward_factor_count if self.reward_factor_count else 0.0

        distance_rows = []
        for distance in sorted(self.location_by_distance):
            counts = self.location_by_distance[distance]
            distance_rows.append(
                {
                    "distance": distance,
                    "samples": sum(counts.values()),
                    "tiersPct": normalized_percentages(counts),
                }
            )

        master_rows = []
        for location_tier in TIERS:
            nominal = self.nominal_master_by_location[location_tier]
            realized = self.realized_master_by_location[location_tier]
            master_rows.append(
                {
                    "locationTier": location_tier,
                    "nominalPct": normalized_percentages(nominal),
                    "realizedPct": normalized_percentages(realized),
                    "samples": sum(realized.values()),
                }
            )

        wait_summary = {}
        for resource in sorted(self.resource_total):
            waits = self.t4_wait_hours.get(resource, [])
            wait_summary[resource] = {
                "samples": len(waits),
                "meanHours": round(statistics.fmean(waits), 6) if waits else None,
                "medianHours": round(percentile(waits, 0.50), 6) if waits else None,
                "p90Hours": round(percentile(waits, 0.90), 6) if waits else None,
                "p95Hours": round(percentile(waits, 0.95), 6) if waits else None,
                "p99Hours": round(percentile(waits, 0.99), 6) if waits else None,
                "uptimePct": round(pct(self.t4_presence_ticks.get(resource, 0), self.cycles), 6),
            }

        zone_fairness = [
            {"zoneId": zone["id"], "highTierAssignments": self.high_by_zone.get(zone["id"], 0)}
            for zone in self.zones
        ]
        zone_fairness.sort(key=lambda item: item["highTierAssignments"], reverse=True)
        max_zone_share = pct(zone_fairness[0]["highTierAssignments"], high_total) if zone_fairness and high_total else 0.0

        desired_t4 = self.nominal_master_total.get("T4", 0)
        realized_t4 = self.realized_master_total.get("T4", 0)
        t4_lost = max(0, desired_t4 - realized_t4)
        t4_block_rate = pct(t4_lost, desired_t4)

        summary = {
            "run": {
                "seed": self.seed,
                "cycles": self.cycles,
                "tickMinutes": self.tick_minutes,
                "simulatedHours": self.cycles * self.tick_minutes / 60.0,
                "worldSize": self.world_size,
                "externalZones": len(self.zones),
            },
            "performance": {
                "simulationSeconds": round(simulation_seconds, 6),
                "cyclesPerSecond": round(self.cycles / simulation_seconds, 3) if simulation_seconds > 0 else None,
                "spawnDecisions": total_master,
                "spawnDecisionsPerSecond": round(total_master / simulation_seconds, 3) if simulation_seconds > 0 else None,
            },
            "locationTiers": {
                "overallPct": normalized_percentages(self.location_total),
                "rerolls": dict(self.location_rerolls),
                "byDistance": distance_rows,
            },
            "masters": {
                "nominalOverallPct": normalized_percentages(self.nominal_master_total),
                "realizedOverallPct": normalized_percentages(self.realized_master_total),
                "byLocationTier": master_rows,
                "desiredSamples": nominal_total,
                "realizedSamples": total_master,
                "t4Wait": wait_summary,
            },
            "resources": {
                resource: {
                    "spawnCount": count,
                    "spawnPct": round(pct(count, sum(self.resource_total.values())), 6),
                }
                for resource, count in sorted(self.resource_total.items())
            },
            "caps": {
                "blockedByReason": dict(self.blocked),
                "blockedTotal": block_total,
                "downgrades": dict(self.downgrades),
                "t4Desired": desired_t4,
                "t4Realized": realized_t4,
                "t4LostRatePct": round(t4_block_rate, 6),
                "capViolationCount": self.cap_violation_count,
                "maxSeenPerResource": {
                    resource: dict(counts) for resource, counts in sorted(self.max_seen_caps.items())
                },
            },
            "rotation": {
                "highTierAssignments": high_total,
                "maxSingleZoneSharePct": round(max_zone_share, 6),
                "byZone": zone_fairness,
                "coverage": self.rotation_allocator.rotation_summary(),
            },
            "rewards": {
                "meanMultiplier": round(reward_mean, 6),
                "factorHistogram": dict(sorted(self.reward_factor_hist.items(), key=lambda item: float(item[0]))),
            },
        }
        summary["effort"] = build_attention_effort(
            self.config,
            self.resources_data,
            master_rows,
        )
        return summary


def evaluate_summary(config: dict[str, Any], summary: dict[str, Any]) -> tuple[str, list[dict[str, str]]]:
    warnings: list[dict[str, str]] = []
    bad = config.get("reportThresholds", {}).get("bad", {})
    review = config.get("reportThresholds", {}).get("review", {})

    cap_violations = int(summary["caps"]["capViolationCount"])
    if cap_violations >= int(bad.get("capViolationCount", 1)):
        warnings.append(
            {
                "severity": "error",
                "code": "CAP_VIOLATION",
                "message": f"World cap invariant was violated {cap_violations} times.",
            }
        )

    t4_block = float(summary["caps"]["t4LostRatePct"])
    if t4_block > float(review.get("t4CapBlockedRatePct", 50.0)):
        warnings.append(
            {
                "severity": "warning",
                "code": "T4_BLOCK_RATE",
                "message": f"{t4_block:.2f}% of nominal T4 outcomes were downgraded by allocation constraints.",
            }
        )

    fairness = float(summary["rotation"]["maxSingleZoneSharePct"])
    if fairness > float(review.get("zoneFairnessMaxSharePct", 30.0)):
        warnings.append(
            {
                "severity": "warning",
                "code": "ZONE_FAIRNESS",
                "message": f"One zone received {fairness:.2f}% of all high-tier assignments.",
            }
        )

    mean_reward = float(summary["rewards"]["meanMultiplier"])
    if mean_reward > float(review.get("meanRewardMultiplier", 1.8)):
        warnings.append(
            {
                "severity": "warning",
                "code": "REWARD_MEAN",
                "message": f"Mean reward/XP multiplier is {mean_reward:.3f}, above the current review threshold.",
            }
        )

    if any(item["severity"] == "error" for item in warnings):
        verdict = "BAD"
    elif warnings:
        verdict = "REVIEW"
    else:
        verdict = "OK"
    return verdict, warnings


def svg_stacked_rows(
    rows: list[tuple[str, dict[str, float]]],
    *,
    title: str,
    width: int = 920,
    row_height: int = 34,
) -> str:
    colors = {"T1": "#6e7681", "T2": "#58a6ff", "T3": "#d2a8ff", "T4": "#f0c66a"}
    left = 120
    right = 20
    top = 48
    bar_width = width - left - right
    height = top + row_height * max(1, len(rows)) + 46
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}">',
        '<style>text{font-family:Arial,sans-serif;fill:#c9d1d9;font-size:11px}.title{font-size:15px;font-weight:700;fill:#f0f6fc}.pct{fill:#0b0f14;font-size:9px;font-weight:700}</style>',
        f'<text class="title" x="0" y="20">{html.escape(title)}</text>',
    ]
    for row_index, (label, values) in enumerate(rows):
        y = top + row_index * row_height
        parts.append(f'<text x="0" y="{y + 16}">{html.escape(label)}</text>')
        x = left
        for tier in TIERS:
            value = float(values.get(tier, 0.0))
            segment = bar_width * value / 100.0
            if segment <= 0:
                continue
            parts.append(f'<rect x="{x:.2f}" y="{y}" width="{segment:.2f}" height="22" rx="2" fill="{colors[tier]}"/>')
            if segment > 32:
                parts.append(f'<text class="pct" x="{x + segment / 2:.2f}" y="{y + 15}" text-anchor="middle">{value:.1f}%</text>')
            x += segment
    legend_y = height - 18
    legend_x = left
    for tier in TIERS:
        parts.append(f'<rect x="{legend_x}" y="{legend_y - 10}" width="10" height="10" rx="2" fill="{colors[tier]}"/>')
        parts.append(f'<text x="{legend_x + 15}" y="{legend_y}">{tier}</text>')
        legend_x += 70
    parts.append("</svg>")
    return "".join(parts)


def svg_horizontal_bars(
    rows: list[tuple[str, float]],
    *,
    title: str,
    suffix: str = "",
    width: int = 920,
) -> str:
    left = 210
    right = 80
    top = 48
    row_height = 32
    max_value = max([value for _label, value in rows] + [1.0])
    height = top + row_height * max(1, len(rows)) + 24
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}">',
        '<style>text{font-family:Arial,sans-serif;fill:#c9d1d9;font-size:11px}.title{font-size:15px;font-weight:700;fill:#f0f6fc}.value{fill:#f0f6fc}</style>',
        f'<text class="title" x="0" y="20">{html.escape(title)}</text>',
    ]
    for index, (label, value) in enumerate(rows):
        y = top + index * row_height
        bar = (width - left - right) * value / max_value
        parts.append(f'<text x="0" y="{y + 15}">{html.escape(label)}</text>')
        parts.append(f'<rect x="{left}" y="{y}" width="{bar:.2f}" height="20" rx="3" fill="#58a6ff"/>')
        parts.append(f'<text class="value" x="{left + bar + 7:.2f}" y="{y + 15}">{value:.2f}{html.escape(suffix)}</text>')
    parts.append("</svg>")
    return "".join(parts)


def format_hours(value: float | None) -> str:
    return "—" if value is None else f"{float(value):.2f} h"


def format_delta_pct(value: float | None) -> str:
    return "—" if value is None else f"{float(value):+.2f}%"


def write_csv(path: Path, header: list[str], rows: list[list[Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


def make_report_files(
    output_dir: Path,
    *,
    config: dict[str, Any],
    summary: dict[str, Any],
    manifest: dict[str, Any],
    warnings: list[dict[str, str]],
    verdict: str,
    trace_lines: list[str] | None = None,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    charts_dir = output_dir / "charts"
    tables_dir = output_dir / "tables"
    charts_dir.mkdir(exist_ok=True)
    tables_dir.mkdir(exist_ok=True)

    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (output_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (output_dir / "warnings.json").write_text(
        json.dumps({"verdict": verdict, "warnings": warnings}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    summary_rows = [
        ["verdict", verdict],
        ["cycles", summary["run"]["cycles"]],
        ["worldSize", summary["run"]["worldSize"]],
        ["simulatedHours", summary["run"]["simulatedHours"]],
        ["cyclesPerSecond", summary["performance"]["cyclesPerSecond"]],
        ["meanRewardMultiplier", summary["rewards"]["meanMultiplier"]],
        ["t4Desired", summary["caps"]["t4Desired"]],
        ["t4Realized", summary["caps"]["t4Realized"]],
        ["t4LostRatePct", summary["caps"]["t4LostRatePct"]],
        ["maxSingleZoneSharePct", summary["rotation"]["maxSingleZoneSharePct"]],
    ]
    write_csv(output_dir / "summary.csv", ["metric", "value"], summary_rows)

    distance_rows = []
    distance_chart_rows = []
    for row in summary["locationTiers"]["byDistance"]:
        distance_rows.append(
            [row["distance"], row["samples"], *[row["tiersPct"][tier] for tier in TIERS]]
        )
        distance_chart_rows.append((f"distance {row['distance']}", row["tiersPct"]))
    write_csv(
        tables_dir / "location-tier-by-distance.csv",
        ["distance", "samples", *TIERS],
        distance_rows,
    )

    master_rows = []
    master_chart_rows = []
    for row in summary["masters"]["byLocationTier"]:
        master_rows.append(
            [
                row["locationTier"],
                row["samples"],
                *[row["nominalPct"][tier] for tier in TIERS],
                *[row["realizedPct"][tier] for tier in TIERS],
            ]
        )
        master_chart_rows.append((row["locationTier"], row["realizedPct"]))
    write_csv(
        tables_dir / "master-tier-by-location-tier.csv",
        [
            "locationTier",
            "samples",
            *[f"nominal{tier}" for tier in TIERS],
            *[f"realized{tier}" for tier in TIERS],
        ],
        master_rows,
    )

    cap_rows = [[key, value] for key, value in sorted(summary["caps"]["blockedByReason"].items())]
    write_csv(tables_dir / "world-caps.csv", ["reason", "count"], cap_rows)

    fairness_rows = [
        [row["zoneId"], row["highTierAssignments"]]
        for row in summary["rotation"]["byZone"]
    ]
    write_csv(tables_dir / "rotation-fairness.csv", ["zoneId", "highTierAssignments"], fairness_rows)

    reward_rows = [[factor, count] for factor, count in summary["rewards"]["factorHistogram"].items()]
    write_csv(tables_dir / "reward-multipliers.csv", ["factor", "count"], reward_rows)

    effort_rows = []
    for row in summary["effort"]["byLocationTier"]:
        effort_rows.append([
            row["locationTier"],
            row["expectedMasterMultiplier"],
            row["locationFactor"],
            row["expectedRewardPerAction"],
            row["expectedRewardActions"],
            row["interactionHours"],
            row["freshEncounter"]["expectedEncounters"],
            row["freshEncounter"]["expectedTotalClicks"],
            row["randomArrival"]["expectedEncounters"],
            row["randomArrival"]["expectedTotalClicks"],
        ])
    write_csv(
        tables_dir / "attention-equivalent-effort.csv",
        [
            "locationTier",
            "expectedMasterMultiplier",
            "locationFactor",
            "expectedRewardPerAction",
            "expectedRewardActions",
            "interactionHours",
            "freshExpectedEncounters",
            "freshExpectedTotalClicks",
            "randomExpectedEncounters",
            "randomExpectedTotalClicks",
        ],
        effort_rows,
    )

    search_rows = []
    for row in summary["effort"]["searchByMasterTier"]:
        search_rows.append([
            row["locationTier"],
            row["targetMasterTier"],
            row["realizedProbabilityPct"],
            row["expectedNpcChecks"],
            row["medianNpcChecks"],
            row["p95NpcChecks"],
            row["expectedClicks"],
            row["medianClicks"],
            row["p95Clicks"],
        ])
    write_csv(
        tables_dir / "master-search-clicks.csv",
        [
            "locationTier",
            "targetMasterTier",
            "realizedProbabilityPct",
            "expectedNpcChecks",
            "medianNpcChecks",
            "p95NpcChecks",
            "expectedClicks",
            "medianClicks",
            "p95Clicks",
        ],
        search_rows,
    )

    rotation_rows = []
    for row in summary["rotation"]["coverage"]["masters"]:
        rotation_rows.append([
            row["resource"],
            row["masterTier"],
            row["assignments"],
            row["uniqueZonesVisited"],
            row["completedRounds"],
            row["currentRoundVisited"],
            row["meanCandidatePool"],
            row["maxCandidatePool"],
        ])
    write_csv(
        tables_dir / "master-rotation-coverage.csv",
        [
            "resource",
            "masterTier",
            "assignments",
            "uniqueZonesVisited",
            "completedRounds",
            "currentRoundVisited",
            "meanCandidatePool",
            "maxCandidatePool",
        ],
        rotation_rows,
    )

    distance_svg = svg_stacked_rows(distance_chart_rows, title="Location Tier by distance")
    master_svg = svg_stacked_rows(master_chart_rows, title="Realized master Tier by Location Tier")
    block_svg = svg_horizontal_bars(
        [(key, float(value)) for key, value in sorted(summary["caps"]["blockedByReason"].items())],
        title="Blocked high-tier attempts",
    )
    reward_total = sum(summary["rewards"]["factorHistogram"].values())
    reward_svg = svg_horizontal_bars(
        [
            (f"×{factor}", pct(count, reward_total))
            for factor, count in summary["rewards"]["factorHistogram"].items()
        ],
        title="Reward / XP multiplier distribution",
        suffix="%",
    )
    effort_svg = svg_horizontal_bars(
        [
            (row["locationTier"], float(row["freshEncounter"]["expectedTotalClicks"]))
            for row in summary["effort"]["byLocationTier"]
            if row["freshEncounter"]["expectedTotalClicks"] is not None
        ],
        title="Expected clicks to 1 Attention-equivalent (fresh encounters)",
        suffix=" clicks",
    )
    t4_search_svg = svg_horizontal_bars(
        [
            (row["locationTier"], float(row["expectedClicks"] or 0))
            for row in summary["effort"]["searchByMasterTier"]
            if row["targetMasterTier"] == "T4"
        ],
        title="Expected clicks to find T4 master",
        suffix=" clicks",
    )

    (charts_dir / "location-tier-by-distance.svg").write_text(distance_svg, encoding="utf-8")
    (charts_dir / "master-tier-distribution.svg").write_text(master_svg, encoding="utf-8")
    (charts_dir / "cap-block-rate.svg").write_text(block_svg, encoding="utf-8")
    (charts_dir / "reward-multiplier.svg").write_text(reward_svg, encoding="utf-8")
    (charts_dir / "attention-equivalent-clicks.svg").write_text(effort_svg, encoding="utf-8")
    (charts_dir / "t4-search-clicks.svg").write_text(t4_search_svg, encoding="utf-8")

    if trace_lines is not None:
        (output_dir / "trace.txt").write_text("\n".join(trace_lines) + "\n", encoding="utf-8")

    warning_html = "".join(
        f'<li class="{html.escape(item["severity"])}"><strong>{html.escape(item["code"])}</strong> — {html.escape(item["message"])}</li>'
        for item in warnings
    ) or "<li>No warning thresholds were triggered.</li>"

    location_overall = summary["locationTiers"]["overallPct"]
    master_realized = summary["masters"]["realizedOverallPct"]
    t4_wait_rows = "".join(
        "<tr>"
        f"<td>{html.escape(resource)}</td>"
        f"<td>{data['uptimePct']:.2f}%</td>"
        f"<td>{format_hours(data['medianHours'])}</td>"
        f"<td>{format_hours(data['p95Hours'])}</td>"
        f"<td>{data['samples']}</td>"
        "</tr>"
        for resource, data in summary["masters"]["t4Wait"].items()
    )

    effort_html_rows = "".join(
        "<tr>"
        f"<td>{row['locationTier']}</td>"
        f"<td>{'—' if row['expectedRewardPerAction'] is None else format(row['expectedRewardPerAction'], '.2f')}</td>"
        f"<td>{'—' if row['expectedRewardActions'] is None else format(row['expectedRewardActions'], '.1f')}</td>"
        f"<td>{'—' if row['interactionHours'] is None else format(row['interactionHours'], '.2f') + ' h'}</td>"
        f"<td>{'—' if row['freshEncounter']['expectedEncounters'] is None else format(row['freshEncounter']['expectedEncounters'], '.1f')}</td>"
        f"<td>{'—' if row['freshEncounter']['expectedTotalClicks'] is None else format(row['freshEncounter']['expectedTotalClicks'], '.1f')}</td>"
        f"<td>{'—' if row['randomArrival']['expectedTotalClicks'] is None else format(row['randomArrival']['expectedTotalClicks'], '.1f')}</td>"
        "</tr>"
        for row in summary["effort"]["byLocationTier"]
    )

    search_html_rows = "".join(
        "<tr>"
        f"<td>{row['locationTier']}</td>"
        f"<td>{row['targetMasterTier']}</td>"
        f"<td>{row['realizedProbabilityPct']:.3f}%</td>"
        f"<td>{'—' if row['expectedNpcChecks'] is None else format(row['expectedNpcChecks'], '.1f')}</td>"
        f"<td>{'—' if row['expectedClicks'] is None else format(row['expectedClicks'], '.1f')}</td>"
        f"<td>{'—' if row['medianClicks'] is None else row['medianClicks']}</td>"
        f"<td>{'—' if row['p95Clicks'] is None else row['p95Clicks']}</td>"
        "</tr>"
        for row in summary["effort"]["searchByMasterTier"]
    )

    rotation_html_rows = "".join(
        "<tr>"
        f"<td>{row['resource']}</td>"
        f"<td>{row['masterTier']}</td>"
        f"<td>{row['assignments']}</td>"
        f"<td>{row['uniqueZonesVisited']}</td>"
        f"<td>{row['completedRounds']}</td>"
        f"<td>{row['meanCandidatePool']:.2f}</td>"
        f"<td>{row['maxCandidatePool']}</td>"
        "</tr>"
        for row in summary["rotation"]["coverage"]["masters"]
    )

    report = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>uGame Simulation Lab · {html.escape(manifest['runId'])}</title>
<style>
:root{{color-scheme:dark;font-family:Arial,sans-serif;background:#0b0f14;color:#e6edf3}}
*{{box-sizing:border-box}}body{{margin:0;background:#0b0f14}}main{{width:min(1180px,calc(100% - 28px));margin:0 auto;padding:24px 0 42px}}
h1,h2{{margin:0}}h1{{font-size:28px}}h2{{margin-top:28px;font-size:19px}}p{{color:#9da7b3}}
.meta,.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px;margin:16px 0}}
.card{{padding:12px;border:1px solid #252b33;border-radius:8px;background:#11161d}}.card b{{display:block;font-size:18px;margin-top:4px}}
.verdict{{display:inline-flex;padding:5px 10px;border:1px solid #30363d;border-radius:999px;font-weight:700}}.OK{{color:#7ee787;border-color:#238636}}.REVIEW{{color:#f0c66a;border-color:#9e6a03}}.BAD{{color:#ff7b72;border-color:#da3633}}
section{{margin-top:18px;padding:16px;border:1px solid #21262d;border-radius:10px;background:#0d1117}}svg{{width:100%;height:auto;display:block}}
table{{width:100%;border-collapse:collapse;font-size:12px}}th,td{{padding:7px 9px;border:1px solid #30363d;text-align:left}}th{{background:#151b23}}
code{{color:#f0c66a}}li{{margin:6px 0}}.warning{{color:#f0c66a}}.error{{color:#ff7b72}}a{{color:#79c0ff}}
.small{{font-size:12px;color:#7d8590}}
</style>
</head>
<body><main>
<div class="small">Simulation result, not player telemetry.</div>
<h1>uGame Simulation Lab</h1>
<p><span class="verdict {verdict}">{verdict}</span> · {html.escape(manifest['runId'])}</p>
<div class="meta">
<div class="card">Git SHA<b><code>{html.escape(manifest['gitCommit'][:12])}</code></b></div>
<div class="card">Seed<b>{manifest['seed']}</b></div>
<div class="card">Cycles<b>{manifest['cycles']:,}</b></div>
<div class="card">World<b>{manifest['worldSize']} zones</b></div>
<div class="card">Config hash<b><code>{html.escape(manifest['configHash'][:12])}</code></b></div>
</div>
<div class="kpis">
<div class="card">Location T4<b>{location_overall['T4']:.2f}%</b></div>
<div class="card">Realized master T4<b>{master_realized['T4']:.2f}%</b></div>
<div class="card">T4 nominal lost<b>{summary['caps']['t4LostRatePct']:.2f}%</b></div>
<div class="card">Mean reward factor<b>×{summary['rewards']['meanMultiplier']:.3f}</b></div>
<div class="card">Max zone high-tier share<b>{summary['rotation']['maxSingleZoneSharePct']:.2f}%</b></div>
<div class="card">Throughput<b>{summary['performance']['spawnDecisionsPerSecond']:,.0f} spawn/s</b></div>
</div>
<section><h2>Warnings</h2><ul>{warning_html}</ul></section>
<section><h2>Location Tier by distance</h2>{distance_svg}</section>
<section><h2>Realized master Tier</h2>{master_svg}</section>
<section><h2>Allocation constraints</h2>{block_svg}</section>
<section><h2>Reward / XP factors</h2>{reward_svg}</section>
<section><h2>1 Attention-equivalent effort</h2>
<p class="small">Analytical comparison only: {summary['effort']['targetSourceUnits']:.0f} {html.escape(summary['effort']['sourceResourceId'])}-value = 1 {html.escape(summary['effort']['targetValueResourceId'])}-value from current resources.json. This is not an in-game exchange rate. Search/movement time is not included unless represented by click actions.</p>
{effort_svg}
<table><thead><tr><th>Location</th><th>Stone/action</th><th>Reward actions</th><th>Interaction time</th><th>Fresh NPC encounters</th><th>Fresh total clicks</th><th>Random-arrival clicks</th></tr></thead><tbody>{effort_html_rows}</tbody></table>
</section>
<section><h2>Clicks to find a master Tier</h2>
{t4_search_svg}
<table><thead><tr><th>Location</th><th>Target master</th><th>Realized chance</th><th>Expected NPC checks</th><th>Expected clicks</th><th>Median clicks</th><th>P95 clicks</th></tr></thead><tbody>{search_html_rows}</tbody></table>
</section>
<section><h2>Master rotation coverage</h2>
<p class="small">Each resource + master Tier has its own coverage history. Repeats are avoided inside the currently eligible pool until the round is covered; the pool itself can change after world rerolls.</p>
<table><thead><tr><th>Resource</th><th>Tier</th><th>Assignments</th><th>Unique zones</th><th>Completed rounds</th><th>Mean candidate pool</th><th>Max pool</th></tr></thead><tbody>{rotation_html_rows}</tbody></table>
</section>
<section><h2>T4 availability</h2>
<table><thead><tr><th>Resource</th><th>Uptime</th><th>Median gap</th><th>P95 gap</th><th>Gap samples</th></tr></thead>
<tbody>{t4_wait_rows}</tbody></table></section>
<section><h2>Reproduce</h2>
<p><code>python tools/simulation/ugame_sim.py run --cycles {manifest['cycles']} --world-size {manifest['worldSize']} --seed {manifest['seed']}</code></p>
<p class="small">Python {html.escape(manifest['pythonVersion'])} · simulator {html.escape(manifest['simulatorVersion'])} · report generation {manifest['reportDurationMs']} ms</p>
</section>
</main></body></html>"""
    (output_dir / "report.html").write_text(report, encoding="utf-8")


def flatten_comparison(summary: dict[str, Any]) -> dict[str, float]:
    result = {
        "locationT4Pct": float(summary["locationTiers"]["overallPct"]["T4"]),
        "masterT4Pct": float(summary["masters"]["realizedOverallPct"]["T4"]),
        "t4LostRatePct": float(summary["caps"]["t4LostRatePct"]),
        "meanRewardMultiplier": float(summary["rewards"]["meanMultiplier"]),
        "maxSingleZoneSharePct": float(summary["rotation"]["maxSingleZoneSharePct"]),
        "cyclesPerSecond": float(summary["performance"]["cyclesPerSecond"] or 0),
    }
    return result


def compare_runs(baseline_dir: Path, candidate_dir: Path, output_dir: Path) -> Path:
    baseline = load_json(baseline_dir / "summary.json")
    candidate = load_json(candidate_dir / "summary.json")
    base_manifest = load_json(baseline_dir / "manifest.json")
    cand_manifest = load_json(candidate_dir / "manifest.json")
    base_metrics = flatten_comparison(baseline)
    cand_metrics = flatten_comparison(candidate)

    rows = []
    for metric in base_metrics:
        before = base_metrics[metric]
        after = cand_metrics[metric]
        delta = after - before
        delta_pct = None if before == 0 else delta * 100.0 / abs(before)
        rows.append([metric, before, after, delta, delta_pct])

    output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(
        output_dir / "comparison.csv",
        ["metric", "baseline", "candidate", "delta", "deltaPct"],
        rows,
    )
    table_rows = "".join(
        "<tr>"
        f"<td>{html.escape(metric)}</td><td>{before:.6f}</td><td>{after:.6f}</td>"
        f"<td>{delta:+.6f}</td><td>{format_delta_pct(delta_pct)}</td>"
        "</tr>"
        for metric, before, after, delta, delta_pct in rows
    )
    metadata = [
        ("Git SHA", base_manifest.get("gitCommit"), cand_manifest.get("gitCommit")),
        ("Config hash", base_manifest.get("configHash"), cand_manifest.get("configHash")),
        ("Seed", base_manifest.get("seed"), cand_manifest.get("seed")),
        ("Cycles", base_manifest.get("cycles"), cand_manifest.get("cycles")),
        ("World size", base_manifest.get("worldSize"), cand_manifest.get("worldSize")),
    ]
    meta_rows = "".join(
        f"<tr><td>{html.escape(str(name))}</td><td>{html.escape(str(a))}</td><td>{html.escape(str(b))}</td></tr>"
        for name, a, b in metadata
    )
    page = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>uGame Simulation comparison</title><style>
:root{{color-scheme:dark;font-family:Arial,sans-serif;background:#0b0f14;color:#e6edf3}}
body{{margin:0}}main{{width:min(1100px,calc(100% - 28px));margin:0 auto;padding:26px 0}}
table{{width:100%;border-collapse:collapse;margin:16px 0}}th,td{{padding:8px;border:1px solid #30363d;text-align:left}}
th{{background:#151b23}}p{{color:#9da7b3}}code{{color:#f0c66a}}
</style></head><body><main><p>Simulation result, not player telemetry.</p>
<h1>A/B Simulation comparison</h1><h2>Metadata</h2><table><thead><tr><th>Field</th><th>Baseline</th><th>Candidate</th></tr></thead><tbody>{meta_rows}</tbody></table>
<h2>Metrics</h2><table><thead><tr><th>Metric</th><th>Baseline</th><th>Candidate</th><th>Delta</th><th>Delta %</th></tr></thead><tbody>{table_rows}</tbody></table>
</main></body></html>"""
    result = output_dir / "comparison.html"
    result.write_text(page, encoding="utf-8")
    return result


def run_once(args: argparse.Namespace, config: dict[str, Any], resources_data: dict[str, Any], *, mode: str) -> Path:
    cycles = int(args.cycles)
    if cycles <= 0:
        raise ValueError("cycles must be positive")
    world_size = int(args.world_size)
    if world_size <= 0:
        raise ValueError("world-size must be positive")
    seed = int(args.seed)

    simulator = Simulation(
        config,
        cycles=cycles,
        world_size=world_size,
        seed=seed,
        trace=(mode == "TRACE"),
        resources_data=resources_data,
    )
    summary = simulator.run()
    verdict, warnings = evaluate_summary(config, summary)

    now = datetime.now(timezone.utc)
    run_id = args.run_id or f"SIM-{now.strftime('%Y%m%d-%H%M%S')}-{mode.lower()}-w{world_size}-s{seed}"
    output_root = Path(args.output_root).resolve()
    output_dir = output_root / run_id
    config_hash = canonical_hash({"simulation": config, "resources": resources_data})
    report_start = time.perf_counter()

    manifest = {
        "runId": run_id,
        "createdAt": now.isoformat(),
        "simulatorVersion": "0.2.0",
        "gitCommit": git_sha(),
        "configHash": config_hash,
        "seed": seed,
        "mode": mode,
        "cycles": cycles,
        "worldSize": world_size,
        "externalZoneCount": world_size,
        "inputFiles": [str(Path(args.config).resolve()), str(Path(args.resources).resolve())],
        "durationMs": round(summary["performance"]["simulationSeconds"] * 1000.0, 3),
        "reportDurationMs": 0.0,
        "pythonVersion": sys.version.split()[0],
        "candidateConfig": bool(config.get("candidate", False)),
    }
    make_report_files(
        output_dir,
        config=config,
        summary=summary,
        manifest=manifest,
        warnings=warnings,
        verdict=verdict,
        trace_lines=simulator.trace_lines if mode == "TRACE" else None,
    )
    report_ms = (time.perf_counter() - report_start) * 1000.0
    manifest["reportDurationMs"] = round(report_ms, 3)
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return output_dir


def matrix_run(args: argparse.Namespace, config: dict[str, Any], resources_data: dict[str, Any]) -> Path:
    sizes = [int(value.strip()) for value in args.world_sizes.split(",") if value.strip()]
    if not sizes:
        raise ValueError("world-sizes is empty")
    root = Path(args.output_root).resolve()
    matrix_id = args.run_id or f"SIM-MATRIX-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-s{args.seed}"
    matrix_dir = root / matrix_id
    matrix_dir.mkdir(parents=True, exist_ok=True)
    rows = []

    for size in sizes:
        child_args = argparse.Namespace(**vars(args))
        child_args.world_size = size
        child_args.output_root = str(matrix_dir)
        child_args.run_id = f"world-{size}"
        output = run_once(child_args, config, resources_data, mode="TEST")
        summary = load_json(output / "summary.json")
        rows.append(
            [
                size,
                summary["locationTiers"]["overallPct"]["T4"],
                summary["masters"]["realizedOverallPct"]["T4"],
                summary["caps"]["t4LostRatePct"],
                summary["rewards"]["meanMultiplier"],
                summary["rotation"]["maxSingleZoneSharePct"],
                summary["performance"]["spawnDecisionsPerSecond"],
            ]
        )

    write_csv(
        matrix_dir / "matrix.csv",
        [
            "worldSize",
            "locationT4Pct",
            "masterT4Pct",
            "t4LostRatePct",
            "meanRewardMultiplier",
            "maxSingleZoneSharePct",
            "spawnDecisionsPerSecond",
        ],
        rows,
    )
    chart = svg_horizontal_bars(
        [(f"{size} zones", float(t4_pct)) for size, _loc, t4_pct, *_rest in rows],
        title="Realized T4 master share by world size",
        suffix="%",
    )
    page_rows = "".join(
        "<tr>"
        + "".join(f"<td>{html.escape(str(value))}</td>" for value in row)
        + "</tr>"
        for row in rows
    )
    page = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>uGame Simulation matrix</title><style>:root{{color-scheme:dark;font-family:Arial,sans-serif;background:#0b0f14;color:#e6edf3}}
body{{margin:0}}main{{width:min(1100px,calc(100% - 28px));margin:auto;padding:24px 0}}table{{width:100%;border-collapse:collapse}}
th,td{{padding:8px;border:1px solid #30363d}}th{{background:#151b23}}svg{{width:100%;height:auto}}</style></head>
<body><main><p>Simulation result, not player telemetry.</p><h1>World-size sensitivity</h1>{chart}
<table><thead><tr><th>Zones</th><th>Location T4 %</th><th>Master T4 %</th><th>T4 lost %</th><th>Mean reward ×</th><th>Max zone share %</th><th>Spawn/s</th></tr></thead><tbody>{page_rows}</tbody></table>
</main></body></html>"""
    (matrix_dir / "matrix.html").write_text(page, encoding="utf-8")
    return matrix_dir


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="uGame headless Simulation Lab")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG), help="Path to simulation config JSON")
    parser.add_argument("--resources", default=str(DEFAULT_RESOURCES), help="Path to resources.json for value-equivalent effort analysis")
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate = subparsers.add_parser("validate", help="Validate simulation configuration")
    validate.set_defaults(mode="VALIDATE")

    for name, default_cycles, mode in (
        ("trace", 20, "TRACE"),
        ("run", 100000, "TEST"),
    ):
        command = subparsers.add_parser(name, help=f"Run {mode} simulation")
        command.add_argument("--cycles", type=int, default=default_cycles)
        command.add_argument("--world-size", type=int, default=8)
        command.add_argument("--seed", type=int, default=42)
        command.add_argument("--output-root", default=str(ROOT / "simulation-reports"))
        command.add_argument("--run-id", default=None)
        command.add_argument("--mode", choices=["TRACE", "TEST", "DEEP"], default=mode)

    matrix = subparsers.add_parser("matrix", help="Run the same candidate across multiple world sizes")
    matrix.add_argument("--cycles", type=int, default=100000)
    matrix.add_argument("--world-sizes", default="8,30,50,100")
    matrix.add_argument("--world-size", type=int, default=8)
    matrix.add_argument("--seed", type=int, default=42)
    matrix.add_argument("--output-root", default=str(ROOT / "simulation-reports"))
    matrix.add_argument("--run-id", default=None)

    compare = subparsers.add_parser("compare", help="Compare two completed run directories")
    compare.add_argument("baseline")
    compare.add_argument("candidate")
    compare.add_argument("--output-root", default=str(ROOT / "simulation-reports"))
    compare.add_argument("--run-id", default=None)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    config_path = Path(args.config).resolve()
    resources_path = Path(args.resources).resolve()
    config = load_json(config_path)
    resources_data = load_json(resources_path)
    errors = validate_config(config)

    if args.command == "validate":
        if errors:
            for error in errors:
                print(f"ERROR: {error}")
            return 2
        print(f"OK: {config_path}")
        print(f"configHash={canonical_hash(config)}")
        return 0

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 2

    if args.command == "compare":
        run_id = args.run_id or f"SIM-COMPARE-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        output = Path(args.output_root).resolve() / run_id
        result = compare_runs(Path(args.baseline).resolve(), Path(args.candidate).resolve(), output)
        print(f"Comparison: {result}")
        return 0

    if args.command == "matrix":
        output = matrix_run(args, config, resources_data)
        print(f"Matrix report: {output / 'matrix.html'}")
        return 0

    mode = args.mode
    if args.command == "trace":
        mode = "TRACE"
    output = run_once(args, config, resources_data, mode=mode)
    print(f"Simulation complete: {output}")
    print(f"Open report: {output / 'report.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
