# Mapeo Bridge

## Usage

Easiest way is to run on Docker:

```
docker run -it \
    --network=host \
    -v /path/to/storage:/root/.mapeo-bridge \
    communityfirst/mapeo-bridge:libremesh
```

We need to use `network=host` for local mDNS discovery to work properly.

Or clone the project, install with `npm i` and run with `npm start`.

The interface will load on [localhost:3000](http://localhost:3000/).

The Mapeo server comes pre-configured to run with the project key of the [community-networks config](). To change the project-key run the project with the `MAPEO_PROJECT_KEY` set to your key.

### Goals

- Syncronize with Mapeo devices
- Convert Mapeo "Terrastories" category data into Terrastories compatible spreadsheets
