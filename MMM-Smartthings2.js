/* global Module */

/* Magic Mirror
 * Module: MMM-Smartthings
 *
 * By BuzzKC
 * MIT Licensed.
 */

Module.register("MMM-Smartthings2", {
	deviceStatuses: [],

	defaults: {
		updateInterval: 30000, //API rate limit: A maximum of 250 executions per minute is allowed for each installed SmartApp or Device Handler.
		personalAccessToken: '', //setup personal access token at https://account.smartthings.com/tokens,
		capabilities: [],
		excludedDeviceNames: [],
	},

	/*
		Capabilities statuses implemented:
		"switch"
		"contactSensor"
		"lock"
		"temperatureMeasurement"
		"relativeHumidityMeasurement"
		"motionSensor"

		Other capabilities reference: https://docs.smartthings.com/en/latest/capabilities-reference.html
	 */

	requiresVersion: "2.1.0", // Required version of MagicMirror

	start: function() {
		let self = this;

		//Flag for check if module is loaded
		this.loaded = false;
		this.sendConfig();
		this.getData();

		// Schedule update timer.
		this.scheduleUpdate(2000); // 2000 = 2s
	},

	sendConfig: function() {
		this.sendSocketNotification('SEND_CONFIG', this.config);
	},

	/*
	 * getData
	 * function example return data and show it in the module wrapper
	 * get a URL request
	 *
	 */
	getData: function() {
		this.sendSocketNotification("GET_DEVICES", null);
	},


	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update.
	 *  If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function(delay) {
		let nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		nextLoad = nextLoad ;
		let self = this;
		setTimeout(function() {
			self.updateDom();
			self.getData();
			self.scheduleUpdate();
		}, nextLoad);
	},

	// output dom object
	// create a list of statuses for each device type
	//
	getDom: function() {
		let self = this;

		// this is our dom  object wrapper
        const wrapper = document.createElement('div');
		wrapper.id = 'MMM-Smartthings2';
		wrapper.className = 'sensors';

		// check if we do have device statuses
		if (this.deviceStatuses === null || this.deviceStatuses.length === 0) {
			wrapper.innerHTML =	'<div class="loading"><span class="zmdi zmdi-rotate-right zmdi-hc-spin"></span> Loading...</div>';

			//retry ui update in a few seconds, data may still be loading
			setTimeout(function() {
				self.updateDom();
			}, 5000);

			return wrapper;
		}

		// list of devices sorted by name
		// (this will make devices appear name sorted on screen)
		this.deviceStatuses = this.deviceStatuses.sort(this.compareDeviceNames); //sort device names

		// get all device types
		for (let i = 0; i < this.config.capabilities.length; i++) {
			let capability = this.config.capabilities[i];
			wrapper.innerHTML += `<span class="title">${self.getTitle(capability)}</span>`;

			// count sensors
			let sensorsCount = 0
			let sensorsSkipped = 0;

			// collect sensor html
			let html = '';

			// show device of current capability
			for (let j=0; j < this.deviceStatuses.length; j++) {
				let device = this.deviceStatuses[j];

				// check device type
				if (device.deviceType != capability) {
					continue;
				}

				// count sensors
				sensorsCount++;

				switch (device.deviceType) {
					case 'contactSensor':
						if (!this.config[capability].skipClosed || device.value == 'open')  {
							html += self.getDeviceHTML(device);
						} else {
							sensorsSkipped++;
						}
						break;
					case 'switch':
					case 'lock':
					case 'temperatureMeasurement':
					case 'relativeHumidityMeasurement':
					case 'motionSensor':
					default:
						html += self.getDeviceHTML(device);
				};
			}

			// add to dom
			wrapper.innerHTML += html;

			// summary for skipped sensors
			switch (capability) {
				case 'contactSensor':
					let msg = '';
					if (sensorsSkipped == sensorsCount) {
						msg = 'all';
					} else if (sensorsSkipped > 0)  {
						msg = 'part';
					}
					if (this.config[capability].summary[msg] !== undefined) {
						wrapper.innerHTML += `<div class="sensor summary">${this.config[capability].summary[msg]}</div>`;
					}
					break;
				case 'switch':
				case 'lock':
				case 'temperatureMeasurement':
				case 'relativeHumidityMeasurement':
				case 'motionSensor':
				default:
					break;
			};
		}

		// done
		return wrapper;
	},

	getTitle: function(capability) {
		if (this.config[capability] === undefined || this.config[capability].title === undefined) {
			return capability;
		}
		return this.config[capability].title;
	},

	getSummary: function(capability, msg) {
		if (this.config[capability].summary[msg] === undefined) {
			return `All other ${this.getTitle(capabbility)} are `;
		}
		return this.config[capability].summary[msg];
	},

	getDeviceHTML(device) {
		let iconClass = 'zmdi';
		let rowClass = '';
		if (device.value === 'locked' || device.value === 'closed') {
			iconClass = `${iconClass} zmdi-lock`;
			rowClass = `${rowClass} ok`;
		} else if (device.value === 'unlocked' || device.value === 'open') {
			iconClass = `${iconClass} zmdi-lock-open`;
			rowClass = `${rowClass} error`;
		} else if (device.value === 'on') {
			ionClass = `${iconClass} zmdi-power`;
			rowClass = `${rowClass} error`;
		} else if (device.value === 'off') {
			iconClass = `${iconClass} zmdi-minus-circle-outline`;
			rowClass = `${rowClass} ok`;
		} else if (device.deviceType === 'temperatureMeasurement') {
			if (device.value <= this.config.tempLowValue) {
				iconClass = `sensor-temp-low fa fa-thermometer-empty`;
			} else if (device.value >= this.config.tempHighValue) {
				iconClass = `sensor-temp-high fa fa-thermometer-full`;
			} else {
				iconClass = `sensor-temp fa fa-thermometer-half`;
			}
		} else if (device.deviceType === 'relativeHumidityMeasurement') {
			iconClass = `${iconClass} zmdi-grain`;
		} else if (device.deviceType === 'motionSensor') {
			if(device.value === 'active') {
				iconClass = `sensor-motion ${iconClass} zmdi-run`;
			} else {
				iconClass = `${iconClass} zmdi-run`;
			}
		}

		let html = `
			<div class="sensor ${rowClass}">
				<div class="top">
					<div class="sensor-status-icon ${iconClass}"></div>
						<div class="sensor-name">${device.deviceName}
							<small>${device.value}</small>
						</div>
  					</div>
				</div>
		`;

		// done
		return html;
	},

	compareDeviceNames: function (a, b) {
		// Use toUpperCase() to ignore character casing
		const deviceNameA = a.deviceName.toUpperCase();
		const deviceNameB = b.deviceName.toUpperCase();

		let comparison = 0;
		if (deviceNameA > deviceNameB) {
			comparison = 1;
		} else if (deviceNameA < deviceNameB) {
			comparison = -1;
		}
		return comparison;
	},

	compareDeviceTypes: function (a, b) {
		// Use toUpperCase() to ignore character casing
		const deviceTypeA = a.deviceType.toUpperCase();
		const deviceTypeB = b.deviceType.toUpperCase();

		let comparison = 0;
		if (deviceTypeA > deviceTypeB) {
			comparison = 1;
		} else if (deviceTypeA < deviceTypeB) {
			comparison = -1;
		}
		return comparison;
	},

	getScripts: function() {
		return [
			'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.min.js',
		];
	},

	getStyles: function () {
		return [
			'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
			'https://cdnjs.cloudflare.com/ajax/libs/material-design-iconic-font/2.2.0/css/material-design-iconic-font.min.css',
			"MMM-Smartthings2.css",
		];
	},

	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
		if(notification === "DEVICE_STATUS_FOUND") {
			this.deviceStatuses = payload;
		}

		//messages to display in console from node_helper and other backend processes.
		if (notification === "ConsoleOutput") {
			console.log("MMM-Smartthings2: " + payload);
		}
	}
});
