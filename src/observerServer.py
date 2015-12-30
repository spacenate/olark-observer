#!/usr/bin/env python
from flask import Flask, request
import ssl

# @todo enable CORS
app = Flask(__name__)

@app.route("/")
def no():
    abort(400)

@app.route("/status/<status>", methods=['PUT'])
def updateStatus(status):
    withChats = request.args.get('withChats', '')
    
    return '',204

@app.route("/chats/<tabName>/<int:difference>", methods=['PUT'])
def updateChats(tabName, difference):
    # "new" if new tab
    # otherwise, updating existing chat tabs
    # 1 added a chat
    # 0 removed a chat
    return '',204

if __name__ == "__main__":
    context = ssl.SSLContext(ssl.PROTOCOL_TLSv1)
    context.load_cert_chain('../lvh.me.crt','../lvh.me.key')
    app.run(host='127.0.0.1', port='4443',
            debug=False, ssl_context=context)
