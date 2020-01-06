#!/usr/bin/env node
// https://github.com/simov/native-messaging
//
// native-messaging-espeak-ng guest271314 1-4-2020
// espeak-ng using Native Messaging, Native File System, JavaScript
const sendMessage = require("./protocol")(handleMessage)
function handleMessage (req) {
  const {exec} = require("child_process");
  if (req.message === "write") {
    const localLibrary = "`pwd`";
    exec("ESPEAK_DATA_PATH=" + localLibrary + "/espeak-ng"
        + " LD_LIBRARY_PATH=src:${LD_LIBRARY_PATH} "
        + localLibrary + "/espeak-ng/src/espeak-ng"
        + " -m -x --stdout -f " + localLibrary + "/data/input.txt -w "
        + localLibrary + "/data/output.wav"
    , (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        sendMessage({message: "stderr", body: stderr});
        return;
      }
      // convert wav to opus using opusenc
      exec(localLibrary + "/build/bin/opusenc " 
          + localLibrary + "/data/output.wav " 
          + localLibrary + "/data/output.ogg"
      , (_err, _stdout, _stderr) => {
        if (_err) {
        // node couldn't execute the command
         sendMessage({message: "stderr", body: _stderr});
          return;
        }
        // `stdout`: message sent to `host` from `app`
        sendMessage({message: "output", body: stdout});  
      });
    });    
  }
}
