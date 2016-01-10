from flask import Flask, request, jsonify
from flask.ext.cors import CORS
import usb.core

# bmRequestType USB standard bit masks - Type
USB_TYPE_STANDARD = (0x00 << 5)
USB_TYPE_CLASS = (0x01 << 5)
USB_TYPE_VENDOR = (0x02 << 5)
USB_TYPE_RESERVED = (0x03 << 5)
# bmRequestType USB standard bit masks - Recipient
USB_RECIP_DEVICE = 0x00
USB_RECIP_INTERFACE = 0x01
USB_RECIP_ENDPOINT = 0x02
USB_RECIP_OTHER = 0x03
# bmRequestType USB standard bit masks - Endpoint
USB_ENDPOINT_IN = 0x80
USB_ENDPOINT_OUT = 0x00
# Custom bRequest byte values
CUSTOM_RQ_STATUS_OFF = 0x00
CUSTOM_RQ_STATUS_AVAIL = 0x01
CUSTOM_RQ_STATUS_UNAVAIL = 0x02
CUSTOM_RQ_STATUS_MAXCHATS = 0x03
CUSTOM_RQ_STATUS_UNREAD = 0x04
CUSTOM_RQ_CONFIRM = 0x01
# OlarkObserver device details
DEVICE_VENDOR_ID = 0x05DF
DEVICE_PRODUCT_ID = 0x16C0
MANUFACTURER_STR = 'Spacenate.com'
PRODUCT_STR = 'OlarkObserver'
TRANSFER_LENGTH = 2

class USBDevice:
    def __init__(self, vendor=DEVICE_VENDOR_ID, product=DEVICE_PRODUCT_ID):
        self.device = usb.core.find(idVendor=vendor, idProduct=product)
        if self.device is None:
            raise IOError('USB device not found')
        if (self.device.product != PRODUCT_STR or
              self.device.manufacturer != MANUFACTURER_STR):
            raise IOError('Manufacturer or product string mismatch')
        self.device.set_configuration()

    def set_status(self, status, wValue = 0x0000, wIndex = 0x0000):
        response = self.device.ctrl_transfer(bmRequestType=(USB_TYPE_VENDOR | USB_RECIP_DEVICE | USB_ENDPOINT_IN),
                                             bRequest=status, wValue=wValue, wIndex=wIndex, data_or_wLength=TRANSFER_LENGTH)
        if len(response) != TRANSFER_LENGTH:
            raise IOError('USB communication error')
        return response

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def index():
    return jsonify(result='meow')

@app.route('/device', methods=['GET'])
def checkDeviceStatus():
    try:
        device = USBDevice()
        response = device.set_status(CUSTOM_RQ_STATUS_OFF)
    except IOError, ex:
        return jsonify(result='NAK', message=ex.message)
    if response[0] != CUSTOM_RQ_CONFIRM:
        return jsonify(result='NAK', message='invalid device response: '+str(response))
    return jsonify(result='ACK')

@app.route('/status/<status>', methods=['PUT', 'GET'])
def updateStatus(status):
    withChats = request.args.get('withChats', '')
    # todo - figure out possible statuses
    # and messages to change to each status
    newStatus = CUSTOM_RQ_STATUS_AVAIL
    try:
        device = USBDevice()
        response = device.set_status(newStatus)
    except IOError, ex:
        return jsonify(result='NAK', message=ex.message)
    if response[0] != CUSTOM_RQ_CONFIRM:
        return jsonify(result='NAK', message='invalid device response: '+str(response))
    return jsonify(result='ACK')

@app.route('/chats/<tabName>/<int:difference>', methods=['PUT','GET'])
def updateChats(tabName, difference):
    # if tabName == 'new': # New chat session
    # else: # Updating an existing chat session
    # 1 added a chat
    # 0 removed a chat
    newStatus = CUSTOM_RQ_STATUS_UNREAD
    try:
        device = USBDevice()
        response = device.set_status(newStatus)
    except IOError, ex:
        return jsonify(result='NAK', message=ex.message)
    if response[0] != CUSTOM_RQ_CONFIRM:
        return jsonify(result='NAK', message='invalid device response: '+str(response))
    return jsonify(result='ACK')
