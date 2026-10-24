/**
* @class Bengali (Bangla) lip-sync processor
* @author Mossaddique Ahsan (assisted by AI)
*
* Rule-based grapheme-to-viseme conversion for Bengali written in the
* Bengali script. The script is largely phonetic, so a consonant/vowel table
* plus a few context rules gives good results:
* - inherent vowel (অ, pronounced /ɔ/ or /o/) after consonants without a
*   vowel sign, dropped at the end of a word unless the word ends in a
*   conjunct (কলম "kolom", but বন্ধ "bondho")
* - hasant (্) and conjuncts, including ya-phala (্য, gemination, or /æ/ in
*   ব্যাগ, অ্যাপ), ba-phala (্ব, gemination) and ra/la-phala (্র, ্ল)
* - the conjuncts ক্ষ (kh) and জ্ঞ (g, /gæ/ before আ-kar), and র‍্য (/ræ/)
* - nukta forms ড়, ঢ় (flap r) and য় (glide), in composed or decomposed form
* - vowel signs, including the diphthongs ৈ (oi) and ৌ (ou)
* - anusvara (ং), visarga (ঃ), chandrabindu (ঁ) and khanda ta (ৎ)
* - Bengali and ASCII digits, ordinals (১ম, ২য়, ৪র্থ), times, decimals,
*   lakh/crore grouping, and common symbols read in Bengali
* - Latin letters in mixed Bengali/English text, as a rough fallback
*/

class LipsyncBn {

