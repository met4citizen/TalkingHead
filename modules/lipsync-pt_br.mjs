/**
* @class Brazilian Portuguese lip-sync processor
* @author Lucas Boemeke (assisted by AI)
*
* Rule-based grapheme-to-viseme conversion for Brazilian Portuguese. Portuguese
* spelling is fairly regular, so a small set of context rules on top of a
* letter table gives good results:
* - digraphs ch, lh, nh, rr, ss, sc/xc, qu, gu
* - soft/hard c and g, silent h and u
* - "ti"/"di" and final "te"/"de" affricates (tia, cidade, de)
* - vocalized "l" in syllable coda (Brasil, alto) and nasal codas (bem, campo)
* - final unstressed e/o (tarde, carro) and the nasal diphthongs ão, am, em, ens
* - numbers, decimal/thousands separators, currencies and common symbols
*   read in Portuguese
*/

class LipsyncPt_br {

  /**
  * @constructor
  */
  constructor() {

    // Portuguese letters to Oculus visemes (used when no context rule applies)
    this.visemes = {
      'a': 'aa', 'á': 'aa', 'à': 'aa', 'â': 'aa', 'ã': 'aa',
      'e': 'E', 'é': 'E', 'ê': 'E',
      'i': 'I', 'í': 'I', 'y': 'I',
      'o': 'O', 'ó': 'O', 'ô': 'O', 'õ': 'O',
      'u': 'U', 'ú': 'U', 'ü': 'U', 'w': 'U',
      'b': 'PP', 'p': 'PP', 'm': 'PP',
      'f': 'FF', 'v': 'FF',
      'd': 'DD', 't': 'DD',
      'c': 'kk', 'k': 'kk', 'g': 'kk', 'q': 'kk',
      'j': 'CH', 'x': 'CH',
      's': 'SS', 'z': 'SS', 'ç': 'SS',
      'n': 'nn', 'l': 'nn',
      'r': 'RR'
    };

    this.vowels = 'aáàâãeéêiíoóôõuúüy';
    this.frontVowels = 'eéêiíy';

    // Viseme durations in relative unit (1=average)
    // Note: Based on the Finnish Google TTS test run, CH estimated
    this.visemeDurations = {
      'aa': 0.95, 'E': 0.90, 'I': 0.92, 'O': 0.96, 'U': 0.95, 'PP': 1.08,
      'SS': 1.23, 'DD': 1.05, 'FF': 1.00, 'kk': 1.21, 'nn': 0.88,
      'RR': 0.88, 'CH': 1.15, 'sil': 1
    };

    // Pauses in relative units (1=average)
    this.specialDurations = { ' ': 1, ',': 3, '-': 0.5 };

    // Portuguese number words
    this.units = [
      'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito',
      'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis',
      'dezessete', 'dezoito', 'dezenove'
    ];
    this.tens = [
      '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta',
      'oitenta', 'noventa'
    ];
    this.hundreds = [
      '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
      'seiscentos', 'setecentos', 'oitocentos', 'novecentos'
    ];

    // Currencies to Portuguese, singular and plural
    this.currencies = {
      'R$': ['real', 'reais'], 'US$': ['dólar', 'dólares'],
      '$': ['dólar', 'dólares'], '€': ['euro', 'euros']
    };
    this.currenciesReg = /(R\$|US\$|\$|€)\s*(\d+(?:[.,]\d+)*)|(\d+(?:[.,]\d+)*)\s*(R\$|US\$|\$|€)/g;

    // Symbols to Portuguese
    this.symbols = {
      '%': 'por cento', '€': 'euros', '&': 'e', '+': 'mais', '$': 'dólares',
      'R$': 'reais', 'US$': 'dólares'
    };
    this.symbolsReg = /R\$|US\$|[%€&\+\$]/g;

  }

