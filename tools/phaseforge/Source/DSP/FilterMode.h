// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — the shared filter-mode switch (phase stage + dynamic EQ). Kept in its own tiny header so that
// modules can use it without depending on each other (PhaseRotator.h should include this instead of declaring it).
#pragma once
#ifndef PF_FILTER_MODE_DEFINED
#define PF_FILTER_MODE_DEFINED

namespace pf {
enum class FilterMode { ZeroLatencyIIR = 0, LinearPhaseFIR = 1 };
} // namespace pf

#endif
