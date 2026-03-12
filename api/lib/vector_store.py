import os
import json
import httpx

VECTOR_URL   = os.environ.get("UPSTASH_VECTOR_REST_URL", "")
VECTOR_TOKEN = os.environ.get("UPSTASH_VECTOR_REST_TOKEN", "")

EMBEDDING_MODEL = "text-embedding-3-small"  # 1536 dims, cheap & fast
TOP_K           = 8   # number of relevant entries to retrieve per query


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {VECTOR_TOKEN}",
        "Content-Type":  "application/json",
    }


def get_embedding(text: str) -> list[float]:
    """Generate an embedding vector for the given text using OpenAI."""
    from api.lib.openai_client import get_client
    client   = get_client()
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text[:8000],   # cap input length
    )
    return response.data[0].embedding


def upsert_entry(
    uid:      str,
    entry_id: str,
    text:     str,
    metadata: dict,
) -> bool:
    """
    Embed an entry and upsert into Upstash Vector.
    Returns True on success.
    """
    if not VECTOR_URL or not VECTOR_TOKEN:
        raise ValueError("UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN must be set")

    vector_id = f"{uid}_{entry_id}"
    embedding = get_embedding(text)

    # Upstash Vector upsert endpoint
    payload = {
        "id":       vector_id,
        "vector":   embedding,
        "metadata": {
            **metadata,
            "uid":     uid,
            "entryId": entry_id,
        }
    }

    res = httpx.post(
        f"{VECTOR_URL}/upsert",
        headers=_headers(),
        json=payload,
        timeout=15.0,
    )
    res.raise_for_status()
    return True


def delete_entry(uid: str, entry_id: str) -> bool:
    """Delete an entry's vector from Upstash."""
    if not VECTOR_URL or not VECTOR_TOKEN:
        return False

    vector_id = f"{uid}_{entry_id}"
    res = httpx.delete(
        f"{VECTOR_URL}/delete/{vector_id}",
        headers=_headers(),
        timeout=10.0,
    )
    return res.status_code == 200


def query_similar(
    uid:   str,
    query: str,
    top_k: int = TOP_K,
) -> list[dict]:
    """
    Find the most relevant entries for a query string.
    Filters by uid in metadata so users only see their own entries.
    Returns list of metadata dicts for the top-k results.
    """
    if not VECTOR_URL or not VECTOR_TOKEN:
        return []

    query_embedding = get_embedding(query)

    payload = {
        "vector":          query_embedding,
        "topK":            top_k,
        "includeMetadata": True,
        "filter":          f'uid = "{uid}"',   # Upstash metadata filter
    }

    res = httpx.post(
        f"{VECTOR_URL}/query",
        headers=_headers(),
        json=payload,
        timeout=15.0,
    )
    res.raise_for_status()

    results = res.json()
    # results is a list of { id, score, metadata }
    return [r["metadata"] for r in results if r.get("metadata")]