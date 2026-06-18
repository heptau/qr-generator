(function () {
	'use strict';

	let mainDisplayCanvas,
		mainDisplayCtx,
		ecInput,
		fgColorInput,
		bgColorInput,
		diagnosticMessageContainer,
		qrTypeSelect,
		dynamicFormFieldsContainer,
		downloadBtn,
		exportFormatSelect,
		shareBtn,
		copyBtn,
		qrGenerationError;
	const dpr = window.devicePixelRatio || 1;

	function tr(key) {
		return typeof window.__ === 'function' ? window.__(key) : key;
	}

	function czAccountToIban(input) {
		if (!input) return null;
		var cleaned = input.replace(/\s+/g, '');

		var parts = cleaned.split('/');
		if (parts.length !== 2) return null;

		var beforeSlash = parts[0];
		var bankCode = parts[1];

		if (!beforeSlash.includes('-') && beforeSlash.length > 10) {
			beforeSlash = beforeSlash.slice(0, -10) + '-' + beforeSlash.slice(-10);
			cleaned = beforeSlash + '/' + bankCode;
		}

		var match = cleaned.match(/^(?:(\d{0,6})-)?(\d{3,20})\/(\d{4})$/);
		if (!match) return null;

		var prefix = (match[1] || '').padStart(6, '0');
		var account = match[2].padStart(10, '0');
		bankCode = match[3];

		var bban = bankCode + prefix + account;
		var checkStr = bban + '123500';

		var mod = 0;
		for (var i = 0; i < checkStr.length; i++) {
			mod = (mod * 10 + parseInt(checkStr[i], 10)) % 97;
		}
		var checkDigits = (98 - mod).toString().padStart(2, '0');

		return 'CZ' + checkDigits + bban;
	}

	const qrCodeTypes = {
		text: {
			fields: [{ name: 'textContent', labelKey: 'field.textContent', type: 'textarea', placeholderKey: 'placeholder.text', rows: 4 }],
			formatter: (data) => data.textContent || '',
		},
		url: {
			fields: [{ name: 'url', labelKey: 'field.url', type: 'url', placeholderKey: 'placeholder.url', inputmode: 'url' }],
			formatter: (data) => {
				let url = data.url || '';
				if (url && !/^[a-zA-Z]+:\/\//.test(url) && url.includes('.')) {
					url = 'http://' + url;
				}
				return url;
			},
		},
		wifi: {
			fields: [
				{ name: 'ssid', labelKey: 'field.ssid', type: 'text', placeholderKey: 'placeholder.ssid' },
				{ name: 'password', labelKey: 'field.password', type: 'password', placeholderKey: 'placeholder.password', inputmode: 'text' },
				{
					name: 'encryption',
					labelKey: 'field.encryption',
					type: 'select',
					options: [
						{ value: 'WPA', textKey: 'wifi.encryption.WPA' },
						{ value: 'WEP', textKey: 'wifi.encryption.WEP' },
						{ value: 'nopass', textKey: 'wifi.encryption.nopass' },
					],
					defaultValue: 'WPA',
				},
				{ name: 'hiddenSSID', labelKey: 'field.hiddenSSID', type: 'checkbox', defaultValue: false },
			],
			formatter: (data) => {
				let wifiString = `WIFI:T:${data.encryption || 'nopass'};S:${data.ssid || ''};`;
				if (data.encryption !== 'nopass' && data.password) {
					const escapeWifiValue = (val) => val.replace(/([\\;,":])/g, '\\$1');
					wifiString += `P:${escapeWifiValue(data.password)};`;
				}
				if (data.hiddenSSID) {
					wifiString += `H:true;`;
				}
				wifiString += ';';
				return wifiString;
			},
		},
		geo: {
			fields: [
				{
					name: 'latitude',
					labelKey: 'field.latitude',
					type: 'number',
					placeholderKey: 'placeholder.latitude',
					step: 'any',
					inputmode: 'decimal',
				},
				{
					name: 'longitude',
					labelKey: 'field.longitude',
					type: 'number',
					placeholderKey: 'placeholder.longitude',
					step: 'any',
					inputmode: 'decimal',
				},
				{
					name: 'actionGetCurrentPosition',
					type: 'button',
					textKey: 'field.actionGetCurrentPosition',
					onClickFunction: 'getCurrentGeolocation',
				},
			],
			formatter: (data) => (data.latitude && data.longitude ? `geo:${data.latitude},${data.longitude}` : ''),
		},
		email: {
			fields: [
				{ name: 'emailTo', labelKey: 'field.emailTo', type: 'email', placeholderKey: 'placeholder.emailTo', inputmode: 'email' },
				{ name: 'emailSubject', labelKey: 'field.emailSubject', type: 'text', placeholderKey: 'placeholder.emailSubject' },
				{ name: 'emailBody', labelKey: 'field.emailBody', type: 'textarea', placeholderKey: 'placeholder.emailBody', rows: 3 },
			],
			formatter: (data) => {
				let mailtoString = `mailto:${data.emailTo || ''}`;
				const params = [];
				if (data.emailSubject) params.push(`subject=${encodeURIComponent(data.emailSubject)}`);
				if (data.emailBody) params.push(`body=${encodeURIComponent(data.emailBody)}`);
				if (params.length > 0) mailtoString += `?${params.join('&')}`;
				return mailtoString;
			},
		},
		tel: {
			fields: [
				{
					name: 'phoneNumber',
					labelKey: 'field.phoneNumber',
					type: 'tel',
					placeholderKey: 'placeholder.phoneNumber',
					inputmode: 'tel',
				},
			],
			formatter: (data) => (data.phoneNumber ? `tel:${data.phoneNumber.replace(/\s+/g, '')}` : ''),
		},
		sms: {
			fields: [
				{ name: 'smsTo', labelKey: 'field.smsTo', type: 'tel', placeholderKey: 'placeholder.smsTo', inputmode: 'tel' },
				{ name: 'smsBody', labelKey: 'field.smsBody', type: 'textarea', placeholderKey: 'placeholder.smsBody', rows: 3 },
			],
			formatter: (data) => {
				const number = data.smsTo ? data.smsTo.replace(/\s+/g, '') : '';
				const body = data.smsBody || '';
				return number ? `SMSTO:${number}:${encodeURIComponent(body)}` : body ? `SMSTO::${encodeURIComponent(body)}` : '';
			},
		},
		spayd: {
			fields: [
				{
					name: 'spayd_iban',
					labelKey: 'field.spayd_iban',
					type: 'text',
					placeholderKey: 'placeholder.spayd_iban',
					inputmode: 'text',
					autocapitalize: 'characters',
					pattern: '[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[A-Z0-9]{0,16}|\\d{0,6}-?\\d{3,20}/\\d{4}',
				},
				{
					name: 'spayd_amount',
					labelKey: 'field.spayd_amount',
					type: 'number',
					placeholderKey: 'placeholder.spayd_amount',
					step: '0.01',
					inputmode: 'decimal',
				},
				{
					name: 'spayd_currency',
					labelKey: 'field.spayd_currency',
					type: 'text',
					value: 'CZK',
					autocapitalize: 'characters',
					pattern: '[A-Z]{3}',
					maxLength: 3,
				},
				{
					name: 'spayd_vs',
					labelKey: 'field.spayd_vs',
					type: 'text',
					placeholderKey: 'placeholder.spayd_vs',
					inputmode: 'numeric',
					maxLength: 10,
				},
				{
					name: 'spayd_ks',
					labelKey: 'field.spayd_ks',
					type: 'text',
					placeholderKey: 'placeholder.spayd_ks',
					inputmode: 'numeric',
					maxLength: 4,
				},
				{
					name: 'spayd_ss',
					labelKey: 'field.spayd_ss',
					type: 'text',
					placeholderKey: 'placeholder.spayd_ss',
					inputmode: 'numeric',
					maxLength: 10,
				},
				{
					name: 'spayd_message',
					labelKey: 'field.spayd_message',
					type: 'text',
					placeholderKey: 'placeholder.spayd_message',
					maxLength: 60,
				},
				{ name: 'spayd_date', labelKey: 'field.spayd_date', type: 'date' },
			],
			formatter: (data) => {
				let spaydString = 'SPD*1.0';
				const appendIfPresent = (tag, value, isNumericOnly = false, maxLength = 0) => {
					if (value !== undefined && value !== null && String(value).trim() !== '') {
						let val = String(value).trim();
						if (isNumericOnly) val = val.replace(/[^0-9]/g, '');
						if (maxLength > 0 && val.length > maxLength) val = val.substring(0, maxLength);
						if (val) spaydString += `*${tag}:${val.toUpperCase()}`;
					}
				};
				const appendAmount = (tag, value) => {
					if (value !== undefined && value !== null && String(value).trim() !== '') {
						const numValue = parseFloat(value);
						if (!isNaN(numValue)) {
							spaydString += `*${tag}:${numValue.toFixed(2)}`;
						}
					}
				};

				var rawIban = data.spayd_iban ? data.spayd_iban.replace(/\s+/g, '').toUpperCase() : '';
				var iban = czAccountToIban(rawIban) || rawIban;
				appendIfPresent('ACC', iban || null);
				appendAmount('AM', data.spayd_amount);
				appendIfPresent('CC', data.spayd_currency || 'CZK');
				appendIfPresent('X-VS', data.spayd_vs, true, 10);
				appendIfPresent('X-KS', data.spayd_ks, true, 4);
				appendIfPresent('X-SS', data.spayd_ss, true, 10);
				appendIfPresent('MSG', data.spayd_message, false, 60);
				if (data.spayd_date) {
					try {
						const date = new Date(data.spayd_date);
						if (!isNaN(date.getTime())) {
							const year = date.getFullYear();
							const month = (date.getMonth() + 1).toString().padStart(2, '0');
							const day = date.getDate().toString().padStart(2, '0');
							appendIfPresent('DT', `${year}${month}${day}`);
						}
					} catch (e) {
						console.warn('Neplatný formát data pro SPAYD DT:', data.spayd_date);
					}
				}
				return spaydString.includes('*ACC:') && spaydString.length > 'SPD*1.0*ACC:'.length ? spaydString : '';
			},
		},
		sepa: {
			fields: [
				{ name: 'sepa_name', labelKey: 'field.sepa_name', type: 'text', placeholderKey: 'placeholder.sepa_name', maxLength: 70 },
				{
					name: 'sepa_iban',
					labelKey: 'field.sepa_iban',
					type: 'text',
					placeholderKey: 'placeholder.sepa_iban',
					inputmode: 'text',
					autocapitalize: 'characters',
					pattern: '[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[A-Z0-9]{0,16}|\\d{0,6}-?\\d{3,20}/\\d{4}',
				},
				{
					name: 'sepa_bic',
					labelKey: 'field.sepa_bic',
					type: 'text',
					placeholderKey: 'placeholder.sepa_bic',
					inputmode: 'text',
					autocapitalize: 'characters',
					pattern: '[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?',
					maxLength: 11,
				},
				{
					name: 'sepa_amount',
					labelKey: 'field.sepa_amount',
					type: 'number',
					placeholderKey: 'placeholder.sepa_amount',
					step: '0.01',
					inputmode: 'decimal',
				},
				{
					name: 'sepa_currency',
					labelKey: 'field.sepa_currency',
					type: 'text',
					value: 'EUR',
					autocapitalize: 'characters',
					pattern: '[A-Z]{3}',
					maxLength: 3,
				},
				{
					name: 'sepa_reference',
					labelKey: 'field.sepa_reference',
					type: 'text',
					placeholderKey: 'placeholder.sepa_reference',
					maxLength: 140,
				},
				{
					name: 'sepa_message',
					labelKey: 'field.sepa_message',
					type: 'text',
					placeholderKey: 'placeholder.sepa_message',
					maxLength: 140,
				},
			],
			formatter: (data) => {
				const serviceTag = 'BCD';
				const version = '002';
				const characterSet = '1';
				const identification = 'SCT';

				const bic = data.sepa_bic ? data.sepa_bic.toUpperCase().replace(/\s+/g, '') : '';
				const name = data.sepa_name || '';
				const rawIban = data.sepa_iban ? data.sepa_iban.toUpperCase().replace(/\s+/g, '') : '';
				const iban = czAccountToIban(rawIban) || rawIban;
				let amount = '';
				if (data.sepa_amount) {
					const numValue = parseFloat(data.sepa_amount);
					if (!isNaN(numValue) && numValue > 0) {
						amount = numValue.toFixed(2);
					}
				}
				const currency = data.sepa_currency || 'EUR';
				const remittanceInfo = data.sepa_reference || '';
				const purposeCode = '';
				const unstructuredRemittanceInfo = data.sepa_message || '';

				if (!iban || !name || !amount || !bic || currency !== 'EUR') {
					return '';
				}

				const lines = [
					serviceTag,
					version,
					characterSet,
					identification,
					bic,
					name.substring(0, 70),
					iban,
					currency + amount,
					purposeCode,
					remittanceInfo.substring(0, 140),
					unstructuredRemittanceInfo.substring(0, 140),
					'',
				];
				return lines.join('\n');
			},
		},
	};

	function setDiagnosticMessage(message, type) {
		if (!diagnosticMessageContainer) return;
		diagnosticMessageContainer.innerHTML = '';
		if (!message) return;
		const p = document.createElement('p');
		p.textContent = message;
		if (type === 'success') p.classList.add('message-success');
		else if (type === 'error') p.classList.add('message-error');
		diagnosticMessageContainer.appendChild(p);
	}

	function getCurrentGeolocation() {
		if (navigator.geolocation) {
			setDiagnosticMessage(tr('msg.geolocating'), 'info');
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const latField = document.getElementById('field-latitude');
					const lonField = document.getElementById('field-longitude');
					if (latField) latField.value = position.coords.latitude.toFixed(6);
					if (lonField) lonField.value = position.coords.longitude.toFixed(6);
					setDiagnosticMessage(tr('msg.geolocationSuccess'), 'success');
					updateQR();
					setTimeout(() => setDiagnosticMessage(''), 3000);
				},
				(error) => {
					let msg = tr('msg.geolocationError');
					switch (error.code) {
						case error.PERMISSION_DENIED:
							msg += tr('msg.geolocationDenied');
							break;
						case error.POSITION_UNAVAILABLE:
							msg += tr('msg.geolocationUnavailable');
							break;
						case error.TIMEOUT:
							msg += tr('msg.geolocationTimeout');
							break;
						default:
							msg += tr('msg.geolocationUnknown');
							break;
					}
					console.error(msg, error);
					setDiagnosticMessage(msg, 'error');
				},
				{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
			);
		} else {
			setDiagnosticMessage(tr('msg.geolocationNotSupported'), 'error');
		}
	}
	window.getCurrentGeolocation = getCurrentGeolocation;

	function renderQrTypeForm(typeKey) {
		dynamicFormFieldsContainer.innerHTML = '';
		const typeConfig = qrCodeTypes[typeKey];
		if (!typeConfig) {
			updateQR();
			return;
		}

		const fieldset = document.createElement('fieldset');
		fieldset.className = 'control-group';

		typeConfig.fields.forEach((field) => {
			const row = document.createElement('div');
			row.className = 'form-row';

			if (field.type === 'button') {
				const button = document.createElement('button');
				button.type = 'button';
				button.textContent = field.textKey ? tr(field.textKey) : field.text;
				button.className = 'small-action-button';
				if (field.onClickFunction && typeof window[field.onClickFunction] === 'function') {
					button.addEventListener('click', window[field.onClickFunction]);
				}
				row.style.justifyContent = 'center';
				row.appendChild(button);
			} else if (field.type === 'checkbox') {
				const label = document.createElement('label');
				label.htmlFor = `field-${field.name}`;
				label.textContent = field.labelKey ? tr(field.labelKey) : field.label;
				row.appendChild(label);

				const toggleLabel = document.createElement('label');
				toggleLabel.className = 'toggle-switch';
				toggleLabel.htmlFor = `field-${field.name}`;

				const inputElement = document.createElement('input');
				inputElement.type = 'checkbox';
				inputElement.id = `field-${field.name}`;
				inputElement.name = field.name;
				inputElement.checked = field.defaultValue === true;

				const slider = document.createElement('span');
				slider.className = 'toggle-slider';

				inputElement.addEventListener('change', updateQR);
				toggleLabel.appendChild(inputElement);
				toggleLabel.appendChild(slider);
				row.appendChild(toggleLabel);
			} else {
				const label = document.createElement('label');
				label.htmlFor = `field-${field.name}`;
				label.textContent = (field.labelKey ? tr(field.labelKey) : field.label) + ':';
				row.appendChild(label);

				let inputElement;
				if (field.type === 'textarea') {
					inputElement = document.createElement('textarea');
					inputElement.rows = field.rows || 3;
				} else if (field.type === 'select') {
					inputElement = document.createElement('select');
					field.options.forEach((opt) => {
						const option = document.createElement('option');
						option.value = opt.value;
						option.textContent = opt.textKey ? tr(opt.textKey) : opt.text;
						if (opt.value === field.defaultValue) option.selected = true;
						inputElement.appendChild(option);
					});
				} else {
					inputElement = document.createElement('input');
					inputElement.type = field.type === 'text' ? 'search' : field.type;
					if (field.type === 'text') inputElement.autocomplete = 'off';
					if (field.step) inputElement.step = field.step;
					if (field.maxLength) inputElement.maxLength = field.maxLength;
					if (field.pattern) inputElement.pattern = field.pattern;
					if (field.value) inputElement.value = field.value;
					if (field.readonly) inputElement.readOnly = true;
				}
				inputElement.id = `field-${field.name}`;
				inputElement.name = field.name;
				inputElement.placeholder = field.placeholderKey ? tr(field.placeholderKey) : field.placeholder || '';
				if (field.inputmode) inputElement.inputMode = field.inputmode;

				if (field.autocapitalize) {
					inputElement.autocapitalize = field.autocapitalize;
					if (field.autocapitalize === 'characters') {
						inputElement.style.textTransform = 'uppercase';
						inputElement.addEventListener('input', function (e) {
							const start = this.selectionStart;
							const end = this.selectionEnd;
							this.value = this.value.toUpperCase();
							this.setSelectionRange(start, end);
						});
					}
				}

				if (field.name.includes('iban')) {
					inputElement.addEventListener('blur', function () {
						var converted = czAccountToIban(this.value);
						if (converted) {
							this.value = converted;
						}
						updateQR();
					});
				}

				inputElement.addEventListener('input', updateQR);
				row.appendChild(inputElement);
			}
			fieldset.appendChild(row);
		});
		dynamicFormFieldsContainer.appendChild(fieldset);
		updateQR();
	}

	function getCurrentQrDataString() {
		const selectedType = qrTypeSelect.value;
		const typeConfig = qrCodeTypes[selectedType];
		if (!typeConfig) return '';

		const formData = {};
		typeConfig.fields.forEach((field) => {
			if (field.type === 'button') return;
			const inputElement = document.getElementById(`field-${field.name}`);
			if (inputElement) {
				formData[field.name] = field.type === 'checkbox' ? inputElement.checked : inputElement.value;
			} else {
				formData[field.name] = field.type === 'checkbox' ? false : '';
			}
		});
		return typeConfig.formatter(formData);
	}

	function initializeElements() {
		mainDisplayCanvas = document.getElementById('qrCanvas');
		mainDisplayCtx = mainDisplayCanvas.getContext('2d');
		ecInput = document.getElementById('ecLevel');
		fgColorInput = document.getElementById('fgColor');
		bgColorInput = document.getElementById('bgColor');
		diagnosticMessageContainer = document.getElementById('diagnosticMessageContainer');
		qrTypeSelect = document.getElementById('qrTypeSelect');
		dynamicFormFieldsContainer = document.getElementById('dynamic-form-fields-container');
		downloadBtn = document.getElementById('downloadButton');
		exportFormatSelect = document.getElementById('exportFormatSelect');
		shareBtn = document.getElementById('shareButton');
		copyBtn = document.getElementById('copyButton');
	}

	function generateQRForDisplay(dataString, ecLevel, fgHex, bgHex) {
		if (typeof QRCode === 'undefined') {
			console.error('QRCode N/A');
			return;
		}
		if (!mainDisplayCtx || !mainDisplayCanvas) {
			return;
		}

		var displayModulePx = 8;
		var margin = 2;

		if (isInputEmpty(dataString)) {
			qrGenerationError = false;
			var placeholderSize = 200;
			mainDisplayCanvas.width = placeholderSize * dpr;
			mainDisplayCanvas.height = placeholderSize * dpr;
			mainDisplayCanvas.style.width = placeholderSize + 'px';
			mainDisplayCtx.scale(dpr, dpr);
			mainDisplayCtx.fillStyle = bgHex;
			mainDisplayCtx.fillRect(0, 0, placeholderSize, placeholderSize);
			mainDisplayCtx.font = '14px Arial';
			mainDisplayCtx.fillStyle = '#AAAAAA';
			mainDisplayCtx.textAlign = 'center';
			mainDisplayCtx.fillText(tr('msg.enterData'), placeholderSize / 2, placeholderSize / 2);
			return;
		}

		try {
			var qr = QRCode.create(dataString || ' ', { errorCorrectionLevel: ecLevel });
		} catch (e) {
			qrGenerationError = true;
			var errSize = 200;
			mainDisplayCanvas.width = errSize * dpr;
			mainDisplayCanvas.height = errSize * dpr;
			mainDisplayCanvas.style.width = errSize + 'px';
			mainDisplayCtx.scale(dpr, dpr);
			mainDisplayCtx.fillStyle = bgHex;
			mainDisplayCtx.fillRect(0, 0, errSize, errSize);
			mainDisplayCtx.font = 'bold 12px Arial';
			mainDisplayCtx.fillStyle = '#cc0000';
			mainDisplayCtx.textAlign = 'center';
			mainDisplayCtx.fillText(tr('msg.dataTooLong'), errSize / 2, errSize / 2);
			return;
		}

		qrGenerationError = false;

		var numModules = qr.modules.size;
		var qrData = qr.modules.data;
		var displaySize = (numModules + 2 * margin) * displayModulePx;

		mainDisplayCanvas.width = Math.round(displaySize * dpr);
		mainDisplayCanvas.height = Math.round(displaySize * dpr);
		mainDisplayCanvas.style.width = Math.round(displaySize) + 'px';

		mainDisplayCtx.scale(dpr, dpr);

		mainDisplayCtx.fillStyle = bgHex;
		mainDisplayCtx.fillRect(0, 0, displaySize, displaySize);
		mainDisplayCtx.fillStyle = fgHex;

		var quietPx = margin * displayModulePx;
		for (var y = 0; y < numModules; y++) {
			for (var x = 0; x < numModules; x++) {
				if (qrData[y * numModules + x]) {
					mainDisplayCtx.fillRect(quietPx + x * displayModulePx, quietPx + y * displayModulePx, displayModulePx, displayModulePx);
				}
			}
		}
	}

	function updateButtonsState() {
		var disabled = isInputEmpty(getCurrentQrDataString()) || qrGenerationError;
		if (downloadBtn) downloadBtn.disabled = disabled;
		if (shareBtn && !shareBtn.hidden) shareBtn.disabled = disabled;
		if (copyBtn && !copyBtn.hidden) copyBtn.disabled = disabled;
	}

	function updateQR() {
		if (typeof QRCode === 'undefined' || !qrTypeSelect || !ecInput || !fgColorInput || !bgColorInput) {
			console.warn('updateQR: Některé elementy nejsou připraveny nebo QRCode není definováno.');
			if (!mainDisplayCanvas && document.readyState === 'complete') {
				console.log('Pokouším se o re-inicializaci prvků v updateQR.');
				initializeElements();
				if (!mainDisplayCanvas) {
					console.error('Re-inicializace prvků v updateQR selhala.');
					return;
				}
			} else if (!mainDisplayCanvas) {
				return;
			}
		}
		const dataString = getCurrentQrDataString();
		generateQRForDisplay(dataString, ecInput.value, fgColorInput.value, bgColorInput.value);
		updateButtonsState();
	}

	function crc32(data) {
		let crc = -1;
		for (let i = 0; i < data.length; i++) {
			crc ^= data[i];
			for (let j = 0; j < 8; j++) {
				crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
			}
		}
		return (crc ^ -1) >>> 0;
	}

	function pngChunk(type, data) {
		const t = new TextEncoder().encode(type);
		const crcInput = new Uint8Array(t.length + data.length);
		crcInput.set(t);
		crcInput.set(data, t.length);
		const crc = crc32(crcInput);
		const buf = new Uint8Array(12 + data.length);
		const v = new DataView(buf.buffer);
		v.setUint32(0, data.length);
		buf.set(t, 4);
		buf.set(data, 8);
		v.setUint32(8 + data.length, crc);
		return buf;
	}

	async function createOptimizedQrBlob(dataString, ecLevel, fgHex, bgHex) {
		const qr = await QRCode.create(dataString || ' ', { errorCorrectionLevel: ecLevel });
		const numModules = qr.modules.size;
		const qrData = qr.modules.data;
		const modulePx = 8;
		const quietPx = 16;
		const qrPx = numModules * modulePx;
		const size = qrPx + quietPx * 2;
		const rowBytes = Math.ceil(size / 8);
		const raw = new Uint8Array(size * (1 + rowBytes));

		for (let y = 0; y < size; y++) {
			const off = y * (1 + rowBytes);
			raw[off] = 0;
			for (let x = 0; x < size; x++) {
				const mx = Math.floor((x - quietPx) / modulePx);
				const my = Math.floor((y - quietPx) / modulePx);
				const inside = x >= quietPx && x < quietPx + qrPx && y >= quietPx && y < quietPx + qrPx;
				if (inside && qrData[my * numModules + mx] === 1) {
					raw[off + 1 + (x >> 3)] |= 0x80 >> (x & 7);
				}
			}
		}

		const compressed = new Uint8Array(
			await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer(),
		);

		const fg = [parseInt(fgHex.slice(1, 3), 16), parseInt(fgHex.slice(3, 5), 16), parseInt(fgHex.slice(5, 7), 16)];
		const bg = [parseInt(bgHex.slice(1, 3), 16), parseInt(bgHex.slice(3, 5), 16), parseInt(bgHex.slice(5, 7), 16)];

		const ihdr = new Uint8Array(13);
		const dv = new DataView(ihdr.buffer);
		dv.setUint32(0, size);
		dv.setUint32(4, size);
		ihdr[8] = 1;
		ihdr[9] = 3;
		ihdr[10] = 0;
		ihdr[11] = 0;
		ihdr[12] = 0;

		const plte = new Uint8Array(6);
		plte[0] = bg[0];
		plte[1] = bg[1];
		plte[2] = bg[2];
		plte[3] = fg[0];
		plte[4] = fg[1];
		plte[5] = fg[2];

		const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
		const chunks = [
			sig,
			pngChunk('IHDR', ihdr),
			pngChunk('PLTE', plte),
			pngChunk('IDAT', compressed),
			pngChunk('IEND', new Uint8Array(0)),
		];
		const total = chunks.reduce((s, c) => s + c.length, 0);
		const out = new Uint8Array(total);
		let offset = 0;
		for (const c of chunks) {
			out.set(c, offset);
			offset += c.length;
		}
		return new Blob([out], { type: 'image/png' });
	}

	async function exportQrCode(dataString, ecLevel, fgHex, bgHex, format) {
		if (format === 'png') {
			return createOptimizedQrBlob(dataString, ecLevel, fgHex, bgHex);
		}
		if (format === 'gif') {
			return createOptimizedGifBlob(dataString, ecLevel, fgHex, bgHex);
		}
		return createOptimizedWebpBlob(dataString, ecLevel, fgHex, bgHex);
	}

	async function createOptimizedGifBlob(dataString, ecLevel, fgHex, bgHex) {
		const qr = await QRCode.create(dataString || ' ', { errorCorrectionLevel: ecLevel });
		const numModules = qr.modules.size;
		const qrData = qr.modules.data;
		const modulePx = 8;
		const quietPx = 16;
		const size = numModules * modulePx + quietPx * 2;

		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d', { alpha: false });
		ctx.fillStyle = bgHex;
		ctx.fillRect(0, 0, size, size);
		ctx.fillStyle = fgHex;

		for (let y = 0; y < numModules; y++) {
			for (let x = 0; x < numModules; x++) {
				if (qrData[y * numModules + x] === 1) {
					ctx.fillRect(quietPx + x * modulePx, quietPx + y * modulePx, modulePx, modulePx);
				}
			}
		}
		return new Promise(function (resolve) {
			canvas.toBlob(resolve, 'image/gif');
		});
	}

	async function createOptimizedWebpBlob(dataString, ecLevel, fgHex, bgHex) {
		const qr = await QRCode.create(dataString || ' ', { errorCorrectionLevel: ecLevel });
		const numModules = qr.modules.size;
		const qrData = qr.modules.data;
		const modulePx = 8;
		const quietPx = 16;
		const size = numModules * modulePx + quietPx * 2;

		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d', { alpha: false });
		ctx.fillStyle = bgHex;
		ctx.fillRect(0, 0, size, size);
		ctx.fillStyle = fgHex;

		for (let y = 0; y < numModules; y++) {
			for (let x = 0; x < numModules; x++) {
				if (qrData[y * numModules + x] === 1) {
					ctx.fillRect(quietPx + x * modulePx, quietPx + y * modulePx, modulePx, modulePx);
				}
			}
		}
		return new Promise(function (resolve) {
			canvas.toBlob(resolve, 'image/webp', 1.0);
		});
	}

	function isInputEmpty(dataString) {
		if (
			!dataString ||
			dataString.trim() === '' ||
			dataString === 'SMSTO::' ||
			dataString === 'mailto:' ||
			dataString === 'geo:,' ||
			dataString === 'SPD*1.0' ||
			dataString.startsWith('WIFI:T:nopass;S:;;')
		) {
			const selectedType = qrTypeSelect.value;
			const typeConfig = qrCodeTypes[selectedType];
			if (typeConfig && typeConfig.fields.length > 0) {
				return typeConfig.fields.every((field) => {
					if (field.type === 'button') return true;
					const el = document.getElementById(`field-${field.name}`);
					if (!el) return true;
					if (field.type === 'checkbox') return !el.checked;
					return !el.value || el.value.trim() === '';
				});
			}
			return !dataString || dataString.trim() === '';
		}
		return false;
	}

	async function handleDownload() {
		try {
			const dataString = getCurrentQrDataString();

			const format = exportFormatSelect.value;
			const blob = await exportQrCode(dataString, ecInput.value, fgColorInput.value, bgColorInput.value, format);
			const link = document.createElement('a');
			link.download = `qrcode_${qrTypeSelect.value}_${Date.now()}.${format}`;
			link.href = URL.createObjectURL(blob);
			link.click();
			URL.revokeObjectURL(link.href);
		} catch (error) {
			alert(tr('msg.generateError') + error.message);
			console.error('Chyba v handleDownload:', error);
		}
	}

	async function handleShare() {
		try {
			const dataString = getCurrentQrDataString();
			if (!navigator.canShare) return;

			const format = exportFormatSelect.value;
			const blob = await exportQrCode(dataString, ecInput.value, fgColorInput.value, bgColorInput.value, format);
			const file = new File([blob], `qrcode.${format}`, { type: blob.type });
			if (navigator.canShare({ files: [file] })) {
				await navigator.share({ files: [file], title: 'QR Code' });
			}
		} catch (error) {
			if (error.name !== 'AbortError') {
				console.error('Chyba v handleShare:', error);
			}
		}
	}

	async function handleCopy() {
		try {
			const dataString = getCurrentQrDataString();
			if (isInputEmpty(dataString)) {
				alert(tr('msg.emptyInput'));
				return;
			}

			const format = exportFormatSelect.value;
			const blob = await exportQrCode(dataString, ecInput.value, fgColorInput.value, bgColorInput.value, format);
			const item = new ClipboardItem({ [blob.type]: blob });
			await navigator.clipboard.write([item]);
			setDiagnosticMessage(tr('msg.copied'), 'success');
		} catch (error) {
			setDiagnosticMessage(tr('msg.copyFailed'), 'error');
			console.error('Chyba v handleCopy:', error);
		}
	}

	function supportsWebpExport() {
		return new Promise(function (resolve) {
			var c = document.createElement('canvas');
			c.width = 1;
			c.height = 1;
			c.toBlob(function (blob) {
				resolve(blob && blob.type === 'image/webp');
			}, 'image/webp');
		});
	}

	function doInit() {
		initializeElements();

		qrTypeSelect.addEventListener('change', (event) => {
			renderQrTypeForm(event.target.value);
		});
		renderQrTypeForm(qrTypeSelect.value);

		ecInput.addEventListener('change', updateQR);
		fgColorInput.addEventListener('input', updateQR);
		bgColorInput.addEventListener('input', updateQR);
		if (downloadBtn) {
			downloadBtn.addEventListener('click', handleDownload);
		}

		if (exportFormatSelect) {
			exportFormatSelect.addEventListener('change', updateQR);
		}

		if (shareBtn && navigator.canShare) {
			shareBtn.hidden = false;
			shareBtn.addEventListener('click', handleShare);
		}

		if (copyBtn && location.protocol !== 'file:' && navigator.clipboard && ClipboardItem) {
			copyBtn.hidden = false;
			copyBtn.addEventListener('click', handleCopy);
		}

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('sw.js').catch(() => {});
		}

		supportsWebpExport().then(function (supported) {
			if (!supported && exportFormatSelect) {
				var opt = exportFormatSelect.querySelector('option[value="webp"]');
				if (opt) {
					opt.remove();
					if (exportFormatSelect.value === 'webp') {
						exportFormatSelect.value = 'png';
						updateQR();
					}
				}
			}
		});

		var toolbar = document.createElement('div');
		toolbar.className = 'keyboard-toolbar';
		var doneBtn = document.createElement('button');
		doneBtn.className = 'done-button';
		doneBtn.textContent = tr('button.done');
		doneBtn.addEventListener('pointerdown', function (e) {
			e.preventDefault();
			if (document.activeElement && document.activeElement !== document.body) {
				document.activeElement.blur();
			}
			toolbar.classList.remove('visible');
		});
		toolbar.appendChild(doneBtn);
		document.body.appendChild(toolbar);

		var controlsContainer = document.querySelector('.controls-container');
		controlsContainer.addEventListener('focusin', function (e) {
			var tag = e.target.tagName;
			var type = e.target.type;
			if (
				tag === 'TEXTAREA' ||
				tag === 'SELECT' ||
				(tag === 'INPUT' && !['color', 'checkbox', 'button', 'submit', 'range', 'file'].includes(type))
			) {
				toolbar.classList.add('visible');
			}
		});

		let resizeTimeout;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(() => {
				initializeElements();
				updateQR();
			}, 250);
		});
		updateQR();
	}

	function appInit() {
		if (window.__ready) {
			doInit();
		} else {
			document.addEventListener('i18n-ready', doInit);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', appInit);
	} else {
		appInit();
	}
})();
