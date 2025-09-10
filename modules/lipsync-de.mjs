/**
* @class German lip-sync processor
* @author Stephan Wald (assisted by AI), Based on TalkingHead English module, adapted for German phonetics
*
* added support for German umlauts, diphtongs and vowel durations to match German pronounciation patterns
* Sources:
* Duden Aussprachewörterbuch - Standard German pronunciation dictionary
* International Phonetic Association (IPA) - German phonetic transcription standards
* German Phonetics and Phonology research from linguistic institutions
* TalkingHead Framework Documentation - Base structure and viseme mapping system
* Oculus Lip Sync Documentation - Viseme format and timing specifications
*/

class LipsyncDe {

  /**
  * @constructor
  */
  constructor() {

    // German words to Oculus visemes, rule-based mapping
    // Adapted for German phonetic rules and orthography
    this.rules = {
      'A': [
        "[AH]=aa", "[AU]=aa U", "[AI]=aa I", "[AE]=E", "[A]H=aa",
        "[A]U=aa U", "[A]I=aa I", " [AN] =aa nn", " [AM] =aa PP",
        "[ARR]=aa RR", "[AR]=aa RR", " [ALS]=aa nn SS", "[AL]=aa nn",
        "[AUCH]=aa U kk", "[ABER]=aa PP E RR", "[A]=aa"
      ],

      'Ä': [
        "[Ä]H=E", "[ÄU]=O", "[Ä]=E"
      ],

      'B': [
        "[B]=PP"
      ],

      'C': [
        "[CH]S=kk SS", "[CH]=kk", " [CH]=kk", "#[CH]=kk", "[CK]=kk",
        "[C]H=kk", "[C]=kk"
      ],

      'D': [
        " [DAS] =DD aa SS", " [DEN] =DD E nn", " [DER] =DD E RR",
        " [DIE] =DD I", " [DU] =DD U", " [DURCH]=DD U RR kk",
        "[D]=DD"
      ],

      'E': [
        "[EI]=aa I", "[EU]=O", "[EH]=E", " [ER] =E RR", " [ES] =E SS",
        " [EIN] =aa I nn", " [EINE]=aa I nn aa", "[ER]#=E", "[ER]=E RR",
        "[EN]#=aa nn", "[E]=E"
      ],

      'F': [
        "[F]=FF"
      ],

      'G': [
        "[G]=kk"
      ],

      'H': [
        " [HAT] =I aa DD", " [HABEN]=I aa PP aa nn", " [HIER]=I I RR",
        " [HEUTE]=I O DD aa", "[H]="
      ],

      'I': [
        " [ICH] =I kk", " [IHR] =I RR", " [IN] =I nn", " [IST] =I SS DD",
        " [IM] =I PP", "[IE]=I", "[IH]=I", "[I]=I"
      ],

      'J': [
        "[J]=I"
      ],

      'K': [
        "[K]=kk"
      ],

      'L': [
        "[L]=nn"
      ],

      'M': [
        " [MIT] =PP I DD", " [MAN] =PP aa nn", " [MEHR]=PP E RR",
        " [MICH]=PP I kk", "[M]=PP"
      ],

      'N': [
        " [NICHT]=nn I kk DD", " [NUR] =nn U RR", " [NACH]=nn aa kk",
        " [NOCH]=nn aa kk", "[NG]=nn kk", "[N]=nn"
      ],

      'O': [
        "[OO]=U", "[OH]=O", "[OU]=aa U", " [ODER]=O DD E RR",
        " [OHNE]=O nn aa", "[Ö]=E", "[O]=aa"
      ],

      'Ö': [
        "[ÖH]=E", "[Ö]=E"
      ],

      'P': [
        "[PF]=FF FF", "[PH]=FF", "[P]=PP"
      ],

      'Q': [
        "[QU]=kk FF", "[Q]=kk"
      ],

      'R': [
        "[R]=RR"
      ],

      'S': [
        "[SCH]=SS", "[SP]=SS PP", "[ST]=SS DD", "[SS]=SS", "[S]=SS"
      ],

      'ß': [
        "[ß]=SS"
      ],

      'T': [
        "[TZ]=DD SS", "[TH]=DD", "[T]=DD"
      ],

      'U': [
        " [UND] =U nn DD", " [UM] =U PP", " [UNTER]=U nn DD E RR",
        " [UNS] =U nn SS", "[UH]=U", "[ÜH]=I U", "[Ü]=I U", "[U]=U"
      ],

      'Ü': [
        "[ÜH]=I U", "[Ü]=I U"
      ],

      'V': [
        " [VON] =FF aa nn", " [VOR] =FF aa RR", " [VIEL]=FF I nn",
        "[V]=FF"
      ],

      'W': [
        " [WAS] =FF aa SS", " [WIR] =FF I RR", " [WIE] =FF I",
        " [WENN]=FF E nn", " [WILL]=FF I nn", " [WO] =FF aa",
        " [WIEDER]=FF I DD E RR", "[W]=FF"
      ],

      'X': [
        "[X]=kk SS"
      ],

      'Y': [
        "[Y]=I"
      ],

      'Z': [
        " [ZU] =DD SS U", " [ZUM] =DD SS U PP", " [ZUR] =DD SS U RR",
        " [ZEIT]=DD SS aa I DD", "[Z]=DD SS"
      ]
    };

    const ops = {
      '#': '[AEIOUÄÖÜ]+', // One or more vowels including German umlauts
      '.': '[BDVGJLMNRWZ]', // One voiced consonant
      '%': '(?:ER|E|ES|ED|ING|ELY|EN|TE|ST)', // German suffixes
      '&': '(?:[SCGZXJ]|CH|SCH|TZ)', // German consonant clusters
      '@': '(?:[TSRDLZNJ]|TH|CH|SCH)', // German consonant sounds
      '^': '[BCDFGHJKLMNPQRSTVWXYZß]', // German consonants including ß
      '+': '[EIY]', // Front vowels
      ':': '[BCDFGHJKLMNPQRSTVWXYZß]*', // Zero or more consonants
      ' ': '\\b' // Word boundary
    };

    // Convert rules to regex
    Object.keys(this.rules).forEach( key => {
      this.rules[key] = this.rules[key].map( rule => {
        const posL = rule.indexOf('[');
        const posR = rule.indexOf(']');
        const posE = rule.indexOf('=');
        const strLeft = rule.substring(0,posL);
        const strLetters = rule.substring(posL+1,posR);
        const strRight = rule.substring(posR+1,posE);
        const strVisemes = rule.substring(posE+1);

        const o = { regex: '', move: 0, visemes: [] };

        let exp = '';
        exp += [...strLeft].map( x => ops[x] || x ).join('');
        const ctxLetters = [...strLetters];
        ctxLetters[0] = ctxLetters[0].toLowerCase();
        exp += ctxLetters.join('');
        o.move = ctxLetters.length;
        exp += [...strRight].map( x => ops[x] || x ).join('');
        o.regex = new RegExp(exp);

        if ( strVisemes.length ) {
          strVisemes.split(' ').forEach( viseme => {
            o.visemes.push(viseme);
          });
        }

        return o;
      });
    });

    // Viseme durations in relative units (1=average)
    // Adjusted for German phonetic characteristics
    this.visemeDurations = {
      'aa': 1.0,   // German 'a' sounds (longer than English)
      'E': 0.85,   // German 'e' and 'ä' sounds
      'I': 0.90,   // German 'i' sounds
      'O': 1.05,   // German 'o' and rounded vowels
      'U': 1.0,    // German 'u' sounds
      'PP': 1.15,  // German 'p', 'b', 'm' (more pronounced)
      'SS': 1.20,  // German 's', 'sch' sounds
      'TH': 1.0,   // German 'th' (rare in German)
      'DD': 1.10,  // German 'd', 't' sounds
      'FF': 1.05,  // German 'f', 'v', 'w' sounds
      'kk': 1.25,  // German 'k', 'g', 'ch' sounds (prominent)
      'nn': 0.85,  // German 'n', 'l' sounds
      'RR': 0.90,  // German 'r' sound (uvular)
      'sil': 1
    };

    // Pauses in relative units (1=average)
    this.specialDurations = { ' ': 1, ',': 3, '-': 0.5, "'": 0.5, '.': 4, '!': 3, '?': 3 };

    // German number words
    this.digits = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
    this.ones = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
    this.tens = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
    this.teens = ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];

