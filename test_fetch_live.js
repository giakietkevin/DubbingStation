const fs = require('fs');

async function testFullArticleViaFetch() {
  const content = fs.readFileSync('test_article.js', 'utf8');
  const text = content.substring(content.indexOf('`') + 1, content.lastIndexOf('`'));

  console.log('Sending full article to http://localhost:3000/api/tts/stream ...');
  const encoded = encodeURIComponent(text);
  const res = await fetch('http://localhost:3000/api/tts/stream?text=' + encoded + '&voiceId=bac-ba-review&speed=1.0');
  console.log('Response status:', res.status);
  console.log('Response Content-Type:', res.headers.get('content-type'));
  console.log('Response Content-Length:', res.headers.get('content-length'));
  console.log('Voice Profile:', res.headers.get('x-voice-profile'));

  if (res.status === 200) {
    const ab = await res.arrayBuffer();
    console.log('Successfully received MP3 buffer of size:', ab.byteLength, 'bytes!');
  } else {
    const errText = await res.text();
    console.log('Error payload:', errText);
  }
}
testFullArticleViaFetch();
