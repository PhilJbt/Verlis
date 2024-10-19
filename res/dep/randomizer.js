
/*
	Randomizer

	Options:
	Provide an object with keys 'rng' and/or 'seed'. If 'rng' is not provided
	Randomizer will use Math.random(). 

	The provided RNG can be a javascript object with methods for random(), setSeed(), 
	and possibly randomInteger(), or one of the following options:

	'MersenneTwister',
	'MultiplyWithCarry'
	'CombinedMultipleRecursive'

*/
var Randomizer = function(options) {
	options = options || {};

	var seed = options.seed || new Date().getTime();
	var rng = options.rng || options.RNG;

	if(typeof rng === "string") {
		switch (rng) {
			case 'MersenneTwister': // fall-through intentional
			case 'CombinedMultipleRecursive':
			case 'MultiplyWithCarry':
				if(typeof window[rng] === "undefined") {
					throw new TypeError("'" + rng + "' must be included before use.");
				}
				rng = new window[rng]();
				if(seed && typeof rng.setSeed === 'function') {
					rng.setSeed(seed);
				}
				break;
			default:
				throw new TypeError("'" + rng + "' is not a valid RNG option.");
		}
	} else if(rng) {
		// ensure the proper methods are provided
		if(typeof rng.random !== 'function') {
			throw new TypeError("The provided RNG does not implement random()");
		}

	} else {
		rng = Math;
	}

	this.random = function() {
		return rng.random();
	};
	this.randomInteger = function(min, max) {
		if(typeof rng.randomInteger === 'function') {
			return rng.randomInteger(min, max);
		} else {
			if(!min || min < 0) {
				min = 0;
			}
			if(!max) {
				max = 2147483647;
			}
			return Math.floor(rng.random() * (max - min + 1)) + min;
		}
	};
	this.setSeed = function(seed) {
		if(typeof rng.setSeed === 'function') {
			rng.setSeed(seed);
		}
	};
	this.getSeed = function() {
		if(typeof rng.getSeed === 'function') {
			return rng.getSeed();
		}
		return null;
	};

	/* 
		Normal distribution

		Javascript implementation of the Box-Muller transform.
		http://en.wikipedia.org/wiki/Box-Muller_transform
		The ziggurat algorithm is more efficient, but this is
		easier to implement. This particular implementation is a 
		version of http://www.dreamincode.net/code/snippet1446.htm
		@constructor 
		@param {Number} sigma The standard-deviation of the distribution
		@param {Number} mu The center of the distribution

		by Sean McCullough (banksean@gmail.com)
		25.December 2007
		http://www.cricketschirping.com/code/random_sampling_in_javascript.html
	*/
	var rand_obj = this;
	function NormalDistribution(sigma, mu) {
		return {
			sigma: sigma,
			mu: mu,
			sample: function normaldistribution__sample() {
				var res;
				if (this.storedDeviate) {
					res = this.storedDeviate * this.sigma + this.mu;
					this.storedDeviate = null;
				} else {
					var dist = Math.sqrt(-1 * Math.log(rand_obj.random()));
					var angle = 2 * Math.PI * rand_obj.random();
					this.storedDeviate = dist*Math.cos(angle);
					res = dist*Math.sin(angle) * this.sigma + this.mu;
				}
				return res; 
			},
			sampleInt : function normaldistribution__sample_int() {
				return Math.round(this.sample());
			}
		}; 
	}   

	// cache some of the normal objects instead of re-evaluating deviate
	var stored_normals = {};
	var cache_normal = function(mean, stddev, create_new) {
		create_new = (create_new === undefined) ? false : create_new;

		// store and retrieve distributions to avoid some of the math if we're going over and over it
		var key = mean + '_' + stddev;
		var exists = (stored_normals[key] !== undefined);
		if(!exists || create_new) {
			stored_normals[key] = new NormalDistribution(stddev, mean);
		}
		
		return stored_normals[key];
	};

	this.normal = function(mean, stddev, create_new) {
		stddev = stddev || 1;
		var obj = cache_normal(mean, stddev, create_new);
		return obj.sample();
	};

	this.normalInteger = function(mean, stddev, create_new) {
		stddev = stddev || 1;
		var obj = cache_normal(mean, stddev, create_new);
		return obj.sampleInt();
	};
};


