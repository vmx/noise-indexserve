Serving up a Noise index
========================

This is a simple HTTP server to serve up a [Noise] index.


Quickstart
----------

    npm install
    node index.js <path-to-noise-index>

Now you can query it with e.g.

    curl -X POST http://localhost:3000/query -d 'find {}'


License
-------

This project is Licensed under the MIT License.

[Noise]: https://github.com/pipedown/noise/
