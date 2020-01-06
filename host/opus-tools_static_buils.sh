#!/bin/sh

# ==============================================================
# Script to build a statically linked version of opus-tools
#
# Release tarballs:
# http://downloads.xiph.org/releases/opus/
# http://downloads.xiph.org/releases/ogg/
# http://downloads.xiph.org/releases/flac/
#
# Build deps: autoconf automake libtool pkg-config
#
# ==============================================================
# https://gist.github.com/spvkgn/60c12010d4cae1243dfee45b0821f692
export BUILD_DIR=`pwd`/build
export PKG_CONFIG_PATH="$BUILD_DIR/lib/pkgconfig"
export OPT_FLAGS="-fno-strict-aliasing -O3 -march=native"

OPUS_TAR=opus-1.3.1.tar.gz
OPUSTOOLS_TAR=opus-tools-0.2.tar.gz
LIBOPUSENC_TAR=libopusenc-0.2.1.tar.gz
OPUSFILE_TAR=opusfile-0.11.tar.gz
LIBOGG_TAR=libogg-1.3.4.tar.xz
FLAC_TAR=flac-1.3.3.tar.xz

SUFFIX="-static"

echo "Download source tarballs..."
[ -f $OPUS_TAR ] || wget -nv http://downloads.xiph.org/releases/opus/$OPUS_TAR
[ -f $OPUSTOOLS_TAR ] || wget -nv http://downloads.xiph.org/releases/opus/$OPUSTOOLS_TAR
[ -f $LIBOPUSENC_TAR ] || wget -nv http://downloads.xiph.org/releases/opus/$LIBOPUSENC_TAR
[ -f $OPUSFILE_TAR ] || wget -nv http://downloads.xiph.org/releases/opus/$OPUSFILE_TAR
[ -f $LIBOGG_TAR ] || wget -nv http://downloads.xiph.org/releases/ogg/$LIBOGG_TAR
[ -f $FLAC_TAR ] || wget -nv http://downloads.xiph.org/releases/flac/$FLAC_TAR

find -name "*.tar.xz" -exec tar xJf {} \;
find -name "*.tar.gz" -exec tar xzf {} \;

[ -d "$BUILD_DIR" ] || mkdir "$BUILD_DIR"

# build libogg
cd $(ls -d libogg-*/)
autoreconf -fi && \
CFLAGS="$OPT_FLAGS" \
./configure --prefix=$BUILD_DIR \
  --disable-shared --enable-static
make clean
make -j $(nproc) install
cd ..

# build FLAC
cd $(ls -d flac-*/)
autoreconf -fi && \
CFLAGS="$OPT_FLAGS" \
./configure --prefix=$BUILD_DIR \
  --disable-shared --enable-static \
  --disable-debug \
  --disable-oggtest \
  --disable-cpplibs \
  --disable-doxygen-docs \
  --with-ogg="$BUILD_DIR"
make clean
make -j $(nproc) install
cd ..

# build Opus
cd $(ls -d opus-*/)
CFLAGS="$OPT_FLAGS" \
./configure --prefix=$BUILD_DIR \
  --disable-shared --enable-static \
  --disable-maintainer-mode \
  --disable-doc \
  --disable-extra-programs
make clean
make -j $(nproc) install
cd ..

# build opusfile
cd $(ls -d opusfile-*/)
CFLAGS="$OPT_FLAGS" \
./configure --prefix=$BUILD_DIR \
  --disable-shared --enable-static \
  --disable-maintainer-mode \
  --disable-examples \
  --disable-doc \
  --disable-http
make clean
make -j $(nproc) install
cd ..

# build libopusenc
cd $(ls -d libopusenc-*/)
CFLAGS="$OPT_FLAGS" \
./configure --prefix=$BUILD_DIR \
  --disable-shared --enable-static \
  --disable-maintainer-mode \
  --disable-examples \
  --disable-doc
make clean
make -j $(nproc) install
cd ..

# build opus-tools
cd $(ls -d opus-tools-*/)
CFLAGS="$OPT_FLAGS" \
./configure --prefix=$BUILD_DIR \
  --disable-shared --enable-static \
  --disable-maintainer-mode
make clean
make -j $(nproc) install
cd ..

if ls $BUILD_DIR/bin/opus* > /dev/null 2>&1 ; then
  for file in $BUILD_DIR/bin/opus*
  do
    cp $file $PWD/$(basename $file)$SUFFIX
    strip $PWD/$(basename $file)$SUFFIX
  done
fi

rm -rf *.tar.gz *tar.xz
