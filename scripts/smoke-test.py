#!/usr/bin/env python3
"""
실제 백엔드가 앱이 기대하는 모양으로 응답하는지 한 번에 확인 (설치할 것 없음)

  python3 scripts/smoke-test.py https://api.gaebalmani.shop/api/v1

테스트 계정을 새로 하나 만들어서 가입 → 내 정보 → 목록들 → 구슬 만들기 → 나에게 보내기 → 기록 순서로 불러봐요.
✅ = 앱이 쓰는 필드가 다 있음, ❌ = 실패하거나 필드가 없음 (이걸 지섭님께 전달)
"""
import json
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid


# 맥의 python.org 파이썬은 인증서 묶음이 없어서 HTTPS 가 CERTIFICATE_VERIFY_FAILED 로 실패함
# → certifi 가 있으면 그걸, 없으면 맥 시스템 루트 인증서를 꺼내서 씀 (서버 문제 아님)
def ssl_context():
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        pass
    if sys.platform == "darwin":
        try:
            pem = subprocess.run(
                ["security", "find-certificate", "-a", "-p",
                 "/System/Library/Keychains/SystemRootCertificates.keychain"],
                capture_output=True, check=True).stdout
            f = tempfile.NamedTemporaryFile(delete=False, suffix=".pem")
            f.write(pem)
            f.close()
            return ssl.create_default_context(cafile=f.name)
        except (OSError, subprocess.CalledProcessError):
            pass
    return ssl.create_default_context()


CTX = ssl_context()
# 파이썬 3.13+ 는 인증서 검사가 더 엄격(X509_STRICT)해서 새 Let's Encrypt 체인을 거부할 수 있음
CTX.verify_flags &= ~getattr(ssl, "VERIFY_X509_STRICT", 0)
USE_CURL = False  # 파이썬 SSL 이 계속 실패하면 맥 기본 curl 로 대신 요청


def call_curl(method, url, headers, data):
    out = tempfile.NamedTemporaryFile(delete=False)
    out.close()
    cmd = ["curl", "-sS", "-X", method, "-o", out.name, "-w", "%{http_code} %{content_type}", "--max-time", "15"]
    for k, v in headers.items():
        cmd += ["-H", f"{k}: {v}"]
    if data is not None:
        cmd += ["--data-binary", data.decode()]
    r = subprocess.run(cmd + [url], capture_output=True, text=True)
    raw = open(out.name, "rb").read()
    status, _, ctype = r.stdout.partition(" ")
    status = int(status or 0)
    if status == 0:
        return 0, r.stderr.strip()
    try:
        return status, (json.loads(raw) if raw and "json" in ctype else raw)
    except ValueError:
        return status, raw[:200]

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://api.gaebalmani.shop/api/v1").rstrip("/")
if not BASE.endswith("/api/v1"):
    BASE += "/api/v1"
TOKEN = None
FAILS = 0


def call(method, path, body=None, idem=False):
    global USE_CURL
    headers = {"Content-Type": "application/json"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    if idem:
        headers["Idempotency-Key"] = str(uuid.uuid4())
    data = json.dumps(body).encode() if body is not None else None
    if USE_CURL:
        return call_curl(method, BASE + path, headers, data)
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15, context=CTX) as r:
            raw = r.read()
            ctype = r.headers.get("Content-Type", "")
            return r.status, (json.loads(raw) if raw and "json" in ctype else raw)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, raw[:200]
    except Exception as e:  # 연결 자체 실패
        if "CERTIFICATE_VERIFY_FAILED" in str(e):
            print("  (파이썬 인증서 검사 실패 → curl 로 다시 시도)")
            USE_CURL = True
            return call_curl(method, BASE + path, headers, data)
        return 0, str(e)


def check(name, status, body, ok_status, keys=()):
    global FAILS
    missing = [k for k in keys if not isinstance(body, dict) or k not in body]
    good = status in ok_status and not missing
    FAILS += 0 if good else 1
    detail = ""
    if not good:
        detail = f"  → HTTP {status}" + (f", 없는 필드 {missing}" if missing else "")
        detail += f"\n     응답: {str(body)[:300]}"
    print(f"{'✅' if good else '❌'} {name}{detail}")
    return good


