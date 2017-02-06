import PackageDescription
let package = Package (
    name: "note-swift",
    dependencies: [
        .Package(url: "https://github.com/grpc/grpc-swift.git", Version(0,1,8)),
        .Package(url: "https://github.com/apple/swift-protobuf.git", Version(0,9,24)),
    ]
)
