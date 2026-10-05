import subprocess
import os
import http.server
import socketserver
import threading
import time

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if not os.path.exists(edge_path):
    edge_path = r'C:\Program Files\Microsoft\Edge\Application\msedge.exe'

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args): pass

httpd = socketserver.TCPServer(('127.0.0.1', 8994), QuietHandler)
t = threading.Thread(target=httpd.serve_forever)
t.daemon = True
t.start()

# Use headless Edge with mobile window size
try:
    subprocess.run([
        edge_path, '--headless=new', '--disable-gpu',
        '--window-size=375,812',
        '--screenshot=mobile_preview.png',
        'http://127.0.0.1:8994/index.html'
    ], timeout=15)
    print("Screenshot taken: mobile_preview.png exists =", os.path.exists('mobile_preview.png'))
finally:
    httpd.shutdown()
