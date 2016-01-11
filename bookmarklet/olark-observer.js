var OlarkObserver = (function(OO) {
	"use strict";

	// OlarkObserver already injected
	if (OO instanceof Object) return OO;

	function sendXHR(newStatus) {
		var oReq = new XMLHttpRequest();
		oReq.open("PUT", "https://localhost:4443/" + newStatus, true);
		oReq.send();
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
			if (newNodes[i].id === "status-indicator") {
				newStatus = newNodes[i].className;
			}
		}

		if (newStatus) {
			sendXHR('status/' + newStatus);
		}
	})
	statusObserver.observe(document.querySelector('#op-status-panel'), {childList: true});

	/* New unread chats */
	var chatTabObserver = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			// mutation.target is a LIVE element, and mutation callbacks are ASYNC
			// so, ensure the tab has not been closed (mutation.target is not null)
			if (mutation.type === "attributes" && mutation.target !== null) {
				var displayNameElement = mutation.target.querySelector(".display-name");

				if (displayNameElement === null) {
					return; // "continue" with the next forEach, this is a closed chat tab
				}

				// @todo: maybe hash the tabName?
				var tabName = displayNameElement.textContent.trim();

				if (mutation.target.classList.contains("unread") && mutation.oldValue.indexOf("unread") === -1) {
					// mutation.target just added the unread class
					sendXHR('chats/' + tabName + '/1');
				} else if (mutation.target.classList.contains("unread") === false && mutation.oldValue.indexOf("unread") !== -1) {
					// mutation.target just removed the unread class
					sendXHR('chats/' + tabName + '/0');
				}
			}
		});
	});
	var chatListObserver = new MutationObserver(function(mutations) {
		// iterate over mutations to look for new chats (new child added to #active-chats)
		mutations.forEach(function(mutation) {
			if (mutation.type === "childList" && mutation.target.id === "active-chats" && mutation.addedNodes.length > 0) {
				sendXHR("chats/new/1")
				var newTab = mutation.addedNodes[0];
				chatTabObserver.observe(newTab, {attributes: true, attributeOldValue: true});
			}
		});
	});
	chatListObserver.observe(document.querySelector('#active-chats'), { childList: true});

	/* New unread chats, while window is inactive */
	var linkObserver = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
				// It seems only one element is added for each mutation
				var newElement = mutation.addedNodes[0];
				// "continue" with next forEach if the new element is not a link[rel=icon]
				if (newElement.rel !== "icon") {
					return;
				}

				var icon = identifyBase64Image(newElement.href);
				if (icon !== false) {
                    chats = false;
                    switch (icon) {
                        case 'avail_0chat':
                            chats = 0;
                        case 'avail_1chat':
                            if (false === chats) chats = 1;
                        case 'avail_2chat':
                            if (false === chats) chats = 2;
                        case 'avail_3chat':
                            if (false === chats) chats = 3;
                            // @todo: what status names does Olark use?
					        sendXHR('status/available?withChats=' + chats);
				            break;
                        case 'unavail':
                            sendXHR('status/unavailable');
                            break;
                    }
                }
			}
		});
	});
	linkObserver.observe(document.querySelector('head'), {childList: true});
	// @todo: slim down this list to one base64 image per status
	function identifyBase64Image(base64String) {
		switch (base64String) {
			case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADVUlEQVRYhe2TTUwbRxiG5wbyKVWtRCqNWkgIErWlwglziExVxQilUhL10KiqmkpJS5O0BKfGP2t2Zz2xvYvXWmdtfpy4tOql6o/UEz1wS9MmIjQYG8zaBiMc95Arh5gciN8eFnPo1U6lVn6kT9837470vjOjJaRFixb/VSilZp7nHTzPOyilpzVNa/tXjD3Kx+NcaOypIPpeuNWP9ifUD/e9kc+rlPmeCwHXAmOs+6UY+3yXj3GRq0/8kWu4+csJjP9G4PydwPkHwY37BGOLBM5vB2uCyO1ROnmpqeY36LkjfOSLXe/8CFwPCNxLBBOPjO5eIpg46K6HBDd/fQ3+sLPa1BB+9UrR//X78C4TcI8JuD+N7n1MwC0T+OraMoFvmcCz2AlB5Paa8hze+ZGzQsgN/tEr4NPtENImCKsmTKZN4Ffbwafbwa8cVNoEPt2OyRUTvN+/WxNCnoXGTx+/nBV+fA9i5ijErBksa0Yga8yBzFEEsmYEMoYuZow5kHkVwtIbEBn3vOG/Q4hdf8buDSC43nFYofUOBNeMurXWgeD6cUNfO27o6x1g2dchRseqlNLTDQUQw55aOP0WQrlOSBtvQsp1QdroQvigpFwXwrmuf3w7ASnXCXHm032e5x0NBvDW5FUr5I1TkPUeTOndmNK7IeeNWdZPQta7IW+cwpTeA0nvMfbmTyIwM9p4AKaOV+UHdih5C6KFXkTzFigFK6IFC5RCL5SCFZG8BUq+19DyVih5CxTdCiHgf0EpNTd2A/Hrurx4HrHNPqibfYht9hu19TZiW/2Ha7XYZ+wp9kEt9kO5PwIW9TxtyJwQQqjqlMLfjNYS2zbES4NIlGxIlAaQKNkQ37ZhetuGeGkAiW0bput6aRC3brvApq+ONxxA07Q2GvTvag8vYK48hNkdO+Z2hpAsD2Fux45k2Y7Zcn39DpJlOyI/XwFTv3rSsHkdyibO0bB/b3rpA6QqZ3C3cgapyjBSlWHcrQwj9ZcDqYoDd3ZGEPnhGthtz64vOHasaQEOQ4QmdyPffVmL3/sEyfRFpLbOY750AcmVi4gtfAYm+yHNuopUvXSkqeZ1NE1rYzGfFEq69bDmrjKJqzGJqwVnvM+kO85s9KfRsy/FuEWLFv9r/gY+jTpf/0j1VwAAAABJRU5ErkJggg==':
			case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADU0lEQVRYhe2TPWgbZxzG381GU0pFAnVDayeOwZWg9mSlEORAI2MSSEKHBkqbQkIwrrEdVdHX6T4t3Z11qpST/KFadUqX0lLayR28pWkSHDeWJVs+SbaMFWXI6iFyBkdPh7M8ZD0lkKAfPPz/73MvPM9xHCFNmjR5W2FZ1kzTtIOmaQfLsmdUVW15I8Ee5ZtxShx7xvC+l57o1/vu6Ff7vvBQlRX8LxjBtSAIQudrCfYFrx2jwsNPqPAwnH+dwPg/BDf/Jbh5n2DsHsHoIoHz589qDO/fY9nA1YaGj0UvHqHDI7ve+UG4HhC4lwhuPdKne4ng1sF0PSRw/v0BAqKz2tASVPR6kfrpC3iXCfyPCfz/6dP7mMC/TOCre8sEvmUCz2I7GN6/15DP4Z2/cJ4JuUE/eg90uhVM2gRm1YRA2gR6tRV0uhX0yoHSJtDpVgRWTPD9+nmNCXkWjL99/FqW+f0CuMxRcFkzhKwZfFbf+cxR8Fkz+Izucxl95zPvg1n6CJxAvTD8dzCxkefC3T4E19sOFVpvQ3BN18RaG4Lrx3V/7bjur7dByH4I7ofRKsuyZwwV4ERvTUx/glCuHdLGx5ByHZA2OiAeSMp1QMx1vPLsBKRcO7jpG/s0TTsMFvDV5FUr5I1TkLUuTGqdmNQ6Ief1XdZOQtY6IW+cwqTWBUnr0u/mT4KfHjJeQIiNV+UHdih5CyKFbkTyFigFKyIFC5RCN5SCFeG8BUq+W/fyVih5CxTNClagXrIsazZUgE+MaPLiJcQ2exDd7EFss1fX1qeIbfUenqPFHv1OsQfRYi+Ue4MQIp5nhsIJIYSLfi+Jd4ZqiW0b4qXTSJRsSJT6kCjZEN+2YWrbhnipD4ltG6bqfuk0Jm67IEx9N264gKqqLVyI2lUfXsZsuR8zO3bM7vQjWe7H7I4dybIdM+X6+SySZTvCf1zHRMz1xHB4HVbwXuQkam9q6UukKucwVzmHVGUAqcoA5ioDSD11IFVx4MedQYR/G8bEbc9uMDZ6rGEFDkuIgd3wL6O1+N1vkUxfQWrrEuZLl5FcuYLYwg0IMgVpxlVk71w90tDwOqqqtgRVnyQm3ZoY91QFiaoJElULTXufS3PObOTP4fOvJbhJkybvNP8DXOE67fHe6r8AAAAASUVORK5CYII=':
				return 'avail_no_chats';
			case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADLElEQVRYhe2VW0gUYRiGP4JykwiDqSgvMsOKUsi6qITCggikoKSLIKIuCjoY6oaHPTjz7w7uIZVd1qK6UJcIiiK6KsibskzZtEa3UkunqQyKblwpD9E2bxfuWq0rO+oUBL7w8c8B5n3+9/t+hmhWs5rV/yrGGMfz/G6e53czxrb7fL6kf2JcXn2k2OIo/CTYzD/KPIfDpZ5DYVPVyWEmmkcFe8kdURQz/oqx2XxsqaXq1Htr1Wmcvb0KxQ8JxmaC8TGh6BGhsJFg9Oeogs0ywljFUV3Ni9i+FL7qzKCpPg8lLYSyAKH0ydhaFiCURtaSVsLZu8thdRqHdYWweo6/ttYdgKmNYHlKsLSPraanBEsbwRx91kYwtxHKG1dCsFlGdGmHqT5vj+AoA/9kEXjJAEFKhtCRjAopGXyHAbxkAP8sUlIyeMkAsWk+ais2qU7LmXsz333tsaBwYy9snUtgC3IQgxzswbFre+cS2IMc7J0crooLcH/nPMhEsTUgEzUoRLnTAhC8BUNi0xZUvkgdL8eLVFQ+H6sLNxejfe3ceMYTqo/ovkKUMiUAm7NcdUrr4Xi5Eq6uNLhepsPVlQ5nVzrq/MvQs3DOBKOQ14uovly7FvteUYg2TAHApLo7suDuWg139xqc687Aue4MXL69Iq75h82bEf78+RfA9evx0pA0JyF6iofdLbmo7slEzat1qOnJRPWrLDxbaxj/oMJxGG1tRfjjR0BV8bsmAUAfkV9bArUF3e7G/fD2ZsPTmw1v70bccq3442MKx0H9+hXxNBmATASFKC0hAPMYXc6GE+r5N1tRK+fgvLwVLbsWTQD4JkkI9/fju6JAHRrSBCATsYQAPp8viVVaB32t+bj0bgcuvs1NOO0jzc2aAPqIHmhqAxNL9zGndeRC4CCutmxLCDAaCGhNYEATwDiEo2LQX56v6ggAzQDRdtSw0x4dAUJTAohKJgrpAaB5BmLVR+TXKYGiaQEoRLk6AISm/F+ISeHBDAHYtM0jKaTIRG8TAly5ol/v40BskIk6Ep2KWPMZRR8HIiXRUEZ7PuPYE4CkyUQsMhvRYxqK3BdNtuuf8bvc+Hczj/wAAAAASUVORK5CYII=':
			case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADLElEQVRYhe2VW0gUYRiGP4JykwiFySgvMsOKMtAIyqKwIIQo6HTRRVQXdREirW2me5qZnUF3N5VdVqO6qJYIiiK6KsibTqZspqNbuppO0wkMb1opD9E2bxfuWq0rO+oUBL7w8c8B5n3+9/t+hmhWs5rV/yqe5xmWZYtYli3ieX6bz+dL+SfGFTVHS21O4ydOsPyo8ByJlHsORyzVJ4d50TrKiWX3RFHM+SvGlsrji23Vxe9t1cUw3V2B0ieE042E088IxqeEUw0Ek3+LygnWEZ63H9PV3OjZm8ZWlwyar+xCWROhPEA4+3xsLQ8QzkbXsmaC6f5S2J2mYV0hbJ4Tr22XD8LcQrC2EqwvxlZzK8HaQrDEnrUQLC2Eiobl4ATriC7tMF/Zs5urKgf7PB2sZAAnpYJrT4VdSgXbbgArGcC2RUtKBSsZID6ejzr7BtVpLXkw893XHQ9yt/bA0ZEBR5CBGGQgBMeuhY4MCEEGQgeD6+ICPNwxDzJRfH2Wia4qRIXTAuC8JUPi402ofJU5XlWvMlH5cqzO316EF6vnJjKeUH1EDxWitCkBOJxm1SmtRVXncri6suDqzIarKxvOrmxc9i9B98I5E4zCXi9i+nLjRvx7RSHKmwKARXW3r4O7ayXcoVU4F8rBuVAOLt1dltD848aNiAwM/AK4eTNRGpLmJERv6bC7qRA13bmo7VmD2u5c1PSsQ9tqw/gHFYbBaHMzIv39gKrid00CgD4ivyYAob4k5G7YB29vPjy9+fD2rscd17I/PqYwDNSvX5FIkwHIRFCIspK3wHPG5bx6Uq1/U4A6eTPq5QI07UyfAPBNkhD58AHfFQXq0JAmAJmITwrg8/lSHFW2QV/zflx8tx0X3hYmnfaRxkZNAH1EjzS1gRfNex0u28j5wCFcb9qaFGA0ENCawGdNAOMQTvugv+KAqiMANAPE2uERij06AoSnBBCTTBTWA0DzDMSrj8ivUwLGaQEoRIU6AISn/F+IS+HRDAH4aZtHU0iTid4mBbh2Tb/eJ4DIk4nak52KePMZRZ8AIi3ZUMZ6PuPYk4BkyUR8dDZixzQcvTdOtuufuk3dRfHDbRAAAAAASUVORK5CYII=':
			case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADIklEQVRYhe2VW0gUcRTGTw+xi09Zk1E9mIYGlQ8GUUmFPQVSkFFYRNiDQRejdcPLXpyZ3cW9eGmX1S4vXShIKcIeKkiIrCzZzEY3XdOdzcrA8CUldY22+XpQ07bVHXUqAj84nGEY5vv9v3OYIZrXvOb1v4rneYZl2Z0sy+7keX672+1W/RXjovLsPIP19CfOpP9e6DwcKnAeCunKjg/zFv0IZ86/Z7FYkv6IsV6fs8xQduKDsewkztSuRt4TgraBoH1G0DwlnK4jaK+mSZzJEOT54iOKmmv4PYvYslMDussZyH9OKPQQCl6M9kIPoWCs5zcSztxfAaNNO6wohNF5tMt4aR90TQRDM8HwcrTrmgmGJoJ+/F4TQd9EKKpLAGcyBBUZh+5yxi7OWgj2RSxYQQ1OiAHXEoNiIQZsixqsoAb7aqyEGLCCGva7atw4nCyVa3Iezv30lTle7uZumFrjYPIysHgZmL2j1+bWOJi9DMytDB5kqvCaWYAAUXhJIpE/QKSZFQDnyh2yPN6MkraVP8vathIlr0fremksulS/mUYskeizjyh+RgAmW5FkE9bB2p4Au28V7O2JsPsSYfMl4nbR4ohG/S4XxvWlujoc4ptIlDUDAJ3kaEmBw5cMR8calHYkobQjCTfOLo9o/nHTJoT6+iYAamoiPTcsOwmLM2/Y8Twd5W/Wo6JzLSrerEd5Zwq6VBPz7mYYjDQ2ItTbC0gSJmsKAPiJRHkJVOZ2OOoy4fKnwulPhcu/AY/2L/nlZd0MA2lwEJE0FUCACJ1EW6MC8E6t3XblmFT1dgsqA2moCmxB+9KFvwF8FQSEenrwrbsb0tCQLACRqD4qgNvtVvElxgF3415cfL8DF96lR932YEODXIB+WWPgLQV7eJsxeM5zALdub4wKMOLxyAIIEEmyAH5CWIsH7hzcJikIANkA4+O4oM0+/88AxqUUgOwdCJefSFQIoHa2CWiUAJjxf2GyRKL+uQDI+gZMJx9RfIAoFBXg2jXlZh8hhSyRKBhtKcPN5xR9uHxE8dGWUrHYp1Mn0VaRqD58N0SifpGodqpT/wCWW+EolsF5jAAAAABJRU5ErkJggg==':
				return 'avail_1chat';
			case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADyklEQVRYhe1VXWxTZRh+Y6LUxZiRHDHKBWNmSiYQ0BshUaZBSBZNkEgwWUQvMJmWha5kP/3Z+enJ+kO3dOkgzgugF3DjYriaxN0w/BkZA9pV2IbtsQwjK6lhW5S2G915vFh31nPa2nabJiZ7kzff6Zv0e57zvO/zHqK1WIu1+L8Gz/MMy7L7WZbdz/P8W16vd91/Atza8UmjxX48ygnm+RbPx6lmT13K5P48zovmJGdr6hNFsepfATabjz5vcX9xz+rW48TFl9D4PcH4I8H4E8HwA+F4P8Ho2y1zgiXB822friq4gT9QzrobZkxna9E0SGgZIjRfWzhbhgjN6bPpKuHEty/C6jDGV5WE1fPZL9YzH8I0TLDcIFiuL5ymGwTLMMG8WBsmmIcJrf2bwQmWxKq0w3S29j3O3gL22nqwfh04fxm4QBna/GVgAzqwfh3Ym+n0l4H16yBeeRrdba/LDkvDdyt/++6jQe7r9yGMbIAQZCAGGdiCC8+2kQ2wBRnYRhicF5/B5XeegkSkzSmJ6FyEqGZZBLiuY4/EK2+g/dZGJe23NqL954U83fscrm95UgV6f98+TNbWIsIwqnqY6HKEqLwkAoKjVXb4X4X99mY4RyvgvF0J52glHKOVOON7AePPPqEAxC9dghyPIzMeh8OIHj6cSSQSIdpRAgGT7Apsg2v0ZbjGXsHJsSqcHKvCVxc3qcATAwPIG/PziNXXZ5LwF62E6GmMuwZr0DG+FZ13qtE5vhUdd7bh5hadcmH00CEglVoCnJ1FanJSxSEVjapaEibyFadA97ExV/8H6ArthCe0E12h1/CNc5Oqt9NerwIkJxL4fc8eSET4q7d3qR6P4151tep/EaKKggR4j9HpOFcvn/p1F7ql3Tgl7cLgu+tVF8309ChAc6GQUo/p9YAsK214cOSI1iF8QQJer3cd326d8V49iJ6Jt/Hl3Zosq93fuxcPBQEPBQGxhgal/qivT6XMb9u3a10xUFQbeLH5AO+wJk4PfYTzg2/m8npWZsoPAI8nJnLuiKIIKCTsbTO+1oPyPwFHGAazgUCWC3LID4kIRRNYbEcnr/fkA4/p9ZCTSTX43Bz+MBjyEZ4uicBiSETT2suyrJheQtq+L2sGtBEm8mllT0WjS8iyjD8vXChmVgzLIhAhqlHtAbc7e/lNTUFOJpcykcCDujqV/CV/FzQqDOSyW96QZcT0+tJ2QAEVyiWiuwW/AzmcsOze5yCxQyIKFLMXMgdvRdLnIFGuHcp8llux7AWIVEhEfHo2Fm06nf5tyPfWfwPcuzdCV3S+YgAAAABJRU5ErkJggg==':
				return 'avail_2chat';
			case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD+UlEQVRYhe2VXUibZxTHD4OtmYxhIevoelF1uBXXQrverIWtbnQtBAddWelgjO2ig820VFP8yIdv3uTFfFQlGi3LLmxDKb3YGPZmgwlS67YUtRqN1lg1SxtIW2rXJHOJmo/3v4uYN59q/Nhg4B8OT3J4OOf3nHOe5yXa0pa29H8Vy7JihmGOMwxznGXZ98xm87b/JHF98xfVSt35x2qNIlZn+jxaa/osKm/6JsRyigW1tuYnjuNK/5XECsWZV5VNlR5VkxQXul5HdR9B9htB9juh6lfC+W6CzHqYV2uU8yzb8OWmJq9iTxQyTecC8ssS1NgIdf2E2oH4WtdPqF1aa24TLvz8GlR6WWhTIVSmr6ZUnZ9APkhQDhGUd+KrfIigHCQoEr5BgmKQUN9dDLVGOb8p7ZBfllSodXVgBraDsYugthdAPVKABnsBmBERGLsIzPCS2QvA2EXgbr2I9oaDvF557peNn779jEP9/UfQjO6AxiEG5xBD64j/1o7ugNYhhnZUjGvcS7j5wQtwEWWaz0V0xU1Uvi4AdevZIHfrHTSO7xJMN74LjWNxu/TDK7iz5/m0pA+PHcMjiQRusTjNP0N0001UuCYAjb6e19vfgu5uMQwTRTDcLYFhogT6iRJ0Wndi8uXnhAShnh4gHEaqwk4nHh49mgridhPtXwOAnDeO7INx4g0YnW/iorMUF52l+K5rd1ryhYEBLKtwGN4jR1Ih7HlXgjNVh4y2cjRP7kXLvTK0TO5F8719GN4jEgLOVlYCPC/kiz55gqjXm8YQ6unJbIc1vwq0n3Uauz9G6/QBmKYPoHX6bfxo2J0WLGCxJJN7vYJ/cWwsWYSpqawBdRMVrQrAmmQG/ZWv+Y4/DqHddRgdrkOwfbg9LZDPaAQfDIKfm8Pc9etJgKEhAWBxfDzXDWFXBTCbzdvYRlXAfPskLA/ex7f3y3MFSp5KLMZfnZ3xmUhpy9zVq1l7Z4h682oDy9WeYPWq+Uv9n+Ka7d0VAR6fPg3EYulDGI1mXcnEG5EXgAChawhY60/yKwKcOgVEo1kXYb6vL+f+vAES7WhhpaaVAFxEeCSR4BnLIvb0qQDAh0LwlJVl7vWvCSAhF5E/NdDfXV2IeDyIeDx4ptUK/j/l8uQc8DxmpdL1zUCmZoisqYEWh4eFky7YbILf39a20mMEF1HVugDcROWZFUjVgs2G4I0babMQ8/nwoLg4rfxr/i5kVKFX6HlFBRCJZA1eqgIdHWt/A1apQqGL6L7wHEul4IPB7MyRCAIWy+b0PgfEfhfRSGrwWakU/rY2BCwW+IzGXJ/k3g2VPgdEYeZQLmP+DZd9FZAiFxG7NBuJa+pf+l+13Kn/Ac86ODo4iC2XAAAAAElFTkSuQmCC':
				return 'avail_3chat';
			case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADPElEQVRYhe2T32tTZxzGz12Fk5PE0zbRBFJoT5tmZth6ck7SE82vTnM2XFq2dDOllaYX6Ryt4FpEK+qt173zD8hopa1Wkord1TaGbGOMeSPkzk6lV8PM9rzfQM3jxUn1DzhxMMkHXp73eXjheeBwOK5Fixb/V27LQkdR5dNFlU8XlUOxJYlr+0+Ky2eOXlqPizvLYeF1OX1kf1M/sr+RdBkrqkCrmqNcDLf1vpfi74dd7o1Ex/b9ZCcq38j493oKezeGsXfzE7y6kcLO5VP47Zy/vhwR2B1FmGpq+d2E07kRE6uPvujG7pU4aDEBuhZHbTGO2tUEaosJ0GIcxtUYnl4IYVVzGk0dURrurPzyuQ/Gd0OoLWioLZhKC1HU5rV32bwGNh/F34VBLEcE1pTP8fNn3rNrmgO738qguRBoTgFdVEFzKuhiw88qoNmQmc0pMGZV/DHSVV+N2MuWBzxIdD7+M+MDKwyCzQyAZgZAM4NgM8dBhUHTF8ycFRr3wnH8Mx3EHcVGlv+O0klx79nXEth0ECwfBOWDoPwx0JR5WD4INh0ETQdB+Y9BU+YbY+oYSidFo6gcilkasBYW6i9zfWAT/aDJftBEADQZADsfAJsMvPU02d/QAOj8R6CJfmwlxP2iyqetDVCF+suvekC5XrCcHzTeB8r1gcb9De01NdcHyvnBxv1gjfxh7LD1AWXNabzI+EBZCTTW3VAJNNYDNtYNGpPAsj1g2W4zy0qgrATjSwkriu31bVnosDTgoXb4SeW0GzTiAxvxgUa6zDPqA4027pkusEyX+SZj+qe6B/fC9h1L5RzHcSXVcetHzVEn3QuW9oJ0D0j3gOleMN0D+vRAPaC0B6R7YegelIcceBCxX7I8YEni2lZVW3U71g6WcoElXKCkG5RygyU7QUkXWMr0Zu7C71Enyqp923L5ASuyMLqu8mx7SARFRTBNBGntoGg7SOsARUWQJmI3KuJRxIGSKlQ3wry7aQPejlBs1Z9CtnpFteO5Ykc15EBVdeCZYsdfih3rig1bslC5O8A5m1p+wJLEtZVk/taWbHuyGeKNtRBfXwvx9U2Z3/tB5h//ekI4+16KW7Ro8UHzBoGVChwxHE8wAAAAAElFTkSuQmCC':
				return 'unavail';
			default:
				return false;
		}
	}

    console.log("Observing!");
	return {};
}(OlarkObserver));
