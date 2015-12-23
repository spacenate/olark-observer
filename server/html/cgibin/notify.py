#!/usr/bin/env python

import os
import urlparse

# CGI scripts must output header manually
print "Content-type: text/html"
print "Access-Control-Allow-Origin: *"
print
# Content follows
print "Ok"

# Grab query string using os and urlparse
query = os.environ[ "QUERY_STRING" ]
parsed = urlparse.parse_qs(query)
for key, value in parsed.items():
    print "<p>'%s' = %s</p>" % (key, value)

