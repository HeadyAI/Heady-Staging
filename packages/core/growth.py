import math

PHI = (1 + math.sqrt(5)) / 2


def fib(n: int) -> int:
    i = int(n) if n is not None else 0
    if i < 0:
        i = 0
    a = 0
    b = 1
    for _ in range(i):
        a, b = b, a + b
    return a


def fib_floor(value: int) -> int:
    v = int(value) if value is not None else 0
    if v < 0:
        v = 0
    if v <= 1:
        return v

    a = 0
    b = 1
    while b <= v:
        a, b = b, a + b
    return a


def fib_ceil(value: int) -> int:
    v = int(value) if value is not None else 0
    if v < 0:
        v = 0
    if v <= 1:
        return v

    a = 0
    b = 1
    while b < v:
        a, b = b, a + b
    return b


def fib_nearest(value: int) -> int:
    v = int(value) if value is not None else 0
    if v < 0:
        v = 0
    lo = fib_floor(v)
    hi = fib_ceil(v)
    if (v - lo) <= (hi - v):
        return lo
    return hi


def phi_scale(value: float, steps: float = 1.0) -> float:
    if value is None or steps is None:
        return float("nan")
    return float(value) * (PHI ** float(steps))


def phi_round(value: float, steps: float = 1.0) -> int:
    return int(round(phi_scale(value, steps)))