/*
	A Pierre L'Ecuyer Combined Multiple Recursive RNG
    - Copyright (c) 1998, 2002 Pierre L'Ecuyer, DIRO, Universite de Montreal.
	- License Below
    - http://www.iro.umontreal.ca/~lecuyer/

	Javascript implementation by Johannes Baagoe <baagoe@baagoe.com>, 2010
	from http://baagoe.com/en/RandomMusings/javascript/
*/

var CombinedMultipleRecursive = function(in_seed) {
	if (in_seed == undefined) {
		in_seed = (new Date()).getTime();
	} 
	var seed = in_seed;
	
	var rng = new MRG32k3a(seed);
	
	this.random = function() {
		return rng();
	};

	this.setSeed = function(new_seed) {
		seed = new_seed;
		rng = new MRG32k3a(seed);
	};

	this.getSeed = function() {
		return seed;
	};
};

function MRG32k3a() {
  return (function(args) {
    var m1 = 4294967087;
    var m2 = 4294944443;
    var s10 = 12345,
        s11 = 12345,
        s12 = 123,
        s20 = 12345,
        s21 = 12345,
        s22 = 123;

    if (args.length === 0) {
      args = [+new Date()];
    }
    var mash = Mash();
    for (var i = 0; i < args.length; i++) {
      s10 += mash(args[i]) * 0x100000000; // 2 ^ 32
      s11 += mash(args[i]) * 0x100000000;
      s12 += mash(args[i]) * 0x100000000;
      s20 += mash(args[i]) * 0x100000000;
      s21 += mash(args[i]) * 0x100000000;
      s22 += mash(args[i]) * 0x100000000;
    }
    s10 %= m1;
    s11 %= m1;
    s12 %= m1;
    s20 %= m2;
    s21 %= m2;
    s22 %= m2;
    mash = null;

    var uint32 = function() {
      var m1 = 4294967087;
      var m2 = 4294944443;
      var a12 = 1403580;
      var a13n = 810728;
      var a21 = 527612;
      var a23n = 1370589;

      var k, p1, p2;

      /* Component 1 */
      p1 = a12 * s11 - a13n * s10;
      k = p1 / m1 | 0;
      p1 -= k * m1;
      if (p1 < 0) p1 += m1;
      s10 = s11;
      s11 = s12;
      s12 = p1;

      /* Component 2 */
      p2 = a21 * s22 - a23n * s20;
      k = p2 / m2 | 0;
      p2 -= k * m2;
      if (p2 < 0) p2 += m2;
      s20 = s21;
      s21 = s22;
      s22 = p2;

      /* Combination */
      if (p1 <= p2) return p1 - p2 + m1;
      else return p1 - p2;
    };

    var random = function() {
      return uint32() * 2.3283064365386963e-10; // 2^-32
    };
    random.uint32 = uint32;
    random.fract53 = function() {
      return random() +
        (uint32() & 0x1fffff) * 1.1102230246251565e-16; // 2^-53
    };
    random.version = 'MRG32k3a 0.9';
    random.args = args;

    return random;
  } (Array.prototype.slice.call(arguments)));
};
/*
http://www.iro.umontreal.ca/~simardr/testu01/copyright.html

Copyright (c) 2002 Pierre L'Ecuyer, Universite de Montreal.
Web address: http://www.iro.umontreal.ca/~lecuyer/
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted without a fee for private, research, academic, or other non-commercial purposes. Any use of this software by a commercial enterprise requires a written licence from the copyright owner.

Any changes made to this package must be clearly identified as such.

In scientific publications which used this software, one may give the citation as:
P. L'Ecuyer and R. Simard, TestU01: A C Library for Empirical Testing of Random Number Generators, ACM Transactions on Mathematical Software, Vol. 33, 4, article 22, 2007.

Redistributions of source code must retain this copyright notice and the following disclaimer.

THIS PACKAGE IS PROVIDED "AS IS" AND WITHOUT ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTIBILITY AND FITNESS FOR A PARTICULAR PURPOSE.
*/


/*
	MultiplyWithCarry implementation uses Alea,
	from http://baagoe.com/en/RandomMusings/javascript/
    by Johannes Baagøe <baagoe@baagoe.com>, 2010
	Permissive MIT License Below
*/

