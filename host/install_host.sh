#!/bin/sh
# Copyright 2013 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
#
# native-messagive-espeak-ng guest271314 1-4-2020
set -e

DIR="$( cd "$( dirname "$0" )" && pwd )"
echo $DIR
mkdir --mode=u+rw "$DIR/data"
# adjust path to NativeMessagingHost at the OS, browser used, here
TARGET_DIR="$HOME/.config/chromium/NativeMessagingHosts"
echo $TARGET_DIR
# name of native messging host
HOST_NAME="native_messaging_espeak_ng"
# Update host path in the manifest.
HOST_PATH="$DIR/native-messaging-host.js"
echo $HOST_PATH
sed -i -e "s?HOST_PATH?"$HOST_PATH"?" "$HOST_NAME.json"
# Create directory to store native messaging host, if does not exist.
mkdir -p "$TARGET_DIR"
# Copy native messaging host manifest.
cp "$DIR/$HOST_NAME.json" "$TARGET_DIR"
# Set permissions for the manifest so that all users can read it.
chmod o+r "$TARGET_DIR/$HOST_NAME.json"
chmod u+x "$DIR/opus-tools_static_build.sh" "$DIR/uninstall_host.sh" "$DIR/protocol.js" "$HOST_PATH" 
echo "Cloning espeak-ng from github.com..."
# sudo apt-get install -y make autoconf automake libtool pkg-config gcc libsonic-dev ruby-ronn ruby-kramdown nodejs
# if ! git -C espeak-ng rev-parse --is-inside-work-tree ; then
git clone https://github.com/espeak-ng/espeak-ng.git
# fi
cd espeak-ng
./autogen.sh
./configure
make clean
make -B en
cd ..
echo "Cloning opus opus-tools libopusenc opusfile libogg flac from GitHub to output opus in ogg container..."
./opus-tools_static_build.sh
echo "Native messaging host $HOST_NAME has been installed."
