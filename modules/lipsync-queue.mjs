
import { animEmojis } from './anim-emojis.mjs'

const lipsync = []

/**
* Get lip-sync processor based on language. Import module dynamically.
* @param {string} lang Language
* @return {Object} Pre-processsed text.
*/
export async function lipsyncGetProcessor(lang, path="./") {
	if ( !lipsync.hasOwnProperty(lang) ) {
		const moduleName = path + 'lipsync-' + lang.toLowerCase() + '.mjs';
		const className = 'Lipsync' + lang.charAt(0).toUpperCase() + lang.slice(1);
		const module = await import(moduleName)
		if(module) {
			lipsync[lang] = new module[className];
		}
	}
}

/**
* Preprocess text for tts/lipsync, including:
* - convert symbols/numbers to words
* - filter out characters that should be left unspoken
* @param {string} s Text
* @param {string} lang Language
* @return {string} Pre-processsed text.
*/
export function lipsyncPreProcessText(s,lang) {
	const o = lipsync[lang] || Object.values(lipsync)[0];
	return o.preProcessText(s);
}

/**
* Convert words to Oculus LipSync Visemes.
* @param {string} w Word
* @param {string} lang Language
* @return {Lipsync} Lipsync object.
*/
export function lipsyncWordsToVisemes(w,lang) {
	const o = lipsync[lang] || Object.values(lipsync)[0];
	return o.wordsToVisemes(w);
}

