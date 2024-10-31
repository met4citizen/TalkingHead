/**
* @class French lip-sync processor
* @author Assistant
*/

class LipsyncFr {

	/**
	* @constructor
	*/
	constructor() {
		// French pronunciation rules to Oculus visemes
		this.rules = {
			'A': [
				"[A]=aa", "[AI]=E", "[AIN]=E", "[AIM]=E", "[AU]=O", "[AY]=E I",
				"[AN]=aa", "[AM]=aa", "[AIENT]=E"
			],

			'B': [
				"[B]=PP"
			],

			'C': [
				"[CH]=SS", "[C]E=SS", "[C]I=SS", "[C]Y=SS", "[Ç]=SS", "[C]=kk"
			],

			'D': [
				"[D]=DD"
			],

			'E': [
				"[EAU]=O", "[EU]=U", "[EIN]=E", "[EIM]=E", "[EN]=aa", "[EM]=aa",
				"[È]=E", "[É]=E", "[Ê]=E", "[E]=E"
			],

			'F': [
				"[F]=FF"
			],

			'G': [
				"[GN]=nn", "[G]E=SS", "[G]I=SS", "[G]Y=SS", "[G]=kk"
			],

			'H': [
				"[H]="
			],

			'I': [
				"[IN]=E", "[IM]=E", "[I]=I"
			],

			'J': [
				"[J]=SS"
			],

			'K': [
				"[K]=kk"
			],

			'L': [
				"[LL]E=I", "[L]=nn"
			],

			'M': [
				"[M]=PP"
			],

			'N': [
				"[NG]=nn kk", "[N]=nn"
			],

			'O': [
				"[OIN]=FF E", "[OI]=FF aa", "[ON]=O", "[OM]=O", "[OU]=U", "[O]=O"
			],

			'P': [
				"[PH]=FF", "[P]=PP"
			],

			'Q': [
				"[QU]=kk", "[Q]=kk"
			],

			'R': [
				"[R]=RR"
			],

			'S': [
				" [S] =SS", "[SS]=SS", "[S]=SS"
			],

			'T': [
				"[TION]=SS I O", "[T]I=SS", "[TH]=DD", "[T]=DD"
			],

			'U': [
				"[UN]=E", "[UM]=E", "[U]=I"
			],

			'V': [
				"[V]=FF"
			],

			'W': [
				"[W]=FF"
			],

			'X': [
				"[X]=kk SS"
			],

			'Y': [
				"[Y]=I"
			],

			'Z': [
				"[Z]=SS"
			]
		};

		const ops = {
			'#': '[AEIOUY]+',
			'.': '[BDVGJLMNRWZ]',
			'%': '(?:ER|E|ES|É|È|Ê|ANT)',
			'&': '(?:[SCGZXJ]|CH)',
			'@': '(?:[TSRDLZNJ]|TH|CH)',
			'^': '[BCDFGHJKLMNPQRSTVWXZ]',
			'+': '[EIY]',
			':': '[BCDFGHJKLMNPQRSTVWXZ]*',
			' ': '\\b'
		};

		// Convert rules to regex (same as English version)
		Object.keys(this.rules).forEach(key => {
			this.rules[key] = this.rules[key].map(rule => {
				const posL = rule.indexOf('[');
				const posR = rule.indexOf(']');
				const posE = rule.indexOf('=');
				const strLeft = rule.substring(0, posL);
				const strLetters = rule.substring(posL + 1, posR);
				const strRight = rule.substring(posR + 1, posE);
				const strVisemes = rule.substring(posE + 1);

				const o = { regex: '', move: 0, visemes: [] };

				let exp = '';
				exp += [...strLeft].map(x => ops[x] || x).join('');
				const ctxLetters = [...strLetters];
				ctxLetters[0] = ctxLetters[0].toLowerCase();
				exp += ctxLetters.join('');
				o.move = ctxLetters.length;
				exp += [...strRight].map(x => ops[x] || x).join('');
				o.regex = new RegExp(exp);

				if (strVisemes.length) {
					strVisemes.split(' ').forEach(viseme => {
						o.visemes.push(viseme);
					});
				}

				return o;
			});
		});

		// Viseme durations in relative unit (1=average)
		// Adjusted for French pronunciation
		this.visemeDurations = {
			'aa': 1.0, 'E': 0.95, 'I': 0.90, 'O': 1.0, 'U': 0.95,
			'PP': 1.05, 'SS': 1.20, 'DD': 1.05, 'FF': 1.00,
			'kk': 1.15, 'nn': 0.90, 'RR': 1.10, 'sil': 1
		};

		// Pauses in relative units (1=average)
		this.specialDurations = {
			' ': 1,
			',': 2.5,
			'.': 3.5,
			'-': 0.5,
			"'": 0.25,
			'ˈ': 0.5  // stress mark
		};

		// French number words
		this.digits = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
		this.ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
		this.tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
		this.teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];

