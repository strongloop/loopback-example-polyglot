import Foundation
import gRPC
import CgRPC
import Dispatch

print("\(CommandLine.arguments)")

// server options
var server : Bool = false

// general configuration
var useSSL : Bool = false

var i : Int = 0
while i < Int(CommandLine.argc) {
  let arg = CommandLine.arguments[i]
  i = i + 1
  if i == 1 {
    continue // skip the first argument
  }

  if arg == "serve" {
    server = true
  } else if arg == "-ssl" {
    useSSL = true
  } 
}

var latch = CountDownLatch(1)

gRPC.initialize()

if server {
  let noteProvider = NoteProvider()
  var noteServer: Note_TranslationServiceServer!

  if useSSL {
    print("Starting secure server")
    let certificateURL = URL(fileURLWithPath:"grpc.crt")
    let keyURL = URL(fileURLWithPath:"grpc.key")
    noteServer = Note_TranslationServiceServer(address:"0.0.0.0:50053",
                                 certificateURL:certificateURL,
                                 keyURL:keyURL,
                                 provider:noteProvider)
  } else {
    print("Starting insecure server")
    noteServer = Note_TranslationServiceServer(address:"0.0.0.0:50053",
                                 provider:noteProvider)
  }
  noteServer.start()
  // Block to keep the main thread from finishing while the server runs.
  // This server never exits. Kill the process to stop it.
  latch.wait()
}

