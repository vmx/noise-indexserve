const http = require('http');

const accesslog = require('access-log');
const noise = require('noise-search');

const indexName = process.argv[2];

const hostname = '127.0.0.1';
const port = 3000;
const maxPostSize = 4 * 1024;
const accessLogFormat = ':Xip - :userID [:endDate] ":method :url :protocol/:httpVersion" :statusCode :contentLength ":referer" ":userAgent"';
const escapeNewlineRegexp = /\n|\r\n|\r/g;
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST'
};

// open the index, create if missing
const index = noise.open(indexName);

const sendErrorResponse = (res, statusCode, error) => {
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify({error: error.toString()}));
};

const sendResponseAsync = (res, results, index) => {
  try {
    const next = results.next();
    if (next.value !== undefined) {
      res.write(',\n' + JSON.stringify(next.value, null, 2), () => {
        sendResponseAsync(res, results, index);
      });
    } else {
      res.end('\n]');
      noisePool.release(index);
    }
  } catch(e) {
    results.unref();
  }
}

const server = http.createServer((req, res) => {
  if (req.method == 'POST') {
    let str = '';
    req.on('data', chunk => {
      str += chunk;
      if (str.length > maxPostSize) {
        req.removeAllListeners('data');
        req.removeAllListeners('end');
        sendErrorResponse(res, 413, 'The query was too long.');
      }
    });
    req.on('end', async () => {
      accesslog(req, res, accessLogFormat, line => {
        console.log(line,
                    '|',
                    str.replace(escapeNewlineRegexp, '\\n'));
      });
      try {
        const results = await index.query(str);
        res.writeHead(200, headers);

        res.write('[');
        // First result is a special case to get the commas right
        const first = results.next();
        if (first.value !== undefined) {
          try {
            const json = JSON.stringify(first.value, null, 2);
            res.write('\n' + json, 'utf8', () => {
              sendResponseAsync(res, results, index);
            });
          } catch (e) {
            results.unref();
            throw e;
          }
        } else {
          res.write('\n]');
          res.end();
        }
      } catch(error) {
        sendErrorResponse(res, 400, error);
      }
    });
  }
});

server.listen(port, hostname, () => {
  console.log(`Serving up ${indexName} at http://${hostname}:${port}/`);
});
