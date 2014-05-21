1.1.1 / 2014-05-20
==================

  * simplify method to get remote address

1.1.0 / 2014-05-18
==================

  * "dev" format will use same tokens as other formats
  * `:response-time` token is now empty when immediate used
  * `:response-time` token is now monotonic
  * `:response-time` token has precision to 1 μs
  * fix `:status` + immediate output in node.js 0.8
  * improve `buffer` option to prevent indefinite event loop holding
  * deps: bytes@1.0.0
    - add negative support

1.0.1 / 2014-05-04
==================

  * Make buffer unique per morgan instance
  * deps: bytes@0.3.0
    * added terabyte support

1.0.0 / 2014-02-08
==================

  * Initial release