  /**
  * @constructor
  */
  constructor() {

    // Bengali consonants to Oculus visemes. ঙ (and ং) is a velar nasal, so kk.
    // ফ is aspirated p in Bangla, so PP. স is usually "sh" (CH), but "s"
    // (SS) in clusters such as স্কুল, স্টেশন, ব্যস্ত. হ has no mouth shape
    // of its own (null): the following vowel's shape covers it.
    this.consonants = {
      'ক': 'kk', 'খ': 'kk', 'গ': 'kk', 'ঘ': 'kk', 'ঙ': 'kk',
      'চ': 'CH', 'ছ': 'CH', 'জ': 'CH', 'ঝ': 'CH', 'ঞ': 'nn',
      'ট': 'DD', 'ঠ': 'DD', 'ড': 'DD', 'ঢ': 'DD', 'ণ': 'nn',
      'ত': 'DD', 'থ': 'DD', 'দ': 'DD', 'ধ': 'DD', 'ন': 'nn',
      'প': 'PP', 'ফ': 'PP', 'ব': 'PP', 'ভ': 'PP', 'ম': 'PP',
      'য': 'CH', 'র': 'RR', 'ল': 'nn',
      'শ': 'CH', 'ষ': 'CH', 'স': 'CH', 'হ': null,
      'ড়': 'RR', 'ঢ়': 'RR', 'য়': 'I', 'ৎ': 'DD',
      'ক্ষ': 'kk', 'জ্ঞ': 'kk', 'র‍্য': 'RR' // Conjuncts treated as one unit
    };

    // Conjuncts that are pronounced as one unit, merged before processing
    this.units = [ 'ক্ষ', 'জ্ঞ', 'র‍্য' ];

    // Independent vowels to Oculus visemes
    this.vowels = {
      'অ': ['O'], 'আ': ['aa'], 'ই': ['I'], 'ঈ': ['I'], 'উ': ['U'], 'ঊ': ['U'],
      'ঋ': ['RR','I'], 'এ': ['E'], 'ঐ': ['O','I'], 'ও': ['O'], 'ঔ': ['O','U']
    };

    // Dependent vowel signs (kar) to Oculus visemes
    this.vowelSigns = {
      'া': ['aa'], 'ি': ['I'], 'ী': ['I'], 'ু': ['U'], 'ূ': ['U'],
      'ৃ': ['RR','I'], 'ে': ['E'], 'ৈ': ['O','I'], 'ো': ['O'], 'ৌ': ['O','U']
    };

    this.hasant = '্';
    this.nukta = '়';

    // Consonant + nukta to the composed nukta letter
    this.nuktaForms = { 'ড': 'ড়', 'ঢ': 'ঢ়', 'য': 'য়' };

    // Latin letters in mixed text (code-switching is common in Bengali).
    // A rough fallback only; English words are not read with English rules.
    this.latin = {
      'a': 'aa', 'b': 'PP', 'c': 'kk', 'd': 'DD', 'e': 'E', 'f': 'FF',
      'g': 'kk', 'h': 'kk', 'i': 'I', 'j': 'CH', 'k': 'kk', 'l': 'nn',
      'm': 'PP', 'n': 'nn', 'o': 'O', 'p': 'PP', 'q': 'kk', 'r': 'RR',
      's': 'SS', 't': 'DD', 'u': 'U', 'v': 'FF', 'w': 'U', 'x': 'SS',
      'y': 'I', 'z': 'SS'
    };

    // Viseme durations in relative unit (1=average)
    // Note: Based on the Finnish Google TTS test run, CH estimated
    this.visemeDurations = {
      'aa': 0.95, 'E': 0.90, 'I': 0.92, 'O': 0.96, 'U': 0.95, 'PP': 1.08,
      'SS': 1.23, 'DD': 1.05, 'FF': 1.00, 'kk': 1.21, 'nn': 0.88,
      'RR': 0.88, 'CH': 1.15, 'sil': 1
    };

    // Pauses in relative units (1=average)
    this.specialDurations = { ' ': 1, ',': 3, '-': 0.5 };

    // Ordinals 1st-10th (১ম, ২য়, ৩য়, ৪র্থ, ৫ম, ৬ষ্ঠ ... ১০ম)
    this.ordinals = [
      '', 'প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ', 'পঞ্চম', 'ষষ্ঠ', 'সপ্তম', 'অষ্টম',
      'নবম', 'দশম'
    ];

    // Bengali numbers 0-99. Each one is its own word, so a table is needed.
    this.numbers = [
      'শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
      'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ',
      'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'ঊনত্রিশ',
      'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ',
      'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ',
      'পঞ্চাশ', 'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট',
      'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর',
      'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি',
      'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'অষ্টাশি', 'ঊননব্বই',
      'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
    ];

    // Symbols to Bengali. Note: speakText currently drops characters outside
    // its "speakables" set (including ৳) before calling preProcessText, so
    // ৳ is only read when this method gets the raw text (e.g. streaming words).
    this.symbols = {
      '%': 'শতাংশ', '৳': 'টাকা', '$': 'ডলার', '€': 'ইউরো', '&': 'এবং',
      '+': 'যোগ'
    };
    this.symbolsReg = /[%৳€&\+\$]/g;

  }

  /**
  * Convert an integer string into Bengali words, using the South Asian
  * grouping (হাজার 10^3, লাখ 10^5, কোটি 10^7).
  * @param {string} x Number string (ASCII digits)
  * @return {string} The number in words in Bengali
  */
  numberToBengaliWords(x) {
    const n = parseInt(x, 10);
    if ( isNaN(n) ) return x;

    // Numbers with leading zeros (codes) or too long are read digit by digit
    if ( x.length > 15 || ( x.length > 1 && x[0] === '0' ) ) {
      return [...x].map( d => this.numbers[d] ).join(' ');
    }
    if ( n === 0 ) return this.numbers[0];

    const w = [];
    let r = n;
    const group = (z, word) => {
      if ( r >= z ) {
        const d = Math.floor(r / z);
        w.push( this.numberToBengaliWords(d.toString()) + ' ' + word );
        r -= d * z;
      }
    };
    group(10000000, 'কোটি');
    group(100000, 'লাখ');
    group(1000, 'হাজার');
    if ( r >= 100 ) {
      const d = Math.floor(r / 100);
      w.push( this.numbers[d] + 'শ' );
      r -= d * 100;
    }
    if ( r > 0 ) w.push( this.numbers[r] );
    return w.join(' ');
  }

