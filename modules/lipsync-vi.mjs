/**
 * @class Vietnamese lip-sync processor
 * @author unclebob
 */
class LipsyncVi {
    /**
     * @constructor
     */
    constructor() {
      // Vietnamese letters to visemes
      this.visemes = {
        'a': 'aa', 'ă': 'ah', 'â': 'ah', 'e': 'ee', 'ê': 'eh', 'i': 'ih', 'o': 'oo', 'ô': 'oh', 'ơ': 'uh-oh', 'u': 'uh', 'ư': 'uh', 'y': 'y',
        'b': 'pp', 'c': 'kk', 'd': 'tt', 'đ': 'dh', 'g': 'kk', 'h': 'hh', 'k': 'kk', 'l': 'll', 'm': 'mm', 'n': 'nn', 'p': 'pp', 'q': 'wh',
        'r': 'rl', 's': 'ss', 't': 'tt', 'v': 'ff', 'x': 'ss', 'ch': 'ch', 'gi': 'jh', 'nh': 'ny', 'qu': 'wh', 'ph': 'ff', 'th': 'th',
        'tr': 'ch', 'ng': 'ng', 'ngh': 'ng', 'gh': 'gg', 'kh': 'kk', 'f': 'ff', 'w': 'w', 'z': 'zr', 'j': 'jh', 'sh': 'sh', 'zh': 'zh',
        'fl': 'fl', 'gl': 'gl', 'hw': 'hw', 'sl': 'sl', 'qr': 'qr', 'zr': 'zr', 'nl': 'nl',
        'á': 'aa', 'à': 'aa', 'ả': 'aa', 'ã': 'aa', 'ạ': 'aa', 'ấ': 'ah', 'ầ': 'ah', 'ẩ': 'ah', 'ẫ': 'ah', 'ậ': 'ah', 'ắ': 'ah', 'ằ': 'ah',
        'ẳ': 'ah', 'ẵ': 'ah', 'ặ': 'ah', 'é': 'ee', 'è': 'ee', 'ẻ': 'ee', 'ẽ': 'ee', 'ẹ': 'ee', 'ế': 'eh', 'ề': 'eh', 'ể': 'eh', 'ễ': 'eh',
        'ệ': 'eh', 'í': 'ih', 'ì': 'ih', 'ỉ': 'ih', 'ĩ': 'ih', 'ị': 'ih', 'ó': 'oo', 'ò': 'oo', 'ỏ': 'oo', 'õ': 'oo', 'ọ': 'oo', 'ố': 'oh',
        'ồ': 'oh', 'ổ': 'oh', 'ỗ': 'oh', 'ộ': 'oh', 'ớ': 'uh-oh', 'ờ': 'uh-oh', 'ở': 'uh-oh', 'ỡ': 'uh-oh', 'ợ': 'uh-oh', 'ú': 'uh', 'ù': 'uh',
        'ủ': 'uh', 'ũ': 'uh', 'ụ': 'uh', 'ứ': 'uh', 'ừ': 'uh', 'ử': 'uh', 'ữ': 'uh', 'ự': 'uh'
      };
  
      // Viseme durations in relative unit (1=average)
      // Note: Adjust these values based on Vietnamese language characteristics
      this.visemeDurations = {
        'aa': 0.95, 'ee': 0.90, 'mm': 1.08, 'oo': 0.96, 'pp': 1.08, 'ff': 1.00, 'ss': 1.23, 'll': 0.88, 'tt': 1.05, 'kk': 1.21, 'ng': 0.88,
        'ih': 0.92, 'uh': 0.95, 'eh': 0.90, 'ah': 0.95, 'oh': 0.96, 'uh-oh': 1.00, 'sh': 1.23, 'th': 1.05, 'zh': 0.88, 'dh': 1.05, 'ch': 1.21,
        'jh': 1.00, 'ny': 0.88, 'wh': 1.08, 'rl': 0.88, 'y': 0.90, 'w': 1.08, 'fl': 1.00, 'sp': 1.23, 'vr': 0.88, 'gl': 1.05, 'hw': 1.21,
        'sl': 0.90, 'qr': 1.08, 'zr': 0.88, 'nl': 1.00, 'sil': 1, 'hh': 1.00, 'gg': 1.00
      };
  
      // Pauses in relative units (1=average)
      this.specialDurations = { ' ': 1, ',': 3, '-': 0.5 };
  
      // Vietnamese number words
      this.numbers = [
        'không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín',
        'mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm',
        'mười sáu', 'mười bảy', 'mười tám', 'mười chín'
      ];
  
      // Symbols to Vietnamese
      this.symbols = {
        '%': 'phần trăm', '€': 'euro', '&': 'và', '+': 'cộng', '$': 'đô la'
      };
      this.symbolsReg = /[%€&\+\$]/g;
  
      // Vowels for vi-VN
      this.vowels = {
        'a': '2', 'ɛ': '4', 'i': '6', 'ɔ': '3', 'u': '7', 'u͡a': '7,2', 'a͡j': '2,6', 'ɛ̆j': '4,6', 'ə͡j': '1,6', 'o': '8', 'i͡e͡w': '6,4,7',
        'ɨ͡ə': '6,1', 'ɔ͡i': '3,6', 'ə': '1', 'ie': '6,4', 'u͡j': '7,6', 'a͡w': '2,7', 'ɨ': '6', 'ɐ': '4', 'ăw': '2,7', 'ăj': '2,6', 'ɨ͡ə͡j': '6,1,6',
        'o͡j': '8,6', 'əː': '1', 'e': '4', 'ɔ̆w': '3,7', 'ɛ͡w': '4,7', 'oi͡w': '6,7', 'uɨ͡w': '6,7', 'ue͡j': '4,6', 'uɨ͡ʌ͡w': '6,1,7', 'uɨ͡j': '6,6',
        'iɪ': '6', 'iə': '6,1', 'a͡ʲ': '2', 'aa͡ʲ': '2'
      };
  
      // Consonants for vi-VN (continued)
      this.consonants = {
        'ɓ': '21', 'k': '20', 'c': '15', 'z': '15', 'j': '6', 'ɹ': '13', 'f': '18', 'ɣ': '20',
        'h': '12', 'l': '14', 'm': '21', 'n': '19', 'p': '21', 's': '15', 'ʂ': '15', 't': '19',
        'v': '18', 'ɗ': '19', 'ŋ': '20', 'x': '12', 'ɲ': '19', 'tʰ': '19', 'ʈ': '19', 't͡ʃ': '19,16', 'w': '7'
      };
  
      // Tones for vi-VN
      this.tones = {
        'ē': 'tone ngang', 'è̏͡': 'tone huyền', 'ḿ̋͡': 'tone sắc', 'ń̏̄͡͡': 'tone hỏi', 'í̋͡': 'tone ngã', 'ǹ̀͡': 'tone nặng'
      };
    }


