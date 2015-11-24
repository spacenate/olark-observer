#!/usr/bin/env python
import os
import cgitb
import urlparse

import uc

# Enable error reporting
cgitb.enable()

# CGI scripts must output header manually
print "Content-type: text/html"
print

# Content follows
print "<h1>Hello world</h1>"

# Example of calling function in uc module
uc.meow("More text")

# Grab query string using os and urlparse
query = os.environ[ "QUERY_STRING" ]
parsed = urlparse.parse_qs(query)
for key, value in parsed.items():
      print "<paragraph>You set '%s' to value %s</paragraph>" % \
         ( key, value )

