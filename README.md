# Olark Observer

This project is an attempt at creating a monkeypatch for the Olark chat console, which will enable a user to capture events related to new/unread messages, and other bits of trivia including operator status.

You might be able to find the patch in bookmarklet form [on this page][bookmarklet].

If such a thing existed, it would be sure to communicate these events to a local Python server, whose sole purpose for existence was to relay such messages on to an embedded system via the USB HID protocol.

## Running the server

To run this Python server, one would first generate a self-signed certificate.

    ./generate_cert.sh

Fill in whatever makes you happy for the the certificate details.

If using virtualenv, go ahead and set up a virtual environment and activate it. This step is optional but recommended.

    virtualenv observer_server
    source observer_server/bin/activate

Next change to the `observer_server` directory, and install the server dependencies by running the setup file.

    cd observer_server
    python setup.py install

Then run the server!

    python run.py

Because the server will be using the self-signed certificate that was created earlier, you'll need to visit [https://localhost:4443/](https://localhost:4443/) and accept your certificate. You may need to jump through some hoops to do this, but it should only need to be done once (unless you generate a new certificate later).

Now you are ready to load the bookmarklet while using the Olark chat console, and the party is on!

## USB hardware

The hardware design for the embedded system borrows heavily from the V-USB examples, and it will likely use the V-USB library as well. ATtiny85 seems like a good choice for the microcontroller, with 3 pins and a timer left open after V-USB (I believe/hope).

More to come on that when I find a USB cable to hack up.

[bookmarklet]: http://htmlpreview.github.io/?https://raw.githubusercontent.com/spacenate/olark-observer/master/bookmarklet.html
