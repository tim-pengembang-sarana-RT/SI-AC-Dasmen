import urllib.request
import urllib.error

url = 'https://script.google.com/macros/s/AKfycbwaMcCW4ZEnSvX-n9PoIocASsVrIcf_fASdsQKQJqRcEl9L2a7hWHfYxWpV_792TPgr/exec?id=11R2z5n1rLg3X4dI72F31h_K8H808_K7tQ_Yk8N9N0E'

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        print(f"Redirecting to: {newurl}")
        return None # Do not follow

opener = urllib.request.build_opener(NoRedirectHandler())
urllib.request.install_opener(opener)

try:
    req = urllib.request.Request(url)
    res = urllib.request.urlopen(req)
    print("Code:", res.getcode())
    print("Body:", res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Headers:", e.headers)
    print("Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Exception:", e)
