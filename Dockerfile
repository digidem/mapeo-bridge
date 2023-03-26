FROM node:16-alpine

# create destination directory
RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/output
WORKDIR /usr/src/app

COPY . /usr/src/app/
RUN npm install --fetch-retry-maxtimeout 300000 --no-optional

# expose ports on container
EXPOSE 5353
EXPOSE 42157
EXPOSE 8084
# start the app
CMD [ "npm", "start" ]