    // German symbols to words
    this.symbols = {
      '%': 'prozent',
      '€': 'euro',
      '&': 'und',
      '+': 'plus',
      '$': 'dollar',
      '=': 'gleich',
      '@': 'at',
      '#': 'hashtag'
    };
    this.symbolsReg = /[%€&\+\$=@#]/g;
  }

  convert_digit_by_digit(num) {
    num = String(num).split("");
    let numWords = "";
    for(let m = 0; m < num.length; m++) {
      numWords += this.digits[num[m]] + " ";
    }
    numWords = numWords.substring(0, numWords.length - 1);
    return numWords;
  }

  convert_millions(num) {
    if (num >= 1000000) {
      const millions = Math.floor(num / 1000000);
      const remainder = num % 1000000;
      let result = this.convert_thousands(millions);
      result += (millions === 1) ? " million " : " millionen ";
      if (remainder > 0) {
        result += this.convert_thousands(remainder);
      }
      return result;
    } else {
      return this.convert_thousands(num);
    }
  }

  convert_thousands(num) {
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      let result = "";
      
      if (thousands === 1) {
        result = "eintausend";
      } else {
        result = this.convert_hundreds(thousands) + "tausend";
      }
      
      if (remainder > 0) {
        result += this.convert_hundreds(remainder);
      }
      return result;
    } else {
      return this.convert_hundreds(num);
    }
  }

  convert_hundreds(num) {
    if (num > 99) {
      const hundreds = Math.floor(num / 100);
      const remainder = num % 100;
      let result = "";
      
      if (hundreds === 1) {
        result = "einhundert";
      } else {
        result = this.ones[hundreds] + "hundert";
      }
      
      if (remainder > 0) {
        result += this.convert_tens(remainder);
      }
      return result;
    } else {
      return this.convert_tens(num);
    }
  }

  convert_tens(num) {
    if (num < 10) {
      return this.ones[Number(num)] || "";
    } else if (num >= 10 && num < 20) {
      return this.teens[num - 10];
    } else {
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      if (ones === 0) {
        return this.tens[tens];
      } else {
        // German puts ones before tens with "und"
        return this.ones[ones] + "und" + this.tens[tens];
      }
    }
  }

  convertNumberToWords(num) {
    const numStr = String(num);
    
    if (num == "0") {
      return "null";
    } else if (numStr.startsWith('0')) {
      return this.convert_digit_by_digit(num);
    } else if (numStr.length === 4 && (num < 1000 || num > 2100)) {
      // Read as digits for codes
      return this.convert_digit_by_digit(num);
    } else {
      return this.convert_millions(Number(num));
    }
  }

  /**
  * Preprocess text for German:
  * - convert symbols to words
  * - convert numbers to words
  * - handle German-specific characters
  * - filter out characters that should be left unspoken
  * @param {string} s Text
  * @return {string} Pre-processed text.
  */
  preProcessText(s) {
    return s
      .replace(/[#_*\":;]/g, '') // Remove unwanted characters
      .replace(this.symbolsReg, (symbol) => {
        return ' ' + this.symbols[symbol] + ' ';
      })
      .replace(/(\d)\.(\d)/g, '$1 komma $2') // Decimal separator
      .replace(/(\d),(\d)/g, '$1 komma $2') // German decimal comma
      .replace(/\d+/g, this.convertNumberToWords.bind(this)) // Numbers to words
      .replace(/(\D)\1\1+/g, "$1$1") // Max 2 repeating chars
      .replace(/\s+/g, ' ') // Only one space
      .toLowerCase() // German is case-insensitive for phonetics
      .trim();
  }

  /**
  * Convert German text to Oculus LipSync Visemes and durations
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
        let matched = false;
        for (let i = 0; i < ruleset.length; i++) {
          const rule = ruleset[i];
          const test = o.words.substring(0, o.i) + c.toLowerCase() + o.words.substring(o.i + 1);
          let matches = test.match(rule.regex);
          
          if (matches) {
            rule.visemes.forEach(viseme => {
              if (o.visemes.length && o.visemes[o.visemes.length - 1] === viseme) {
                // Extend duration of same viseme
                const d = 0.7 * (this.visemeDurations[viseme] || 1);
                o.durations[o.durations.length - 1] += d;
                t += d;
              } else {
                // Add new viseme
                const d = this.visemeDurations[viseme] || 1;
                o.visemes.push(viseme);
                o.times.push(t);
                o.durations.push(d);
                t += d;
              }
            });
            o.i += rule.move;
            matched = true;
            break;
          }
        }
        
        if (!matched) {
          o.i++;
          t += this.specialDurations[c] || 0;
        }
      } else {
        o.i++;
        t += this.specialDurations[c] || 0;
      }
    }

    return o;
  }
}

export { LipsyncDe };
