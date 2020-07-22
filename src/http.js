import http from 'http';
import qs from 'querystring';

export async function get(url, params = {}) {
  return new Promise((resolve, reject) => {
    http.get(`${url}?${qs.stringify(params)}`, (res) => {
      // console.log('statusCode:', res.statusCode);
      // console.log('headers:', res.headers);

      const chunks = [];

      res.on('data', (d) => {
        chunks.push(d);
      });

      res.on('end', () => {
        resolve(chunks.join(''));
      });

      res.on('error', reject);
    }).on('error', reject);
  });
}