  /**
  * Convert an integer string into Portuguese words.
  * @param {string} x Number string
  * @return {string} The number in words in Portuguese
  */
  numberToPortugueseWords(x) {
    const n = parseInt(x, 10);
    if ( isNaN(n) ) return x;

    // Numbers with leading zeros (codes) or too long are read digit by digit
    if ( x.length > 12 || ( x.length > 1 && x[0] === '0' ) ) {
      return [...x].map( d => this.units[d] ).join(' ');
    }
    if ( n === 0 ) return 'zero';

    // Numbers from 1 to 999
    const below1000 = (n) => {
      if ( n === 100 ) return 'cem';
      const parts = [];
      const h = Math.floor(n / 100), r = n % 100;
      if ( h ) parts.push( this.hundreds[h] );
      if ( r < 20 ) {
        if ( r ) parts.push( this.units[r] );
      } else {
        const t = Math.floor(r / 10), u = r % 10;
        parts.push( u ? this.tens[t] + ' e ' + this.units[u] : this.tens[t] );
      }
      return parts.join(' e ');
    };

    // Join the groups of thousands. The conjunction "e" is used before a
    // group below 100 or a round hundred: "mil e vinte", "um milhão e cem",
    // "dois milhões e quinhentos mil", but "mil duzentos e trinta".
    let s = '';
    const add = (g, w) => {
      if ( g ) s += ( s ? ( ( g < 100 || g % 100 === 0 ) ? ' e ' : ' ' ) : '' ) + w;
    };
    const bi = Math.floor(n / 1e9);
    const mi = Math.floor(n / 1e6) % 1000;
    const th = Math.floor(n / 1e3) % 1000;
    const un = n % 1000;
    add( bi, bi === 1 ? 'um bilhão' : below1000(bi) + ' bilhões' );
    add( mi, mi === 1 ? 'um milhão' : below1000(mi) + ' milhões' );
    add( th, th === 1 ? 'mil' : below1000(th) + ' mil' );
    add( un, below1000(un) );
    return s;
  }