  /**
  * Preprocess text:
  * - convert Bengali digits to ASCII digits
  * - convert symbols to words
  * - convert numbers to words
  * - filter out characters that should be left unspoken
  * @param {string} s Text
  * @return {string} Pre-processsed text.
  */
  preProcessText(s) {
    return s.normalize('NFC')
      .replace(/[০-৯]/g, (d) => String.fromCharCode( d.charCodeAt(0) - 0x09E6 + 48 )) // Bengali digits
      .replace(/(\d):(?=\d)/g, '$1 ') // Times: 10:30 -> 10 30
      .replace(/[#_*\'\":;]/g,'')
      .replace(/([৳\$€])\s*(\d[\d,]*(?:\.\d+)?)/g, '$2 $1') // Currency is read after the amount: ৳৫০০ -> ৫০০ টাকা
      .replace( this.symbolsReg, (symbol) => {
        return ' ' + this.symbols[symbol] + ' ';
      })
      .replace(/(^|[^\d])(10|[1-9])(ম|য়|র্থ|ষ্ঠ)/g, (m, p, n, sfx) => p + this.ordinals[n]) // Ordinals: ১ম, ২য়, ৪র্থ, ৬ষ্ঠ
      .replace(/\d[\d,]*\d/g, (m) => {
        // Remove grouping commas only from well-formed lakh or Western grouping
        return ( /^\d{1,2}(,\d{2})*,\d{3}$/.test(m) || /^\d{1,3}(,\d{3})+$/.test(m) ) ? m.replaceAll(',','') : m;
      })
      .replace(/(\d)\.(\d+)/g, (m, a, b) => a + ' দশমিক ' + [...b].map( d => this.numbers[d] ).join(' ')) // Decimals digit by digit
      .replace(/(^|\s)-(?=\d)/g, '$1ঋণাত্মক ') // Negative numbers, only at the start of a word
      .replace(/(\d)-(?=\d)/g, '$1 ') // Ranges, years, phone numbers: 10-20 -> 10 20
      .replace(/\d+/g, this.numberToBengaliWords.bind(this)) // Numbers to words
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
      if ( !viseme ) { t += 0.9; return; } // No shape of its own (হ)
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

    // NFC decomposes ড়, ঢ়, য় into a base letter + nukta, so recompose them.
    // Zero-width non-joiners are dropped; a zero-width joiner only matters
    // in র‍্য (ra + ZWJ + ya-phala), which is kept apart from reph + য (র্য).
    const raw = [];
    for( const c of w.normalize('NFC').toLowerCase() ) {
      if ( c === this.nukta && raw.length && this.nuktaForms[ raw[raw.length-1] ] ) {
        raw[raw.length-1] = this.nuktaForms[ raw[raw.length-1] ];
      } else if ( c !== this.nukta && c !== '\u200C' ) {
        raw.push(c);
      }
    }

    // Merge conjuncts that are pronounced as one unit (ক্ষ, জ্ঞ, র‍্য)
    const chars = [];
    for( let j=0; j<raw.length; j++ ) {
      const unit = this.units.find( u => [...u].every( (x,k) => raw[j+k] === x ) );
      if ( unit ) {
        chars.push(unit);
        j += [...unit].length - 1;
      } else if ( raw[j] !== '\u200D' ) {
        chars.push(raw[j]);
      }
    }

    const isConsonant = (c) => c !== undefined && this.consonants.hasOwnProperty(c);
    const isBengaliLetter = (c) => c !== undefined && /[ঀ-৿]/.test(c) && c !== '।';
    const isEnd = (i) => !isBengaliLetter(chars[i]); // End of the Bengali word

    let i = 0;
    while ( i < chars.length ) {
      const c = chars[i], c1 = chars[i+1], c2 = chars[i+2], c3 = chars[i+3];

      // Initial অ + ya-phala + আ-kar is /æ/ (অ্যাপ)
      if ( c === 'অ' && c1 === this.hasant && c2 === 'য' && c3 === 'া' ) {
        push('E'); i += 4; continue;
      }

      // Independent vowels
      if ( this.vowels[c] ) {
        this.vowels[c].forEach( push );
        i++; continue;
      }

      // Consonants
      if ( isConsonant(c) ) {
        const startOfWord = !isBengaliLetter(chars[i-1]);
        const isUnit = this.units.includes(c);
        const afterHasant = isUnit || chars[i-1] === this.hasant || chars[i-1] === 'ঃ'; // Conjunct, or visarga gemination (দুঃখ)
        const prevVowel = !startOfWord && o.visemes.length > 0 &&
          ['aa','E','I','O','U'].includes( o.visemes[o.visemes.length-1] );
        const viseme = ( c === 'স' && c1 === this.hasant && c2 !== 'য' && c2 !== 'ব' ) ? 'SS' : this.consonants[c];

        // র‍্য is /ræ/ (র‍্যাব), and জ্ঞ before আ-kar is /gæ/ (জ্ঞান, বিজ্ঞান)
        if ( c === 'র‍্য' || ( c === 'জ্ঞ' && c1 === 'া' ) ) {
          push(viseme);
          i++;
          if ( chars[i] === 'া' ) { push('E'); i++; }
          else if ( this.vowelSigns[chars[i]] ) { this.vowelSigns[chars[i]].forEach( push ); i++; }
          else push('E');
          continue;
        }

        // ক্ষ inside a word is geminated (শিক্ষা "shikkha")
        if ( c === 'ক্ষ' && !startOfWord ) push(viseme);

        // ya-phala and ba-phala (C + ্ + য/ব)
        if ( c1 === this.hasant && ( c2 === 'য' || c2 === 'ব' ) && c !== 'র' ) {
          if ( c2 === 'য' && startOfWord ) {
            // Word-initial ya-phala is usually /æ/ (ব্যাগ, ব্যবহার, ব্যস্ত)
            push(viseme);
            i += 3;
            if ( chars[i] === 'া' ) { push('E'); i++; }
            else if ( this.vowelSigns[chars[i]] ) { this.vowelSigns[chars[i]].forEach( push ); i++; }
            else push('E');
            continue;
          }
          push(viseme);
          if ( !startOfWord ) push(viseme); // Gemination (বাক্য, বিশ্ব)
          i += 3;
          if ( this.vowelSigns[chars[i]] ) {
            this.vowelSigns[chars[i]].forEach( push );
            i++;
          } else if ( !isEnd(i) && chars[i] !== this.hasant ) {
            push('O');
          } else if ( isEnd(i) ) {
            push('O'); // Final conjunct keeps the inherent vowel (বাক্য)
          }
          continue;
        }

        push(viseme);
        i++;

        if ( chars[i] === this.hasant ) {
          i++; // Vowel killed; next consonant forms a conjunct
          continue;
        }
        if ( this.vowelSigns[chars[i]] ) {
          this.vowelSigns[chars[i]].forEach( push );
          i++;
          continue;
        }
        if ( c === 'ৎ' || c === 'য়' ) continue; // No inherent vowel

        // Inherent vowel: dropped at the end of the word, except after a
        // conjunct (বন্ধ) or in a single-letter word. Inside a word it is
        // also dropped between a vowel and a consonant that carries a vowel
        // sign (আমরা "amra", করছে "korche"), otherwise pronounced (কলম).
        if ( isEnd(i) ) {
          if ( afterHasant || startOfWord ) push('O');
        } else if ( !( prevVowel && !afterHasant && isConsonant(chars[i]) &&
                       chars[i] !== 'য়' && this.vowelSigns[chars[i+1]] ) ) {
          push('O');
        }
        continue;
      }

      // Anusvara, visarga, chandrabindu
      if ( c === 'ং' ) { push('kk'); i++; continue; } // Velar nasal, like ঙ
      if ( c === 'ঃ' || c === 'ঁ' || c === this.hasant ) { i++; continue; }

      // Stray vowel sign (e.g. after a digit or Latin letter)
      if ( this.vowelSigns[c] ) {
        this.vowelSigns[c].forEach( push );
        i++; continue;
      }

      // Latin letters in mixed text
      if ( this.latin[c] ) {
        push( this.latin[c] );
        i++; continue;
      }

      t += this.specialDurations[c] || 0;
      i++;
    }

    return o;
  }

}

export { LipsyncBn };
