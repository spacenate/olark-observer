/*

# TASKS

- keep track of observers, and stop observing when a tab is removed (necessary? likely)

- chatTabObserver causes a null object error occasionally - seems to do with switching back to a closed chat?

ALSO, if there is no "unresponded" class, that will be added separate from the "unread" class
mutation.target is live, where-as mutation.oldValue is static, and mutation callbacks are async
SO both mutations will evalute true for "newly added unread class" (is unread in oldValue? is it present in target now?)
this means unseenMessages should just be a boolean flag - getting set multiple times won't matter

https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver

*/

var chatTabObserver = new MutationObserver(function(mutations) {
	mutations.forEach(function(mutation) {
		// mutation.target is a LIVE element, and mutation callbacks are ASYNC
		// so, ensure the tab has not been closed (mutation.target is not null)
		if (mutation.type === "attributes" && mutation.target !== null) {
			// @todo: maybe hash the tabName?
			var tabName = mutation.target.querySelector(".display-name").textContent.trim()
			
			if (mutation.target.classList.contains("unread") &&
					mutation.oldValue.indexOf("unread") === -1) {
				// mutation.target just added the unread class
				console.log("newUnseenMessage("+tabName+")")
			} else if (mutation.target.classList.contains("unread") === false &&
								 mutation.oldValue.indexOf("unread") !== -1) {
				// mutation.target just removed the unread class
				console.log("messagesSeen("+tabName+")")
			}
		}
	})
})

var chatListObserver = new MutationObserver(function(mutations) {
	// iterate over mutations to look for new chats (new child added to #active-chats)
  mutations.forEach(function(mutation) {
	  if (mutation.type === "childList"
			  && mutation.target.id === "active-chats"
				&& mutation.addedNodes.length > 0) {
			console.log("New Chat")
			var newTab = mutation.addedNodes[0]
			chatTabObserver.observe(newTab, {attributes: true, attributeOldValue: true})
		}
  })
})

chatListObserver.observe(document.querySelector('#active-chats'), { childList: true})


/* Test currently active tabs

var chatList = document.querySelector('#active-chats')
var chatTabs = chatList.childNodes

for (var i = 0; i < chatTabs.length; i++) {
  console.log("adding observer", chatTabs[i])
	chatTabObserver.observe(chatTabs[i], {attributes: true, childList: true,  characterData: true, attributeOldValue: true})
}

*/