"""Server tinh cho VocabFlash (dev). Gui header no-store de trinh duyet luon lay file moi nhat.
Chay:  python serve.py  [port]   (mac dinh 8080)"""
import http.server, os, sys, webbrowser, threading

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.webmanifest': 'application/manifest+json', '.js': 'text/javascript'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, fmt, *args):
        pass  # im lang cho gon

if __name__ == '__main__':
    url = f'http://localhost:{PORT}'
    print(f'VocabFlash dang chay tai {url}  (Ctrl+C de dung)')
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
