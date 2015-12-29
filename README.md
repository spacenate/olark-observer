# Olark Observer

This project is attempting to create a monkeypatch for the Olark chat console, that will allow a user to capture events related to new/unread messages and operator status.

[Test it out!](javascript:(function()%7Bvars%3Ddocument.createElement(%22script%22)%3Bs.src%3D%22https%3A%2F%2Fraw.githubusercontent.com%2Fspacenate%2Folark-observer%2Fmaster%2FOlark_Observer.js%22%3Bdocument.body.appendChild(s)%3B%7D)())

It is planned to post these events to a server, which relays updates to an embedded system. End result - a big flashing LED when I have unread chat messages!


https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver 
