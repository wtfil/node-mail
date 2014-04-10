nmail
===========

Simple module for nodejs witch can send emails

Install
---------------

    npm install -g nmail

Usage
---------------

    Usage: nmail [options] text

    Options:

    -h, --help              output usage information
    -V, --version           output the version number
    -f, --from [value]      Email sender
    -p, --password [value]  Sender password. If set the authorization command will be send
    -t, --to [value]        Email receiver 
    -s, --smtp [value]      SMTP server. Change smtp server (default localhost or sender`s mail provider)
    --file [value]          Attach file to email
