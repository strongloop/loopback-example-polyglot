# Build
LDFLAGS = -Xlinker -lz 

all:
	swift build -v $(LDFLAGS)

clean:
	rm -rf Packages
	rm -rf .build

run: all
	.build/debug/note-swift serve &

run-ssl: all
	.build/debug/note-swift serve -ssl &
