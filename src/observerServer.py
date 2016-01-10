#!/usr/bin/env python
from flask import Flask, request, jsonify
from flask.ext.cors import CORS
import ssl
import hid

VENDOR_ID = 0x05DF
PRODUCT_ID = 0x16C0
MANUFACTURER_STR = 'Spacenate.com'
PRODUCT_STR = 'OlarkObserver'
SET = 0x00
CONFIRM = 0x01
STATUS_OFF = 0xFF
STATUS_AVAIL = 0x00
STATUS_UNAVAIL = 0x01
STATUS_MAXCHATS = 0x02
STATUS_UNREAD = 0x03

def messageDevice(message):
    h = hid.device()
    h.open(VENDOR_ID, PRODUCT_ID)
    manufacturer = h.get_manufacturer_string()
    product = h.get_product_string()
    message = [0x00] + message # endpoint id 0
    sent = h.send_feature_report(message)
    deviceResponse = h.read(2, 100)
    h.close()
    if manufacturer != MANUFACTURER_STR or product != PRODUCT_STR:
        raise IOError('manufacturer or product string mismatch')
    if sent != len(message):
        raise IOError('usb communication error')
    return deviceResponse

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def index():
    return jsonify(result='meow')

@app.route('/device', methods=['GET'])
def checkDeviceStatus():
    try:
        deviceResponse = messageDevice([SET, STATUS_OFF])
    except IOError, ex:
        return jsonify(result='NAK', message=ex.message)
    if deviceResponse != [CONFIRM, STATUS_OFF]:
        return jsonify(result='NAK', message='invalid device response: '+','.join(deviceResponse))
    return jsonify(result='ACK')

@app.route('/status/<status>', methods=['PUT', 'GET'])
def updateStatus(status):
    withChats = request.args.get('withChats', '')
    # todo - figure out possible statuses
    # and messages to change to each status
    newStatus = STATUS_AVAIL
    try:
        deviceResponse = messageDevice([SET, newStatus])
    except IOError, ex:
        return jsonify(result='NAK', message=ex.message)
    if deviceResponse != [CONFIRM, newStatus]:
        return jsonify(result='NAK', message='invalid device response: '+deviceResponse)
    return jsonify(result='ACK')

@app.route('/chats/<tabName>/<int:difference>', methods=['PUT'])
def updateChats(tabName, difference):
    # 'new' if new tab
    # otherwise, updating existing chat tabs
    # 1 added a chat
    # 0 removed a chat
    newStatus = STATUS_UNREAD
    try:
        deviceResponse = messageDevice([SET, newStatus])
    except IOError, ex:
        return jsonify(result='NAK', message=ex.message)
    if deviceResponse != [CONFIRM, newStatus]:
        return jsonify(result='NAK', message='invalid device response: '+deviceResponse)
    return jsonify(result='ACK')

if __name__ == '__main__':
    context = ssl.SSLContext(ssl.PROTOCOL_TLSv1)
    context.load_cert_chain('../lvh.me.crt','../lvh.me.key')
    app.run(host='127.0.0.1', port='4443',
            debug=False, ssl_context=context)