  /**
  * Preprocess text:
  * - convert symbols and currencies to words
  * - convert numbers to words
  * - filter out characters that should be left unspoken
  * @param {string} s Text
  * @return {string} Pre-processsed text.
  */
  preProcessText(s) {
    return s.replace(/[#_*\'\":;]/g,'')
      .replace( this.currenciesReg, (match, sym1, num1, num2, sym2) => {
        const num = num1 || num2;
        const words = this.currencies[ sym1 || sym2 ];
        return ' ' + num + ' ' + ( num === '1' ? words[0] : words[1] ) + ' ';
      }) // Currencies: R$10, $10, 10€ -> 10 reais, 10 dólares, 10 euros
      .replace( this.symbolsReg, (symbol) => {
        return ' ' + this.symbols[symbol] + ' ';
      })
      .replace(/(\d)\.(?=\d{3}(?!\d))/g, '$1') // Thousands separator: 1.234 -> 1234
      .replace(/(\d)\,(\d)/g, '$1 vírgula $2') // Decimal separator
      .replace(/\d+/g, this.numberToPortugueseWords.bind(this)) // Numbers to words
      .replace(/\s+/g, ' ') // Only one repeating space
      .normalize('NFC')
      .trim();
  }

  /**
  * Convert words to Oculus LipSync Visemes and durations
  * @param {string} w Words
  * @return {Object} Oculus LipSync Visemes and durations.
  */
  wordsToVisemes(w) {
    let o = { words: w, visemes: [], times: [], durations: [] };
    let t = 0;

    // Add a viseme, extending the duration if the viseme repeats
    const push = (viseme) => {
      if ( o.visemes.length && o.visemes[ o.visemes.length-1 ] === viseme ) {
        const d = 0.7 * (this.visemeDurations[viseme] || 1);
        o.durations[ o.durations.length-1 ] += d;
        t += d;
      } else {
        const d = this.visemeDurations[viseme] || 1;
        o.visemes.push(viseme);
        o.times.push(t);
        o.durations.push(d);
        t += d;
      }
    };

    const chars = [...w.toLowerCase()];
    const isLetter = (c) => c !== undefined && /\p{L}/u.test(c);
    const isVowel = (c) => c !== undefined && this.vowels.includes(c);
    const isFront = (c) => c !== undefined && this.frontVowels.includes(c);
    const isEnd = (i) => !isLetter(chars[i]); // End of the word
    const isFinal = (i) => isEnd(i) || ( chars[i] === 's' && isEnd(i+1) ); // End of the word, optionally with plural s

    let i = 0;
    while ( i < chars.length ) {
      const c = chars[i], c1 = chars[i+1], c2 = chars[i+2];
      const startOfWord = !isLetter(chars[i-1]);

      // Digraphs
      if ( c === 'c' && c1 === 'h' ) { push('CH'); i += 2; continue; } // chave
      if ( (c === 'l' || c === 'n') && c1 === 'h' ) { push('nn'); i += 2; continue; } // filho, ninho
      if ( c === 'r' && c1 === 'r' ) { push('RR'); i += 2; continue; } // carro
      if ( c === 's' && c1 === 's' ) { push('SS'); i += 2; continue; } // passo
      if ( (c === 's' || c === 'x') && c1 === 'c' && isFront(c2) ) { push('SS'); i += 2; continue; } // nascer, exceto

      // Consonants with context
      if ( c === 'q' ) { push('kk'); i += ( c1 === 'u' && isFront(c2) ) ? 2 : 1; continue; } // que, qui: silent u
      if ( c === 'g' ) {
        if ( c1 === 'u' && isFront(c2) ) { push('kk'); i += 2; } // gue, gui: silent u
        else { push( isFront(c1) ? 'CH' : 'kk' ); i++; } // gelo vs. gato
        continue;
      }
      if ( c === 'c' ) { push( isFront(c1) ? 'SS' : 'kk' ); i++; continue; } // cedo vs. casa
      if ( c === 'h' ) { i++; continue; } // Silent (hoje)
      if ( c === 'x' ) {
        // Sounds like s before a consonant (texto) and like z in initial "ex" + vowel (exame), otherwise sh (caixa, xícara)
        const isS = ( isLetter(c1) && !isVowel(c1) ) || ( ( chars[i-1] === 'e' || chars[i-1] === 'ê' ) && !isLetter(chars[i-2]) && isVowel(c1) );
        push( isS ? 'SS' : 'CH' ); i++; continue;
      }
      if ( c === 't' || c === 'd' ) {
        // ti, di and final te, de are affricates (tia, dia, tarde, cidade, de)
        const isAffricate = ( c1 === 'i' || c1 === 'í' ) || ( c1 === 'e' && isFinal(i+2) );
        push( isAffricate ? 'CH' : 'DD' ); i++; continue;
      }
      if ( c === 'l' ) { push( isVowel(c1) ? 'nn' : 'U' ); i++; continue; } // Coda l is vocalized (Brasil, alto)
      if ( c === 'm' || c === 'n' ) {
        if ( isVowel(c1) ) push( c === 'm' ? 'PP' : 'nn' ); // Coda m/n only nasalizes the vowel (campo, canto)
        i++; continue;
      }

      // Nasal diphthongs and final vowels
      if ( c === 'ã' && c1 === 'o' ) { push('aa'); push('U'); i += 2; continue; } // não
      if ( c === 'a' && c1 === 'm' && isEnd(i+2) ) { push('aa'); push('U'); i += 2; continue; } // falam
      if ( (c === 'e' || c === 'é') && ( ( c1 === 'm' && isEnd(i+2) ) || ( c1 === 'n' && c2 === 's' && isEnd(i+3) ) ) ) { push('E'); push('I'); i += 2; continue; } // bem, também, parabéns
      if ( c === 'o' && c1 === 'u' ) { push('O'); i += 2; continue; } // ou sounds like o (pouco)
      if ( c === 'e' && isFinal(i+1) && !startOfWord ) { push('I'); i++; continue; } // Final unstressed e (tarde)
      if ( c === 'e' && startOfWord && isEnd(i+1) ) { push('I'); i++; continue; } // The word "e"
      if ( c === 'o' && isFinal(i+1) ) { push('U'); i++; continue; } // Final unstressed o (carro), the word "o"

      // Letter table, falling back to the base letter for unknown diacritics
      let viseme = this.visemes[c];
      if ( viseme === undefined && isLetter(c) ) {
        viseme = this.visemes[ c.normalize('NFD')[0] ];
      }
      if ( viseme ) {
        push(viseme);
      } else {
        t += this.specialDurations[c] || 0;
      }
      i++;
    }

    return o;
  }

}

// LipsyncPt_br is the class name TalkingHead derives from lipsyncLang 'pt_br';
// the aliases allow 'pt_BR' and direct imports with a conventional name.
export { LipsyncPt_br, LipsyncPt_br as LipsyncPt_BR, LipsyncPt_br as LipsyncPtBr };