    /**
 * Convert the number string into Vietnamese words.
 * @param {string} x Number string
 * @return {string} The number in words in Vietnamese
 */
numberToVietnameseWords(x) {
    const w = [];
    let n = parseFloat(x);
    if (n === undefined) return x;
  
    const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
    const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  
    let p = (n, z, w0, w1, w2) => {
      if (n < z) return n;
      const d = Math.floor(n / z);
      w.push(w0 + ((d === 1) ? w1 : this.numberToVietnameseWords(d.toString()) + w2));
      return n - d * z;
    };
  
    if (n < 0) {
      w.push('âm ');
      n = Math.abs(n);
    }
  
    n = p(n, 1000000000, ' ', 'tỷ', ' tỷ');
    n = p(n, 1000000, ' ', 'triệu', ' triệu');
    n = p(n, 1000, '', 'nghìn', ' nghìn');
    n = p(n, 100, ' ', 'trăm', ' trăm');
  
    if (n >= 20) {
      const d = Math.floor(n / 10);
      w.push(tens[d]);
      n %= 10;
    }
  
    if (n >= 10) {
      w.push(teens[n - 10]);
    } else if (n >= 1) {
      w.push(units[n]);
    }
  
    if (n >= 0 && Math.abs(parseFloat(x)) < 1) w.push('không');
  
    if (n > 0) {
      let d = x.split('.');
      if (d.length > 1) {
        w.push(' phẩy');
        let c = [...d[d.length - 1]];
        for (let i = 0; i < c.length; i++) {
          w.push(' ' + units[c[i]]);
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
     * @return {string} Pre-processsed text
     */
    preProcessText(s) {
      return s.replace(/[#_'":;]/g, '')
        .replace(this.symbolsReg, (symbol) => {
          return ' ' + this.symbols[symbol] + ' ';
        })
        .replace(/(\d),(\d)/g, '$1 phẩy $2') // Number separator
        .replace(/\d+/g, this.numberToVietnameseWords.bind(this)) // Numbers to words
        .replace(/(\D)\1\1+/g, "$1$1") // max 2 repeating chars
        .replaceAll(' ', ' ') // Only one repeating space
        .normalize('NFD').replace(/[\u0300-\u0307\u0309\u030b-\u036f]/g, '').normalize('NFC') // Remove non-Vietnamese diacritics
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
      for (let i = 0; i < chars.length; i++) {
        const viseme = this.visemes[chars[i].toLowerCase()];
        if (viseme) {
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
        } else {
          t += this.specialDurations[chars[i]] || 0;
        }
      }
      return o;
    }
  }
  
  export { LipsyncVi };
