import urllib.request
import re

url = 'https://docs.google.com/spreadsheets/d/11R2z5n1rLg3X4dI72F31h_K8H808_K7tQ_Yk8N9N0E/edit'

try:
    req = urllib.request.Request(url)
    res = urllib.request.urlopen(req)
    html = res.read().decode('utf-8')
    title_match = re.search(r'<title>(.*?)</title>', html)
    if title_match:
        print("Title:", title_match.group(1))
    else:
        print("No title found.")
except Exception as e:
    print("Error:", e)