var MultiplyWithCarry = function(in_seed) {
	if (in_seed == undefined) {
		in_seed = (new Date()).getTime();
	} 
	var seed = in_seed;
	
	var rng = new Alea(seed);
	
	this.random = function() {
		return rng();
	};

	this.setSeed = function(new_seed) {
		seed = new_seed;
		rng = new Alea(seed);
	};

	this.getSeed = function() {
		return seed;
	};
};

function Mash() {
  var n = 0xefc8249d;

  var mash = function(data) {
    data = data.toString();
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  mash.version = 'Mash 0.9';
  return mash;
}

function Alea() {
  return (function(args) {
    var s0 = 0;
    var s1 = 0;
    var s2 = 0;
    var c = 1;

    if (args.length == 0) {
      args = [+new Date];
    }
    var mash = Mash();
    s0 = mash(' ');
    s1 = mash(' ');
    s2 = mash(' ');

    for (var i = 0; i < args.length; i++) {
      s0 -= mash(args[i]);
      if (s0 < 0) {
        s0 += 1;
      }
      s1 -= mash(args[i]);
      if (s1 < 0) {
        s1 += 1;
      }
      s2 -= mash(args[i]);
      if (s2 < 0) {
        s2 += 1;
      }
    }
    mash = null;

    var random = function() {
      var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
      s0 = s1;
      s1 = s2;
      return s2 = t - (c = t | 0);
    };
    random.uint32 = function() {
      return random() * 0x100000000; // 2^32
    };
    random.fract53 = function() {
      return random() + 
        (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
    };
    random.version = 'Alea 0.9';
    random.args = args;

	// added by Brian Ramsay for randomizer compatibility
	random.setSeed = function() {
	}
    return random;

  } (Array.prototype.slice.call(arguments)));
};
/*
Copyright (C) 2010 by Johannes Baagoe <baagoe@baagoe.org>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/


/*
	The following code has been adapted from the gist posted by Sean McCullough
	which uses the Mersenne Twister implementation of Nishimura and Matsumoto.

	Comments and license follow the code.
*/

var MersenneTwister = function(in_seed) {
	if (in_seed == undefined) {
		in_seed = (new Date()).getTime();
	} 
	this.seed = in_seed;

	/* Period parameters */  
	this.N = 624;
	this.M = 397;
	this.MATRIX_A = 0x9908b0df;   /* constant vector a */
	this.UPPER_MASK = 0x80000000; /* most significant w-r bits */
	this.LOWER_MASK = 0x7fffffff; /* least significant r bits */

	this.mt = new Array(this.N); /* the array for the state vector */
	this.mti=this.N+1; /* mti==N+1 means mt[N] is not initialized */

	this.init_genrand(this.seed);
}  
 
/* initializes mt[N] with a seed */
MersenneTwister.prototype.init_genrand = function(s) {
  this.mt[0] = s >>> 0;
  for (this.mti=1; this.mti<this.N; this.mti++) {
      var s = this.mt[this.mti-1] ^ (this.mt[this.mti-1] >>> 30);
   this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253)
  + this.mti;
      /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
      /* In the previous versions, MSBs of the seed affect   */
      /* only MSBs of the array mt[].                        */
      /* 2002/01/09 modified by Makoto Matsumoto             */
      this.mt[this.mti] >>>= 0;
      /* for >32 bit machines */
  }
}
 
/* initialize by an array with array-length */
/* init_key is the array for initializing keys */
/* key_length is its length */
/* slight change for C++, 2004/2/26 */
MersenneTwister.prototype.init_by_array = function(init_key, key_length) {
  var i, j, k;
  this.init_genrand(19650218);
  i=1; j=0;
  k = (this.N>key_length ? this.N : key_length);
  for (; k; k--) {
    var s = this.mt[i-1] ^ (this.mt[i-1] >>> 30)
    this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525)))
      + init_key[j] + j; /* non linear */
    this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
    i++; j++;
    if (i>=this.N) { this.mt[0] = this.mt[this.N-1]; i=1; }
    if (j>=key_length) j=0;
  }
  for (k=this.N-1; k; k--) {
    var s = this.mt[i-1] ^ (this.mt[i-1] >>> 30);
    this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941))
      - i; /* non linear */
    this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
    i++;
    if (i>=this.N) { this.mt[0] = this.mt[this.N-1]; i=1; }
  }

  this.mt[0] = 0x80000000; /* MSB is 1; assuring non-zero initial array */ 
}
 
