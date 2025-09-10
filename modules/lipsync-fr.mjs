/**
* @class French lip-sync processor
* @author Stephan Wald (assisted by AI) Improved version based on French phonetic rules
* sources: 
* Léon, P. & Léon, M. (2009). La Prononciation du Français
* Warnant, L. (1987). Dictionnaire de la Prononciation Française
* Yvon, F. (1996). Grapheme-to-Phoneme Conversion using Multiple Unbounded Overlapping Chunks
* International Phonetic Association Handbook (1999)
*/

class LipsyncFr {

  /**
  * @constructor
  */
  constructor() {

    // Comprehensive French grapheme-to-viseme rules
    // Based on French phonetic patterns and pronunciation rules
    this.rules = {
      'A': [
        // Nasal vowels
        "[AN]C=aa nn", "[AN]G=aa nn", "[AN]T=aa nn", "[AN]D=aa nn", "[AN] =aa nn", "[AN]$=aa nn",
        "[AM]P=aa nn", "[AM]B=aa nn", "[AM] =aa nn", "[AM]$=aa nn",
        // Vowel combinations
        "[AI]N=E nn", "[AIM]=E nn", "[AIN]=E nn",
        "[AU]=O", "[AUX]=O", "[AUT]=O",
        "[AI]=E", "[AY]=E",
        // Basic vowel
        "[A]=aa"
      ],

      'À': [
        "[À]=aa"
      ],

      'Â': [
        "[Â]=aa"
      ],

      'B': [
        " [B] =PP", "[BB]=PP", "[B]=PP"
      ],

      'C': [
        // Soft C
        "[C]E=SS", "[C]I=SS", "[C]Y=SS", "[C]È=SS", "[C]É=SS", "[C]Ê=SS",
        // CH combinations
        "[CH]=SS",
        // Hard C
        "[C]A=kk", "[C]O=kk", "[C]U=kk", "[C]L=kk", "[C]R=kk",
        "[CK]=kk", "[C]=kk"
      ],

      'Ç': [
        "[Ç]=SS"
      ],

      'D': [
        "[D]=DD"
      ],

      'E': [
        // Nasal E
        "[EN]C=aa nn", "[EN]T=aa nn", "[EN]D=aa nn", "[EN] =aa nn", "[EN]$=aa nn",
        "[EM]P=aa nn", "[EM]B=aa nn", "[EM] =aa nn", "[EM]$=aa nn",
        // Vowel combinations
        "[EAU]=O", "[EAU]X=O",
        "[EU]=U", "[EUX]=U", "[EUR]=U RR",
        "[EI]=E", "[EIN]=E nn",
        "[ER] =E", "[ER]$=E", "[EZ] =E", "[EZ]$=E",
        "[ED] =E", "[ED]$=E",
        // Silent E
        " [E] =", "[E] =", "[E]$=",
        "[E]S =", "[E]S$=", "[E]NT =", "[E]NT$=",
        // Accented E
        "[È]=E", "[É]=E", "[Ê]=E", "[Ë]=E",
        // Basic E
        "[E]=E"
      ],

      'È': [
        "[È]=E"
      ],

      'É': [
        "[É]=E"
      ],

      'Ê': [
        "[Ê]=E"
      ],

      'Ë': [
        "[Ë]=E"
      ],

      'F': [
        "[FF]=FF", "[F]=FF", "[PH]=FF"
      ],

      'G': [
        // Soft G
        "[G]E=SS", "[G]I=SS", "[G]Y=SS", "[G]È=SS", "[G]É=SS", "[G]Ê=SS",
        // GN combination
        "[GN]=nn I", "[GN]E=nn", "[GN]A=nn aa", "[GN]O=nn O",
        // GU combinations
        "[GU]E=kk", "[GU]I=kk", "[GU]A=kk FF aa", "[GU]O=kk FF O",
        // Hard G
        "[G]A=kk", "[G]O=kk", "[G]U=kk", "[G]L=kk", "[G]R=kk",
        "[GG]=kk", "[G]=kk"
      ],

      'H': [
        // Silent H
        "[H]="
      ],

      'I': [
        // Nasal I
        "[IN]C=E nn", "[IN]T=E nn", "[IN]D=E nn", "[IN] =E nn", "[IN]$=E nn",
        "[IM]P=E nn", "[IM]B=E nn", "[IM] =E nn", "[IM]$=E nn",
        // Vowel combinations
        "[IEN]=I E nn", "[IER]=I E", "[IEU]=I U", "[IEZ]=I E",
        "[ILL]E=I", "[ILLE]=I", "[ILL]=I",
        // Basic I
        "[Î]=I", "[Ï]=I", "[I]=I"
      ],

      'Î': [
        "[Î]=I"
      ],

      'Ï': [
        "[Ï]=I"
      ],

      'J': [
        "[J]=SS"
      ],

      'K': [
        "[K]=kk"
      ],

      'L': [
        // Double L
        "[LL]E=", "[LLE]=", "[LL]A=I aa", "[LL]O=I O", "[LL]U=I U",
        "[LL]I=I", "[LL]=I",
        // Basic L
        "[L]=nn"
      ],

      'M': [
        "[MM]=PP", "[M]=PP"
      ],

      'N': [
        "[NN]=nn", "[N]=nn"
      ],

      'O': [
        // Nasal O
        "[ON]C=O nn", "[ON]T=O nn", "[ON]D=O nn", "[ON] =O nn", "[ON]$=O nn",
        "[OM]P=O nn", "[OM]B=O nn", "[OM] =O nn", "[OM]$=O nn",
        // Vowel combinations
        "[OI]N=FF E nn", "[OI]G=FF aa", "[OI]S=FF aa", "[OI]T=FF aa", "[OI]X=FF aa", "[OI]=FF aa",
        "[OU]=U", "[OÙ]=U", "[OÛ]=U",
        "[OEU]=U", "[OEUR]=U RR",
        "[OUGH]=U FF", "[OUGH]T=U",
        // Basic O
        "[Ô]=O", "[O]=O"
      ],

      'Ô': [
        "[Ô]=O"
      ],

      'Ù': [
        "[Ù]=U"
      ],

      'Û': [
        "[Û]=U"
      ],

      'P': [
        "[PH]=FF", "[PP]=PP", "[P]=PP"
      ],

      'Q': [
        "[QU]=kk", "[Q]=kk"
      ],

      'R': [
        "[RR]=RR", "[R]=RR"
      ],

      'S': [
        // S between vowels
        "#[S]#=SS",
        // Initial S
        " [S]=SS",
        // Double S
        "[SS]=SS",
        // Final S (often silent)
        "[S] =", "[S]$=",
        // S in combinations
        "[SC]E=SS", "[SC]I=SS", "[SC]Y=SS",
        // Basic S
        "[S]=SS"
      ],

      'T': [
        // TI combinations
        "[TI]A=SS I aa", "[TI]E=SS I E", "[TI]O=SS I O", "[TI]ON=SS I O nn",
        // TH (rare in French)
        "[TH]=DD",
        // Double T
        "[TT]=DD",
        // Final T (often silent)
        "[T] =", "[T]$=",
        // Basic T
        "[T]=DD"
      ],

      'U': [
        // Nasal U
        "[UN]C=U nn", "[UN]T=U nn", "[UN]D=U nn", "[UN] =U nn", "[UN]$=U nn",
        "[UM]=U nn",
        // Vowel combinations
        "[UE]=I", "[UEI]=I E", "[UEIL]=I I", "[UILL]=I",
        // Basic U
        "[Ù]=U", "[Û]=U", "[Ü]=I U", "[U]=I U"
      ],

      'Ü': [
        "[Ü]=I U"
      ],

      'V': [
        "[V]=FF"
      ],

      'W': [
        "[W]=FF"
      ],

      'X': [
        // X at end (often silent or /s/)
        "[X] =", "[X]$=",
        // X between vowels
        "#[X]#=kk SS",
        // Initial X
        " [X]=kk SS",
        // Basic X
        "[X]=kk SS"
      ],

      'Y': [
        // Y as vowel
        "[Y]=I",
        // Y as consonant
        " [Y]=I",
        // Y combinations
        "[YE]=I E", "[YA]=I aa", "[YO]=I O", "[YU]=I U"
      ],

      'Z': [
        "[Z]=SS"
      ]
    };

    const ops = {
      '#': '[AEIOUYÀÂÈÉÊËÎÏÔÙÛÜ]+', // French vowels including accented ones
      '.': '[BDVGJLMNRWZ]', // Voiced consonants
      '%': '(?:ER|E|ES|ÉS|ÈS|ÊS|ENT|MENT|TION|SION)', // French suffixes
      '&': '(?:[SCGZXJ]|CH|SH|GN)', // French consonant clusters
      '@': '(?:[TSRDLZNJ]|TH|CH|SH|GN)', // French consonant sounds
      '^': '[BCDFGHJKLMNPQRSTVWXZÇ]+', // French consonants
      '+': '[EIYÈÉÊËÎÏ]', // Front vowels
      ':': '[BCDFGHJKLMNPQRSTVWXZÇ]*', // Zero or more consonants
      ' ': '\\b', // Word boundary
      '$': '$' // End of word
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
        o.regex = new RegExp(exp, 'i'); // Case insensitive for French

        if ( strVisemes.length ) {
          strVisemes.split(' ').forEach( viseme => {
            if (viseme) { // Only add non-empty visemes
              o.visemes.push(viseme);
            }
          });
        }

        return o;
      });
    });

    // Viseme durations in relative units (1=average)
    // Adjusted for French phonetic characteristics
    this.visemeDurations = {
      'aa': 1.0,   // French /a/ and /ɑ/
      'E': 0.95,   // French /e/, /ɛ/, /ə/
      'I': 0.90,   // French /i/, /y/
      'O': 1.05,   // French /o/, /ɔ/
      'U': 0.95,   // French /u/, /ø/, /œ/
      'PP': 1.10,  // French /p/, /b/, /m/
      'SS': 1.25,  // French /s/, /z/, /ʃ/, /ʒ/
      'TH': 1.0,   // Rare in French
      'DD': 1.05,  // French /t/, /d/
      'FF': 1.00,  // French /f/, /v/
      'kk': 1.20,  // French /k/, /g/
      'nn': 0.88,  // French /n/, /l/, /ɲ/
      'RR': 1.15,  // French /r/ (uvular)
      'sil': 1
    };

    // Pauses in relative units (1=average)
    this.specialDurations = { 
      ' ': 1, ',': 2.5, '.': 3.5, ';': 2.8, ':': 2.2, '!': 3.2, '?': 3.2,
      '-': 0.8, "'": 0.3, '"': 0.3, '(': 1.5, ')': 1.5
    };

    // French number words
    this.digits = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    this.ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    this.teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    this.tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

    // French symbols to words
    this.symbols = {
      '%': 'pourcent',
      '€': 'euros',
      '&': 'et',
      '+': 'plus',
      '$': 'dollars',
      '=': 'égale',
      '@': 'arobase',
      '#': 'dièse',
      '°': 'degrés'
    };
    this.symbolsReg = /[%€&\+\$=@#°]/g;
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

  convert_tens(num) {
    if (num < 10) {
      return this.ones[num] || "";
    } else if (num >= 10 && num < 20) {
      return this.teens[num - 10];
    } else if (num >= 70 && num < 80) {
      // French: soixante-dix, soixante et onze, soixante-douze, etc.
      const remainder = num - 60;
      if (remainder === 11) {
        return "soixante et onze";
      }
      return "soixante-" + this.teens[remainder - 10];
    } else if (num >= 90) {
      // French: quatre-vingt-dix, quatre-vingt-onze, etc.
      const remainder = num - 80;
      if (remainder === 11) {
        return "quatre-vingt-onze";
      }
      return "quatre-vingt-" + this.teens[remainder - 10];
    } else {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      
      if (ten === 8 && one === 0) {
        return "quatre-vingts"; // Special case: 80
      } else if (ten === 8) {
        return "quatre-vingt-" + this.ones[one];
      } else if ((ten === 2 || ten === 3 || ten === 4 || ten === 5 || ten === 6) && one === 1) {
        return this.tens[ten] + " et un"; // et un for 21, 31, 41, 51, 61
      } else if (one === 0) {
        return this.tens[ten];
      } else {
        return this.tens[ten] + "-" + this.ones[one];
      }
    }
  }

  convert_hundreds(num) {
    if (num >= 100) {
      const hundreds = Math.floor(num / 100);
      const remainder = num % 100;
      
      let result = "";
      if (hundreds === 1) {
        result = "cent";
      } else {
        result = this.ones[hundreds] + " cent";
        if (remainder === 0) {
          result += "s"; // cents when plural and no remainder
        }
      }
      
      if (remainder > 0) {
        result += " " + this.convert_tens(remainder);
      }
      
      return result;
    } else {
      return this.convert_tens(num);
    }
  }

  convert_thousands(num) {
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      
      let result = "";
      if (thousands === 1) {
        result = "mille";
      } else {
        result = this.convert_hundreds(thousands) + " mille";
      }
      
      if (remainder > 0) {
        result += " " + this.convert_hundreds(remainder);
      }
      
      return result;
    } else {
      return this.convert_hundreds(num);
    }
  }

  convert_millions(num) {
    if (num >= 1000000) {
      const millions = Math.floor(num / 1000000);
      const remainder = num % 1000000;
      
      let result = "";
      if (millions === 1) {
        result = "un million";
      } else {
        result = this.convert_hundreds(millions) + " millions";
      }
      
      if (remainder > 0) {
        result += " " + this.convert_thousands(remainder);
      }
      
      return result;
    } else {
      return this.convert_thousands(num);
    }
  }

  convertNumberToWords(num) {
    const numStr = String(num);
    
    if (num === "0" || num === 0) {
      return "zéro";
    } else if (numStr.startsWith('0')) {
      return this.convert_digit_by_digit(num);
    } else {
      return this.convert_millions(Number(num));
    }
  }

  /**
  * Preprocess text for French:
  * - convert symbols to words
  * - convert numbers to words  
  * - handle French-specific characters and liaisons
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
      .replace(/(\d)[,.](\d)/g, '$1 virgule $2') // French decimal comma/point
      .replace(/\d+/g, this.convertNumberToWords.bind(this)) // Numbers to words
      .replace(/(\D)\1\1+/g, "$1$1") // Max 2 repeating chars
      .replace(/\s+/g, ' ') // Only one space
      .replace(/'/g, "'") // Normalize apostrophes
      .trim();
  }

  /**
  * Convert French text to Oculus LipSync Visemes and durations
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

export { LipsyncFr };
