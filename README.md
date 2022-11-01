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

The Mapeo server comes pre-configured to run with the project key of the [community-networks config](https://github.com/digidem/config-cn/releases). To change the project-key run the project with the `MAPEO_PROJECT_KEY` set to your key.

### TODO

- Add all community supported LibreMesh (LROS) devices
    - librerouter-v1
    - tp-link-tl-wdr3500-v1
    - tp-link-archer-c5-v1
    - tp-link-tl-wdr4300-v1
    - tp-link-cpe510-v11
    - tp-link-cpe510-v10
    - tp-link-cpe510-v20
    - tp-link-cpe210-v20
    - tp-link-cpe210-v11
    - wd-my-net-n600
- Only show connections for observation once clicked
- Cache all data
- Add visual cue as to connection to Mapeo server and LibreMesh node
- Re-write using a framework and taking into account performance and network failure
- Add support for offline map tiles from [tileserver-gl](https://github.com/maptiler/tileserver-gl) or Mapeo map-server

### Future work

- Add [Grafana](https://github.com/libremesh/lime-packages/blob/master/packages/altermundi-grafana/files/etc/uci-defaults/90_altermundi-grafana) dashboard
- Analyze Grafana historic data and generate network notifications to a [gotify](https://gotify.net/) server