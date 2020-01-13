#!/bin/bash
# Loop forever, to deal with chrome.runtime.connectNative
# https://stackoverflow.com/a/24777120
while IFS= read -r -n1 c; do
    # We do not message input text to Native Messaging host
    # we just message `0` then get input.txt file written by Native File System 
    if [ "$c" == "0" ] ; then
       continue
    fi
    # Output phonemes to Native Messaging application
    message="\"$(espeak-ng -m -x -f input.txt -w output.wav | base64 -w 0)\""
    # Calculate the byte size of the string.
    # NOTE: This assumes that byte length is identical to the string length!
    # Do not use multibyte (unicode) characters, escape them instead, e.g.
    # message='"Some unicode character:\u1234"'
    messagelen=${#message}

    # Convert to an integer in native byte order.
    # If you see an error message in Chrome's stdout with
    # "Native Messaging host tried sending a message that is ... bytes long.",
    # then just swap the order, i.e. messagelen1 <-> messagelen4 and
    # messagelen2 <-> messagelen3
    messagelen1=$(( ($messagelen      ) & 0xFF ))               
    messagelen2=$(( ($messagelen >>  8) & 0xFF ))               
    messagelen3=$(( ($messagelen >> 16) & 0xFF ))               
    messagelen4=$(( ($messagelen >> 24) & 0xFF ))               

    # Print the message byte length followed by the actual message.
    printf "$(printf '\\x%x\\x%x\\x%x\\x%x' \
        $messagelen1 $messagelen2 $messagelen3 $messagelen4)%s" "$message"
done
