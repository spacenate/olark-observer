var statusObserver = new MutationObserver(function(mutations) {
  // Multiple mutations take place for each status change.
  // Only the final mutation is important in determining the new status.
  var lastMutation = mutations[mutations.length - 1],
      newNodes = lastMutation.addedNodes,
      newStatus = false

  // Grab the #status-indicator element, see what class has been assigned to it.
  for (var i = 0; i < newNodes.length; i++) {
    if (newNodes[i].id === "status-indicator")
      newStatus = newNodes[i].className
  }

  if (newStatus)
    console.log("newOperatorStatus(" + newStatus + ")")
})

statusObserver.observe(document.querySelector('#op-status-panel'), {childList: true})
