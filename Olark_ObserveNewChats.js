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
