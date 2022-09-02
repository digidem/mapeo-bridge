FROM node:16-alpine

# create destination directory
RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/output
WORKDIR /usr/src/app

# copy the app, note .dockerignore
COPY . /usr/src/app/
RUN npm install --fetch-retry-maxtimeout 300000 --no-optional
# build necessary, even if no static files are needed,
# since it builds the server as well

# expose ports on container
EXPOSE 5353
EXPOSE 42157

# ENVs
ENV MAPEO_PROJECT_KEY=af43cbdb6827d3ddc5b39b20df174bf5c3e44d9bbcdccfe034af090440cebf69
ENV STORAGE_PATH=/usr/src/output
# start the app
CMD [ "npm", "start" ]
