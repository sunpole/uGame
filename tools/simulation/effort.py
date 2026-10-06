from __future__ import annotations

import math
from typing import Any

TIERS = ("T1", "T2", "T3", "T4")


def resource_value_equivalent(
    resources_data: dict[str, Any],
    source_resource_id: str,
    target_resource_id: str,
) -> float:
    resources = {
        item["id"]: item
        for item in resources_data.get("resources", [])
        if isinstance(item, dict) and "id" in item
    }
    source = resources.get(source_resource_id)
    target = resources.get(target_resource_id)
    if not source or not target:
        raise ValueError("Effort model resource id is missing in resources.json")
    source_value = float(source.get("baseValue", 0))
    target_value = float(target.get("baseValue", 0))
    if source_value <= 0 or target_value <= 0:
        raise ValueError("Effort model requires positive resource baseValue")
    return target_value / source_value


def geometric_attempts(probability: float, quantile: float) -> int | None:
    if probability <= 0:
        return None
    if probability >= 1:
        return 1
    return max(1, math.ceil(math.log(1.0 - quantile) / math.log(1.0 - probability)))


def click_count_for_attempts(
    attempts: float,
    *,
    initial_city_exit_actions: int,
    dialogue_actions_per_encounter: int,
    search_next_npc_actions: int,
) -> float:
    if attempts <= 0:
        return 0.0
    return (
        float(initial_city_exit_actions)
        + attempts * float(dialogue_actions_per_encounter)
        + max(0.0, attempts - 1.0) * float(search_next_npc_actions)
    )


def build_search_effort(
    master_rows: list[dict[str, Any]],
    effort: dict[str, Any],
) -> list[dict[str, Any]]:
    initial = int(effort["initialCityExitActions"])
    dialogue = int(effort["dialogueActionsPerEncounter"])
    search_next = int(effort["searchNextNpcActions"])
    result: list[dict[str, Any]] = []

    for row in master_rows:
        location_tier = row["locationTier"]
        realized = row["realizedPct"]
        for target_tier in TIERS:
            probability = float(realized.get(target_tier, 0.0)) / 100.0
            expected_attempts = None if probability <= 0 else 1.0 / probability
            median_attempts = geometric_attempts(probability, 0.50)
            p95_attempts = geometric_attempts(probability, 0.95)

            result.append(
                {
                    "locationTier": location_tier,
                    "targetMasterTier": target_tier,
                    "realizedProbabilityPct": round(probability * 100.0, 6),
                    "expectedNpcChecks": None if expected_attempts is None else round(expected_attempts, 6),
                    "medianNpcChecks": median_attempts,
                    "p95NpcChecks": p95_attempts,
                    "expectedClicks": None
                    if expected_attempts is None
                    else round(
                        click_count_for_attempts(
                            expected_attempts,
                            initial_city_exit_actions=initial,
                            dialogue_actions_per_encounter=dialogue,
                            search_next_npc_actions=search_next,
                        ),
                        6,
                    ),
                    "medianClicks": None
                    if median_attempts is None
                    else int(
                        click_count_for_attempts(
                            median_attempts,
                            initial_city_exit_actions=initial,
                            dialogue_actions_per_encounter=dialogue,
                            search_next_npc_actions=search_next,
                        )
                    ),
                    "p95Clicks": None
                    if p95_attempts is None
                    else int(
                        click_count_for_attempts(
                            p95_attempts,
                            initial_city_exit_actions=initial,
                            dialogue_actions_per_encounter=dialogue,
                            search_next_npc_actions=search_next,
                        )
                    ),
                }
            )
    return result


def build_attention_effort(
    config: dict[str, Any],
    resources_data: dict[str, Any],
    master_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    effort = config["effortModel"]
    source_id = effort["sourceResourceId"]
    target_id = effort["targetValueResourceId"]
    target_source_units = resource_value_equivalent(resources_data, source_id, target_id)

    reward_min = float(effort["rewardPerActionMin"])
    reward_max = float(effort["rewardPerActionMax"])
    reward_mean = (reward_min + reward_max) / 2.0
    interval_minutes = float(effort["rewardActionIntervalMinutes"])
    lifetime_minutes = float(effort["encounterLifetimeMinutes"])
    max_reward_actions = max(1.0, math.floor(lifetime_minutes / interval_minutes))
    random_arrival_mean_actions = (1.0 + max_reward_actions) / 2.0

    initial = int(effort["initialCityExitActions"])
    dialogue = int(effort["dialogueActionsPerEncounter"])
    search_next = int(effort["searchNextNpcActions"])

    rows: list[dict[str, Any]] = []
    for row in master_rows:
        location_tier = row["locationTier"]
        realized = row["realizedPct"]
        expected_master_multiplier = sum(
            (float(realized.get(tier, 0.0)) / 100.0)
            * float(config["masterMultipliers"][tier])
            for tier in TIERS
        )
        location_factor = 1.0 + float(config["locationTiers"][location_tier]["locationBonus"])
        expected_reward_per_action = reward_mean * location_factor * expected_master_multiplier
        reward_actions = target_source_units / expected_reward_per_action
        interaction_minutes = reward_actions * interval_minutes

        fresh_encounters = reward_actions / max_reward_actions
        random_encounters = reward_actions / random_arrival_mean_actions

        fresh_overhead = click_count_for_attempts(
            fresh_encounters,
            initial_city_exit_actions=initial,
            dialogue_actions_per_encounter=dialogue,
            search_next_npc_actions=search_next,
        )
        random_overhead = click_count_for_attempts(
            random_encounters,
            initial_city_exit_actions=initial,
            dialogue_actions_per_encounter=dialogue,
            search_next_npc_actions=search_next,
        )

        rows.append(
            {
                "locationTier": location_tier,
                "targetSourceUnits": round(target_source_units, 6),
                "expectedMasterMultiplier": round(expected_master_multiplier, 6),
                "locationFactor": round(location_factor, 6),
                "expectedRewardPerAction": round(expected_reward_per_action, 6),
                "expectedRewardActions": round(reward_actions, 6),
                "interactionMinutes": round(interaction_minutes, 6),
                "interactionHours": round(interaction_minutes / 60.0, 6),
                "freshEncounter": {
                    "meanRewardActionsAvailable": max_reward_actions,
                    "expectedEncounters": round(fresh_encounters, 6),
                    "expectedTotalClicks": round(reward_actions + fresh_overhead, 6),
                },
                "randomArrival": {
                    "meanRewardActionsAvailable": round(random_arrival_mean_actions, 6),
                    "expectedEncounters": round(random_encounters, 6),
                    "expectedTotalClicks": round(reward_actions + random_overhead, 6),
                },
            }
        )

    return {
        "sourceResourceId": source_id,
        "targetValueResourceId": target_id,
        "targetSourceUnits": round(target_source_units, 6),
        "rewardPerActionRange": [reward_min, reward_max],
        "rewardPerActionMean": reward_mean,
        "rewardActionIntervalMinutes": interval_minutes,
        "encounterLifetimeMinutes": lifetime_minutes,
        "maxRewardActionsPerFreshEncounter": max_reward_actions,
        "note": "Analytical value-equivalent only; not an in-game exchange rate. Movement/waiting time between NPCs is not included unless represented by click actions.",
        "byLocationTier": rows,
        "searchByMasterTier": build_search_effort(master_rows, effort),
    }
