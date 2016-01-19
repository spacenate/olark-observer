var OlarkObserver = (function(OO, document, window) {
    'use strict';

    var debug = false,
        statusObserver,
        chatTabObserver,
        chatListObserver,
        linkObserver,
        observerObject = {};

    if (OO instanceof Object) {
        // OlarkObserver is already injected
        // Debug behavior - disconnect old listeners,
        // and proceed to load new OlarkObserver object
        debug = OO.disconnect();
    }

    /* Operator status changes */
    var statusObserver = new MutationObserver(function(mutations) {
        // Multiple mutations take place for each status change.
        // Only the final mutation is important in determining the new status.
        var lastMutation = mutations[mutations.length - 1],
            newNodes = lastMutation.addedNodes,
            newStatus = false;

        // Grab the #status-indicator element, see what class has been assigned to it.
        for (var i = 0; i < newNodes.length; i++) {
            if (newNodes[i].id === 'status-indicator') {
                newStatus = newNodes[i].className;
            }
        }

        if (newStatus) {
            setStatus(newStatus);
        }
    });

    /* New unread chats */
    var chatTabObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            // mutation.target is a LIVE element, and mutation callbacks are ASYNC
            // so, ensure the tab has not been closed (mutation.target is not null)
            if (mutation.type === 'attributes' && mutation.target !== null) {
                var displayNameElement = mutation.target.querySelector('.display-name');

                if (displayNameElement === null) {
                    return; // 'continue' with the next forEach, this is a closed chat tab
                }

                var tabName = hashString(displayNameElement.textContent.trim());

                if (mutation.target.classList.contains('unread') && mutation.oldValue.indexOf('unread') === -1) {
                    // mutation.target just added the unread class
                    setStatus('unread');
                } else if (mutation.target.classList.contains('unread') === false && mutation.oldValue.indexOf('unread') !== -1) {
                    // mutation.target just removed the unread class
                    setStatus(getCurrentStatus());
                }
            }
        });
    });
    var chatListObserver = new MutationObserver(function(mutations) {
        // iterate over mutations to look for new chats (new child added to #active-chats)
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.target.id === 'active-chats' && mutation.addedNodes.length > 0) {
                var newTab = mutation.addedNodes[0];
                chatTabObserver.observe(newTab, {attributes: true, attributeOldValue: true});
            }
        });
    });

    /* New unread chats, while window is inactive */
    var linkObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // It seems only one element is added for each mutation
                var newElement = mutation.addedNodes[0];
                // 'continue' with next forEach if the new element is not a link[rel=icon]
                if (newElement.rel !== 'icon') {
                    return;
                }
				var imgHash = hashString(newElement.href);
                var newStatus = identifyImage(imgHash);
                if (newStatus !== false) {
                    setStatus(newStatus);
                }
            }
        });
    });

    function getCurrentStatus() {
        var indicator = document.getElementById('status-indicator');
        return indicator.className;
    }

	function getCurrentStatusMenuIcon() {
		var links = document.head.getElementsByTagName('link');
		return hashString(links[links.length-1].href);
	}

    /* @todo: slim down this list to one image per status */
    function identifyImage(imgHash) {
        switch (imgHash) {
            case '2112346368':
            case '-738135977':
                return 'available';
            case '1748419166':
            case '-2139276908':
            case '-247468270':
                return 'available?withChats=1';
            case '1488560486':
                return 'available?withChats=2';
            case '713115020':
                return 'available?withChats=3';
            case '859112101':
                return 'away';
            case '744595388':
                return 'away?withChats=1';
            /* need base64 image for away?withChats=2 */
            case '872779176':
                return 'away?withChats=3';
            default:
                return false;
        }
    }

    function disconnect() {
        var observers = [statusObserver,chatTabObserver,chatListObserver,linkObserver];
        for (var i=0; i<observers.length; i++) {
            debugLog('Disconnecting', observers[i]);
            observers[i].disconnect();
        }
        return debug;
    }

    function debugLog() {
        if (debug) {
            console.log.apply(console, arguments);
        }
    }

    function setDebugMode(bool) {
        debug = (bool) ? true : false;
        var prefix = (debug) ? 'en' : 'dis';
        return 'Debug mode ' + prefix + 'abled';
        if (debug) {
            observerObject.sendXHR = sendXHR;
            observerObject.setDebugMode = setDebugMode;
            observerObject.getIcon = getCurrentStatusMenuIcon;
        }
    }

    function hashString(string) {
        var hash = 0, i, chr, len;
        if (string.length === 0) return hash;
        for (i = 0, len = string.length; i < len; i++) {
            chr = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    }

    var feedbackEl,
        statusIndicator,
        statusText,
        offScreen,
        redColor = '#d65129',
        yellowColor = '#f9cb32',
        greenColor = '#88de68';

    function createFeedbackElement() {
        if ((feedbackEl = document.getElementById('olark-observer')) instanceof Object) {
            statusIndicator = document.getElementById('olark-observer-status-indicator');
            statusText = document.getElementById('olark-observer-status-text');
            offScreen = document.getElementById('olark-observer-offscreen');
            return;
        }
        /* olark-observer-container */
        var container = document.createElement('div');
        container.id = 'olark-observer-container';
        container.style.position = 'absolute';
        container.style.right = '20px';
        container.style.bottom = '0px';
        container.style.paddingBottom = '18px';
        /* olark-observer */
        feedbackEl = document.createElement('div');
        feedbackEl.id = 'olark-observer';
        feedbackEl.style.display = 'inline-block';
        feedbackEl.style.width = '156px';
        feedbackEl.style.padding = '7px 14px';
        feedbackEl.style.borderRadius = '19px';
        feedbackEl.style.backgroundColor = 'rgba(255,255,255,0.1)';
        feedbackEl.style.color = '#fff';
        feedbackEl.style.fontSize = '14px';
        feedbackEl.style.transition = 'transform 1s, width .6s';
        feedbackEl.style.transform = 'translateY(4em)';
        /* status-indicator */
        statusIndicator = document.createElement('span');
        statusIndicator.id = 'olark-observer-status-indicator';
        statusIndicator.style.float = 'right';
        statusIndicator.style.position = 'relative';
        statusIndicator.style.top = '3px';
        statusIndicator.style.left = '4px';
        statusIndicator.style.height = '9px';
        statusIndicator.style.width = '9px';
        statusIndicator.style.marginLeft = '5px';
        statusIndicator.style.borderRadius = '10px';
        statusIndicator.style.backgroundColor = redColor;
        /* status-text */
        statusText = document.createElement('span');
        statusText.id = 'olark-observer-status-text';
        statusText.style.float = 'right';
        statusText.style.height = '16px';
        statusText.style.transition = 'opacity .4s';

        feedbackEl.appendChild(statusIndicator);
        feedbackEl.appendChild(statusText);
        container.appendChild(feedbackEl);
        document.body.appendChild(container);

        /* off screen 'test sizing' area */
        var offScreenContainer = document.createElement('div');
        offScreenContainer.style.position = 'absolute';
        offScreenContainer.style.top = '-100em';
        offScreen = document.createElement('p');
        offScreen.id = 'olark-observer-offscreen';
        offScreen.style.fontSize = '14px';

        offScreenContainer.appendChild(offScreen);
        document.body.appendChild(offScreenContainer);

        statusText.textContent = 'Connecting to server...';
        window.setTimeout(function(){
            feedbackEl.style.transform = 'translateY(0em)';
        }, 0);
    }

    function showFeedback(message) {
        debugLog(message);
        statusText.style.opacity = '0';
        window.setTimeout(function(){
            statusText.textContent = '';
            offScreen.textContent = message;
            feedbackEl.style.width = (offScreen.scrollWidth + 15) + 'px';
            window.setTimeout(function(){
                statusText.textContent = message;
                statusText.style.opacity = '1';
            }, 600);
        }, 400);
    }

    function sendXHR(method, newStatus, successCb, errorCb) {
        debugLog(method, newStatus);
        var oReq = new XMLHttpRequest();
        if (successCb instanceof Function) oReq.addEventListener('load', successCb);
        if (errorCb instanceof Function) oReq.addEventListener('error', errorCb);
        oReq.open(method, 'https://localhost.spacenate.com:4443/' + newStatus, true);
        oReq.send();
    }

    function setStatus(newStatus) {
        var allowed = ['available', 'away', 'unread', 'at-chat-limit', 'at-busy-limit', 'disconnected', 'reconnecting', 'logout'];
        if (allowed.indexOf(newStatus) === -1) {
            return debugLog('Invalid status passed to setStatus', newStatus);
        }
        sendXHR('PUT', 'status/'+newStatus,
            function(e) {
                var response = JSON.parse(e.currentTarget.responseText);
                if (response.result !== 'ACK') {
                    debugLog('Error encountered while setting status', response);
                    connectToDevice();
                }
            },
            function(e) {
                debugLog('Error encountered while setting status', e.currentTarget);
                connectToServer();
            });
    }

    var retryWaitTime = 1200,
        retryIncrement = 1.1;

    function connectToServer() {
        showFeedback('Connecting to server...');
        sendXHR('GET', '',
            function(){
                statusIndicator.style.backgroundColor = yellowColor;
                connectToDevice();
                retryWaitTime = 800;
            },
            function(){
                debugLog('Error connecting to server');
                window.setTimeout(connectToServer, retryWaitTime);
                retryWaitTime *= retryIncrement;
            });
    }

    function connectToDevice() {
        showFeedback('Connecting to device...');
        sendXHR('PUT', 'status/' + getCurrentStatus(),
            function(e){
                var response = JSON.parse(e.currentTarget.responseText);
                if (response.result === 'ACK') {
                    statusIndicator.style.backgroundColor = greenColor;
                    showFeedback('Connected');
					/* @todo: set current status */
                    retryWaitTime = 1200;
                } else {
                    debugLog(response);
                    window.setTimeout(connectToDevice, retryWaitTime);
                    retryWaitTime *= retryIncrement;
                }
            },
            function(){
                debugLog('Error connecting to server');
                window.setTimeout(connectToServer, retryWaitTime);
            });
    }

    /* Start observers observing */
    var statusPanelEl = document.querySelector('#op-status-panel'),
        activeChatsEl = document.querySelector('#active-chats');

    if (statusPanelEl instanceof Object && activeChatsEl instanceof Object) {
        statusObserver.observe(statusPanelEl, {childList: true});
        chatListObserver.observe(activeChatsEl, { childList: true});
        linkObserver.observe(document.querySelector('head'), {childList: true});
        debugLog('Observing!');
    } else {
        debugLog('Not observing.');
    }

    createFeedbackElement();
    connectToServer();
    observerObject.disconnect = disconnect;
    return observerObject;
}(OlarkObserver, document, window));
