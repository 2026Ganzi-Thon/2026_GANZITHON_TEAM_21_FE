#!/usr/bin/env python3
"""
EmOri 가짜 백엔드 (FE 연동 테스트용) - 실제 서버가 아니에요!
백엔드 API 명세 v0.3 (지섭님 feat/stage3-inbox-records-cancel, 11/16)의 요청/응답 모양대로
메모리에서만 동작해요. 실제 서버를 못 띄울 때 FE 흐름을 끝까지 눌러보는 용도.

실행:  python3 scripts/fake-server.py            (http://0.0.0.0:8200)
앱:    .env 에 EXPO_PUBLIC_API_URL=http://<맥 IP>:8200/api/v1  → npx expo start

- 목록은 일부러 한 페이지 2개씩만 줘요 (FE 가 cursor 를 끝까지 읽는지 확인)
- AI 음악: 생성 요청 후 2초마다 1곡씩 완성. 설명에 'fail' 이 있으면 2번째 곡이 한 번 실패
- 설명에 '503' 이 있으면 실제 운영 서버처럼 503 GENERATION_UNAVAILABLE
- 미리 들어 있는 데이터: 친구 jiseop / eunjae, 받은 구슬 2개(친구 1, 익명 1), 친구 요청 1개
"""
import json
import os
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PAGE_MAX = 2
COLORS = {
    "YELLOW": ("기쁨·기대", ["기쁨", "기대", "홀가분함", "감사"]),
    "ORANGE": ("활력·설렘", ["설렘", "의욕", "뿌듯함", "들뜸"]),
    "PINK": ("애정·다정함", ["애정", "다정함", "그리움", "위로받고 싶음"]),
    "RED": ("강한 감정", ["짜증", "화남", "억울함", "벅참"]),
    "PURPLE": ("복잡함·불안", ["불안", "막막함", "복잡함", "생각이 많음"]),
    "BLUE": ("가라앉음", ["가라앉음", "외로움", "무기력", "지침"]),
    "GREEN": ("안정·회복", ["편안함", "안정", "회복 중", "평온"]),
}
CATALOG = {
    f"{c.lower()}_{i + 1:02d}": {"id": f"{c.lower()}_{i + 1:02d}", "color": c, "area": a, "word": w}
    for c, (a, ws) in COLORS.items()
    for i, w in enumerate(ws)
}
REACTIONS = [
    {"code": "HEART", "label": "마음 전하기", "emoji": "❤️"},
    {"code": "HUG", "label": "안아주기", "emoji": "🫂"},
    {"code": "CHEER", "label": "응원하기", "emoji": "🙌"},
]
REASONS = {"INAPPROPRIATE", "UNWANTED_REPEATED", "HARASSMENT_THREAT", "OTHER"}
CARE_IDS = {"purple_01", "purple_02", "blue_02", "blue_03", "blue_04"}
WAV = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds", "wave-01.wav")


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def now_iso(delta_min=0):
    return iso(datetime.now(timezone.utc) - timedelta(minutes=delta_min))


