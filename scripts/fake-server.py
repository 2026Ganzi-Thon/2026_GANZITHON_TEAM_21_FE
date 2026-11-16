#!/usr/bin/env python3
"""
EmOri 가짜 백엔드 (FE 연동 테스트용) - 실제 서버가 아니에요!
FE가 기대하는 요청/응답 모양(docs/API_FE_계약.md)대로 메모리에서만 동작해요.

실행:  python3 scripts/fake-server.py            (http://0.0.0.0:8200)
앱:    .env 에 EXPO_PUBLIC_API_URL=http://<맥 IP>:8200  → npx expo start

미리 들어 있는 데이터: 친구 jiseop / eunjae, 받은 구슬 2개(친구 1, 익명 1)
"""
import json
import time
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

AREA = {
    "YELLOW": ("기쁨·기대", ["기쁨", "기대", "홀가분함", "감사"]),
    "ORANGE": ("활력·설렘", ["설렘", "의욕", "뿌듯함", "들뜸"]),
    "PINK": ("애정·다정함", ["애정", "다정함", "그리움", "위로받고 싶음"]),
    "RED": ("강한 감정", ["짜증", "화남", "억울함", "벅참"]),
    "PURPLE": ("복잡함·불안", ["불안", "막막함", "복잡함", "생각이 많음"]),
    "BLUE": ("가라앉음", ["가라앉음", "외로움", "무기력", "지침"]),
    "GREEN": ("안정·회복", ["편안함", "안정", "회복 중", "평온"]),
}
SOUNDS = [
    {"id": "s_rain", "title": "빗소리", "durationMs": 12000, "playbackUrl": "https://example.invalid/rain.m4a"},
    {"id": "s_piano", "title": "잔잔한 피아노", "durationMs": 12000, "playbackUrl": "https://example.invalid/piano.m4a"},
]
REACTIONS = [{"code": f"R{i}", "label": e, "emoji": e} for i, e in enumerate("🤗🙏💜🫂✨👍")]


def now_iso(delta_min=0):
    return (datetime.now(timezone.utc) - timedelta(minutes=delta_min)).isoformat()


def emotion(c):
    area, words = AREA[c]
    return {"color": c, "area": area, "words": words}


def orb(colors, sound_id=None, delta_min=0):
    sound = next((s for s in SOUNDS if s["id"] == sound_id), None)
    return {
        "id": "o_" + uuid.uuid4().hex[:6],
        "kind": "MIXED" if len(colors) == 2 else "SINGLE",
        "emotions": [emotion(c) for c in colors],
        "sound": sound,
        "createdAt": now_iso(delta_min),
    }


# ── 메모리 DB ──
users = {
    "u_jiseop": {"id": "u_jiseop", "loginId": "jiseop", "password": "x", "nickname": "jiseop"},
    "u_eunjae": {"id": "u_eunjae", "loginId": "eunjae", "password": "x", "nickname": "eunjae"},
}
tokens = {}  # accessToken -> userId
friendships = set()  # frozenset({a, b})
requests_ = {}  # id -> FriendRequest
records = {}  # userId -> [Record]
receipts = {}  # id -> {receipt, orb, owner, dispatchId, actionToken, reacted}
dispatches = {}
settings = {}


