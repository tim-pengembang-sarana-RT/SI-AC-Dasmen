import urllib.request
import json

url = 'https://script.google.com/macros/s/AKfycbyAkEX2mgONV1E9aPX1ti5DUoIEWPnCMjUG0RS2VOeoybqm20B8WiLmASZHHJY2ga2W/exec?id=11R2z5n1rLg3X4dI72F31h_K8H808_K7tQ_Yk8N9N0E'

try:
    req = urllib.request.Request(url)
    res = urllib.request.urlopen(req)
    data = res.read().decode('utf-8')
    print("Status:", res.getcode())
    print("Headers:")
    print(res.headers)
    print("Response Data:")
    try:
        parsed = json.loads(data)
        print(json.dumps(parsed, indent=2)[:500] + "...")
    except:
        print(data[:500])
except Exception as e:
    print("Error:", e)