def nid(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


# ── 메모리 DB ──
users = {
    "u_jiseop": {"id": "u_jiseop", "loginId": "jiseop", "password": "password1", "nickname": "지섭"},
    "u_eunjae": {"id": "u_eunjae", "loginId": "eunjae", "password": "password1", "nickname": "은재"},
}
tokens, refresh_tokens = {}, {}
friendships = set()
requests_ = {}
records = {}  # uid -> [Record]
receipts = {}  # rid -> {...}
orbs = {}  # orbId -> {"orb", "owner", "dispatched", "generation"}
generations = {}
tracks = {}  # trackId -> generation id
dispatches = {}  # id -> {"dispatch", "owner", "targets": {tid: receiptId}}
settings, care_ack, blocks = {}, {}, set()
idem = {}  # (uid, method, path, key) -> (status, body)


def summary(uid):
    return {"id": uid, "nickname": users[uid]["nickname"]}


def make_orb(owner, ids, delta_min=0, playlist=None):
    o = {
        "id": nid("o"),
        "kind": "MIXED" if len(ids) == 2 else "SINGLE",
        "emotions": [CATALOG[i] for i in ids],
        "playlist": playlist,
        "createdAt": now_iso(delta_min),
    }
    orbs[o["id"]] = {"orb": o, "owner": owner, "dispatched": False, "generation": None}
    return o


def add_record(uid, side, o, route, delta_min=0, receipt=None, dispatch=None, cp=None):
    rec = {
        "id": nid("r"), "side": side, "orb": o, "route": route, "recordedAt": now_iso(delta_min),
        "receiptId": receipt, "dispatchId": dispatch, "counterpart": cp, "_hidden": False,
    }
    records.setdefault(uid, []).insert(0, rec)
    return rec


def deliver(o, sender_uid, to_uid, route, delta_min=0):
    rid = nid("i")
    rc = {
        "id": rid, "route": route,
        "sender": summary(sender_uid) if route == "FRIEND" else None,
        "receivedAt": now_iso(delta_min), "openedAt": None, "orb": o,
    }
    receipts[rid] = {"receipt": rc, "owner": to_uid, "sender": sender_uid, "token": None,
                     "reaction": None, "cancelled": False, "reported": False}
    add_record(to_uid, "RECEIVED", o, route, delta_min, receipt=rid, cp=rc["sender"])
    return rid


def demo_playlist():
    return {"id": nid("p"), "status": "READY", "tracks": [
        {"id": "trk_demo", "order": 1, "title": "Test fixture", "durationMs": 12000,
         "playbackUrl": "/api/v1/asmr-tracks/trk_demo/audio"}]}


def seed_for(uid):
    for f in ("u_jiseop", "u_eunjae"):
        friendships.add(frozenset({uid, f}))
    deliver(make_orb("u_jiseop", ["yellow_03"], 10, demo_playlist()), "u_jiseop", uid, "FRIEND", 10)
    deliver(make_orb("u_eunjae", ["blue_04", "purple_04"], 1, demo_playlist()), "u_eunjae", uid,
            "ANONYMOUS", 1)
    for ids, days in ((["blue_02"], 1), (["purple_01"], 2), (["blue_03"], 3), (["blue_04"], 4),
                      (["green_01"], 9)):
        add_record(uid, "OWN", make_orb(uid, ids, days * 1440), "SELF", days * 1440)
    settings[uid] = {"anonymousEnabled": False, "pushEnabled": True,
                     "rest": {"mode": "OFF", "startsAt": None, "endsAt": None, "active": False}}
    qid = nid("q")
    requests_[qid] = {"id": qid, "from": summary("u_eunjae"), "to": summary(uid),
                      "status": "PENDING", "createdAt": now_iso(30)}


def me_json(u):
    return {"id": u["id"], "loginId": u["loginId"], "nickname": u["nickname"],
            "friendCode": u["loginId"], "adultStatus": "VERIFIED_19_PLUS"}


def session_for(uid):
    a, r = uuid.uuid4().hex, uuid.uuid4().hex
    tokens[a], refresh_tokens[r] = uid, uid
    return {"accessToken": a, "refreshToken": r, "expiresIn": 900}


def err(code, message, status, **extra):
    return status, {"error": {"code": code, "message": message, **extra}}


def page(items, q):
    limit = min(int(q.get("limit", 20)), PAGE_MAX)
    start = int(q.get("cursor", 0))
    chunk = items[start:start + limit]
    nxt = str(start + limit) if start + limit < len(items) else None
    return 200, {"items": chunk, "nextCursor": nxt}


def only(b, allowed):
    extra = set(b) - set(allowed)
    return err("INVALID_INPUT", f"알 수 없는 필드: {sorted(extra)}", 422) if extra else None


# ── AI 음악 시뮬레이션 ──
def gen_json(g):
    elapsed = time.time() - g["startedAt"]
    out = []
    for t in g["tracks"]:
        if t["status"] in ("QUEUED", "PROCESSING"):
            if elapsed >= 2 * t["order"]:
                if g["failOnce"] and t["order"] == 2 and not t["retried"]:
                    t["status"] = "FAILED"
                else:
                    t["status"] = "READY"
                    t["title"] = f"Test fixture {t['order']}"
                    t["durationMs"] = 12000
                    t["playbackUrl"] = f"/api/v1/asmr-tracks/{t['id']}/audio"
            else:
                t["status"] = "PROCESSING"
        out.append({k: v for k, v in t.items() if k != "retried"} | {"errorCode": "GENERATION_FAILED" if t["status"] == "FAILED" else None})
    st = [t["status"] for t in g["tracks"]]
    if all(s == "READY" for s in st):
        status = "READY"
    elif any(s in ("QUEUED", "PROCESSING") for s in st):
        status = "PROCESSING"
    elif all(s == "FAILED" for s in st):
        status = "FAILED"
    else:
        status = "PARTIAL_FAILED"
    g["status"] = status
    if status == "READY":
        orbs[g["orbId"]]["orb"]["playlist"] = {"id": nid("p"), "status": "READY", "tracks": [
            {k: t[k] for k in ("id", "order", "title", "durationMs", "playbackUrl")} for t in g["tracks"]]}
    return {"id": g["id"], "orbId": g["orbId"], "status": status, "trackCount": 3, "tracks": out,
            "createdAt": g["createdAt"], "updatedAt": now_iso()}


def dispatch_json(d):
    disp = d["dispatch"]
    now = datetime.now(timezone.utc)
    until = datetime.fromisoformat(disp["cancelUntil"].replace("Z", "+00:00")) if disp["cancelUntil"] else None
    for t in disp["targets"]:
        rc = receipts[d["targets"][t["id"]]]
        t["openedAt"] = rc["receipt"]["openedAt"]
        t["canCancel"] = t["status"] == "DELIVERED" and not t["openedAt"] and until and now <= until
        t["canCancel"] = bool(t["canCancel"])
    alive = [t for t in disp["targets"] if t["status"] == "DELIVERED"]
    if disp["route"] != "SELF":
        disp["status"] = "SENT" if len(alive) == len(disp["targets"]) else (
            "CANCELLED" if not alive else "PARTIALLY_CANCELLED")
    return disp


def single_view(rid, mode):
    rc = receipts[rid]
    first_anon = mode == "FIRST" and rc["receipt"]["route"] == "ANONYMOUS"
    if first_anon:
        rc["token"] = uuid.uuid4().hex
    return {"receipt": rc["receipt"], "orb": rc["receipt"]["orb"], "mode": mode,
            "actions": ["REACT", "QUIET"] if first_anon else [],
            "actionToken": rc["token"] if first_anon else None}


def care_json(uid):
    today = datetime.now(timezone(timedelta(hours=9))).date()
    days = set()
    for r in records.get(uid, []):
        if r["side"] != "OWN" or r["_hidden"]:
            continue
        if any(e["id"] in CARE_IDS for e in r["orb"]["emotions"]):
            d = datetime.fromisoformat(r["recordedAt"].replace("Z", "+00:00")).astimezone(
                timezone(timedelta(hours=9))).date()
            days.add((today - d).days)
    d7 = len([d for d in days if 0 <= d < 7])
    d14 = len([d for d in days if 0 <= d < 14])
    level = 2 if d14 >= 10 else 1 if d7 >= 4 else 0
    done = care_ack.setdefault(uid, set())
    notice = None
    if level and level not in done and not (level == 1 and 2 in done):
        notice = {"id": f"notice_{level}", "level": level, "title": "최근 마음을 돌아보세요",
                  "body": "기획 검수 전 예시 문구입니다.",
                  "resources": [{"id": "care_reflection", "title": "일상 자기돌봄 안내"}]}
    return {"asOfDate": today.isoformat(), "timezone": "Asia/Seoul", "daysIn7": d7, "daysIn14": d14,
            "level": level, "notice": notice}


def visible_records(uid, q):
    side = q.get("side")
    items = [r for r in records.get(uid, []) if not r["_hidden"]]
    items = [r for r in items if not (r["side"] == "RECEIVED" and receipts[r["receiptId"]]["cancelled"])]
    if side:
        items = [r for r in items if r["side"] == side]
    if "from" in q:
        items = [r for r in items if r["recordedAt"][:10] >= q["from"]]
    return [{k: v for k, v in r.items() if k != "_hidden"} for r in items]


def route(m, p, q, b, uid, key):
    # ── 공개 ──
    if m == "GET" and p == "/auth/login-id-availability":
        lid = q.get("loginId", "").lower()
        return 200, {"loginId": lid, "available": not any(u["loginId"] == lid for u in users.values())}
    if m == "POST" and p == "/auth/signup":
        if (e := only(b, ["loginId", "password", "nickname"])):
            return e
        lid = (b.get("loginId") or "").strip().lower()
        pw = b.get("password") or ""
        import re
        if not re.fullmatch(r"[a-z0-9_]{4,20}", lid) or not 8 <= len(pw.encode()) <= 72:
            return err("INVALID_INPUT", "아이디 또는 비밀번호 형식을 확인해주세요.", 422)
        if any(u["loginId"] == lid for u in users.values()):
            return err("LOGIN_ID_IN_USE", "이미 사용 중인 아이디예요.", 409)
        new = {"id": nid("u"), "loginId": lid, "password": pw, "nickname": (b.get("nickname") or lid).strip()}
        users[new["id"]] = new
        seed_for(new["id"])
        return 201, {"user": me_json(new), "session": session_for(new["id"])}
    if m == "POST" and p == "/auth/login":
        u = next((u for u in users.values() if u["loginId"] == (b.get("loginId") or "").lower()), None)
        if not u or u["password"] != b.get("password"):
            return err("INVALID_CREDENTIALS", "아이디 또는 비밀번호를 확인해주세요.", 401)
        if u["id"] not in settings:
            seed_for(u["id"])
        return 200, {"user": me_json(u), "session": session_for(u["id"])}
    if m == "POST" and p == "/auth/refresh":
        rid = refresh_tokens.pop(b.get("refreshToken", ""), None)
        return (200, session_for(rid)) if rid else err("INVALID_SESSION", "다시 로그인해주세요.", 401)

    if not uid:
        return err("INVALID_SESSION", "로그인이 필요해요.", 401)
    u = users[uid]
    seg = p.strip("/").split("/")

    if m == "POST" and p == "/auth/logout":
        return 204, None
    if m == "GET" and p == "/me":
        return 200, me_json(u)
    if m == "PUT" and p == "/me/profile":
        u["nickname"] = b["nickname"].strip()
        return 200, me_json(u)

    # ── 카탈로그 ──
    if m == "GET" and p == "/catalog/emotions":
        return 200, {"version": "1", "items": list(CATALOG.values())}
    if m == "GET" and p == "/catalog/reactions":
        return 200, {"items": REACTIONS}

    # ── 초안 구슬 ──
    if m == "POST" and p == "/orbs":
        if (e := only(b, ["emotionIds"])):
            return e
        ids = b.get("emotionIds") or []
        colors = [CATALOG[i]["color"] for i in ids if i in CATALOG]
        if not 1 <= len(ids) <= 2 or len(colors) != len(ids) or len(set(colors)) != len(colors):
            return err("INVALID_INPUT", "서로 다른 색의 단어 1~2개를 골라주세요.", 422)
        return 201, {"orb": make_orb(uid, ids), "recordId": None}
    if m == "POST" and len(seg) == 3 and seg[0] == "orbs" and seg[2] == "asmr-generations":
        o = orbs[seg[1]]
        if o["owner"] != uid or o["dispatched"]:
            return err("NOT_FOUND", "찾을 수 없어요.", 404)
        if "503" in (b.get("description") or ""):
            return err("GENERATION_UNAVAILABLE", "지금은 음악을 만들 수 없어요.", 503)
        if o["generation"]:
            return err("GENERATION_EXISTS", "이미 음악을 만들고 있어요.", 409)
        gid = nid("g")
        g = {"id": gid, "orbId": seg[1], "startedAt": time.time(), "createdAt": now_iso(),
             "failOnce": "fail" in (b.get("description") or ""), "status": "QUEUED",
             "tracks": [{"id": nid("trk"), "order": i, "status": "QUEUED", "title": None,
                         "durationMs": None, "playbackUrl": None, "retried": False} for i in (1, 2, 3)]}
        generations[gid], o["generation"] = g, gid
        for t in g["tracks"]:
            tracks[t["id"]] = gid
        return 202, gen_json(g)
    if m == "GET" and len(seg) == 2 and seg[0] == "asmr-generations":
        return 200, gen_json(generations[seg[1]])
    if m == "POST" and len(seg) == 3 and seg[0] == "asmr-generations" and seg[2] == "retry":
        g = generations[seg[1]]
        for t in g["tracks"]:
            if t["status"] == "FAILED":
                t["status"], t["retried"] = "QUEUED", True
        g["startedAt"] = time.time() - 2  # 다시 2초 뒤 완성
        return 202, gen_json(g)
    if m == "DELETE" and len(seg) == 3 and seg[0] == "orbs" and seg[2] == "playlist":
        o = orbs[seg[1]]
        o["orb"]["playlist"], o["generation"] = None, None
        return 204, None
    if m == "GET" and len(seg) == 3 and seg[0] == "asmr-tracks" and seg[2] == "audio":
        return "AUDIO", None

    # ── 보내기 ──
    if m == "POST" and len(seg) == 3 and seg[0] == "orbs" and seg[2] == "dispatches":
        o = orbs[seg[1]]
        if o["owner"] != uid:
            return err("NOT_FOUND", "찾을 수 없어요.", 404)
        if o["dispatched"]:
            return err("ALREADY_DISPATCHED", "이미 보낸 구슬이에요.", 409)
        if o["generation"] and generations[o["generation"]]["status"] != "READY":
            return err("PLAYLIST_NOT_READY", "음악이 아직 준비되지 않았어요.", 409)
        r = b.get("route")
        if r == "FRIEND":
            if (e := only(b, ["route", "friendId"])) or not isinstance(b.get("friendId"), str):
                return e or err("INVALID_INPUT", "friendId 는 한 명이에요.", 422)
            if frozenset({uid, b["friendId"]}) not in friendships:
                return err("FRIENDSHIP_CHANGED", "친구 관계가 바뀌었어요.", 409)
            to = [b["friendId"]]
        elif r in ("SELF", "ANONYMOUS"):
            if (e := only(b, ["route"])):
                return e
            if r == "ANONYMOUS" and not settings[uid]["anonymousEnabled"]:
                return err("ANONYMOUS_DISABLED", "익명 설정을 켜주세요.", 403)
            to = [] if r == "SELF" else [x for x in users if x != uid and (uid, x) not in blocks
                                           and (x, uid) not in blocks][:3]
            if r == "ANONYMOUS" and not to:
                return err("NO_MATCH", "받을 사람이 없어요.", 409)
        else:
            return err("INVALID_INPUT", "route 를 확인해주세요.", 422)
        o["dispatched"] = True
        did = nid("d")
        targets, tmap = [], {}
        for x in to:
            rid = deliver(o["orb"], uid, x, r)
            tid = nid("t")
            tmap[tid] = rid
            targets.append({"id": tid, "counterpart": summary(x) if r == "FRIEND" else None,
                            "status": "DELIVERED", "openedAt": None, "cancelledAt": None, "canCancel": True})
        sent = datetime.now(timezone.utc)
        disp = {"id": did, "orbId": o["orb"]["id"], "route": r, "status": "SAVED" if r == "SELF" else "SENT",
                "recipientCount": len(to), "sentAt": iso(sent),
                "cancelUntil": None if r == "SELF" else iso(sent + timedelta(minutes=5)), "targets": targets}
        dispatches[did] = {"dispatch": disp, "owner": uid, "targets": tmap}
        rec = add_record(uid, "OWN", o["orb"], r, dispatch=did,
                         cp=summary(to[0]) if r == "FRIEND" else None)
        return 201, {"dispatch": dispatch_json(dispatches[did]), "recordId": rec["id"]}
    if m == "GET" and len(seg) == 2 and seg[0] == "dispatches":
        return 200, dispatch_json(dispatches[seg[1]])
    if m == "POST" and len(seg) == 5 and seg[0] == "dispatches" and seg[4] == "cancel":
        d = dispatches[seg[1]]
        dispatch_json(d)
        t = next(t for t in d["dispatch"]["targets"] if t["id"] == seg[3])
        if not t["canCancel"]:
            return err("CANCEL_NOT_ALLOWED", "취소할 수 없어요.", 409)
        t["status"], t["cancelledAt"] = "CANCELLED", now_iso()
        receipts[d["targets"][t["id"]]]["cancelled"] = True
        return 200, {"dispatch": dispatch_json(d)}

    # ── 받은 구슬 ──
    if m == "GET" and p == "/inbox":
        items = [r["receipt"] for r in receipts.values() if r["owner"] == uid and not r["cancelled"]]
        items.sort(key=lambda r: r["receivedAt"], reverse=True)
        if q.get("unreadOnly") == "true":
            items = [r for r in items if not r["openedAt"]]
        return page(items, q)
    if len(seg) >= 3 and seg[0] == "receipts":
        rc = receipts.get(seg[1])
        if not rc or rc["owner"] != uid or rc["cancelled"]:
            return err("NOT_FOUND", "확인할 수 없는 구슬이에요.", 404)
        act = seg[2]
        if m == "POST" and act == "open":
            if rc["receipt"]["openedAt"]:
                return 200, single_view(seg[1], "REPLAY")
            rc["receipt"]["openedAt"] = now_iso()
            return 200, single_view(seg[1], "FIRST")
        if m == "GET" and act == "replay":
            if not rc["receipt"]["openedAt"]:
                return err("NOT_OPENED", "아직 열지 않은 구슬이에요.", 409)
            rc["token"] = None
            return 200, single_view(seg[1], "REPLAY")
        if m == "POST" and act == "reaction":
            if rc["receipt"]["route"] != "ANONYMOUS":
                return err("ACTION_NOT_ALLOWED", "반응할 수 없어요.", 403)
            if not rc["token"] or b.get("actionToken") != rc["token"]:
                return err("ACTION_CLOSED", "이미 끝난 구슬이에요.", 409)
            if b.get("code") not in {x["code"] for x in REACTIONS}:
                return err("INVALID_INPUT", "반응 code 를 확인해주세요.", 422)
            rc["reaction"], rc["token"] = b["code"], None
            return 201, {"code": b["code"], "reactedAt": now_iso()}
        if m == "POST" and act == "finish":
            rc["token"] = None
            return 204, None
        if m == "POST" and act == "reports":
            if rc["receipt"]["route"] != "ANONYMOUS":
                return err("ACTION_NOT_ALLOWED", "익명 구슬만 신고할 수 있어요.", 403)
            if (e := only(b, ["reasonCode", "detail"])):
                return e
            if b.get("reasonCode") not in REASONS or ("detail" in b and b["reasonCode"] != "OTHER"):
                return err("INVALID_INPUT", "신고 사유를 확인해주세요.", 422)
            if rc["reported"]:
                return err("ALREADY_REPORTED", "이미 신고했어요.", 409)
            rc["reported"] = True
            return 201, {"reportId": nid("rep"), "status": "RECEIVED"}
        if m == "PUT" and act == "anonymous-block":
            if rc["receipt"]["route"] != "ANONYMOUS":
                return err("ACTION_NOT_ALLOWED", "친구 구슬은 차단할 수 없어요.", 403)
            blocks.add((uid, rc["sender"]))
            return 204, None

    # ── 기록 ──
    if m == "GET" and p == "/records":
        if "date" in q and ("from" in q or "to" in q):
            return err("INVALID_INPUT", "date 와 from/to 는 함께 못 써요.", 422)
        return page(visible_records(uid, q), q)
    if len(seg) == 2 and seg[0] == "records":
        rec = next(r for r in records[uid] if r["id"] == seg[1] and not r["_hidden"])
        if m == "GET":
            reactions = []
            if rec["dispatchId"]:
                codes = [receipts[x]["reaction"] for x in dispatches[rec["dispatchId"]]["targets"].values()]
                for c in {c for c in codes if c}:
                    reactions.append({"code": c, "count": codes.count(c)})
            clean = {k: v for k, v in rec.items() if k != "_hidden"}
            disp = dispatch_json(dispatches[rec["dispatchId"]]) if rec["dispatchId"] else None
            return 200, {"record": clean, "dispatch": disp, "reactions": reactions}
        if m == "DELETE":
            if rec["side"] != "OWN":
                return err("ACTION_NOT_ALLOWED", "받은 기록은 지울 수 없어요.", 403)
            rec["_hidden"] = True
            return 204, None

    # ── 친구 ──
    if m == "GET" and p == "/friends":
        return page([summary(x) for f in friendships if uid in f for x in f if x != uid], q)
    if m == "DELETE" and len(seg) == 2 and seg[0] == "friends":
        friendships.discard(frozenset({uid, seg[1]}))
        return 204, None
    if m == "GET" and p == "/friend-requests":
        mine = [r for r in requests_.values() if r["to"]["id"] == uid]
        return page(mine, q)
    if m == "POST" and p == "/friend-requests":
        code = b.get("friendCode", "")
        target = next((x for x in users.values() if x["loginId"] == code), None)
        if not target:
            return err("NOT_FOUND", "없는 아이디예요.", 404)
        if target["id"] == uid:
            return err("INVALID_INPUT", "나에게는 보낼 수 없어요.", 422)
        if frozenset({uid, target["id"]}) in friendships:
            return err("RELATION_EXISTS", "이미 친구예요.", 409)
        qid = nid("q")
        requests_[qid] = {"id": qid, "from": summary(uid), "to": summary(target["id"]),
                          "status": "PENDING", "createdAt": now_iso()}
        return 201, requests_[qid]
    if m == "PUT" and len(seg) == 3 and seg[0] == "friend-requests":
        r = requests_[seg[1]]
        r["status"] = "ACCEPTED" if b.get("decision") == "ACCEPT" else "DECLINED"
        if r["status"] == "ACCEPTED":
            friendships.add(frozenset({r["from"]["id"], r["to"]["id"]}))
        return 200, r

    # ── 설정·휴식·케어 ──
    if m == "GET" and p == "/me/settings":
        return 200, settings[uid]
    if m == "PATCH" and p == "/me/settings":
        settings[uid].update({k: v for k, v in b.items() if k in ("anonymousEnabled", "pushEnabled")})
        return 200, settings[uid]
    if m == "PUT" and p == "/me/rest":
        mode = b.get("mode")
        rest = {"mode": mode, "startsAt": b.get("startsAt"), "endsAt": b.get("endsAt"),
                "active": mode == "MANUAL"}
        if mode == "MANUAL":
            rest["startsAt"] = now_iso()
        settings[uid]["rest"] = rest
        return 200, rest
    if m == "GET" and p == "/me/care":
        return 200, care_json(uid)
    if m == "PUT" and len(seg) == 5 and seg[2] == "notices":
        care_ack.setdefault(uid, set()).add(int(seg[3].split("_")[1]))
        return 204, None

    return err("NOT_FOUND", "찾을 수 없어요.", 404)


class H(BaseHTTPRequestHandler):
    def _send(self, status, body=None, raw=None, ctype=None):
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        data = raw if raw is not None else (
            json.dumps(body, ensure_ascii=False).encode() if body is not None else None)
        if data is not None:
            self.send_header("Content-Type", ctype or "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            self.end_headers()

    def do_OPTIONS(self):
        self._send(204)

    def _handle(self, method):
        url = urlparse(self.path)
        path = url.path.removeprefix("/api/v1")
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        n = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(n) or b"{}") if n else {}
        except json.JSONDecodeError:
            return self._send(400, {"error": {"code": "INVALID_JSON", "message": "JSON 오류"}})
        uid = tokens.get(self.headers.get("Authorization", "").removeprefix("Bearer "))
        key = self.headers.get("Idempotency-Key")
        ik = (uid, method, path, key)
        if key and ik in idem:
            status, res = idem[ik]
            print(f"{method} {self.path} → {status} (재시도 키 재사용)")
            return self._send(status, res)
        try:
            status, res = route(method, path, q, body, uid, key)
        except (KeyError, StopIteration):
            status, res = err("NOT_FOUND", "찾을 수 없어요.", 404)
        if status == "AUDIO":
            print(f"{method} {self.path} → 200 audio/wav")
            with open(WAV, "rb") as f:
                return self._send(200, raw=f.read(), ctype="audio/wav")
        if key and isinstance(status, int) and status < 300:
            idem[ik] = (status, res)
        print(f"{method} {self.path} → {status}" + (f" {res['error']['code']}" if isinstance(res, dict) and 'error' in res else ""))
        sys.stdout.flush()
        self._send(status, res)

    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")

    def do_PUT(self):
        self._handle("PUT")

    def do_PATCH(self):
        self._handle("PATCH")

    def do_DELETE(self):
        self._handle("DELETE")

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8200))
    print(f"EmOri 가짜 백엔드 v0.3 → http://0.0.0.0:{port}/api/v1")
    ThreadingHTTPServer(("0.0.0.0", port), H).serve_forever()
