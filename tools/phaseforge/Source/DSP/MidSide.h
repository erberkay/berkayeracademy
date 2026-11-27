// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Berkay Er — PHASEFORGE. License: ../../LICENSE (GNU AGPL v3 ya da sonrası).
// PHASEFORGE — Mid/Side matrix.  M = (L+R)/2, S = (L−R)/2;  L = M+S, R = M−S.
// Done in double: for float inputs the round trip encode → decode is bit-exact (L+R and L−R are exact in double
// for any two floats whose exponents differ by < 29 octaves, and ·0.5 is exact), so a 0 dB path reconstructs
// the input exactly once the result is rounded back to float.
#pragma once

namespace pf::ms {

inline void encode(double l, double r, double& m, double& s) noexcept {
    m = 0.5 * (l + r);
    s = 0.5 * (l - r);
}

inline void decode(double m, double s, double& l, double& r) noexcept {
    l = m + s;
    r = m - s;
}

// block helpers (float in/out, may be in place)
inline void encodeBlock(const float* l, const float* r, float* m, float* s, int n) noexcept {
    for (int i = 0; i < n; ++i) {
        const double a = l[i], b = r[i];
        m[i] = (float) (0.5 * (a + b));
        s[i] = (float) (0.5 * (a - b));
    }
}
inline void decodeBlock(const float* m, const float* s, float* l, float* r, int n) noexcept {
    for (int i = 0; i < n; ++i) {
        const double a = m[i], b = s[i];
        l[i] = (float) (a + b);
        r[i] = (float) (a - b);
    }
}

} // namespace pf::ms
