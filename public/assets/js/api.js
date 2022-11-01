const getCloudNodes = () => api.call('lime-utils', 'get_cloud_nodes', {})

const getMetrics = (params) => api.call('lime-metrics', 'get_metrics', params)

const getAllMetrics = (params) => params.targets.map(x => getMetrics(api, { target: x }));

const getGateway = () => api.call('lime-metrics', 'get_gateway', {});

const getPath = (params) => api.call('lime-metrics', 'get_path', params);

const getLastKnownPath = (params) => api.call('lime-metrics', 'get_last_internet_path', params);

const getMeshIfaces = (hostname) =>
	api.call('lime-utils', 'get_mesh_ifaces', {}, hostname)
		.then(res => res.ifaces);

const getAssocList = (iface, hostname) =>
	api.call('iwinfo', 'assoclist', { device: iface }, hostname)
		.then(res => res.results);
// .then(res => mocked.results);

function getBatHost(mac, outgoingIface, hostname) {
	return api.call('bat-hosts', 'get_bathost', { mac, outgoing_iface: outgoingIface }, hostname)
		.then(response => new Promise((res, rej) => {
			if (response.status === 'ok') {
				res(response.bathost);
			}
			else {
				rej(response.message);
			}
		}))
}

function getBoardData(hostname) {
	return api.call('system', 'board', {}, hostname);
}

function getSession(hostname) {
	return api.call('session', 'access', {}, hostname).
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

function getCommunitySettings(hostname) {
	return api.call('lime-utils', 'get_community_settings', {})

}

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
