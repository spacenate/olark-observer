var OlarkObserver = (function(OO, document, window) {
    'use strict';

    var debug = false,
        statusObserver,
        chatTabObserver,
        chatListObserver,
        linkObserver,
        feedbackEl,
        statusIndicator,
        statusText,
        redColor = "#d65129",
        yellowColor = "#f9cb32",
        greenColor = "#88de68";


    if (OO instanceof Object) {
        // OlarkObserver is already injected
        // Debug behavior - unregister old listeners,
        // and proceed to load new OlarkObserver object
        debug = OO.unregister();
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
            sendXHR('PUT', 'status/' + newStatus);
        }
    })

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
                    sendXHR('PUT', 'chats/' + tabName + '/1');
                } else if (mutation.target.classList.contains('unread') === false && mutation.oldValue.indexOf('unread') !== -1) {
                    // mutation.target just removed the unread class
                    sendXHR('PUT', 'chats/' + tabName + '/0');
                }
            }
        });
    });
    var chatListObserver = new MutationObserver(function(mutations) {
        // iterate over mutations to look for new chats (new child added to #active-chats)
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.target.id === 'active-chats' && mutation.addedNodes.length > 0) {
                sendXHR('PUT', 'chats/new/1')
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
                var newStatus = identifyBase64Image(newElement.href);
                if (newStatus !== false) {
                    sendXHR('PUT', 'status/'+newStatus);
                } else {
                    debugLog("Unidentified status icon", newElement.href);
                }
            }
        });
    });
    // @todo: slim down this list to one base64 image per status
    function identifyBase64Image(base64String) {
        switch (base64String) {
            case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADVUlEQVRYhe2TTUwbRxiG5wbyKVWtRCqNWkgIErWlwglziExVxQilUhL10KiqmkpJS5O0BKfGP2t2Zz2xvYvXWmdtfpy4tOql6o/UEz1wS9MmIjQYG8zaBiMc95Arh5gciN8eFnPo1U6lVn6kT9837470vjOjJaRFixb/VSilZp7nHTzPOyilpzVNa/tXjD3Kx+NcaOypIPpeuNWP9ifUD/e9kc+rlPmeCwHXAmOs+6UY+3yXj3GRq0/8kWu4+csJjP9G4PydwPkHwY37BGOLBM5vB2uCyO1ROnmpqeY36LkjfOSLXe/8CFwPCNxLBBOPjO5eIpg46K6HBDd/fQ3+sLPa1BB+9UrR//X78C4TcI8JuD+N7n1MwC0T+OraMoFvmcCz2AlB5Paa8hze+ZGzQsgN/tEr4NPtENImCKsmTKZN4Ffbwafbwa8cVNoEPt2OyRUTvN+/WxNCnoXGTx+/nBV+fA9i5ijErBksa0Yga8yBzFEEsmYEMoYuZow5kHkVwtIbEBn3vOG/Q4hdf8buDSC43nFYofUOBNeMurXWgeD6cUNfO27o6x1g2dchRseqlNLTDQUQw55aOP0WQrlOSBtvQsp1QdroQvigpFwXwrmuf3w7ASnXCXHm032e5x0NBvDW5FUr5I1TkPUeTOndmNK7IeeNWdZPQta7IW+cwpTeA0nvMfbmTyIwM9p4AKaOV+UHdih5C6KFXkTzFigFK6IFC5RCL5SCFZG8BUq+19DyVih5CxTdCiHgf0EpNTd2A/Hrurx4HrHNPqibfYht9hu19TZiW/2Ha7XYZ+wp9kEt9kO5PwIW9TxtyJwQQqjqlMLfjNYS2zbES4NIlGxIlAaQKNkQ37ZhetuGeGkAiW0bput6aRC3brvApq+ONxxA07Q2GvTvag8vYK48hNkdO+Z2hpAsD2Fux45k2Y7Zcn39DpJlOyI/XwFTv3rSsHkdyibO0bB/b3rpA6QqZ3C3cgapyjBSlWHcrQwj9ZcDqYoDd3ZGEPnhGthtz64vOHasaQEOQ4QmdyPffVmL3/sEyfRFpLbOY750AcmVi4gtfAYm+yHNuopUvXSkqeZ1NE1rYzGfFEq69bDmrjKJqzGJqwVnvM+kO85s9KfRsy/FuEWLFv9r/gY+jTpf/0j1VwAAAABJRU5ErkJggg==':
            case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADU0lEQVRYhe2TPWgbZxzG381GU0pFAnVDayeOwZWg9mSlEORAI2MSSEKHBkqbQkIwrrEdVdHX6T4t3Z11qpST/KFadUqX0lLayR28pWkSHDeWJVs+SbaMFWXI6iFyBkdPh7M8ZD0lkKAfPPz/73MvPM9xHCFNmjR5W2FZ1kzTtIOmaQfLsmdUVW15I8Ee5ZtxShx7xvC+l57o1/vu6Ff7vvBQlRX8LxjBtSAIQudrCfYFrx2jwsNPqPAwnH+dwPg/BDf/Jbh5n2DsHsHoIoHz589qDO/fY9nA1YaGj0UvHqHDI7ve+UG4HhC4lwhuPdKne4ng1sF0PSRw/v0BAqKz2tASVPR6kfrpC3iXCfyPCfz/6dP7mMC/TOCre8sEvmUCz2I7GN6/15DP4Z2/cJ4JuUE/eg90uhVM2gRm1YRA2gR6tRV0uhX0yoHSJtDpVgRWTPD9+nmNCXkWjL99/FqW+f0CuMxRcFkzhKwZfFbf+cxR8Fkz+Izucxl95zPvg1n6CJxAvTD8dzCxkefC3T4E19sOFVpvQ3BN18RaG4Lrx3V/7bjur7dByH4I7ofRKsuyZwwV4ERvTUx/glCuHdLGx5ByHZA2OiAeSMp1QMx1vPLsBKRcO7jpG/s0TTsMFvDV5FUr5I1TkLUuTGqdmNQ6Ief1XdZOQtY6IW+cwqTWBUnr0u/mT4KfHjJeQIiNV+UHdih5CyKFbkTyFigFKyIFC5RCN5SCFeG8BUq+W/fyVih5CxTNClagXrIsazZUgE+MaPLiJcQ2exDd7EFss1fX1qeIbfUenqPFHv1OsQfRYi+Ue4MQIp5nhsIJIYSLfi+Jd4ZqiW0b4qXTSJRsSJT6kCjZEN+2YWrbhnipD4ltG6bqfuk0Jm67IEx9N264gKqqLVyI2lUfXsZsuR8zO3bM7vQjWe7H7I4dybIdM+X6+SySZTvCf1zHRMz1xHB4HVbwXuQkam9q6UukKucwVzmHVGUAqcoA5ioDSD11IFVx4MedQYR/G8bEbc9uMDZ6rGEFDkuIgd3wL6O1+N1vkUxfQWrrEuZLl5FcuYLYwg0IMgVpxlVk71w90tDwOqqqtgRVnyQm3ZoY91QFiaoJElULTXufS3PObOTP4fOvJbhJkybvNP8DXOE67fHe6r8AAAAASUVORK5CYII=':
                return 'available';
            case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADLElEQVRYhe2VW0gUYRiGP4JykwiDqSgvMsOKUsi6qITCggikoKSLIKIuCjoY6oaHPTjz7w7uIZVd1qK6UJcIiiK6KsibskzZtEa3UkunqQyKblwpD9E2bxfuWq0rO+oUBL7w8c8B5n3+9/t+hmhWs5rV/yrGGMfz/G6e53czxrb7fL6kf2JcXn2k2OIo/CTYzD/KPIfDpZ5DYVPVyWEmmkcFe8kdURQz/oqx2XxsqaXq1Htr1Wmcvb0KxQ8JxmaC8TGh6BGhsJFg9Oeogs0ywljFUV3Ni9i+FL7qzKCpPg8lLYSyAKH0ydhaFiCURtaSVsLZu8thdRqHdYWweo6/ttYdgKmNYHlKsLSPraanBEsbwRx91kYwtxHKG1dCsFlGdGmHqT5vj+AoA/9kEXjJAEFKhtCRjAopGXyHAbxkAP8sUlIyeMkAsWk+ais2qU7LmXsz333tsaBwYy9snUtgC3IQgxzswbFre+cS2IMc7J0crooLcH/nPMhEsTUgEzUoRLnTAhC8BUNi0xZUvkgdL8eLVFQ+H6sLNxejfe3ceMYTqo/ovkKUMiUAm7NcdUrr4Xi5Eq6uNLhepsPVlQ5nVzrq/MvQs3DOBKOQ14uovly7FvteUYg2TAHApLo7suDuWg139xqc687Aue4MXL69Iq75h82bEf78+RfA9evx0pA0JyF6iofdLbmo7slEzat1qOnJRPWrLDxbaxj/oMJxGG1tRfjjR0BV8bsmAUAfkV9bArUF3e7G/fD2ZsPTmw1v70bccq3442MKx0H9+hXxNBmATASFKC0hAPMYXc6GE+r5N1tRK+fgvLwVLbsWTQD4JkkI9/fju6JAHRrSBCATsYQAPp8viVVaB32t+bj0bgcuvs1NOO0jzc2aAPqIHmhqAxNL9zGndeRC4CCutmxLCDAaCGhNYEATwDiEo2LQX56v6ggAzQDRdtSw0x4dAUJTAohKJgrpAaB5BmLVR+TXKYGiaQEoRLk6AISm/F+ISeHBDAHYtM0jKaTIRG8TAly5ol/v40BskIk6Ep2KWPMZRR8HIiXRUEZ7PuPYE4CkyUQsMhvRYxqK3BdNtuuf8bvc+Hczj/wAAAAASUVORK5CYII=':
            case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADLElEQVRYhe2VW0gUYRiGP4JykwiFySgvMsOKMtAIyqKwIIQo6HTRRVQXdREirW2me5qZnUF3N5VdVqO6qJYIiiK6KsibTqZspqNbuppO0wkMb1opD9E2bxfuWq0rO+oUBL7w8c8B5n3+9/t+hmhWs5rV/yqe5xmWZYtYli3ieX6bz+dL+SfGFTVHS21O4ydOsPyo8ByJlHsORyzVJ4d50TrKiWX3RFHM+SvGlsrji23Vxe9t1cUw3V2B0ieE042E088IxqeEUw0Ek3+LygnWEZ63H9PV3OjZm8ZWlwyar+xCWROhPEA4+3xsLQ8QzkbXsmaC6f5S2J2mYV0hbJ4Tr22XD8LcQrC2EqwvxlZzK8HaQrDEnrUQLC2Eiobl4ATriC7tMF/Zs5urKgf7PB2sZAAnpYJrT4VdSgXbbgArGcC2RUtKBSsZID6ejzr7BtVpLXkw893XHQ9yt/bA0ZEBR5CBGGQgBMeuhY4MCEEGQgeD6+ICPNwxDzJRfH2Wia4qRIXTAuC8JUPi402ofJU5XlWvMlH5cqzO316EF6vnJjKeUH1EDxWitCkBOJxm1SmtRVXncri6suDqzIarKxvOrmxc9i9B98I5E4zCXi9i+nLjRvx7RSHKmwKARXW3r4O7ayXcoVU4F8rBuVAOLt1dltD848aNiAwM/AK4eTNRGpLmJERv6bC7qRA13bmo7VmD2u5c1PSsQ9tqw/gHFYbBaHMzIv39gKrid00CgD4ivyYAob4k5G7YB29vPjy9+fD2rscd17I/PqYwDNSvX5FIkwHIRFCIspK3wHPG5bx6Uq1/U4A6eTPq5QI07UyfAPBNkhD58AHfFQXq0JAmAJmITwrg8/lSHFW2QV/zflx8tx0X3hYmnfaRxkZNAH1EjzS1gRfNex0u28j5wCFcb9qaFGA0ENCawGdNAOMQTvugv+KAqiMANAPE2uERij06AoSnBBCTTBTWA0DzDMSrj8ivUwLGaQEoRIU6AISn/F+IS+HRDAH4aZtHU0iTid4mBbh2Tb/eJ4DIk4nak52KePMZRZ8AIi3ZUMZ6PuPYk4BkyUR8dDZixzQcvTdOtuufuk3dRfHDbRAAAAAASUVORK5CYII=':
            case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADIklEQVRYhe2VW0gUcRTGTw+xi09Zk1E9mIYGlQ8GUUmFPQVSkFFYRNiDQRejdcPLXpyZ3cW9eGmX1S4vXShIKcIeKkiIrCzZzEY3XdOdzcrA8CUldY22+XpQ07bVHXUqAj84nGEY5vv9v3OYIZrXvOb1v4rneYZl2Z0sy+7keX672+1W/RXjovLsPIP19CfOpP9e6DwcKnAeCunKjg/zFv0IZ86/Z7FYkv6IsV6fs8xQduKDsewkztSuRt4TgraBoH1G0DwlnK4jaK+mSZzJEOT54iOKmmv4PYvYslMDussZyH9OKPQQCl6M9kIPoWCs5zcSztxfAaNNO6wohNF5tMt4aR90TQRDM8HwcrTrmgmGJoJ+/F4TQd9EKKpLAGcyBBUZh+5yxi7OWgj2RSxYQQ1OiAHXEoNiIQZsixqsoAb7aqyEGLCCGva7atw4nCyVa3Iezv30lTle7uZumFrjYPIysHgZmL2j1+bWOJi9DMytDB5kqvCaWYAAUXhJIpE/QKSZFQDnyh2yPN6MkraVP8vathIlr0fremksulS/mUYskeizjyh+RgAmW5FkE9bB2p4Au28V7O2JsPsSYfMl4nbR4ohG/S4XxvWlujoc4ptIlDUDAJ3kaEmBw5cMR8calHYkobQjCTfOLo9o/nHTJoT6+iYAamoiPTcsOwmLM2/Y8Twd5W/Wo6JzLSrerEd5Zwq6VBPz7mYYjDQ2ItTbC0gSJmsKAPiJRHkJVOZ2OOoy4fKnwulPhcu/AY/2L/nlZd0MA2lwEJE0FUCACJ1EW6MC8E6t3XblmFT1dgsqA2moCmxB+9KFvwF8FQSEenrwrbsb0tCQLACRqD4qgNvtVvElxgF3415cfL8DF96lR932YEODXIB+WWPgLQV7eJsxeM5zALdub4wKMOLxyAIIEEmyAH5CWIsH7hzcJikIANkA4+O4oM0+/88AxqUUgOwdCJefSFQIoHa2CWiUAJjxf2GyRKL+uQDI+gZMJx9RfIAoFBXg2jXlZh8hhSyRKBhtKcPN5xR9uHxE8dGWUrHYp1Mn0VaRqD58N0SifpGodqpT/wCWW+EolsF5jAAAAABJRU5ErkJggg==':
                return 'available?withChats=1';
            case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADyklEQVRYhe1VXWxTZRh+Y6LUxZiRHDHKBWNmSiYQ0BshUaZBSBZNkEgwWUQvMJmWha5kP/3Z+enJ+kO3dOkgzgugF3DjYriaxN0w/BkZA9pV2IbtsQwjK6lhW5S2G915vFh31nPa2nabJiZ7kzff6Zv0e57zvO/zHqK1WIu1+L8Gz/MMy7L7WZbdz/P8W16vd91/Atza8UmjxX48ygnm+RbPx6lmT13K5P48zovmJGdr6hNFsepfATabjz5vcX9xz+rW48TFl9D4PcH4I8H4E8HwA+F4P8Ho2y1zgiXB822friq4gT9QzrobZkxna9E0SGgZIjRfWzhbhgjN6bPpKuHEty/C6jDGV5WE1fPZL9YzH8I0TLDcIFiuL5ymGwTLMMG8WBsmmIcJrf2bwQmWxKq0w3S29j3O3gL22nqwfh04fxm4QBna/GVgAzqwfh3Ym+n0l4H16yBeeRrdba/LDkvDdyt/++6jQe7r9yGMbIAQZCAGGdiCC8+2kQ2wBRnYRhicF5/B5XeegkSkzSmJ6FyEqGZZBLiuY4/EK2+g/dZGJe23NqL954U83fscrm95UgV6f98+TNbWIsIwqnqY6HKEqLwkAoKjVXb4X4X99mY4RyvgvF0J52glHKOVOON7AePPPqEAxC9dghyPIzMeh8OIHj6cSSQSIdpRAgGT7Apsg2v0ZbjGXsHJsSqcHKvCVxc3qcATAwPIG/PziNXXZ5LwF62E6GmMuwZr0DG+FZ13qtE5vhUdd7bh5hadcmH00CEglVoCnJ1FanJSxSEVjapaEibyFadA97ExV/8H6ArthCe0E12h1/CNc5Oqt9NerwIkJxL4fc8eSET4q7d3qR6P4151tep/EaKKggR4j9HpOFcvn/p1F7ql3Tgl7cLgu+tVF8309ChAc6GQUo/p9YAsK214cOSI1iF8QQJer3cd326d8V49iJ6Jt/Hl3Zosq93fuxcPBQEPBQGxhgal/qivT6XMb9u3a10xUFQbeLH5AO+wJk4PfYTzg2/m8npWZsoPAI8nJnLuiKIIKCTsbTO+1oPyPwFHGAazgUCWC3LID4kIRRNYbEcnr/fkA4/p9ZCTSTX43Bz+MBjyEZ4uicBiSETT2suyrJheQtq+L2sGtBEm8mllT0WjS8iyjD8vXChmVgzLIhAhqlHtAbc7e/lNTUFOJpcykcCDujqV/CV/FzQqDOSyW96QZcT0+tJ2QAEVyiWiuwW/AzmcsOze5yCxQyIKFLMXMgdvRdLnIFGuHcp8llux7AWIVEhEfHo2Fm06nf5tyPfWfwPcuzdCV3S+YgAAAABJRU5ErkJggg==':
                return 'available?withChats=2';
            case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD+UlEQVRYhe2VXUibZxTHD4OtmYxhIevoelF1uBXXQrverIWtbnQtBAddWelgjO2ig820VFP8yIdv3uTFfFQlGi3LLmxDKb3YGPZmgwlS67YUtRqN1lg1SxtIW2rXJHOJmo/3v4uYN59q/Nhg4B8OT3J4OOf3nHOe5yXa0pa29H8Vy7JihmGOMwxznGXZ98xm87b/JHF98xfVSt35x2qNIlZn+jxaa/osKm/6JsRyigW1tuYnjuNK/5XECsWZV5VNlR5VkxQXul5HdR9B9htB9juh6lfC+W6CzHqYV2uU8yzb8OWmJq9iTxQyTecC8ssS1NgIdf2E2oH4WtdPqF1aa24TLvz8GlR6WWhTIVSmr6ZUnZ9APkhQDhGUd+KrfIigHCQoEr5BgmKQUN9dDLVGOb8p7ZBfllSodXVgBraDsYugthdAPVKABnsBmBERGLsIzPCS2QvA2EXgbr2I9oaDvF557peNn779jEP9/UfQjO6AxiEG5xBD64j/1o7ugNYhhnZUjGvcS7j5wQtwEWWaz0V0xU1Uvi4AdevZIHfrHTSO7xJMN74LjWNxu/TDK7iz5/m0pA+PHcMjiQRusTjNP0N0001UuCYAjb6e19vfgu5uMQwTRTDcLYFhogT6iRJ0Wndi8uXnhAShnh4gHEaqwk4nHh49mgridhPtXwOAnDeO7INx4g0YnW/iorMUF52l+K5rd1ryhYEBLKtwGN4jR1Ih7HlXgjNVh4y2cjRP7kXLvTK0TO5F8719GN4jEgLOVlYCPC/kiz55gqjXm8YQ6unJbIc1vwq0n3Uauz9G6/QBmKYPoHX6bfxo2J0WLGCxJJN7vYJ/cWwsWYSpqawBdRMVrQrAmmQG/ZWv+Y4/DqHddRgdrkOwfbg9LZDPaAQfDIKfm8Pc9etJgKEhAWBxfDzXDWFXBTCbzdvYRlXAfPskLA/ex7f3y3MFSp5KLMZfnZ3xmUhpy9zVq1l7Z4h682oDy9WeYPWq+Uv9n+Ka7d0VAR6fPg3EYulDGI1mXcnEG5EXgAChawhY60/yKwKcOgVEo1kXYb6vL+f+vAES7WhhpaaVAFxEeCSR4BnLIvb0qQDAh0LwlJVl7vWvCSAhF5E/NdDfXV2IeDyIeDx4ptUK/j/l8uQc8DxmpdL1zUCmZoisqYEWh4eFky7YbILf39a20mMEF1HVugDcROWZFUjVgs2G4I0babMQ8/nwoLg4rfxr/i5kVKFX6HlFBRCJZA1eqgIdHWt/A1apQqGL6L7wHEul4IPB7MyRCAIWy+b0PgfEfhfRSGrwWakU/rY2BCwW+IzGXJ/k3g2VPgdEYeZQLmP+DZd9FZAiFxG7NBuJa+pf+l+13Kn/Ac86ODo4iC2XAAAAAElFTkSuQmCC':
                return 'available?withChats=3';
            case 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADPElEQVRYhe2T32tTZxzGz12Fk5PE0zbRBFJoT5tmZth6ck7SE82vTnM2XFq2dDOllaYX6Ryt4FpEK+qt173zD8hopa1Wkord1TaGbGOMeSPkzk6lV8PM9rzfQM3jxUn1DzhxMMkHXp73eXjheeBwOK5Fixb/V27LQkdR5dNFlU8XlUOxJYlr+0+Ky2eOXlqPizvLYeF1OX1kf1M/sr+RdBkrqkCrmqNcDLf1vpfi74dd7o1Ex/b9ZCcq38j493oKezeGsXfzE7y6kcLO5VP47Zy/vhwR2B1FmGpq+d2E07kRE6uPvujG7pU4aDEBuhZHbTGO2tUEaosJ0GIcxtUYnl4IYVVzGk0dURrurPzyuQ/Gd0OoLWioLZhKC1HU5rV32bwGNh/F34VBLEcE1pTP8fNn3rNrmgO738qguRBoTgFdVEFzKuhiw88qoNmQmc0pMGZV/DHSVV+N2MuWBzxIdD7+M+MDKwyCzQyAZgZAM4NgM8dBhUHTF8ycFRr3wnH8Mx3EHcVGlv+O0klx79nXEth0ECwfBOWDoPwx0JR5WD4INh0ETQdB+Y9BU+YbY+oYSidFo6gcilkasBYW6i9zfWAT/aDJftBEADQZADsfAJsMvPU02d/QAOj8R6CJfmwlxP2iyqetDVCF+suvekC5XrCcHzTeB8r1gcb9De01NdcHyvnBxv1gjfxh7LD1AWXNabzI+EBZCTTW3VAJNNYDNtYNGpPAsj1g2W4zy0qgrATjSwkriu31bVnosDTgoXb4SeW0GzTiAxvxgUa6zDPqA4027pkusEyX+SZj+qe6B/fC9h1L5RzHcSXVcetHzVEn3QuW9oJ0D0j3gOleMN0D+vRAPaC0B6R7YegelIcceBCxX7I8YEni2lZVW3U71g6WcoElXKCkG5RygyU7QUkXWMr0Zu7C71Enyqp923L5ASuyMLqu8mx7SARFRTBNBGntoGg7SOsARUWQJmI3KuJRxIGSKlQ3wry7aQPejlBs1Z9CtnpFteO5Ykc15EBVdeCZYsdfih3rig1bslC5O8A5m1p+wJLEtZVk/taWbHuyGeKNtRBfXwvx9U2Z3/tB5h//ekI4+16KW7Ro8UHzBoGVChwxHE8wAAAAAElFTkSuQmCC':
                return 'away';
            case 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADHUlEQVRYhe2V7UtTYRjGb4iIIkhqmlszZ2yRmnS2OTdrbtN0i7bKXlhU9EJK0fqiEWlk4Me+Jf0DRVAatKJVhlbYB0mMaBFUEBtHWrCUyGnqppvP1Ye2XuZkR3cKAi+4eXjOgef6neu+Hw7Rgha0oP9VN9fLJLc0ObZbmhybWy01XSFa8k+Mu6qVjR7j2s9unXS6u0YZe2xVxjrNBRN3tLKIR7/m4Q0uW/VXjG/qC1Y/Mik+PjIrMHDChMiFHYi27ET04i5MtuzA17Pb4HWqmbtMFnZrco+Jan6XU2R1bskfeVlbgqlz28Ga7WDn7UCzHWj6sbJmO2JN2xE8acY9g3xCVIhuS8GHF/YixBpqgDPWn8XO2IDG35411mC60YbB+gq4dbKwKO14bt3g8OjlmDppBlwWwFUJnK4Cc1UBpy1grkrgVCVwygK4qgBXJaaOG/GuXME6udVdGQM8MRW8eWsvAqurAKuvAOLF6o1AXXxfZ8SoaT2C+SvhJ0quYT/RVZ7IMi+ArvK88aF9HNjRcrAjBiBRh39UxFGCwMplqYxnlI+ohyfKmhOAp1TKwk4t2AEdcFAHHCgDDpaBHSrDxNYN4BcvmmEUamtDQt/a25Pf8zwRJxxAK2XhvWrAqQVzlgL7SwGnFpPWopTmn/R6xIaGfgF0dKRKwys4iccG+cQXezGwWw3s4eKrGoEVS38eyEskiPT1IRYMAozhd80CAB/RNUEAPQb5+4EqFeDYCObYCDhKMLpJ/sdhvEQCNjaGVJoNwE8EnkiRFqBbK7vUp89jqC4E21oIVBcimL18BsCk14tYIIAoz4ONjwsC8BO1pgW4QrTEo80dGdy8DsykAjOq0k57uLdXEICP6JmgNtzmcmofaKXhQZ0CUS4vLUCkv19oAsOCABIQ9zW5I6+Uq5iIABAMkGjH0+LsyyIChOYEkJCfKCQGgOAZSJaP6JpICTTMC4AnsogAEJrzfyEphWcZArTO2zyeQpafaCAtwPXr4vU+BQTnJ3qd7lYkm2cUfQqIrHRDmeh5xrGnAVH4iVrjs5G4pqH4vmG2r/4Oe0DU2cmYxtwAAAAASUVORK5CYII=':
                return 'away?withChats=1';
            /* need base64 image for away?withChats=2 */
            case 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD6ElEQVRYhe2VbUibVxTHL4xRNgaVLlqTxTUZWmpaWWKML1tMoo1xJOnWrWukLXthykqTL1rGqqwD6af5aVj6IV/KSmFCYZldtlm0DZV+yEBWO9ZughhiU9LUl5lEl/cn978PJk+evKjxZYOBfzg8PIfLOb97zrn3ErKrXe3q/6qhgwLejdqy9hu1Ze02GV91mZA9/0niUW1lj1356jObgp8ca6tkbusqmRG1OPy9XBC1N7zy87fS0qp/JfFQg3j/LZXIc0stwuynKkS/OIbExbeR+PIdxC4ew9Jnb+GBSUZt9YKIrbb84x1NPiwVlYy8eSD46/EaxD/Xg/YaQPsMQK8BuLD6pb0GMBf08J1V44dGYXhHIcY04ukJgwRMdxtwXscaPd8O9HB8PW1I9rRjrqsZNoUgsiPtcOoOGe0NQsTPqgGzBjC3AJZWUHMrYNGAmluAcy3AOQ1gbgXMLYh/osSfTSI6It0/um2AOyrx738YJKCdzaBdzUDKaJcS6Ez9dyqxrDoI34F9cBGSa34XId+4CdFsCWC0qSI0/74U9KMm0A8bgbR9sGpRYw2e7HsxK+lTnQ4+vR5uHi/LP0PIXTchJZsCsNfxacQkBz2lAE4rgFP1wOl60DP1CB89BPfzz7EJwg4HEI+Dq/jUFJ5qtVwQt5sQafEAcj6NnJABJjmoqQ7oqANMcsR0kqzk0YkJrKl4HF61mgvxoOhK3G4UhhcNh4F3ZcB70tRXhid7X2ADLpjNAKVsPmZ+HozXm8UQdjhy23GtKIC7jcKp2dYqwHgE1HgEMNZg+XVhVrCg1ZpJ7vWy/tjDh5kiTE/nDaibENGGAGNywVe/NFRQaKtBj1YD2mr4Sl/KCuQfGAANhUBXVrAyNJQBuH+fBYg9elTohPRvCHCZkD12eXlw7o3XQFVVoMqqQoEyu+LxsHz16upMcNqycv163toZQsaLasN30rLjP8n5kTmFCAlpxboAzzo6gGQyewgZJu9Ipu+IogDSED/WlgcnK1+m6wKcPAkwTN5BiNy7V3B90QDpdjgOl369HoCLEPj0eiz19yO5uMgC0HAYHokkd21gUwBpuQgJcAP9PTyMhMeDhMeDpUuXWP9ffX2ZOaAUCxbL1mYgVzOEXOMGik1OsjuNOp2sPzA4uN5lBBch3VsCcBOiya0AV1GnE6GbN7NmIen347FYnFX+Tb8LOVUYZ3tuNAKJRN7gcRW8cmXzd8AGVShxETLLXscWC2golJ85kUDQat2Z3heAkLoI+Y0bfMFiQWBwEEGrFf6BgUJP8vi2Sl8AoiR3KNewwLbLvgGIyEVIf2o20sc0kPrvXmvX/wBYvzAbZYnsEQAAAABJRU5ErkJggg==':
                return 'away?withChats=3';
            default:
                return false;
        }
    }

    function sendXHR(method, newStatus, successCb, errorCb) {
        debugLog(method, newStatus);
        var oReq = new XMLHttpRequest();
        if (successCb instanceof Function) oReq.addEventListener('load', successCb);
        if (errorCb instanceof Function) oReq.addEventListener('error', errorCb);
        oReq.open(method, 'https://localhost.spacenate.com:4443/' + newStatus, true);
        oReq.send();
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

    function unregister() {
        debugLog('Disconnecting observers');
        var observers = [statusObserver,chatTabObserver,chatListObserver,linkObserver];
        for (var i=0; i<observers.length; i++) {
            debugLog('Disconnecting', observers[i]);
            observers[i].disconnect();
        }
        return debug;
    }

    function setDebugMode(bool) {
        debug = (bool) ? true : false;
        var prefix = (debug) ? "en" : "dis";
        return "Debug mode " + prefix + "abled";
    }

    function debugLog() {
        if (debug) {
            console.log.apply(console, arguments);
        }
    }

    function createFeedbackElement() {
        if ((feedbackEl = document.getElementById('olark-observer')) instanceof Object) {
            statusIndicator = document.getElementById('olark-observer-status-indicator');
            statusText = document.getElementById('olark-observer-status-text');
            return;
        }
        /* olark-observer-container */
        var container = document.createElement('div');
        container.id = "olark-observer-container";
        container.style.position = "absolute";
        container.style.right = "20px";
        container.style.bottom = "0px";
        container.style.paddingBottom = "18px";

        /* olark-observer */
        var inner = document.createElement('div');
        inner.id = "olark-observer";
        inner.style.display = "inline-block";
        inner.style.padding = "7px 14px";
        inner.style.borderRadius = "19px";
        inner.style.backgroundColor = "rgba(255,255,255,0.1)";
        inner.style.color = "#fff";
        inner.style.fontSize = "14px";
        inner.style.transition = "transform 1s";
        inner.style.transform = "translateY(4em)";
        /* status-indicator */
        var indicator = document.createElement('span');
        indicator.id = "olark-observer-status-indicator";
        indicator.style.float = "right";
        indicator.style.position = "relative";
        indicator.style.top = "3px";
        indicator.style.left = "4px";
        indicator.style.height = "9px";
        indicator.style.width = "9px";
        indicator.style.borderRadius = "10px";
        indicator.style.backgroundColor = redColor;
        /* status-text */
        var text = document.createElement('span');
        text.id = "olark-observer-status-text";
        text.style.float = "right";
        text.style.marginRight = "5px";

        inner.appendChild(indicator);
        inner.appendChild(text);
        container.appendChild(inner);
        document.body.appendChild(container);

        statusIndicator = indicator;
        statusText = text;
        feedbackEl = inner;

        text.textContent = "Connecting to server...";
        window.setTimeout(function(){
            feedbackEl.style.transform = "translateY(0em)";
        }, 0);
    }

    function showFeedback(message) {
        debugLog(message);
        //statusText.textContent = message;
    }

    /* Find width of element, then animate on to page
    var offScreen = document.createElement('div');
    offScreen.style.position = "absolute";
    offScreen.style.top = "-100em";
    document.body.appendChild(offScreen);

    var p = document.createElement('p');
    p.textContent = "Some string";
    offScreen.appendChild(p);
    p.scrollWidth;
    */

	/* Start observers observing */
    createFeedbackElement();

    var statusPanelEl = document.querySelector('#op-status-panel'),
        activeChatsEl = document.querySelector('#active-chats');

    if (statusPanelEl instanceof Object && activeChatsEl instanceof Object) {
        statusObserver.observe(statusPanelEl, {childList: true});
        chatListObserver.observe(activeChatsEl, { childList: true});
        linkObserver.observe(document.querySelector('head'), {childList: true});
        showFeedback('Olark Observer loaded!');
    } else {
        showFeedback('Olark Observer loaded~')
    }

    return {
        send: sendXHR,
        unregister: unregister,
        setDebugMode: setDebugMode,
        showFeedback: showFeedback
    };
}(OlarkObserver, document, window));
