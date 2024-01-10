
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
      'ö': 'O', 'b': 'PP', 'c': 'SS', 'd': 'DD', 'f': 'FF', 'g': 'kk',
      'h': 'O', 'j': 'I', 'k': 'kk', 'l': 'nn', 'm': 'PP', 'n': 'nn',
      'p': 'PP', 'q': 'kk', 'r': 'RR','s': 'SS', 't': 'DD', 'v': 'FF',
      'w': 'FF', 'x': 'SS', 'z': 'SS'
    };

    // Viseme durations in relative unit (1=average)
    // TODO: Check for statistics for Finnish
    this.visemeDurations = {
      'aa': 1.3, 'E': 1.1, 'I': 0.9, 'O': 1.1, 'U': 0.9, 'PP': 1, 'SS': 1.3,
      'TH': 0.8, 'DD': 0.9, 'FF': 1.1, 'kk': 0.8, 'nn': 0.9, 'RR': 1,
      'DD': 0.9, 'sil': 1
    };

    // Pauses in relative units (1=average)
    this.otherDurations = { ' ': 1, ',': 3, '-':0.5 };

  }

  /**
  * Convert the number string into Finnish words.
  * @param {string} x Number string
  * @return {string} The number in words in Finnish
  */
  numberToFinnishWords(x) {
    const w = [];
    const dg = ['nolla', 'yksi', 'kaksi', 'kolme', 'neljä', 'viisi', 'kuusi',
    'seitsemän', 'kahdeksan', 'yhdeksän', "kymmenen","yksitoista","kaksitoista",
    "kolmetoista","neljätoista","viisitoista","kuusitoista",'seitsemäntoista',
    'kahdeksantoista', 'yhdeksäntoista'];
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
      w.push( dg[d] );
      n -= d;
    }
    if ( n >= 0 && parseFloat(x) < 1) w.push( 'nolla' );
    if ( n > 0 ) {
      let d = (n % 1).toFixed(1) * 10;
      if ( d > 0 ) w.push( ' pilkku ' + dg[d] );
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
    return s.replace('/[#_*\'\":;]/g','')
        .replaceAll('%',' prosenttia ')
        .replaceAll('€',' euroa ')
        .replaceAll('&',' ja ')
        .replaceAll('+',' plus ')
        .replace(/(\D)\1\1+/g, "$1$1") // max 2 repeating chars
        .replaceAll('  ',' ') // Only one repeating space
        .replace(/(\d)\,(\d)/g, '$1 pilkku $2') // Number separator
        .replace(/\d+/g, this.numberToFinnishWords.bind(this)) // Numbers to words
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
        o.visemes.push(viseme);
        o.times.push(t);
        o.durations.push( this.visemeDurations[viseme] || 1 );
        t += this.visemeDurations[viseme] || 1;
      } else {
        t += this.otherDurations[chars[i]] || 0;
      }
    }

    return o;
  }

}

export { LipsyncFi };
