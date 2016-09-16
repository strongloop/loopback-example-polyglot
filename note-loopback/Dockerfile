FROM node:6.6

# Create app directory
RUN mkdir -p /usr/src/note-loopback
WORKDIR /usr/src/note-loopback

# Bundle app source
COPY . /usr/src/note-loopback

# Install app dependencies
COPY package.json /usr/src/note-loopback
RUN npm install

EXPOSE 3000 50051
CMD [ "npm", "start" ]
