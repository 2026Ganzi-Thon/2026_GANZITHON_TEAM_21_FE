#!/usr/bin/env python3
"""
EmOri 가짜 백엔드 (FE 연동 테스트용) - 실제 서버가 아니에요!
백엔드 API 명세 v0.3 + 기획 결정(11/16) 반영 제안 모양대로 메모리에서만 동작해요.
  - 감정은 색 단위 POST /orbs {colors, soundId?} → 색에 매핑된 단어 4개를 그대로 저장
  - 음악은 미리 만든 15초 샘플 (GET /catalog/sounds), AI 생성은 MVP 제외
  - 가입 때 birthDate, 기존 가입자는 PUT /me/birth-date
실제 서버를 못 띄울 때 FE 흐름을 끝까지 눌러보는 용도.

실행:  python3 scripts/fake-server.py            (http://0.0.0.0:8200)
앱:    .env 에 EXPO_PUBLIC_API_URL=http://<맥 IP>:8200/api/v1  → npx expo start

- 목록은 일부러 한 페이지 2개씩만 줘요 (FE 가 cursor 를 끝까지 읽는지 확인)
- 미리 들어 있는 데이터: 친구 jiseop / eunjae, 받은 구슬 2개(친구 1, 익명 1), 친구 요청 1개
- eunjae 계정은 생년월일이 없는 기존 가입자 (익명 켤 때 입력 팝업 확인용)
"""
import json
import os
import sys
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
EMOTION = {c: {"id": c.lower(), "color": c, "area": a, "words": ws} for c, (a, ws) in COLORS.items()}
SOUNDS = [
    {"id": f"sample_{c}", "title": t, "color": c.upper(), "durationMs": 15000,
     "playbackUrl": f"/api/v1/sounds/sample_{c}/audio"}
    for c, t in (("yellow", "햇살 산책"), ("orange", "설레는 걸음"), ("pink", "포근한 오후"),
                 ("red", "가라앉히는 숨"), ("purple", "창밖의 빗소리"), ("blue", "잔잔한 파도"),
                 ("green", "숲속 시냇물"))
]
REACTIONS = [
    {"code": "HEART", "label": "마음 전하기", "emoji": "❤️"},
    {"code": "HUG", "label": "안아주기", "emoji": "🫂"},
    {"code": "CHEER", "label": "응원하기", "emoji": "🙌"},
]
REASONS = {"INAPPROPRIATE", "UNWANTED_REPEATED", "HARASSMENT_THREAT", "OTHER"}
CARE_WORDS = {"불안", "막막함", "외로움", "무기력", "지침"}
SOUND_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def now_iso(delta_min=0):
    return iso(datetime.now(timezone.utc) - timedelta(minutes=delta_min))


