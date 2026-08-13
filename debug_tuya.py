import urllib.request
import json
import time
import hmac
import hashlib

CLIENT_ID = "ytkeaq3npjgjusjwh5e5"
CLIENT_SECRET = "fbe2f5a22abb4de1bf7367d8f4b87a71"
DEVICE_ID = "bf0fc3897a43d32f4c89u6"
REGION = "https://openapi.tuyaeu.com"

t = str(int(time.time() * 1000))
content_hash = hashlib.sha256("".encode('utf-8')).hexdigest()
string_to_sign = f"GET\n{content_hash}\n\n/v1.0/token?grant_type=1"
sign_str = CLIENT_ID + t + string_to_sign
sign = hmac.new(CLIENT_SECRET.encode('utf-8'), sign_str.encode('utf-8'), hashlib.sha256).hexdigest().upper()

req = urllib.request.Request(REGION + "/v1.0/token?grant_type=1", headers={
    "client_id": CLIENT_ID, "sign": sign, "sign_method": "HMAC-SHA256", "t": t
})
with urllib.request.urlopen(req) as response:
    token = json.loads(response.read().decode())["result"]["access_token"]

t2 = str(int(time.time() * 1000))
path2 = f"/v1.0/iot-03/devices/status?device_ids={DEVICE_ID}"
string_to_sign2 = f"GET\n{content_hash}\n\n{path2}"
sign_str2 = CLIENT_ID + token + t2 + string_to_sign2
sign2 = hmac.new(CLIENT_SECRET.encode('utf-8'), sign_str2.encode('utf-8'), hashlib.sha256).hexdigest().upper()

try:
    req2 = urllib.request.Request(REGION + path2, headers={
        "client_id": CLIENT_ID, "access_token": token, "sign": sign2, "sign_method": "HMAC-SHA256", "t": t2
    })
    with urllib.request.urlopen(req2) as resp2:
        print("Success:", resp2.read().decode())
except urllib.error.URLError as e:
    print("Error:", e.read().decode())
