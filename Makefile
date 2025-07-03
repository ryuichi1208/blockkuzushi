# WebAssemblyビルド用Makefile
CC = emcc
CFLAGS = -O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' -s ALLOW_MEMORY_GROWTH=1
TARGET = collision.js

all: $(TARGET)

$(TARGET): collision.c
	$(CC) $(CFLAGS) collision.c -o $(TARGET)

clean:
	rm -f $(TARGET) collision.wasm

# ビルドコマンド: make
# 必要なツール: Emscripten SDK (emcc)