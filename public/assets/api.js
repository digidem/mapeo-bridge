// import api from 'utils/uhttpd.service';
// import { DEFAULT_COMMUNITY_SETTINGS } from 'utils/constants';

const getCloudNodes = () => api.call('lime-utils', 'get_cloud_nodes', {})

const getMetrics = (params) => api.call('lime-metrics', 'get_metrics', params)
	// .pipe(
	// 	map(result => Object.assign({}, result, { target: params.target }))
	// );

const getAllMetrics = (params) => params.targets.map(x => getMetrics(api, { target: x }));

const getGateway = () => api.call('lime-metrics', 'get_gateway', {});

const getPath = (params) => api.call('lime-metrics', 'get_path', params);

const getLastKnownPath = (params) => api.call('lime-metrics', 'get_last_internet_path', params);

const getMeshIfaces = () =>
	api.call('lime-utils', 'get_mesh_ifaces', {})
		.then(res => res.ifaces);

const getAssocList = (iface) =>
	api.call('iwinfo', 'assoclist', { device: iface })
		.then(res => res.results);

function getBatHost(mac, outgoingIface) {
	return api.call('bat-hosts', 'get_bathost', { mac, outgoing_iface: outgoingIface })
		.then(response => new Promise((res, rej) => {
			if (response.status === 'ok') {
				res(response.bathost);
			}
			else {
				rej(response.message);
			}
		}))
}

function getBoardData() {
	return api.call('system', 'board', {});
}

function getSession() {
	return api.call('session', 'access', {}).
		then(async (result) => {
			let username = null;
			if (result['access-group']['root']) {
				username = 'root';
			} else if (result['access-group']['lime-app']) {
				username = 'lime-app';
			}
			return ({ username })
		})
		.catch(async () => ({ username: null }));
}

// function getCommunitySettings() {
// 	return api.call('lime-utils', 'get_community_settings', {})
// 		.then(res => ({ ...res, DEFAULT_COMMUNITY_SETTINGS }))
// 		.catch(() => DEFAULT_COMMUNITY_SETTINGS);
// }

function reboot() {
	return api.call('system', 'reboot', {}).then(() => true);
}

function checkInternet() {
	return api.call('check-internet', 'is_connected', {});
}

async function getChangesNeedReboot() {
	return sessionStorage.getItem('need-reboot') == 'yes';
}

async function setChangesNeedReboot(value) {
	sessionStorage.setItem('need-reboot', value);
	return value;
}