		// Symbols to French
		this.symbols = {
			'%': 'pourcent',
			'€': 'euros',
			'&': 'et',
			'+': 'plus',
			'$': 'dollars'
		};
		this.symbolsReg = /[%€&\+\$]/g;
	}

	convert_digit_by_digit(num) {
		num = String(num).split("");
		let numWords = "";
		for (let m = 0; m < num.length; m++) {
			numWords += this.digits[num[m]] + " ";
		}
		numWords = numWords.substring(0, numWords.length - 1);
		return numWords;
	}

	convert_tens(num) {
		if (num < 10) return this.ones[num];
		else if (num >= 10 && num < 17) {
			return this.teens[num - 10];
		} else if (num >= 17 && num < 20) {
			return 'dix-' + this.ones[num - 10];
		} else if (num >= 70 && num < 80) {
			return 'soixante-' + this.teens[num - 70];
		} else if (num >= 90) {
			return 'quatre-vingt-' + this.teens[num - 90];
		} else {
			const ten = Math.floor(num / 10);
			const one = num % 10;
			return this.tens[ten] + (one ? '-' + this.ones[one] : '');
		}
	}

	convert_hundreds(num) {
		if (num > 99) {
			const hundreds = Math.floor(num / 100);
			const remainder = num % 100;
			if (hundreds === 1) {
				return 'cent' + (remainder ? ' ' + this.convert_tens(remainder) : '');
			}
			return this.ones[hundreds] + ' cent' + (remainder ? ' ' + this.convert_tens(remainder) : '');
		} else {
			return this.convert_tens(num);
		}
	}

	convert_thousands(num) {
		if (num >= 1000) {
			const thousands = Math.floor(num / 1000);
			const remainder = num % 1000;
			if (thousands === 1) {
				return 'mille' + (remainder ? ' ' + this.convert_hundreds(remainder) : '');
			}
			return this.convert_hundreds(thousands) + ' mille' + (remainder ? ' ' + this.convert_hundreds(remainder) : '');
		} else {
			return this.convert_hundreds(num);
		}
	}

	convert_millions(num) {
		if (num >= 1000000) {
			const millions = Math.floor(num / 1000000);
			const remainder = num % 1000000;
			if (millions === 1) {
				return 'un million' + (remainder ? ' ' + this.convert_thousands(remainder) : '');
			}
			return this.convert_hundreds(millions) + ' millions' + (remainder ? ' ' + this.convert_thousands(remainder) : '');
		} else {
			return this.convert_thousands(num);
		}
	}

	convertNumberToWords(num) {
		if (num === 0) {
			return "zéro";
		} else {
			return this.convert_millions(num);
		}
	}

	/**
	* Preprocess text:
	* - convert symbols to words
	* - convert numbers to words
	* - filter out characters that should be left unspoken
	* @param {string} s Text
	* @return {string} Pre-processed text.
	*/
	preProcessText(s) {
		return s.replace('/[#_*\":;]/g', '')
			.replace(this.symbolsReg, (symbol) => {
				return ' ' + this.symbols[symbol] + ' ';
			})
			.replace(/(\d)\,(\d)/g, '$1 virgule $2')
			.replace(/\d+/g, this.convertNumberToWords.bind(this))
			.replace(/(\D)\1\1+/g, "$1$1")
			.replaceAll('  ', ' ')
			.trim();
	}

	/**
	* Convert word to Oculus LipSync Visemes and durations
	* @param {string} w Text
	* @return {Object} Oculus LipSync Visemes and durations.
	*/
	wordsToVisemes(w) {
		let o = { words: w.toUpperCase(), visemes: [], times: [], durations: [], i: 0 };
		let t = 0;

		const chars = [...o.words];
		while (o.i < chars.length) {
			const c = chars[o.i];
			const ruleset = this.rules[c];
			if (ruleset) {
				for (let i = 0; i < ruleset.length; i++) {
					const rule = ruleset[i];
					const test = o.words.substring(0, o.i) + c.toLowerCase() + o.words.substring(o.i + 1);
					let matches = test.match(rule.regex);
					if (matches) {
						rule.visemes.forEach(viseme => {
							if (o.visemes.length && o.visemes[o.visemes.length - 1] === viseme) {
								const d = 0.7 * (this.visemeDurations[viseme] || 1);
								o.durations[o.durations.length - 1] += d;
								t += d;
							} else {
								const d = this.visemeDurations[viseme] || 1;
								o.visemes.push(viseme);
								o.times.push(t);
								o.durations.push(d);
								t += d;
							}
						})
						o.i += rule.move;
						break;
					}
				}
			} else {
				o.i++;
				t += this.specialDurations[c] || 0;
			}
		}

		return o;
	}
}

export { LipsyncFr };
