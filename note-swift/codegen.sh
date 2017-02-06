#!/bin/bash
# Generate gprc and protobuf code for Swift
protoc --swift_out=Sources --swiftgrpc_out=Sources note.proto