/* generates a random number on [0,0xffffffff]-interval */
MersenneTwister.prototype.genrand_int32 = function() {
  var y;
  var mag01 = new Array(0x0, this.MATRIX_A);
  /* mag01[x] = x * MATRIX_A  for x=0,1 */

  if (this.mti >= this.N) { /* generate N words at one time */
    var kk;

    if (this.mti == this.N+1)   /* if init_genrand() has not been called, */
      this.init_genrand(5489); /* a default initial seed is used */

    for (kk=0;kk<this.N-this.M;kk++) {
      y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
      this.mt[kk] = this.mt[kk+this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
    }
    for (;kk<this.N-1;kk++) {
      y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk+1]&this.LOWER_MASK);
      this.mt[kk] = this.mt[kk+(this.M-this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
    }
    y = (this.mt[this.N-1]&this.UPPER_MASK)|(this.mt[0]&this.LOWER_MASK);
    this.mt[this.N-1] = this.mt[this.M-1] ^ (y >>> 1) ^ mag01[y & 0x1];

    this.mti = 0;
  }

  y = this.mt[this.mti++];

  /* Tempering */
  y ^= (y >>> 11);
  y ^= (y << 7) & 0x9d2c5680;
  y ^= (y << 15) & 0xefc60000;
  y ^= (y >>> 18);

  return y >>> 0;
}
 
/* generates a random number on [0,0x7fffffff]-interval */
MersenneTwister.prototype.genrand_int31 = function() {
  return (this.genrand_int32()>>>1);
}
 
/* generates a random number on [0,1]-real-interval */
MersenneTwister.prototype.genrand_real1 = function() {
  return this.genrand_int32()*(1.0/4294967295.0); 
  /* divided by 2^32-1 */ 
}

/* generates a random number on [0,1)-real-interval */
MersenneTwister.prototype.random = function() {
  return this.genrand_int32()*(1.0/4294967296.0); 
  /* divided by 2^32 */
}
 
/* generates a random number on (0,1)-real-interval */
MersenneTwister.prototype.genrand_real3 = function() {
  return (this.genrand_int32() + 0.5)*(1.0/4294967296.0); 
  /* divided by 2^32 */
}
 
/* generates a random number on [0,1) with 53-bit resolution*/
MersenneTwister.prototype.genrand_res53 = function() { 
  var a=this.genrand_int32()>>>5, b=this.genrand_int32()>>>6; 
  return(a*67108864.0+b)*(1.0/9007199254740992.0); 
} 
/* These real versions are due to Isaku Wada, 2002/01/09 added */


/* 
	Additions for use with Randomizer - Brian Ramsay
*/
MersenneTwister.prototype.setSeed = function(seed) {
	this.seed = seed;
	this.mt = new Array(this.N); /* the array for the state vector */
	this.mti=this.N+1; /* mti==N+1 means mt[N] is not initialized */

	this.init_genrand(seed);
}

/* 
	Additions for use with Randomizer - Brian Ramsay
*/
MersenneTwister.prototype.getSeed = function() {
	return this.seed;
}

/*
  I've wrapped Makoto Matsumoto and Takuji Nishimura's code in a namespace
  so it's better encapsulated. Now you can have multiple random number generators
  and they won't stomp all over each other's state.
  
  If you want to use this as a substitute for Math.random(), use the random()
  method like so:
  
  var m = new MersenneTwister();
  var randomNumber = m.random();
  
  You can also call the other genrand_{foo}() methods on the instance.

  If you want to use a specific seed in order to get a repeatable random
  sequence, pass an integer into the constructor:

  var m = new MersenneTwister(123);

  and that will always produce the same random sequence.

  Sean McCullough (banksean@gmail.com)
*/

/* 
   A C-program for MT19937, with initialization improved 2002/1/26.
   Coded by Takuji Nishimura and Makoto Matsumoto.
 
   Before using, initialize the state by using init_genrand(seed)  
   or init_by_array(init_key, key_length).
 
   Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
   All rights reserved.                          
 
   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:
 
     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
 
     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.
 
     3. The names of its contributors may not be used to endorse or promote 
        products derived from this software without specific prior written 
        permission.
 
   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 
 
   Any feedback is very welcome.
   http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
*/
