
/**
* @class Finnish lip-sync processor
* @author Mika Suominen
*/

class LipsyncFi {

  /**
  * @constructor
  */
  constructor() {
    // Finnish letters to visemes. And yes, it is this simple in Finnish!
    this.visemes = {
      'a': 'aa', 'e': 'E', 'i': 'I', 'o': 'O', 'u': 'U', 'y': 'U', 'ä': 'aa',
      'ö': 'O', 'å': 'O', 'b': 'PP', 'c': 'SS', 'd': 'DD', 'f': 'FF', 'g': 'kk',
      'h': 'kk', 'j': 'I', 'k': 'kk', 'l': 'nn', 'm': 'PP', 'n': 'nn',
      'p': 'PP', 'q': 'kk', 'r': 'RR','s': 'SS', 't': 'DD', 'v': 'FF',
      'w': 'FF', 'x': 'SS', 'z': 'SS'
    };

    // Viseme durations in relative unit (1=average)
    // Note: Calculated base on Google TTS test run
    this.visemeDurations = {
      'aa': 0.95, 'E': 0.90, 'I': 0.92, 'O': 0.96, 'U': 0.95, 'PP': 1.08,
      'SS': 1.23, 'DD': 1.05, 'FF': 1.00, 'kk': 1.21, 'nn': 0.88,
      'RR': 0.88, 'DD': 1.05, 'sil': 1
    };

    // Pauses in relative units (1=average)
    this.specialDurations = { ' ': 1, ',': 3, '-':0.5 };

    // Finnish number words
    this.numbers = [
      'nolla', 'yksi', 'kaksi', 'kolme', 'neljä', 'viisi', 'kuusi',
      'seitsemän', 'kahdeksan', 'yhdeksän', "kymmenen", "yksitoista",
      "kaksitoista", "kolmetoista", "neljätoista", "viisitoista",
      "kuusitoista", 'seitsemäntoista', 'kahdeksantoista', 'yhdeksäntoista'
    ];

    // Symbols to Finnish
    this.symbols = {
      '%': 'prosenttia', '€': 'euroa', '&': 'ja', '+': 'plus',
      '$': 'dollaria'
    };
    this.symbolsReg = /[%€&\+\$]/g;

  }

  /**
  * Convert the number string into Finnish words.
  * @param {string} x Number string
  * @return {string} The number in words in Finnish
  */
  numberToFinnishWords(x) {
    const w = [];
    let n = parseFloat(x);
    if ( n === undefined ) return x;
    let p = (n,z,w0,w1,w2) => {
      if ( n < z ) return n;
      const d = Math.floor(n/z);
      w.push( w0 + ((d === 1) ? w1 : this.numberToFinnishWords(d.toString()) + w2) );
      return n - d * z;
    }
    if ( n < 0 ) {
      w.push('miinus ');
      n = Math.abs(n);
    }
    n = p(n,1000000000,' ','miljardi',' miljardia');
    n = p(n,1000000,' ','miljoona',' miljoonaa');
    n = p(n,1000,'', 'tuhat','tuhatta');
    n = p(n,100,' ','sata','sataa');
    if ( n > 20 ) n = p(n,10,'','','kymmentä');
    if ( n >= 1) {
      let d = Math.floor(n);
      w.push( this.numbers[d] );
      n -= d;
    }
    if ( n >= 0 && Math.abs(parseFloat(x)) < 1) w.push( 'nolla' );
    if ( n > 0 ) {
      let d = x.split('.');
      if ( d.length > 1 ) {
        w.push( ' pilkku' );
        let c = [...d[d.length-1]];
        for( let i=0; i<c.length; i++ ) {
          w.push( ' ' + this.numbers[c[i]] );
        }
      }
    }
    return w.join('').trim();
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
    return s.replace(/[#_*\'\":;]/g,'')
      .replace( this.symbolsReg, (symbol) => {
        return ' ' + this.symbols[symbol] + ' ';
      })
      .replace(/(\d)\,(\d)/g, '$1 pilkku $2') // Number separator
      .replace(/\d+/g, this.numberToFinnishWords.bind(this)) // Numbers to words
      .replace(/(\D)\1\1+/g, "$1$1") // max 2 repeating chars
      .replaceAll('  ',' ') // Only one repeating space
      .normalize('NFD').replace(/[\u0300-\u0307\u0309\u030b-\u036f]/g, '').normalize('NFC') // Remove non-Finnish diacritics
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

    const chars = [...w];
    for( let i=0; i<chars.length; i++ ) {
      const viseme = this.visemes[chars[i].toLowerCase()];
      if ( viseme ) {
        if ( o.visemes.length && o.visemes[ o.visemes.length-1 ] === viseme ) {
          const d = 0.7 * (this.visemeDurations[viseme] || 1);
          o.durations[ o.durations.length-1 ] += d;
          t += d;
        } else {
          const d = this.visemeDurations[viseme] || 1
          o.visemes.push(viseme);
          o.times.push(t);
          o.durations.push( d );
          t += d;
        }
      } else {
        t += this.specialDurations[chars[i]] || 0;
      }
    }

    return o;
  }

}

export { LipsyncFi };
