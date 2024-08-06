/**
* @class Italian lip-sync processor
* @autor Andrea Santaniello <andrea@monocul.us>
*/

class LipsyncIt {

  /**
  * @constructor
  */
  constructor() {
    this.rules = {
      'A': [
        "[AN] =aa nn", "[AM] =aa mm", "[AR] =aa rr", "[A]LL =aa",
        " [ARE] =aa rr", "[AR]I=aa rr I", "[AT]O=aa tt O", "[AU] =aa U", "[AV]O=aa v O", "[A]=aa"
      ],
      'B': [
        " [B]=m", "[B]R=m rr", "[B]L=m ll", "[B]=m"
      ],
      'C': [
        "[CH]=kk", "[C]A=kk aa", "[C]O=kk O", "[C]U=kk U", "[CI]=ch I", "[CE]=ch E", "[C]=kk"
      ],
      'D': [
        " [D]=dd", "[D]I=dd I", "[D]O=dd O", "[DI]A=dd I aa", "[DI]O=dd I O", "[D]=dd"
      ],
      'E': [
        "[ER]=E rr", "[E]L=E ll", "[EM]=E mm", "[EN]=E nn", "[ES]=E ss", "[E]=E"
      ],
      'F': [
        " [F]=ff", "[F]I=ff I", "[F]O=ff O", "[F]U=ff U", "[FR]=ff rr", "[FL]=ff ll", "[F]=ff"
      ],
      'G': [
        "[GH]=kk", "[G]A=kk aa", "[G]O=kk O", "[G]U=kk U", "[GI]=j I", "[GE]=j E", "[G]=kk"
      ],
      'H': [
        " [H]=", "[H]O=O", "[H]A=aa", "[H]U=U", "[H]="
      ],
      'I': [
        "[IN]=I nn", "[IM]=I mm", "[IR]=I rr", "[I]=I"
      ],
      'L': [
        " [L]=ll", "[L]A=ll aa", "[L]O=ll O", "[L]U=ll U", "[LI]=ll I", "[LE]=ll E", "[L]=ll"
      ],
      'M': [
        " [M]=mm", "[M]A=mm aa", "[M]O=mm O", "[M]U=mm U", "[MI]=mm I", "[ME]=mm E", "[M]=mm"
      ],
      'N': [
        " [N]=nn", "[N]A=nn aa", "[N]O=nn O", "[N]U=nn U", "[NI]=nn I", "[NE]=nn E", "[N]=nn"
      ],
      'O': [
        "[OR]=O rr", "[ON]=O nn", "[OM]=O mm", "[OS]=O ss", "[O]=O"
      ],
      'P': [
        " [P]=p", "[P]A=p aa", "[P]O=p O", "[P]U=p U", "[PI]=p I", "[PE]=p E", "[P]=p"
      ],
      'Q': [
        " [Q]=kw", "[Q]A=kw aa", "[Q]O=kw O", "[Q]U=kw U", "[QI]=kw I", "[QE]=kw E", "[Q]=kw"
      ],
      'R': [
        " [R]=rr", "[R]A=rr aa", "[R]O=rr O", "[R]U=rr U", "[RI]=rr I", "[RE]=rr E", "[R]=rr"
      ],
      'S': [
        " [S]=ss", "[S]A=ss aa", "[S]O=ss O", "[S]U=ss U", "[SI]=ss I", "[SE]=ss E", "[S]=ss"
      ],
      'T': [
        " [T]=tt", "[T]A=tt aa", "[T]O=tt O", "[T]U=tt U", "[TI]=tt I", "[TE]=tt E", "[T]=tt"
      ],
      'U': [
        "[UN]=U nn", "[UM]=U mm", "[UR]=U rr", "[US]=U ss", "[U]=U"
      ],
      'V': [
        " [V]=v", "[V]A=v aa", "[V]O=v O", "[V]U=v U", "[VI]=v I", "[VE]=v E", "[V]=v"
      ],
      'Z': [
        " [Z]=zz", "[Z]A=zz aa", "[Z]O=zz O", "[Z]U=zz U", "[ZI]=zz I", "[ZE]=zz E", "[Z]=zz"
      ]
    };

    const ops = {
      '#': '[AEIOUY]+', // One or more vowels AEIOUY
      '.': '[BDVGJLMNRWZ]', // One voiced consonant BDVGJLMNRWZ
      '%': '(?:ER|E|ES|ED|ING|ELY)', // One of ER, E, ES, ED, ING, ELY
      '&': '(?:[SCGZXJ]|CH|SH)', // One of S, C, G, Z, X, J, CH, SH
      '@': '(?:[TSRDLZNJ]|TH|CH|SH)', // One of T, S, R, D, L, Z, N, J, TH, CH, SH
      '^': '[BCDFGHJKLMNPQRSTVWXZ]', // One consonant BCDFGHJKLMNPQRSTVWXZ
      '+': '[EIY]', // One of E, I, Y
      ':': '[BCDFGHJKLMNPQRSTVWXZ]*', // Zero or more consonants BCDFGHJKLMNPQRSTVWXZ
      ' ': '\\b' // Start/end of the word
    };

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

    this.visemeDurations = {
      'aa': 0.95, 'E': 0.90, 'I': 0.92, 'O': 0.96, 'U': 0.95, 'm': 1.08,
      'ss': 1.23, 'tt': 1.05, 'ff': 1.00, 'kk': 1.21, 'nn': 0.88,
      'rr': 0.88, 'dd': 1.05, 'sil': 1
    };

    this.specialDurations = { ' ': 1, ',': 3, '-': 0.5, "'": 0.5 };

    this.digits = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];
    this.ones = ['', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];
    this.tens = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];
    this.teens = ['dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];

    this.symbols = {
        '%': 'percento', '€': 'euro', '&': 'e', '+': 'più', '$': 'dollari', '-': 'meno', '/': 'diviso', '*': 'per', ':': 'due punti', ';': 'punto e virgola'
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

  convert_sets_of_two(num) {
    let firstNumHalf = String(num).substring(0, 2);
    let secondNumHalf = String(num).substring(2, 4);
    let numWords = this.convert_tens(firstNumHalf);
    numWords += " " + this.convert_tens(secondNumHalf);
    return numWords;
  }

  convert_millions(num) {
    if (num >= 1000000) {
      return this.convert_millions(Math.floor(num / 1000000)) + " milioni " + this.convert_thousands(num % 1000000);
    } else {
      return this.convert_thousands(num);
    }
  }

  convert_thousands(num) {
    if (num >= 1000) {
      return this.convert_hundreds(Math.floor(num / 1000)) + " mila " + this.convert_hundreds(num % 1000);
    } else {
      return this.convert_hundreds(num);
    }
  }

  convert_hundreds(num) {
    if (num > 99) {
      return this.ones[Math.floor(num / 100)] + " cento " + this.convert_tens(num % 100);
    } else {
      return this.convert_tens(num);
    }
  }

  convert_tens(num) {
    if (num < 10) return this.ones[num];
    else if (num >= 10 && num < 20) {
      return this.teens[num - 10];
    } else {
      return this.tens[Math.floor(num / 10)] + " " + this.ones[num % 10];
    }
  }

  convertNumberToWords(num) {
    if (num == 0) {
      return "zero";
    } else if ((num < 1000 && num > 99) || (num > 10000 && num < 1000000)) {
      return this.convert_digit_by_digit(num);
    } else if ((num > 1000 && num < 2000) || (num > 2009 && num < 3000)) {
      return this.convert_sets_of_two(num);
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
  * @return {string} Pre-processsed text.
  */
  preProcessText(s) {
    return s.replace('/[#_*\":;]/g', '')
      .replace(this.symbolsReg, (symbol) => {
        return ' ' + this.symbols[symbol] + ' ';
      })
      .replace(/(\d)\,(\d)/g, '$1 punto $2') // Number separator
      .replace(/\d+/g, this.convertNumberToWords.bind(this)) // Numbers to words
      .replace(/(\D)\1\1+/g, "$1$1") // max 2 repeating chars
      .replaceAll('  ', ' ') // Only one repeating space
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC') // Remove non-Italian diacritics
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

export { LipsyncIt };
