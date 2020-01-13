#!/bin/sh
# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
#
# native-messagive-espeak-ng-bash guest271314 1-11-2020
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"
echo $DIR
# adjust path to NativeMessagingHost at the OS, browser used, here
if [ -d "$HOME/.config/chromium" ]; then 
  TARGET_DIR="$HOME/.config/chromium/NativeMessagingHosts"
else
  TARGET_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
fi
echo $TARGET_DIR
# name of native messging host
HOST_NAME="native_messaging_espeak_ng_bash"
# Update host path in the manifest.
HOST_PATH="$DIR/native-messaging-espeak-ng-host-bash.sh"
echo $HOST_PATH
sed -i -e "s?HOST_PATH?"$HOST_PATH"?" "$HOST_NAME.json"
cat "$HOST_NAME.json"
# Create directory to store native messaging host.
mkdir -p "$TARGET_DIR"
# Copy native messaging host manifest.
cp "$DIR/$HOST_NAME.json" "$TARGET_DIR"
# Set permissions for the manifest so that all users can read it.
chmod o+r "$TARGET_DIR/$HOST_NAME.json"
chmod u+x "$DIR/native-messaging-espeak-ng-host-bash.sh" "$DIR/uninstall_host.sh"
echo "Native messaging host $HOST_NAME has been installed."