def seed_for(uid):
    """새 사용자에게 친구 2명 + 받은 구슬 2개 + 내 기록 몇 개"""
    for f in ("u_jiseop", "u_eunjae"):
        friendships.add(frozenset({uid, f}))
    records[uid] = []
    for colors, delta, sender, route in (
        (["YELLOW"], 10, users["u_jiseop"], "FRIEND"),
        (["BLUE", "PURPLE"], 1, None, "ANONYMOUS"),
    ):
        o = orb(colors, "s_rain", delta)
        rid = "i_" + uuid.uuid4().hex[:6]
        rc = {
            "id": rid,
            "route": route,
            "sender": {"id": sender["id"], "nickname": sender["nickname"]} if sender else None,
            "receivedAt": now_iso(delta),
            "openedAt": None,
        }
        receipts[rid] = {"receipt": rc, "orb": o, "owner": uid, "token": None, "reacted": False}
        records[uid].append(
            {"id": "r_" + uuid.uuid4().hex[:6], "side": "RECEIVED", "orb": o, "route": route,
             "recordedAt": now_iso(delta), "receiptId": rid, "dispatchId": None,
             "counterpart": rc["sender"]}
        )
    for colors, days in ((["BLUE"], 1), (["PURPLE"], 2), (["BLUE"], 4), (["GREEN"], 9)):
        records[uid].append(
            {"id": "r_" + uuid.uuid4().hex[:6], "side": "OWN", "orb": orb(colors, None, days * 1440),
             "route": "SELF", "recordedAt": now_iso(days * 1440), "receiptId": None,
             "dispatchId": None, "counterpart": None}
        )
    settings[uid] = {"anonymousEnabled": False, "pushEnabled": True,
                     "rest": {"mode": "OFF", "startsAt": None, "endsAt": None, "active": False}}
    # 친구 요청 1개
    qid = "q_" + uuid.uuid4().hex[:6]
    requests_[qid] = {"id": qid, "from": {"id": "u_eunjae", "nickname": "eunjae"},
                      "to": {"id": uid, "nickname": users[uid]["nickname"]},
                      "status": "PENDING", "createdAt": now_iso(30)}


def me_json(u):
    return {"id": u["id"], "nickname": u["nickname"], "friendCode": u["loginId"],
            "schoolVerified": False, "adultStatus": "VERIFIED_19_PLUS", "onboardingStep": "READY"}


def session_for(uid):
    t = uuid.uuid4().hex
    tokens[t] = uid
    return {"accessToken": t, "refreshToken": "rf_" + t, "expiresIn": 86400}


def err(code, message, status):
    return status, {"error": {"code": code, "message": message}}


class H(BaseHTTPRequestHandler):
    def _send(self, status, body=None):
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode()
            self.send_header("Content-Type", "application/json; charset=utf-8")
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
        body = json.loads(self.rfile.read(n) or b"{}") if n else {}
        auth = self.headers.get("Authorization", "")
        uid = tokens.get(auth.removeprefix("Bearer "))
        try:
            status, res = route(method, path, q, body, uid)
        except KeyError:
            status, res = err("NOT_FOUND", "찾을 수 없어요.", 404)
        print(f"{method} {self.path} → {status}")
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


def page(items):
    return {"items": items, "nextCursor": None}