def nid(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


# ── 메모리 DB ──
users = {
    "u_jiseop": {"id": "u_jiseop", "loginId": "jiseop", "password": "password1", "nickname": "지섭",
                 "birthDate": "2001-03-02"},
    "u_eunjae": {"id": "u_eunjae", "loginId": "eunjae", "password": "password1", "nickname": "은재",
                 "birthDate": None},
}
tokens, refresh_tokens = {}, {}
friendships = set()
requests_ = {}
records = {}  # uid -> [Record]
receipts = {}  # rid -> {...}
orbs = {}  # orbId -> {"orb", "owner", "dispatched"}
dispatches = {}  # id -> {"dispatch", "owner", "targets": {tid: receiptId}}
settings, care_ack, blocks = {}, {}, set()
idem = {}  # (uid, method, path, key) -> (status, body)


def summary(uid):
    return {"id": uid, "nickname": users[uid]["nickname"]}


def make_orb(owner, colors, delta_min=0, playlist=None):
    o = {
        "id": nid("o"),
        "kind": "MIXED" if len(colors) == 2 else "SINGLE",
        "emotions": [EMOTION[c] for c in colors],
        "playlist": playlist,
        "createdAt": now_iso(delta_min),
    }
    orbs[o["id"]] = {"orb": o, "owner": owner, "dispatched": False}
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


def sound_playlist(sound_id):
    snd = next(x for x in SOUNDS if x["id"] == sound_id)
    return {"id": nid("p"), "status": "READY", "tracks": [
        {"id": snd["id"], "order": 1, "title": snd["title"], "durationMs": snd["durationMs"],
         "playbackUrl": snd["playbackUrl"]}]}


def seed_for(uid):
    for f in ("u_jiseop", "u_eunjae"):
        friendships.add(frozenset({uid, f}))
    deliver(make_orb("u_jiseop", ["YELLOW"], 10, sound_playlist("sample_yellow")), "u_jiseop", uid,
            "FRIEND", 10)
    deliver(make_orb("u_eunjae", ["BLUE", "PURPLE"], 1, sound_playlist("sample_blue")), "u_eunjae", uid,
            "ANONYMOUS", 1)
    for ids, days in ((["BLUE"], 1), (["PURPLE"], 2), (["BLUE"], 3), (["BLUE", "GREEN"], 4),
                      (["GREEN"], 9)):
        add_record(uid, "OWN", make_orb(uid, ids, days * 1440), "SELF", days * 1440)
    settings[uid] = {"anonymousEnabled": False, "pushEnabled": True,
                     "rest": {"mode": "OFF", "startsAt": None, "endsAt": None, "active": False}}
    qid = nid("q")
    requests_[qid] = {"id": qid, "from": summary("u_eunjae"), "to": summary(uid),
                      "status": "PENDING", "createdAt": now_iso(30)}


def adult_status(birth):
    if not birth:
        return "UNKNOWN"
    y, m, d = map(int, birth.split("-"))
    today = datetime.now(timezone(timedelta(hours=9))).date()
    age = today.year - y - ((today.month, today.day) < (m, d))
    return "VERIFIED_19_PLUS" if age >= 19 else "INELIGIBLE"


def valid_birth(b):
    try:
        return bool(b) and datetime.strptime(b, "%Y-%m-%d").date() <= datetime.now().date()
    except (TypeError, ValueError):
        return False


def me_json(u):
    return {"id": u["id"], "loginId": u["loginId"], "nickname": u["nickname"],
            "friendCode": u["loginId"], "adultStatus": adult_status(u.get("birthDate"))}


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
        if any(w in CARE_WORDS for e in r["orb"]["emotions"] for w in e["words"]):
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
        # 실제 서버(v0.5)처럼 가입에는 birthDate 를 안 받음 → PUT /me/birth-date 로 따로
        if (e := only(b, ["loginId", "password", "nickname"])):
            return e
        lid = (b.get("loginId") or "").strip().lower()
        pw = b.get("password") or ""
        import re
        if not re.fullmatch(r"[a-z0-9_]{4,20}", lid) or not 8 <= len(pw.encode()) <= 72:
            return err("INVALID_INPUT", "아이디 또는 비밀번호 형식을 확인해주세요.", 422)
        if any(u["loginId"] == lid for u in users.values()):
            return err("LOGIN_ID_IN_USE", "이미 사용 중인 아이디예요.", 409)
        new = {"id": nid("u"), "loginId": lid, "password": pw, "nickname": (b.get("nickname") or lid).strip(),
               "birthDate": None}
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
    if m == "PUT" and p == "/me/birth-date":
        if not valid_birth(b.get("birthDate")):
            return err("INVALID_INPUT", "생년월일을 확인해주세요.", 422, field="birthDate")
        u["birthDate"] = b["birthDate"]
        return 200, me_json(u)
    if m == "PUT" and p == "/me/profile":
        u["nickname"] = b["nickname"].strip()
        return 200, me_json(u)

    # ── 카탈로그 ──
    if m == "GET" and p == "/catalog/emotions":
        return 200, {"version": "2", "items": list(EMOTION.values())}
    if m == "GET" and p == "/catalog/reactions":
        return 200, {"items": REACTIONS}
    if m == "GET" and p == "/catalog/sounds":
        return 200, {"items": SOUNDS}
    if m == "GET" and len(seg) == 3 and seg[0] == "sounds" and seg[2] == "audio":
        return "AUDIO", seg[1].removeprefix("sample_")

    # ── 초안 구슬: 색 1~2개 (+ 샘플 음악) ──
    if m == "POST" and p == "/orbs":
        if (e := only(b, ["colors", "soundId"])):
            return e
        colors = b.get("colors") or []
        if not 1 <= len(colors) <= 2 or any(c not in EMOTION for c in colors) or len(set(colors)) != len(colors):
            return err("INVALID_INPUT", "서로 다른 색 1~2개를 골라주세요.", 422)
        sid = b.get("soundId")
        if sid is not None and not any(x["id"] == sid for x in SOUNDS):
            return err("INVALID_INPUT", "없는 음악이에요.", 422, field="soundId")
        return 201, {"orb": make_orb(uid, colors, playlist=sound_playlist(sid) if sid else None), "recordId": None}

    # ── 보내기 ──
    if m == "POST" and len(seg) == 3 and seg[0] == "orbs" and seg[2] == "dispatches":
        o = orbs[seg[1]]
        if o["owner"] != uid:
            return err("NOT_FOUND", "찾을 수 없어요.", 404)
        if o["dispatched"]:
            return err("ALREADY_DISPATCHED", "이미 보낸 구슬이에요.", 409)
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
            if r == "ANONYMOUS" and adult_status(u.get("birthDate")) != "VERIFIED_19_PLUS":
                return err("AGE_REQUIRED", "만 19세 이상만 쓸 수 있어요.", 403)
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
        if b.get("anonymousEnabled") and adult_status(u.get("birthDate")) != "VERIFIED_19_PLUS":
            return err("AGE_REQUIRED", "만 19세 이상만 쓸 수 있어요.", 403)
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
            print(f"{method} {self.path} → 200 audio/mp4")
            with open(os.path.join(SOUND_DIR, f"sample-{res}.m4a"), "rb") as f:
                return self._send(200, raw=f.read(), ctype="audio/mp4")
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
