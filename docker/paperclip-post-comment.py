#!/usr/bin/env python3
"""
paperclip-post-comment — post a comment to a Paperclip issue with retry + verify.

Usage:
  paperclip-post-comment <issue_id> <body>
  echo "<body>" | paperclip-post-comment <issue_id>

Env vars (injected by Paperclip adapter):
  PAPERCLIP_API_URL  — e.g. http://localhost:3100
  PAPERCLIP_API_KEY  — bearer token

Exits 0 on success, 1 on failure. On persistent failure the comment is
saved to $HOME/failed-comments/<timestamp>-<issue_id>.json so nothing is lost.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


def env(key: str) -> str:
    val = os.environ.get(key, "").strip()
    if not val:
        raise RuntimeError(f"${key} is not set — is this running inside a Paperclip agent?")
    return val


def post_comment(base_url: str, api_key: str, issue_id: str, body: str) -> dict:
    url = f"{base_url}/api/issues/{issue_id}/comments"
    payload = json.dumps({"body": body, "reopenIssue": False}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def verify_comment(base_url: str, api_key: str, issue_id: str, comment_id: str) -> bool:
    url = f"{base_url}/api/issues/{issue_id}/comments/{comment_id}"
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {api_key}"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return bool(data.get("id"))
    except Exception:
        return False


def save_failed(issue_id: str, body: str, error: str) -> None:
    failed_dir = Path.home() / "failed-comments"
    failed_dir.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y%m%d-%H%M%S")
    out_path = failed_dir / f"{ts}-{issue_id}.json"
    with open(out_path, "w") as f:
        json.dump({"issue_id": issue_id, "body": body, "error": error, "ts": ts}, f, indent=2)
    print(f"[paperclip-post-comment] saved failed comment to {out_path}", file=sys.stderr)


def main() -> None:
    args = sys.argv[1:]
    if not args:
        print(__doc__, file=sys.stderr)
        sys.exit(1)

    issue_id = args[0]
    if len(args) >= 2:
        body = " ".join(args[1:])
    else:
        body = sys.stdin.read().strip()

    if not body:
        print("[paperclip-post-comment] error: comment body is empty", file=sys.stderr)
        sys.exit(1)

    base_url = env("PAPERCLIP_API_URL").rstrip("/")
    api_key = env("PAPERCLIP_API_KEY")

    last_error = ""
    delays = [0, 1, 2, 4]  # immediate + 3 retries

    for attempt, delay in enumerate(delays):
        if delay:
            time.sleep(delay)
        try:
            result = post_comment(base_url, api_key, issue_id, body)
            comment_id = result.get("id", "")
            if not comment_id:
                raise RuntimeError(f"POST succeeded but response had no id: {result}")

            # Verify it landed
            if not verify_comment(base_url, api_key, issue_id, comment_id):
                raise RuntimeError(f"POST returned id={comment_id} but GET verify failed")

            print(f"[paperclip-post-comment] posted comment {comment_id} on issue {issue_id}")
            return

        except urllib.error.HTTPError as e:
            body_text = e.read().decode(errors="replace")
            last_error = f"HTTP {e.code}: {body_text}"
            # 4xx = client error, don't retry
            if 400 <= e.code < 500:
                break
            print(f"[paperclip-post-comment] attempt {attempt + 1} failed: {last_error}", file=sys.stderr)

        except Exception as e:
            last_error = str(e)
            print(f"[paperclip-post-comment] attempt {attempt + 1} failed: {last_error}", file=sys.stderr)

    save_failed(issue_id, body, last_error)
    print(f"[paperclip-post-comment] error: all attempts failed: {last_error}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
