import os
import time
from upstash_redis import Redis

# Daily limits per feature per user
LIMITS = {
    "reflect":  20,   # AI reflections per day
    "polish":   10,   # Grammar polish per day
    "mood":     30,   # Mood predictions per day
    "prompt":   5,    # Daily prompt generations
    "summary":  3,    # Weekly summaries per day
    "patterns": 3,    # Pattern analysis per day
    "link":     10,   # Entry linking per day
    "chat":     30,   # Chat messages per day
    "letter":   2,    # Letters to future self per day
    "tags":     30,   # Smart tag suggestions per day
}

_redis_client = None

def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    _redis_client = Redis(
        url=os.environ["UPSTASH_REDIS_REST_URL"],
        token=os.environ["UPSTASH_REDIS_REST_TOKEN"],
    )
    return _redis_client


def check_rate_limit(uid: str, feature: str) -> tuple[bool, int, int]:
    """
    Check if a user has exceeded their daily limit for a feature.

    Returns:
        (allowed: bool, current_count: int, limit: int)

    Usage:
        allowed, count, limit = check_rate_limit(uid, "reflect")
        if not allowed:
            return 429 error
    """
    redis = _get_redis()
    limit = LIMITS.get(feature, 10)

    # Key resets daily — include the UTC date in the key
    today = time.strftime("%Y-%m-%d", time.gmtime())
    key = f"rl:{feature}:{uid}:{today}"

    # Increment counter and set expiry to 25 hours
    # (25h instead of 24h to handle timezone edge cases)
    current = redis.incr(key)
    if current == 1:
        # First request today — set expiry
        redis.expire(key, 90000)  # 25 hours in seconds

    allowed = current <= limit
    return allowed, current, limit


def get_remaining(uid: str, feature: str) -> int:
    """Returns how many requests the user has left today for a feature."""
    redis = _get_redis()
    limit = LIMITS.get(feature, 10)
    today = time.strftime("%Y-%m-%d", time.gmtime())
    key = f"rl:{feature}:{uid}:{today}"
    current = redis.get(key)
    if current is None:
        return limit
    return max(0, limit - int(current))