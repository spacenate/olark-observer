# Olark Observer

This project is an attempt at creating a monkeypatch for the Olark chat console, which will enable a user to capture events related to new, unread, hopefully interesting messages, and other bits of trivia including operator status.

You might be able to find the patch in bookmarklet form [on this page][bookmarklet]. 

If such a thing existed, it would be sure to communicate these events to a local Python server, whose sole purpose for existence was to relay such messages on to an embedded HID USB system.

To run this Python server, one would first generate a self-signed certificate.

    chmod +x generate_cert.sh
    ./generate_cert.sh

Fill in whatever makes you happy, for the certificate details. Next change to the `src` directory, and contemplate executing the Python script.

    cd src
    chmod +x observerServer.py
    ./observerServer.py

The hardware design will probably borrow heavily from the V-USB examples, and it will likely use the V-USB library as well. ATtiny85 seems like a good choice for the microcontroller, with 3 pins and a timer left open after V-USB (I believe/hope).

More to come on that when I find a USB cable to hack up.

[bookmarklet]: http://htmlpreview.github.io/?https://raw.githubusercontent.com/spacenate/olark-observer/master/bookmarklet.html
