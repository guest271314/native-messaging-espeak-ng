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
# Create directory to store native messaging host.
mkdir -p "$TARGET_DIR"
# Copy native messaging host manifest.
cp "$DIR/$HOST_NAME.json" "$TARGET_DIR"
# Set permissions for the manifest so that all users can read it.
chmod o+r "$TARGET_DIR/$HOST_NAME.json"
chmod u+x "$DIR/opus-tools_static_build.sh"
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
echo "Downloading opus-1.3.1.tar.gz opus-tools-0.2.tar.gz libopusenc-0.2.1.tar.gz opusfile-0.11.tar.gz libogg-1.3.4.tar.xz flac-1.3.3.tar.xz to output opus in ogg container..."
./opus-tools_static_build.sh
echo "Native messaging host $HOST_NAME has been installed."
