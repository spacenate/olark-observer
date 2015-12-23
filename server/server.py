#!/usr/bin/env python

# Huge thanks to Farville for the tip to use have_fork=False!
# http://www.farville.com/15-line-python-https-cgi-server/

import CGIHTTPServer
import ssl, os
import cgitb; cgitb.enable() # Enable CGI error reporting

def runServer(HandlerClass=CGIHTTPServer.CGIHTTPRequestHandler,
         ServerClass=CGIHTTPServer.BaseHTTPServer.HTTPServer):
    
    HandlerClass.protocol_version = "HTTP/1.0"
    HandlerClass.cgi_directories = ['/cgibin']
    
    os.chdir("html")
    
    httpd = ServerClass(('localhost', 4443), HandlerClass)
    httpd.socket = ssl.wrap_socket (httpd.socket, certfile='../lvh.me.pem', server_side=True)
    # Force the use of a subprocess, rather than
    # normal fork behavior since that doesn't work with ssl
    HandlerClass.have_fork = False
    
    sa = httpd.socket.getsockname()
    print "Serving HTTPS on", sa[0], "port", sa[1], "..."
    
    httpd.serve_forever()

if __name__ == "__main__":
    runServer()