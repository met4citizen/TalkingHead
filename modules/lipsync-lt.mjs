
/**
* @class Lithuanian lip-sync processor
* @author Mika Suominen
*/

class LipsyncLt {

  /**
  * @constructor
  */
  constructor() {
    // Lithuanian letters to visemes
    this.visemes = {
      'a': 'aa', 'ą': 'O', 'e': 'E', 'ę': 'E', 'ė': 'E', 'i': 'I', 'į': 'I',
      'o': 'O', 'u': 'U', 'ū': 'U', 'ų': 'U', 'y': 'I', 'b': 'PP', 'c': 'SS',
      'č': 'SS', 'd': 'DD', 'f': 'FF', 'g': 'kk', 'h': 'kk', 'j': 'I',
      'k': 'kk', 'l': 'nn', 'm': 'PP', 'n': 'nn', 'p': 'PP', 'q': 'kk',
      'r': 'RR','s': 'SS', 'š': 'CH', 't': 'DD', 'v': 'FF', 'w': 'FF',
      'x': 'SS', 'z': 'SS', 'ž': 'SS'
    };

    // Lithuanian letters to durations in relative unit (1=average)
    // TODO: Calculate based on Google TTS test run statistics
    this.durations = {
      'a': 0.95, 'ą': 1.5, 'e': 0.90, 'ę': 1.5, 'ė': 1.5, 'i': 0.92, 'į': 1.5,
      'o': 0.96, 'u': 0.95, 'ū': 1.5, 'ų': 1.5, 'y': 1.5,  'b': 1.08,
      'c': 1.23, 'd': 1.05, 'f': 1.00, 'g': 1.21, 'h': 1.21, 'j': 0.92,
      'k': 1.21, 'l': 0.88, 'm': 1.08, 'n': 0.88, 'p': 1.08, 'q': 1.21,
      'r': 0.88, 's': 1.23, 'š': 1.23, 't': 1.05, 'v': 1.00, 'w': 1.00,
      'x': 1.23, 'z': 1.23, 'ž': 1.23
    };

    // Pauses in relative units (1=average)
    this.pauses = { ' ': 1, ',': 3, '-':0.5 };

    // Lithuanian number words
    this.numbers = [
      "nulis", "vienas", "du", "trys", "keturi", "penki", "šeši",
      "septyni", "aštuoni", "devyni", "dešimt", "vienuolika", "dvylika",
      "trylika", "keturiolika", "penkiolika", "šešiolika", "septyniolika",
      "aštuoniolika","devyniolika"
    ];
    this.tens = [ this.numbers[0], this.numbers[10], "dvidešimt",
      "trisdešimt", "keturiasdešimt", "penkiasdešimt", "šešiasdešimt",
      "septyniasdešimt", "aštuoniasdešimt", "devyniasdešimt"
    ];

  }

  /**
  * Convert the number string into Lithuanian words.
  * @param {string} x Number string
  * @return {string} The number in words in Lithuanian
  */
  numberToLithuanianWords(x) {
    const w = [];
    let n = parseFloat(x);
    if ( n === undefined ) return x;
    let p = (n,z,w1,w2,w3) => {
      if ( n < z ) return n;
      const d = Math.floor(n/z);
      if ( d === 1 ) {
        w.push( this.numbers[1] );
      } else {
        w.push( this.numberToLithuanianWords(d.toString()) );
      }
      if ( d % 10 === 1 ) {
        w.push( w1 );
      } else if ( d % 10 === 0 || (d % 100 > 10 && d % 100 < 20) ) {
        w.push( w3 );
      } else {
        w.push( w2 );
      }
      return n - d * z;
    }
    if ( n < 0 ) {
      w.push('minus');
      n = Math.abs(n);
    }
    n = p(n,1000000000, "milijardas", "milijardai", "milijardų");
    n = p(n,1000000, "milijonas", "milijonai", "milijonų");
    n = p(n,1000, "tūkstantis", "tūkstančiai", "tūkstančių");
    n = p(n,100, "šimtas", "šimtai", "šimtų");
    for( let i=this.tens.length-1; i>=1; i-- ) {
      if ( n >= (10*i) ) {
        w.push( this.tens[i] );
        n = n - (10*i);
        break;
      }
    }
    if ( n >= 1) {
      let d = Math.floor(n);
      w.push( this.numbers[d] );
      n -= d;
    }
    if ( n >= 0 && Math.abs(parseFloat(x)) < 1) w.push( this.numbers[0] );
    if ( n > 0 ) {
      let d = x.split('.');
      if ( d.length > 1 ) {
        w.push( 'kablelis' );
        let c = [...d[d.length-1]];
        for( let i=0; i<c.length; i++ ) {
          w.push( this.numbers[c[i]] );
        }
      }
    }
    return w.join(' ').trim();
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
      .replaceAll('0 %','0 procentų ')
      .replaceAll('1 %','1 procentas ')
      .replaceAll('%',' procentai ')
      .replaceAll('0 €','0 eurų ')
      .replaceAll('1 €','1 euras ')
      .replaceAll('€',' eurai ')
      .replaceAll('0 $','0 dolerių ')
      .replaceAll('1 $','1 doleris ')
      .replaceAll('$',' doleriai ')
      .replaceAll('&',' ir ')
      .replaceAll('+',' pliusas ')
      .replace(/(\d)\,(\d)/g, '$1 kablelis $2') // Number separator
      .replace(/\d+/g, this.numberToLithuanianWords.bind(this)) // Numbers to words
      .replace(/(\D)\1\1+/g, "$1$1") // max 2 repeating chars
      .replaceAll('  ',' ') // Only one repeating space
      .normalize('NFD').replace(/[\u0300-\u0303\u0305\u0306\u0308-\u0327\u0329-\u036f]/g, '').normalize('NFC') // Remove non-Lithuanian diacritics
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
      const c = chars[i].toLowerCase();
      const viseme = this.visemes[c];
      if ( viseme ) {
        if ( o.visemes.length && o.visemes[ o.visemes.length-1 ] === viseme ) {
          const d = 0.7 * (this.durations[c] || 1);
          o.durations[ o.durations.length-1 ] += d;
          t += d;
        } else {
          const d = this.durations[c] || 1
          o.visemes.push(viseme);
          o.times.push(t);
          o.durations.push( d );
          t += d;
        }
      } else {
        t += this.pauses[chars[i]] || 0;
      }
    }

    return o;
  }

}

export { LipsyncLt };
