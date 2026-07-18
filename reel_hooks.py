from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from exa_py import Exa

import csv
import os
import sys


load_dotenv(".env.local")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

api_key = os.getenv("EXA_API_KEY")
if not api_key:
    raise RuntimeError("EXA_API_KEY is missing from .env.local")

exa = Exa(api_key=api_key)

platforms = {
    "Instagram": ["instagram.com"],
    "TikTok": ["tiktok.com"],
    "YouTube Shorts": ["youtube.com"],
    "Facebook": ["facebook.com"],
    "LinkedIn": ["linkedin.com"],
    "X": ["x.com", "twitter.com"],
    "Threads": ["threads.net"],
}

topic = "AI tools for business"
days_back = 7
start_date = (
    datetime.now(timezone.utc) - timedelta(days=days_back)
).isoformat()

rows = []
seen_urls = set()

for platform, domains in platforms.items():
    query = f"""
    Recent popular short-form social media posts about "{topic}".

    Find posts or videos with a strong opening hook, such as:
    - surprising claims
    - controversial opinions
    - curiosity gaps
    - mistakes to avoid
    - before-and-after outcomes
    - numbered tips
    - questions that stop scrolling

    Prefer original posts with visible captions or transcripts.
    """

    try:
        response = exa.search(
            query,
            type="auto",
            num_results=10,
            include_domains=domains,
            exclude_domains=(
                ["shop.tiktok.com"] if platform == "TikTok" else None
            ),
            start_published_date=start_date,
            contents={
                "highlights": {
                    "query": (
                        "Extract the opening hook, first sentence, caption, "
                        "or transcript introduction."
                    ),
                    "max_characters": 800,
                }
            },
        )
    except Exception as error:
        print(f"{platform}: search failed — {error}")
        continue

    for result in response.results:
        url = getattr(result, "url", None)

        if not url or url in seen_urls:
            continue

        seen_urls.add(url)

        highlights = getattr(result, "highlights", None) or []
        hook = " ".join(highlights).strip()

        rows.append(
            {
                "platform": platform,
                "title": getattr(result, "title", "") or "",
                "hook": hook,
                "url": url,
                "published_date": (
                    getattr(result, "published_date", "") or ""
                ),
            }
        )

        print(f"\n[{platform}]")
        print(f"Hook: {hook or '(No hook extracted)'}")
        print(f"URL: {url}")

with open(
    "trending_reel_hooks.csv",
    "w",
    newline="",
    encoding="utf-8-sig",
) as file:
    writer = csv.DictWriter(
        file,
        fieldnames=[
            "platform",
            "title",
            "hook",
            "url",
            "published_date",
        ],
    )
    writer.writeheader()
    writer.writerows(rows)

print(f"\nSaved {len(rows)} results to trending_reel_hooks.csv")
