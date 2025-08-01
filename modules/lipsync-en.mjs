
/**
* @class English lip-sync processor
* @author Mika Suominen
*/

class LipsyncEn {

  /**
  * @constructor
  */
  constructor() {

    // English words to Oculus visemes, algorithmic rules adapted from:
    //   NRL Report 7948, "Automatic Translation of English Text to Phonetics by Means of Letter-to-Sound Rules" (1976)
    //   by HONEY SUE ELOVITZ, RODNEY W. JOHNSON, ASTRID McHUGH, AND JOHN E. SHORE
    //   Available at: https://apps.dtic.mil/sti/pdfs/ADA021929.pdf
    this.rules = {
      'A': [
        "[A] =aa", " [ARE] =aa RR", " [AR]O=aa RR", "[AR]#=E RR",
        " ^[AS]#=E SS", "[A]WA=aa", "[AW]=aa", " :[ANY]=E nn I",
        "[A]^+#=E", "#:[ALLY]=aa nn I", " [AL]#=aa nn", "[AGAIN]=aa kk E nn",
        "#:[AG]E=I kk", "[A]^+:#=aa", ":[A]^+ =E", "[A]^%=E",
        " [ARR]=aa RR", "[ARR]=aa RR", " :[AR] =aa RR", "[AR] =E",
        "[AR]=aa RR", "[AIR]=E RR", "[AI]=E", "[AY]=E", "[AU]=aa",
        "#:[AL] =aa nn", "#:[ALS] =aa nn SS", "[ALK]=aa kk", "[AL]^=aa nn",
        " :[ABLE]=E PP aa nn", "[ABLE]=aa PP aa nn", "[ANG]+=E nn kk", "[A]=aa"
      ],

      'B': [
        " [BE]^#=PP I", "[BEING]=PP I I nn", " [BOTH] =PP O TH",
        " [BUS]#=PP I SS", "[BUIL]=PP I nn", "[B]=PP"
      ],

      'C': [
        " [CH]^=kk", "^E[CH]=kk", "[CH]=CH", " S[CI]#=SS aa",
        "[CI]A=SS", "[CI]O=SS", "[CI]EN=SS", "[C]+=SS",
        "[CK]=kk", "[COM]%=kk aa PP", "[C]=kk"
      ],

      'D': [
        "#:[DED] =DD I DD", ".E[D] =DD", "#^:E[D] =DD", " [DE]^#=DD I",
        " [DO] =DD U", " [DOES]=DD aa SS", " [DOING]=DD U I nn",
        " [DOW]=DD aa", "[DU]A=kk U", "[D]=DD"
      ],

      'E': [
        "#:[E] =", "'^:[E] =", " :[E] =I", "#[ED] =DD", "#:[E]D =",
        "[EV]ER=E FF", "[E]^%=I", "[ERI]#=I RR I", "[ERI]=E RR I",
        "#:[ER]#=E", "[ER]#=E RR", "[ER]=E", " [EVEN]=I FF E nn",
        "#:[E]W=", "@[EW]=U", "[EW]=I U", "[E]O=I", "#:&[ES] =I SS",
        "#:[E]S =", "#:[ELY] =nn I", "#:[EMENT]=PP E nn DD", "[EFUL]=FF U nn",
        "[EE]=I", "[EARN]=E nn", " [EAR]^=E", "[EAD]=E DD", "#:[EA] =I aa",
        "[EA]SU=E", "[EA]=I", "[EIGH]=E", "[EI]=I", " [EYE]=aa", "[EY]=I",
        "[EU]=I U", "[E]=E"
      ],

      'F': [
        "[FUL]=FF U nn", "[F]=FF"
      ],

      'G': [
        "[GIV]=kk I FF", " [G]I^=kk", "[GE]T=kk E", "SU[GGES]=kk kk E SS",
        "[GG]=kk", " B#[G]=kk", "[G]+=kk", "[GREAT]=kk RR E DD",
        "#[GH]=", "[G]=kk"
      ],

      'H': [
        " [HAV]=I aa FF", " [HERE]=I I RR", " [HOUR]=aa EE", "[HOW]=I aa",
        "[H]#=I", "[H]="
      ],

      'I': [
        " [IN]=I nn", " [I] =aa", "[IN]D=aa nn", "[IER]=I E",
        "#:R[IED] =I DD", "[IED] =aa DD", "[IEN]=I E nn", "[IE]T=aa E",
        " :[I]%=aa", "[I]%=I", "[IE]=I", "[I]^+:#=I", "[IR]#=aa RR",
        "[IZ]%=aa SS", "[IS]%=aa SS", "[I]D%=aa", "+^[I]^+=I",
        "[I]T%=aa", "#^:[I]^+=I", "[I]^+=aa", "[IR]=E", "[IGH]=aa",
        "[ILD]=aa nn DD", "[IGN] =aa nn", "[IGN]^=aa nn", "[IGN]%=aa nn",
        "[IQUE]=I kk", "[I]=I"
      ],

      'J': [
        "[J]=kk"
      ],

      'K': [
        " [K]N=", "[K]=kk"
      ],

      'L': [
        "[LO]C#=nn O", "L[L]=", "#^:[L]%=aa nn", "[LEAD]=nn I DD", "[L]=nn"
      ],

      'M': [
        "[MOV]=PP U FF", "[M]=PP"
      ],

      'N': [
        "E[NG]+=nn kk", "[NG]R=nn kk", "[NG]#=nn kk", "[NGL]%=nn kk aa nn",
        "[NG]=nn", "[NK]=nn kk", " [NOW] =nn aa", "[N]=nn"
      ],

      'O': [
        "[OF] =aa FF", "[OROUGH]=E O", "#:[OR] =E", "#:[ORS] =E SS",
        "[OR]=aa RR", " [ONE]=FF aa nn", "[OW]=O", " [OVER]=O FF E",
        "[OV]=aa FF", "[O]^%=O", "[O]^EN=O", "[O]^I#=O", "[OL]D=O nn",
        "[OUGHT]=aa DD", "[OUGH]=aa FF", " [OU]=aa", "H[OU]S#=aa",
        "[OUS]=aa SS", "[OUR]=aa RR", "[OULD]=U DD", "^[OU]^L=aa",
        "[OUP]=U OO", "[OU]=aa", "[OY]=O", "[OING]=O I nn", "[OI]=O",
        "[OOR]=aa RR", "[OOK]=U kk", "[OOD]=U DD", "[OO]=U", "[O]E=O",
        "[O] =O", "[OA]=O", " [ONLY]=O nn nn I", " [ONCE]=FF aa nn SS",
        "[ON'T]=O nn DD", "C[O]N=aa", "[O]NG=aa", " ^:[O]N=aa",
        "I[ON]=aa nn", "#:[ON] =aa nn", "#^[ON]=aa nn", "[O]ST =O",
        "[OF]^=aa FF", "[OTHER]=aa TH E", "[OSS] =aa SS", "#^:[OM]=aa PP",
        "[O]=aa"
      ],

      'P': [
        "[PH]=FF", "[PEOP]=PP I PP", "[POW]=PP aa", "[PUT] =PP U DD",
        "[P]=PP"
      ],

      'Q': [
        "[QUAR]=kk FF aa RR", "[QU]=kk FF", "[Q]=kk"
      ],

      'R': [
        " [RE]^#=RR I", "[R]=RR"
      ],

      'S': [
        "[SH]=SS", "#[SION]=SS aa nn", "[SOME]=SS aa PP", "#[SUR]#=SS E",
        "[SUR]#=SS E", "#[SU]#=SS U", "#[SSU]#=SS U", "#[SED] =SS DD",
        "#[S]#=SS", "[SAID]=SS E DD", "^[SION]=SS aa nn", "[S]S=",
        ".[S] =SS", "#:.E[S] =SS", "#^:##[S] =SS", "#^:#[S] =SS",
        "U[S] =SS", " :#[S] =SS", " [SCH]=SS kk", "[S]C+=",
        "#[SM]=SS PP", "#[SN]'=SS aa nn", "[S]=SS"
      ],

      'T': [
        " [THE] =TH aa", "[TO] =DD U", "[THAT] =TH aa DD", " [THIS] =TH I SS",
        " [THEY]=TH E", " [THERE]=TH E RR", "[THER]=TH E", "[THEIR]=TH E RR",
        " [THAN] =TH aa nn", " [THEM] =TH E PP", "[THESE] =TH I SS",
        " [THEN]=TH E nn", "[THROUGH]=TH RR U", "[THOSE]=TH O SS",
        "[THOUGH] =TH O", " [THUS]=TH aa SS", "[TH]=TH", "#:[TED] =DD I DD",
        "S[TI]#N=CH", "[TI]O=SS", "[TI]A=SS", "[TIEN]=SS aa nn",
        "[TUR]#=CH E", "[TU]A=CH U", " [TWO]=DD U", "[T]=DD"
      ],

      'U': [
        " [UN]I=I U nn", " [UN]=aa nn", " [UPON]=aa PP aa nn",
        "@[UR]#=U RR", "[UR]#=I U RR", "[UR]=E", "[U]^ =aa",
        "[U]^^=aa", "[UY]=aa", " G[U]#=", "G[U]%=", "G[U]#=FF",
        "#N[U]=I U", "@[U]=I", "[U]=I U"
      ],

      'V': [
        "[VIEW]=FF I U", "[V]=FF"
      ],

      'W': [
        " [WERE]=FF E", "[WA]S=FF aa", "[WA]T=FF aa", "[WHERE]=FF E RR",
        "[WHAT]=FF aa DD", "[WHOL]=I O nn", "[WHO]=I U", "[WH]=FF",
        "[WAR]=FF aa RR", "[WOR]^=FF E", "[WR]=RR", "[W]=FF"
      ],

      'X': [
        " [X]=SS", "[X]=kk SS"
      ],

      'Y': [
        "[YOUNG]=I aa nn", " [YOU]=I U", " [YES]=I E SS", " [Y]=I",
        "#^:[Y] =I", "#^:[Y]I=I", " :[Y] =aa", " :[Y]#=aa",
        " :[Y]^+:#=I", " :[Y]^#=I", "[Y]=I"
      ],

      'Z': [
        "[Z]=SS"
      ]
    };

    const ops = {
      '#': '[AEIOUY]+', // One or more vowels AEIOUY
      // This one is not used: "'": '[BCDFGHJKLMNPQRSTVWXZ]+', // One or more consonants BCDFGHJKLMNPQRSTVWXZ
      '.': '[BDVGJLMNRWZ]', // One voiced consonant BDVGJLMNRWZ
      // This one is not used: '$': '[BDVGJLMNRWZ][EI]', // One consonant followed by E or I
      '%': '(?:ER|E|ES|ED|ING|ELY)', // One of ER, E, ES, ED, ING, ELY
      '&': '(?:[SCGZXJ]|CH|SH)', // One of S, C, G, Z, X, J, CH, SH
      '@': '(?:[TSRDLZNJ]|TH|CH|SH)', // One of T, S, R, D, L, Z, N, J, TH, CH, SH
      '^': '[BCDFGHJKLMNPQRSTVWXZ]', // One consonant BCDFGHJKLMNPQRSTVWXZ
      '+': '[EIY]', // One of E, I, Y
      ':': '[BCDFGHJKLMNPQRSTVWXZ]*', // Zero or more consonants BCDFGHJKLMNPQRSTVWXZ
      ' ': '\\b' // Start/end of the word
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

    // Viseme durations in relative unit (1=average)
    // TODO: Check for statistics for English
    this.visemeDurations = {
      'aa': 0.95, 'E': 0.90, 'I': 0.92, 'O': 0.96, 'U': 0.95, 'PP': 1.08,
      'SS': 1.23, 'TH': 1, 'DD': 1.05, 'FF': 1.00, 'kk': 1.21, 'nn': 0.88,
      'RR': 0.88, 'DD': 1.05, 'sil': 1
    };

    // Pauses in relative units (1=average)
    this.specialDurations = { ' ': 1, ',': 3, '-':0.5, "'":0.5 };

    // English number words
    this.digits = ['oh', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    this.ones = ['','one','two','three','four','five','six','seven','eight','nine'];
    this.tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
    this.teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
    this.decades = {
      20: "twenties", 30: "thirties", 40: "forties", 50: "fifties",
      60: "sixties", 70: "seventies", 80: "eighties", 90: "nineties"
    };
    this.ordinals = {
      1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth",
      6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth",
      11: "eleventh", 12: "twelfth", 13: "thirteenth", 14: "fourteenth",
      15: "fifteenth", 16: "sixteenth", 17: "seventeeth", 18: "eighteenth",
      19: "nineteenth", 20: "twentieth", 30: "thirtieth", 40: "fortieth",
      50: "fiftieth", 60: "sixtieth",70: "seventieth", 80: "eightieth",
      90: "ninetieth"
    };

    // Symbols to English
    this.symbols = {
      '%': 'percent', '€': 'euros', '&': 'and', '+': 'plus',
      '$': 'dollars'
    };
    this.symbolsReg = /[%€&\+\$]/g;
  }

  convert_digit_by_digit(num) {
    num = String(num).split("");
    let numWords = "";
    for(let m=0; m<num.length; m++) {
      numWords += this.digits[num[m]] + " ";
    }
    numWords = numWords.substring(0, numWords.length - 1); //kill final space
    return numWords;
  }

  convert_sets_of_two(num) {
    let firstNumHalf = String(num).substring(0, 2);
    let secondNumHalf = String(num).substring(2, 4);
    let numWords = this.convert_tens(firstNumHalf);
    numWords += " " + this.convert_tens(secondNumHalf);
    return numWords;
  }

  convert_millions(num){
    if (num>=1000000){
      return this.convert_millions(Math.floor(num/1000000))+" million "+this.convert_thousands(num%1000000);
    } else {
      return this.convert_thousands(num);
    }
  }

  convert_thousands(num){
    if (num>=1000){
      return this.convert_hundreds(Math.floor(num/1000))+" thousand "+this.convert_hundreds(num%1000);
    } else {
      return this.convert_hundreds(num);
    }
  }

  convert_hundreds(num){
    if (num>99){
      return this.ones[Math.floor(num/100)]+" hundred "+this.convert_tens(num%100);
    } else {
      return this.convert_tens(num);
    }
  }

  convert_tens(num){
    if (num < 10){
      return (Number(num) != 0 && num.toString().startsWith("0") ? "oh " : "") + this.ones[Number(num)];
    } else if (num>=10 && num<20) {
      return this.teens[num-10];
    } else {
      return (this.tens[Math.floor(num/10)]+" "+this.ones[num%10]).trim();
    }
  }
 
  /**
  * Convert number to words. Try to decide how to read it.
  *
  * @param {number|string} num Number
  * @param {boolean} [isNotSpecial=false] If true, this is not a special number (e.g. year, zip code)
  * @return {string} String
  */
  convertNumberToWords(num, isNotSpecial=false){
    const n = parseFloat(num);
    if (num == "0") {
      return "zero";
    } else if (num < 0 ) {
      return " minus " + this.convertNumberToWords( Math.abs(num).toString(), isNotSpecial ).trim();
    } else if ( n && !Number.isInteger(n) ) {
      const parts = n.toString().split('.');
      return this.convertNumberToWords(parts[0], isNotSpecial).trim() + " point " + this.convert_digit_by_digit(parts[1]).trim();
    } else if(num.toString().startsWith('0')){
      return this.convert_digit_by_digit(num).trim();
    } else if (!isNotSpecial && ((num<1000 && num>99 && (num % 100) !== 0) || (num>10000&&num<1000000))) { //read area and zip codes digit by digit
      return this.convert_digit_by_digit(num).trim();
    } else if (!isNotSpecial && ((num > 1000 && num < 2000)||(num>2009&&num<3000))) { //read years as two sets of two digits
      return (num % 100 != 0 ? this.convert_sets_of_two(num).trim() : this.convert_tens(num.toString().substring(0, 2)).trim() + " hundred");
    } else {
      return this.convert_millions(num).trim();
    }
  }

  /**
  * Expand decade to text.
  *
  * @param {string} decade Decade
  * @return {string} Normalized text
  */
  convertDecade(decade) {
    const num = parseInt(decade);
    const isShort = !isNaN(num) && decade.length === 2;
    const isLong = !isNaN(num) && decade.length > 2 && num > 0 && num <= 3000;
    const thousands = (isLong && (num % 1000) === 0 ) ? Math.floor(num / 1000) : null;
    const hundreds = (isLong && !thousands) ?  Math.floor(num / 100) : null;
    const tens = (isShort || isLong) ? Math.floor((num % 100) / 10) * 10 : null;

    let s = [];
    if ( thousands ) {
      s.push( this.convertNumberToWords(thousands).trim(), "thousands" );
    } else {
      if ( hundreds ) {
        s.push( this.convertNumberToWords(hundreds).trim() );
      }
      if ( tens ) {
        s.push( this.decades[tens] || (this.convertNumberToWords(tens).trim() + 's') );
      } else if ( hundreds ) {
        s.push( "hundreds" );
      } else {
        s.push( decade );
      }
    }

    return s.join(" ");
  }

  /**
  * Convert ordinal number to text.
  *
  * @param {number} num Ordinal number
  * @return {string} Normalized text
  */
  convertOrdinal(num) {

    // Return immediately, if we have the number in our map
    if ( this.ordinals.hasOwnProperty(num) ) {
      return this.ordinals[num];
    }

    const hundreds = Math.floor(num / 100);
    const tens = Math.floor( (num % 100) / 10) * 10;
    const ones = num % 10;

    let s = [];
    if ( hundreds ) {
      s.push( this.convertNumberToWords(hundreds).trim() );
      if ( tens || ones ) {
        s.push( "hundred" );
      } else {
        s.push( "hundredth" );
      }
    }

    if ( tens ) {
      if ( ones ) {
        s.push( this.convertNumberToWords(tens).trim() );
      } else {
        s.push( this.ordinals[tens] );
      }
    }

    if ( ones ) {
      s.push( this.ordinals[ones] );
    }

    return s.join(" ");
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
    let r = s.replace('/[#_*\":;]/g','');

    // Symbols
    r = r.replace( this.symbolsReg, (symbol) => {
      return ' ' + this.symbols[symbol] + ' ';
    });

    // Numbers, if any
    if ( /\d/.test(r) ) {
      
      // Decades: 70s, 1970s -> SEVENTIES, NINETEEN SEVENTIES 
      r = r.replace(/\b(\d{2,4})[''']?\s?[sS](?=\s|[.,!?;:]|$)/g, (match, decade) => {
        const result = this.convertDecade(decade);
        return result === decade ? match : result;
      });

      // Ordinals: 1st, 22nd -> FIRST, TWENTY SECOND
      r = r.replace(/\b(\d+)\s*(st|nd|rd|th)(?=\s|[.,!?;:]|$)/gi, (match, number) => {
        
        return this.convertOrdinal(Number(number));
      });

      // Handle mixed alphanumeric sequences
      r = r.replace(/\b(\w*?)(\d+)([A-Za-z]+)\b/g, (match, prefix, numbers, letters) => {
        const processedNumber = this.convertNumberToWords(numbers);
        return `${prefix}${processedNumber} ${letters}`;
      }).replace(/\b([A-Za-z]+)(\d+)(\w*?)\b/g, (match, letters, numbers, suffix) => {
        const processedNumber = this.convertNumberToWords(numbers);
        return `${letters} ${processedNumber}${suffix}`;
      });

      // Process the remaining numbers
      r = r.replace(/-?(?:\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?/g, (match, decimal) => {
        let s = match;
        let isNotSpecial = false;
        if ( /,/.test(s) ) {
          s = s.replace( /,/g, "" );
          isNotSpecial = true;
        }
        if ( decimal ) {
          isNotSpecial = true;
        }
        return this.convertNumberToWords(s, isNotSpecial);
      });
    }

    r = r.replace(/(\D)\1\1+/g, "$1$1") // max 2 repeating chars
      .replaceAll('  ',' ') // Only one repeating space
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC') // Remove non-English diacritics
      .trim();

    return r;
  }


  /**
  * Convert word to Oculus LipSync Visemes and durations
  * @param {string} w Text
  * @return {Object} Oculus LipSync Visemes and durations.
  */
  wordsToVisemes(w) {
    let o = { words: w.toUpperCase(), visemes: [], times: [], durations: [], i:0 };
    let t = 0;

    const chars = [...o.words];
    while( o.i < chars.length ) {
      const c = chars[o.i];
      const ruleset = this.rules[c];
      if ( ruleset ) {
        for(let i=0; i<ruleset.length; i++) {
          const rule = ruleset[i];
          const test = o.words.substring(0, o.i) + c.toLowerCase() + o.words.substring(o.i+1);
          let matches = test.match(rule.regex);
          if ( matches ) {
            rule.visemes.forEach( viseme => {
              if ( o.visemes.length && o.visemes[ o.visemes.length - 1 ] === viseme ) {
                const d = 0.7 * (this.visemeDurations[viseme] || 1);
                o.durations[ o.durations.length - 1 ] += d;
                t += d;
              } else {
                const d = this.visemeDurations[viseme] || 1;
                o.visemes.push( viseme );
                o.times.push(t);
                o.durations.push( d );
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

export { LipsyncEn };