print(f"서버: {BASE}\n")
login_id = f"smoke_{int(time.time()) % 100000}"

s, b = call("GET", f"/auth/login-id-availability?loginId={login_id}")
check("아이디 중복 확인", s, b, {200}, ["available"])

s, b = call("POST", "/auth/signup", {"loginId": login_id, "password": "password1"})
if not check("가입 (아이디·비밀번호)", s, b, {200, 201}, ["session"]):
    sys.exit("가입이 안 돼서 여기서 멈춰요.")
TOKEN = b["session"]["accessToken"]
check("  └ 세션 필드", 200, b["session"], {200}, ["accessToken", "refreshToken", "expiresIn"])

s, b = call("PUT", "/me/birth-date", {"birthDate": "2001-05-19"})
print(f"{'✅' if s == 200 else '⏳'} 생년월일 저장 PUT /me/birth-date → HTTP {s}"
      + ("" if s == 200 else "  (아직 없음. 앱은 무시하고 넘어감)"))

s, b = call("GET", "/me")
check("내 정보", s, b, {200}, ["id", "loginId", "nickname", "friendCode", "adultStatus"])

s, b = call("GET", "/catalog/reactions")
ok = check("반응 목록", s, b, {200}, ["items"])
if ok:
    print(f"     {[r.get('code') for r in b['items']]}")

s, b = call("GET", "/catalog/sounds")
sounds = b.get("items", []) if isinstance(b, dict) else []
check("샘플 음악 목록", s, b, {200}, ["items"])
print(f"     {len(sounds)}곡" + ("  ⚠️ 비어 있음 (WAV 등록 전)" if not sounds else f": {[x.get('title') for x in sounds]}"))
if sounds:
    check("  └ 음악 필드", 200, sounds[0], {200}, ["id", "title", "color", "durationMs", "playbackUrl"])
    s2, audio = call("GET", sounds[0]["playbackUrl"].replace("/api/v1", "", 1))
    print(f"{'✅' if s2 == 200 else '❌'} 미리듣기 음원 (토큰 붙여서) → HTTP {s2}, {len(audio) if isinstance(audio, bytes) else 0} bytes")

for name, path in (("친구 목록", "/friends"), ("받은 감정", "/inbox"), ("기록", "/records"),
                   ("친구 요청", "/friend-requests?direction=INCOMING")):
    s, b = call("GET", path)
    check(name, s, b, {200}, ["items", "nextCursor"])

s, b = call("GET", "/me/settings")
check("설정", s, b, {200}, ["anonymousEnabled", "pushEnabled", "rest"])
s, b = call("GET", "/me/care")
check("케어", s, b, {200}, ["level", "notice"])

body = {"colors": ["BLUE", "GREEN"]}
if sounds:
    body["soundId"] = sounds[0]["id"]
s, b = call("POST", "/orbs", body, idem=True)
if check(f"구슬 만들기 {body}", s, b, {200, 201}, ["orb"]):
    orb = b["orb"]
    check("  └ 구슬 필드", 200, orb, {200}, ["id", "kind", "emotions", "playlist"])
    if orb.get("emotions"):
        check("  └ 감정 필드 (색·영역·단어 4개)", 200, orb["emotions"][0], {200}, ["color", "area", "words"])
    s, b = call("POST", f"/orbs/{orb['id']}/dispatches", {"route": "SELF"}, idem=True)
    if check("나에게 보내기", s, b, {200, 201}, ["dispatch"]):
        check("  └ 보내기 필드", 200, b["dispatch"], {200}, ["id", "route", "recipientCount", "targets"])
    s, b = call("GET", "/records?side=OWN")
    items = b.get("items", []) if isinstance(b, dict) else []
    if check("방금 보낸 기록이 보이는지", s, b, {200}, ["items"]) and items:
        check("  └ 기록 필드", 200, items[0], {200}, ["id", "side", "orb", "route", "recordedAt", "counterpart"])

print(f"\n{'모두 통과! 앱에서 바로 붙여도 돼요.' if FAILS == 0 else f'실패 {FAILS}개 → 위 ❌ 줄을 지섭님께 전달해주세요.'}")
