import urllib.request
import urllib.error

url = 'https://script.google.com/macros/s/AKfycbwaMcCW4ZEnSvX-n9PoIocASsVrIcf_fASdsQKQJqRcEl9L2a7hWHfYxWpV_792TPgr/exec?id=11R2z5n1rLg3X4dI72F31h_K8H808_K7tQ_Yk8N9N0E'

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        print(f"Redirecting to: {newurl}")
        return newurl

opener = urllib.request.build_opener(NoRedirectHandler())
urllib.request.install_opener(opener)

try:
    req = urllib.request.Request(url)
    res = urllib.request.urlopen(req)
except urllib.error.HTTPError as e:
    print("HTTP Error on first request:", e.code)
    newurl = e.headers.get('Location')
    if newurl:
        print("Following to:", newurl)
        try:
            req2 = urllib.request.Request(newurl)
            res2 = urllib.request.build_opener().open(req2)
            print("Second Request Code:", res2.getcode())
            print("Body:", res2.read().decode('utf-8'))
        except Exception as e2:
            print("Second Request Error:", e2)
except Exception as e:
    print("Exception:", e)
