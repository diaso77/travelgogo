import subprocess
import os
import http.server
import socketserver
import threading
import time

with open('index.html', 'r', encoding='utf-8') as f:
    orig = f.read()

test_snippet = """<div id="TEST_RESULT_CONTAINER">WAITING</div>
<script>
window.addEventListener('load', function() {
  setTimeout(function() {
    var el = document.getElementById('TEST_RESULT_CONTAINER');
    try {
      if (!window.tripManager) {
        el.textContent = 'ERR: No tripManager';
        return;
      }
      var tm = window.tripManager;
      
      // 1. Test Select All in Parsed Preview
      tm.parsedImportList = [
        {title: 'A', note: '', address: ''},
        {title: 'B', note: '', address: ''}
      ];
      tm.renderParsedPreview();
      var selectAll = document.getElementById('checkSelectAllParsed');
      var checksBefore = document.querySelectorAll('.parsed-item-check:checked').length;
      
      // Toggle select all off
      if (selectAll) {
        selectAll.checked = false;
        selectAll.onchange({target: {checked: false}});
      }
      var checksAfterOff = document.querySelectorAll('.parsed-item-check:checked').length;
      
      // Toggle select all on
      if (selectAll) {
        selectAll.checked = true;
        selectAll.onchange({target: {checked: true}});
      }
      var checksAfterOn = document.querySelectorAll('.parsed-item-check:checked').length;
      
      // 2. Test Time Indicator with today
      var now = new Date();
      var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
      tm.data.days[0].date = todayStr;
      tm.updateTimeIndicator();
      var indicator = document.getElementById('currentTimeIndicator');
      var hasIndicator = !!indicator;
      
      // 3. Test Schedule Gap & Free Time
      tm.data.days[0].cards = [
        {id: 'c1', title: '景點1', startTime: '09:00', endTime: '10:00'},
        {id: 'c2', title: '景點2', startTime: '12:00', endTime: '13:00'}
      ];
      tm.renderSchedule();
      var gap = document.querySelector('.schedule-gap-indicator');
      var hasGap = !!gap;
      
      el.textContent = 'ALL_PASSED: selectAllOff=' + checksAfterOff + ', selectAllOn=' + checksAfterOn + 
                       ', hasIndicator=' + hasIndicator + ', hasGap=' + hasGap;
    } catch(e) {
      el.textContent = 'EXCEPTION: ' + e.message + ' | ' + (e.stack || '');
    }
  }, 1000);
});
</script>"""

injected = orig.replace('<body>', '<body>\n' + test_snippet)
with open('index_test2.html', 'w', encoding='utf-8') as f:
    f.write(injected)

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if not os.path.exists(edge_path):
    edge_path = r'C:\Program Files\Microsoft\Edge\Application\msedge.exe'

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args): pass

httpd = socketserver.TCPServer(('127.0.0.1', 8993), QuietHandler)
t = threading.Thread(target=httpd.serve_forever)
t.daemon = True
t.start()

try:
    res = subprocess.check_output([
        edge_path, '--headless=new', '--disable-gpu',
        '--virtual-time-budget=5000', '--dump-dom',
        'http://127.0.0.1:8993/index_test2.html'
    ], timeout=15).decode('utf-8', errors='ignore')
    
    for l in res.split('\n'):
        if 'ALL_PASSED' in l or 'EXCEPTION' in l or 'ERR:' in l:
            print("TEST_RESULT:", l.strip())
finally:
    httpd.shutdown()
    if os.path.exists('index_test2.html'): os.remove('index_test2.html')
