const UNAUTH_SESSION_ID = '00000000000000000000000000000000';
const DEFAULT_SESSION_TIMEOUT = 5000;

const parseResult = result =>
	new Promise((res, rej) => {
		if (result.error) { return rej(result.error); }
		if (result.result[0] !== 0) { return rej(result); }
		result = result.result[1];
		if (result && result.status === 'error') {
			return rej(result.message);
		}
		return res(result);
	})

class UhttpdService {
	constructor() {
		const origin = window.origin
		const defaultHost = `http://thisnode.info`
		this.url = `${defaultHost}/ubus`;
		this.jsonrpc = '2.0';
		this.sec = 0;
		this.requestList = [];
	}

	sid() {
		const sid = sessionStorage.getItem('sid');
		return sid || UNAUTH_SESSION_ID;
	}

	addId() {
		this.sec += 1;
		return Number(this.sec);
	}


	async call(action, method, data, hostname, customSid = null, timeout = null) {
		const url = hostname ? `http://${hostname}/ubus` : this.url // Must be dynamic to pull from other nodes
		this.sec +=1;
		const body = {
			id: this.addId(),
			jsonrpc: this.jsonrpc,
			method: 'call',
			params: [customSid || this.sid(), action, method, data]
		};
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), timeout || 15000);
		return fetch(url,
			{ method: 'POST', body: JSON.stringify(body), signal: controller.signal })
			.then(response => response.json())
			.then(parseResult)
			.finally(clearTimeout(id));
	}

	login(username, password, hostname) {
		const data = { username, password, timeout: DEFAULT_SESSION_TIMEOUT };
		return this.call('session', 'login', data, hostname, UNAUTH_SESSION_ID)
			.then(response =>
				new Promise((res, rej) => {
					if (response.ubus_rpc_session) {
						sessionStorage.setItem('sid', response.ubus_rpc_session);
						res(response);
					}
					else {
						rej(response);
					}
				}));
	}
}

const api = new UhttpdService();