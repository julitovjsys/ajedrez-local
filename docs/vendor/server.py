from http.server import SimpleHTTPRequestHandler, HTTPServer
import json

class ChessServer(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/save':
            content_length = int(self.headers['Content-Length'])
            data = self.rfile.read(content_length)
            with open('gamestate.json', 'w') as f:
                f.write(data.decode())
            self.send_response(200)
            self.end_headers()

# Ejecutar en el puerto 8090
httpd = HTTPServer(('0.0.0.0', 8090), ChessServer)
print("Servidor activo en http://tu-ip-local:8090")
httpd.serve_forever()
