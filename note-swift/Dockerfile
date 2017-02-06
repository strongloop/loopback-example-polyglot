FROM swiftdocker/swift

# Create app directory
RUN mkdir -p /usr/src/note-swift
WORKDIR /usr/src/note-swift

# Bundle app source
COPY . /usr/src/note-swift

# install a few missing pieces
RUN apt-get update
RUN apt-get install libz-dev unzip

RUN make

EXPOSE 8081 8443
CMD [ ".build/debug/node-swift", "serve" ]