def route(m, p, q, b, uid):
    # ── 공개 ──
    if m == "POST" and p == "/auth/signup":
        lid = b.get("loginId", "").strip()
        if not lid or len(b.get("password", "")) < 4:
            return err("INVALID_INPUT", "아이디와 비밀번호(4자 이상)를 입력해주세요.", 422)
        if any(u["loginId"] == lid for u in users.values()):
            return err("LOGIN_ID_IN_USE", "이미 사용 중인 아이디예요.", 409)
        new = {"id": "u_" + uuid.uuid4().hex[:6], "loginId": lid, "password": b["password"],
               "nickname": b.get("nickname") or lid}
        users[new["id"]] = new
        seed_for(new["id"])
        return 201, {"user": me_json(new), "session": session_for(new["id"])}
    if m == "POST" and p == "/auth/login":
        u = next((u for u in users.values() if u["loginId"] == b.get("loginId")), None)
        if not u or u["password"] != b.get("password"):
            return err("INVALID_CREDENTIALS", "아이디 또는 비밀번호를 확인해주세요.", 401)
        if u["id"] not in records:
            seed_for(u["id"])
        return 200, {"user": me_json(u), "session": session_for(u["id"])}
    if m == "POST" and p == "/auth/refresh":
        t = b.get("refreshToken", "").removeprefix("rf_")
        if t in tokens:
            return 200, session_for(tokens[t])
        return err("INVALID_SESSION", "다시 로그인해주세요.", 401)

    if not uid:
        return err("INVALID_SESSION", "로그인이 필요해요.", 401)
    u = users[uid]

    if m == "POST" and p == "/auth/logout":
        return 204, None
    if m == "GET" and p == "/me":
        return 200, me_json(u)
    if m == "PUT" and p == "/me/profile":
        u["nickname"] = b["nickname"]
        return 200, me_json(u)

    # ── 카탈로그 ──
    if m == "GET" and p == "/catalog/sounds":
        return 200, {"items": SOUNDS}
    if m == "GET" and p == "/catalog/reactions":
        return 200, {"items": REACTIONS}

    # ── 구슬 만들기·보내기 ──
    if m == "POST" and p == "/orbs":
        colors = b.get("colors") or []
        if not 1 <= len(colors) <= 2 or len(set(colors)) != len(colors) or any(c not in AREA for c in colors):
            return err("INVALID_INPUT", "색은 서로 다른 1~2개예요.", 422)
        o = orb(colors, b.get("soundId"))
        rec = {"id": "r_" + uuid.uuid4().hex[:6], "side": "OWN", "orb": o, "route": None,
               "recordedAt": o["createdAt"], "receiptId": None, "dispatchId": None, "counterpart": None}
        records[uid].append(rec)
        return 201, {"orb": o, "recordId": rec["id"]}
    if m == "POST" and p.startswith("/orbs/") and p.endswith("/dispatches"):
        oid = p.split("/")[2]
        rec = next(r for r in records[uid] if r["orb"]["id"] == oid)
        r = b.get("route")
        ids = b.get("friendIds") or ([b["friendId"]] if b.get("friendId") else [])
        if r == "FRIEND":
            for f in ids:
                if frozenset({uid, f}) not in friendships:
                    return err("FRIENDSHIP_CHANGED", "친구 관계가 바뀌었어요.", 409)
        elif r == "ANONYMOUS" and not settings[uid]["anonymousEnabled"]:
            return err("ANONYMOUS_DISABLED", "설정에서 익명 구슬을 켜주세요.", 403)
        d = {"id": "d_" + uuid.uuid4().hex[:6], "orbId": oid, "route": r,
             "status": "SAVED" if r == "SELF" else "SENT",
             "recipientCount": 0 if r == "SELF" else max(1, len(ids)),
             "sentAt": now_iso(),
             "cancelUntil": None if r == "SELF" else (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()}
        dispatches[d["id"]] = d
        rec["route"], rec["dispatchId"] = r, d["id"]
        if r == "FRIEND" and len(ids) == 1:
            rec["counterpart"] = {"id": ids[0], "nickname": users[ids[0]]["nickname"]}
        return 201, d
    if m == "POST" and p.startswith("/dispatches/") and p.endswith("/cancel"):
        d = dispatches[p.split("/")[2]]
        if d["status"] != "SENT" or datetime.fromisoformat(d["cancelUntil"]) < datetime.now(timezone.utc):
            return err("CANCEL_NOT_ALLOWED", "이미 열람했거나 취소할 수 있는 시간이 지났어요.", 409)
        d["status"] = "CANCELLED"
        return 200, d

    # ── 수신함 ──
    if m == "GET" and p == "/inbox":
        mine = [r for r in receipts.values() if r["owner"] == uid]
        mine.sort(key=lambda r: r["receipt"]["receivedAt"], reverse=True)
        return 200, page([{**r["receipt"], "orb": r["orb"]} for r in mine])
    if p.startswith("/receipts/"):
        parts = p.split("/")
        r = receipts[parts[2]]
        if r["owner"] != uid:
            return err("NOT_FOUND", "찾을 수 없어요.", 404)
        action = parts[3]
        if m == "POST" and action == "open":
            first = r["receipt"]["openedAt"] is None
            if first:
                r["receipt"]["openedAt"] = now_iso()
            anon = r["receipt"]["route"] == "ANONYMOUS"
            r["token"] = uuid.uuid4().hex if first and anon else None
            return 200, {"receipt": r["receipt"], "orb": r["orb"], "mode": "FIRST" if first else "REPLAY",
                         "actions": ["REACT", "QUIET"] if first and anon else [], "actionToken": r["token"]}
        if m == "GET" and action == "replay":
            if r["receipt"]["openedAt"] is None:
                return err("NOT_OPENED", "아직 열지 않은 구슬이에요.", 409)
            return 200, {"receipt": r["receipt"], "orb": r["orb"], "mode": "REPLAY", "actions": [], "actionToken": None}
        if m == "POST" and action == "reaction":
            if r["receipt"]["route"] != "ANONYMOUS":
                return err("ACTION_NOT_ALLOWED", "친구에게 받은 구슬에는 반응할 수 없어요.", 403)
            if not r["token"] or b.get("actionToken") != r["token"]:
                return err("ACTION_CLOSED", "이미 반응했어요.", 409)
            r["token"], r["reacted"] = None, True
            return 201, {"code": b["code"], "reactedAt": now_iso()}
        if m == "POST" and action == "finish":
            r["token"] = None
            return 204, None
        if m == "POST" and action == "reports":
            return 201, {"reportId": "rp_" + uuid.uuid4().hex[:6], "status": "RECEIVED"}

    # ── 기록 ──
    if m == "GET" and p == "/records":
        items = [r for r in records[uid] if not q.get("side") or r["side"] == q["side"]]
        items.sort(key=lambda r: r["recordedAt"], reverse=True)
        return 200, page(items)
    if m == "DELETE" and p.startswith("/records/"):
        rid = p.split("/")[2]
        rec = next(r for r in records[uid] if r["id"] == rid)
        if rec["side"] != "OWN":
            return err("ACTION_NOT_ALLOWED", "받은 기록은 삭제할 수 없어요.", 403)
        records[uid].remove(rec)
        return 204, None

    # ── 친구 ──
    if m == "GET" and p == "/friends":
        ids = [next(iter(f - {uid})) for f in friendships if uid in f]
        return 200, page([{"id": i, "nickname": users[i]["nickname"]} for i in ids])
    if m == "DELETE" and p.startswith("/friends/"):
        friendships.discard(frozenset({uid, p.split("/")[2]}))
        return 204, None
    if m == "GET" and p == "/friend-requests":
        return 200, page([r for r in requests_.values() if r["to"]["id"] == uid])
    if m == "POST" and p == "/friend-requests":
        to = next((x for x in users.values() if x["loginId"] == b.get("friendCode")), None)
        if not to:
            return err("NOT_FOUND", "그런 아이디가 없어요.", 404)
        if to["id"] == uid:
            return err("INVALID_INPUT", "나에게는 요청할 수 없어요.", 422)
        if frozenset({uid, to["id"]}) in friendships:
            return err("RELATION_EXISTS", "이미 친구예요.", 409)
        qid = "q_" + uuid.uuid4().hex[:6]
        requests_[qid] = {"id": qid, "from": {"id": uid, "nickname": u["nickname"]},
                          "to": {"id": to["id"], "nickname": to["nickname"]},
                          "status": "PENDING", "createdAt": now_iso()}
        return 201, requests_[qid]
    if m == "PUT" and p.startswith("/friend-requests/"):
        r = requests_[p.split("/")[2]]
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
        rest = {"mode": b["mode"], "startsAt": b.get("startsAt"), "endsAt": b.get("endsAt"),
                "active": b["mode"] != "OFF"}
        settings[uid]["rest"] = rest
        return 200, rest
    if m == "GET" and p == "/me/care":
        care_words = {"불안", "무기력", "외로움", "막막함", "지침"}
        today = datetime.now(timezone.utc).date()
        days = set()
        for r in records[uid]:
            if r["side"] != "OWN":
                continue
            if any(set(e["words"]) & care_words for e in r["orb"]["emotions"]):
                days.add(datetime.fromisoformat(r["recordedAt"]).date())
        d7 = sum(1 for d in days if (today - d).days < 7)
        d14 = sum(1 for d in days if (today - d).days < 14)
        level = 2 if d14 >= 10 else 1 if d7 >= 4 else 0
        return 200, {"asOfDate": str(today), "timezone": "Asia/Seoul", "daysIn7": d7, "daysIn14": d14,
                     "level": level, "resources": []}

    return err("NOT_FOUND", f"{m} {p} 없음", 404)


if __name__ == "__main__":
    print("EmOri 가짜 서버: http://0.0.0.0:8200  (Ctrl+C 로 종료)")
    ThreadingHTTPServer(("0.0.0.0", 8200), H).serve_forever()
