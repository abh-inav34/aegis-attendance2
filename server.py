import http.server
import json
import os
import sys

PORT = 8080
DIRECTORY = os.path.abspath(os.path.dirname(__file__))
DB_FILE = os.path.join(DIRECTORY, "students_db.json")
CONFIG_FILE = os.path.join(DIRECTORY, "config.json")

class AttendanceAPIHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Allow cross-origin requests for API calls
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # API Route: Retrieve students database
        if self.path == '/api/students':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            data = self.read_db()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return
            
        # API Route: Retrieve active settings configuration
        elif self.path == '/api/config':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            data = self.read_config()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        # Serve static content (HTML, CSS, JS)
        else:
            # SimpleHTTPRequestHandler serves files relative to Directory Cwd
            super().do_GET()

    def do_POST(self):
        # API Route: Update students database
        if self.path == '/api/students':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                self.write_db(data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "database updated"}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return
            
        # API Route: Update active configurations
        elif self.path == '/api/config':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                self.write_config(data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "config updated"}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    # DB Helper Methods
    def read_db(self):
        if not os.path.exists(DB_FILE):
            return []
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def write_db(self, data):
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    # Config Helper Methods
    def read_config(self):
        if not os.path.exists(CONFIG_FILE):
            return {"threshold": 75, "borderline": 70, "critical": 65}
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {"threshold": 75, "borderline": 70, "critical": 65}

    def write_config(self, data):
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

def run_server():
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, AttendanceAPIHandler)
    print(f"Attendance Backend Server running successfully on port {PORT}...")
    print(f"Static Files served from directory: {DIRECTORY}")
    print(f"Server database located at: {DB_FILE}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()
        sys.exit(0)

if __name__ == '__main__':
    run_server()