/**
* Generate a queue of lipsync sequences to perform from a text string
* @param {string} text Text.
* @param {lipsyncLang} available lip sync language or null
* @param {subtitlesfn} [onsubtitles=null] Callback when a subtitle is written
* @param {number[][]} [excludes=null] Array of [start, end] index arrays to not speak
*/
export function lipsyncQueue(text, lipsyncLang = "en", onsubtitles = null, excludes = null) {

	let queue = new Array()

	// Classifiers
	const dividersSentence = /[!,\.\?\n\p{Extended_Pictographic}]/ug;
	const dividersWord = /[ ]/ug;
	const speakables = /[\p{L}\p{N},\.'!€\$\+\-%&\?]/ug;
	const emojis = /[\p{Extended_Pictographic}]/ug;

	let markdownWord = ''; // markdown word
	let textWord = ''; // text-to-speech word
	let markId = 0; // SSML mark id
	let ttsSentence = []; // Text-to-speech sentence
	let lipsyncAnim = []; // Lip-sync animation sequence
	const letters = [...text];
	for( let i=0; i<letters.length; i++ ) {
		const isLast = i === (letters.length-1);
		const isSpeakable = letters[i].match(speakables);
		const isEndOfSentence = letters[i].match(dividersSentence);
		const isEndOfWord = letters[i].match(dividersWord);

		// Add letter to subtitles
		if ( onsubtitles ) {
			markdownWord += letters[i];
		}

		// Add letter to spoken word
		if ( isSpeakable ) {
			if ( !excludes || excludes.every( x => (i < x[0]) || (i > x[1]) ) ) {
				textWord += letters[i];
			}
		}

		// Add words to sentence and animations
		if ( isEndOfWord || isEndOfSentence || isLast ) {

			// Add to text-to-speech sentence
			if ( textWord.length ) {
				textWord = lipsyncPreProcessText(textWord, lipsyncLang);
				if ( textWord.length ) {
					ttsSentence.push( {
						mark: markId,
						word: textWord
					});
				}
			}

			// Push subtitles to animation queue
			if ( markdownWord.length ) {
				lipsyncAnim.push( {
					mark: markId,
					template: { name: 'subtitles' },
					ts: [0],
					vs: {
						subtitles: markdownWord
					},
				});
				markdownWord = '';
			}

			// Push visemes to animation queue
			if ( textWord.length ) {
				const v = lipsyncWordsToVisemes(textWord, lipsyncLang);
				if ( v && v.visemes && v.visemes.length ) {
					const d = v.times[ v.visemes.length-1 ] + v.durations[ v.visemes.length-1 ];
					for( let j=0; j<v.visemes.length; j++ ) {
						const o =
						lipsyncAnim.push( {
							mark: markId,
							template: { name: 'viseme' },
							ts: [ (v.times[j] - 0.6) / d, (v.times[j] + 0.5) / d, (v.times[j] + v.durations[j] + 0.5) / d ],
							vs: {
								['viseme_'+v.visemes[j]]: [null,(v.visemes[j] === 'PP' || v.visemes[j] === 'FF') ? 0.9 : 0.6,0]
							}
						});
					}
				}
				textWord = '';
				markId++;
			}
		}

		// Process sentences
		if ( isEndOfSentence || isLast ) {

			// Send sentence to Text-to-speech queue
			if ( ttsSentence.length || (isLast && lipsyncAnim.length) ) {
				const o = {
					anim: lipsyncAnim
				};
				if ( onsubtitles ) o.onSubtitles = onsubtitles;
				if ( ttsSentence.length) {
					o.text = ttsSentence;
				}
				queue.push(o);

				// Reset sentence and animation sequence
				ttsSentence = [];
				textWord = '';
				markId = 0;
				lipsyncAnim = [];
			}

			// Send emoji, if the divider was a known emoji
			if ( letters[i].match(emojis) ) {
				let emoji = animEmojis[letters[i]];
				if ( emoji && emoji.link ) emoji = animEmojis[emoji.link];
				if ( emoji ) {
					queue.push( { emoji: emoji } );
				}
			}

			queue.push( { break: 100 } );

		}

	}

	queue.push( { break: 1000 } );

	return queue

}

/**
* Convert value from one range to another.
* @param {number} value Value
* @param {number[]} r1 Source range
* @param {number[]} r2 Target range
* @return {number} Scaled value
*/
function convertRange( value, r1, r2 ) {
	return (value-r1[0]) * (r2[1]-r2[0]) / (r1[1]-r1[0]) + r2[0];
}


/**
* Convert array of words with timings to a lipsync sequence
* @param {Audio} r Audio message.
* @param {Options} [opt=null] Text-specific options for lipsyncLang
* @param {subtitlesfn} [onsubtitles=null] Callback when a subtitle is written
*/

export function lipsyncConvert(r, lipsyncLang = "en", onsubtitles = null ) {

    const o = {};

    if ( r.words ) {
      let lipsyncAnim = [];
      for( let i=0; i<r.words.length; i++ ) {
        const word = r.words[i];
        const time = r.wtimes[i];
        let duration = r.wdurations[i];

        if ( word.length ) {

          // Subtitle
          if ( onsubtitles ) {
            lipsyncAnim.push( {
              template: { name: 'subtitles' },
              ts: [time],
              vs: {
                subtitles: ' ' + word
              }
            });
          }

          // If visemes were not specified, calculate them based on the word
          if ( !r.visemes ) {
            const w = lipsyncPreProcessText(word, lipsyncLang);
            const v = lipsyncWordsToVisemes(w, lipsyncLang);
            if ( v && v.visemes && v.visemes.length ) {
              const dTotal = v.times[ v.visemes.length-1 ] + v.durations[ v.visemes.length-1 ];
              const overdrive = Math.min(duration, Math.max( 0, duration - v.visemes.length * 150));
              let level = 0.6 + convertRange( overdrive, [0,duration], [0,0.4]);
              duration = Math.min( duration, v.visemes.length * 200 );
              if ( dTotal > 0 ) {
                for( let j=0; j<v.visemes.length; j++ ) {
                  const t = time + (v.times[j]/dTotal) * duration;
                  const d = (v.durations[j]/dTotal) * duration;
                  lipsyncAnim.push( {
                    template: { name: 'viseme' },
                    ts: [ t - Math.min(60,2*d/3), t + Math.min(25,d/2), t + d + Math.min(60,d/2) ],
                    vs: {
                      ['viseme_'+v.visemes[j]]: [null,(v.visemes[j] === 'PP' || v.visemes[j] === 'FF') ? 0.9 : level, 0]
                    }
                  });
                }
              }
            }
          }
        }
      }

      // If visemes were specifies, use them
      if ( r.visemes ) {
        for( let i=0; i<r.visemes.length; i++ ) {
          const viseme = r.visemes[i];
          const time = r.vtimes[i];
          const duration = r.vdurations[i];
          lipsyncAnim.push( {
            template: { name: 'viseme' },
            ts: [ time - 2 * duration/3, time + duration/2, time + duration + duration/2 ],
            vs: {
              ['viseme_'+viseme]: [null,(viseme === 'PP' || viseme === 'FF') ? 0.9 : 0.6, 0]
            }
          });
        }
      }

      // Timed marker callbacks
      if ( r.markers ) {
        for( let i=0; i<r.markers.length; i++ ) {
          const fn = r.markers[i];
          const time = r.mtimes[i];
          lipsyncAnim.push( {
            template: { name: 'markers' },
            ts: [ time ],
            vs: { "function": [fn] }
          });
        }
      }

      if ( lipsyncAnim.length ) {
        o.anim = lipsyncAnim;
      }

    }

    return o
}


