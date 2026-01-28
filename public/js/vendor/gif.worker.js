// gif.worker.js 0.2.0 - https://github.com/jnordberg/gif.js
(function e(t, n, r) { function s(o, u) { if (!n[o]) { if (!t[o]) { var a = typeof require == "function" && require; if (!u && a) return a(o, !0); if (i) return i(o, !0); var f = new Error("Cannot find module '" + o + "'"); throw f.code = "MODULE_NOT_FOUND", f } var l = n[o] = { exports: {} }; t[o][0].call(l.exports, function (e) { var n = t[o][1][e]; return s(n ? n : e) }, l, l.exports, e, t, n, r) } return n[o].exports } var i = typeof require == "function" && require; for (var o = 0; o < r.length; o++)s(r[o]); return s })({
    1: [function (require, module, exports) {
        var NeuQuant = require('./neuquant');

        var LZWEncoder = require('./lzw');

        function ByteArray() {
            this.page = -1;
            this.pages = [];
            this.newPage();
        }

        ByteArray.pageSize = 4096;

        ByteArray.charMap = {};

        for (var i = 0; i < 256; i++)
            ByteArray.charMap[i] = String.fromCharCode(i);

        ByteArray.prototype.newPage = function () {
            this.pages[++this.page] = new Uint8Array(ByteArray.pageSize);
            this.cursor = 0;
        };

        ByteArray.prototype.getData = function () {
            var rv = '';
            for (var p = 0; p < this.pages.length; p++) {
                for (var i = 0; i < ByteArray.pageSize; i++) {
                    rv += ByteArray.charMap[this.pages[p][i]];
                }
            }
            return rv;
        };

        ByteArray.prototype.writeByte = function (val) {
            if (this.cursor >= ByteArray.pageSize) this.newPage();
            this.pages[this.page][this.cursor++] = val;
        };

        ByteArray.prototype.writeUTFBytes = function (string) {
            for (var l = string.length, i = 0; i < l; i++)
                this.writeByte(string.charCodeAt(i));
        };

        ByteArray.prototype.writeBytes = function (array, offset, length) {
            for (var l = length || array.length, i = offset || 0; i < l; i++)
                this.writeByte(array[i]);
        };

        function GIFEncoder(width, height) {
            this.width = ~~width;
            this.height = ~~height;
            this.transparent = null;
            this.transIndex = 0;
            this.repeat = -1;
            this.delay = 0;
            this.image = null;
            this.pixels = null;
            this.indexedPixels = null;
            this.colorDepth = null;
            this.colorTab = null;
            this.neuQuant = null;
            this.usedEntry = new Array();
            this.palSize = 7;
            this.dispose = -1;
            this.firstFrame = true;
            this.sample = 10;
            this.dither = false;
            this.globalPalette = false;
            this.out = new ByteArray();
        }

        GIFEncoder.prototype.setDelay = function (milliseconds) {
            this.delay = Math.round(milliseconds / 10);
        };

        GIFEncoder.prototype.setFrameRate = function (fps) {
            this.delay = Math.round(100 / fps);
        };

        GIFEncoder.prototype.setDispose = function (disposalCode) {
            if (disposalCode >= 0) this.dispose = disposalCode;
        };

        GIFEncoder.prototype.setRepeat = function (repeat) {
            this.repeat = repeat;
        };

        GIFEncoder.prototype.setTransparent = function (color) {
            this.transparent = color;
        };

        GIFEncoder.prototype.addFrame = function (imageData) {
            this.image = imageData;
            this.getImagePixels();
            this.analyzePixels();
            if (this.globalPalette === true) {
                this.out.writeByte(0x21);
                this.out.writeByte(0xff);
                this.out.writeByte(11);
                this.out.writeUTFBytes("NETSCAPE2.0");
                this.out.writeByte(3);
                this.out.writeByte(1);
                this.out.writeByte(0);
                this.out.writeByte(0);
                this.out.writeByte(0);
            }
            if (this.firstFrame === true) {
                this.writeLSD();
                this.writePalette();
                if (this.repeat >= 0) {
                    this.writeNetscapeExt();
                }
            }
            this.writeGraphicCtrlExt();
            this.writeImageDesc();
            if (!this.firstFrame && !this.globalPalette) {
                this.writePalette();
            }
            this.writePixels();
            this.firstFrame = false;
        };

        GIFEncoder.prototype.finish = function () {
            this.out.writeByte(0x3b);
        };

        GIFEncoder.prototype.setQuality = function (quality) {
            if (quality < 1) quality = 1;
            this.sample = quality;
        };

        GIFEncoder.prototype.setDither = function (dither) {
            if (dither === true) dither = 'FloydSteinberg';
            this.dither = dither;
        };

        GIFEncoder.prototype.setGlobalPalette = function (flag) {
            this.globalPalette = !!flag;
        };

        GIFEncoder.prototype.getGlobalPalette = function () {
            return (this.globalPalette && this.neuQuant && this.neuQuant.getPalette()) || null;
        };

        GIFEncoder.prototype.writeHeader = function () {
            this.out.writeUTFBytes("GIF89a");
        };

        GIFEncoder.prototype.analyzePixels = function () {
            if (!this.globalPalette) {
                var len = this.pixels.length;
                var nPix = len / 3;
                this.indexedPixels = new Uint8Array(nPix);
                var nQ = new NeuQuant(this.pixels, this.sample);
                this.colorTab = nQ.process();
                this.neuQuant = nQ;
            } else {
                // Reuse global palette
            }
            var k = 0;
            for (var j = 0; j < nPix; j++) {
                var index = nQ.map(this.pixels[k++] & 0xff, this.pixels[k++] & 0xff, this.pixels[k++] & 0xff);
                this.usedEntry[index] = true;
                this.indexedPixels[j] = index;
            }
            this.pixels = null;
            this.colorDepth = 8;
            this.palSize = 7;
            if (this.transparent !== null) {
                this.transIndex = this.findClosest(this.transparent);
            }
        };

        GIFEncoder.prototype.findClosest = function (c) {
            if (this.colorTab === null) return -1;
            var r = (c & 0xFF0000) >> 16;
            var g = (c & 0x00FF00) >> 8;
            var b = (c & 0x0000FF);
            var minpos = 0;
            var dmin = 256 * 256 * 256;
            var len = this.colorTab.length;
            for (var i = 0; i < len;) {
                var dr = r - (this.colorTab[i++] & 0xff);
                var dg = g - (this.colorTab[i++] & 0xff);
                var db = b - (this.colorTab[i] & 0xff);
                var d = dr * dr + dg * dg + db * db;
                var index = i / 3;
                if (this.usedEntry[index] && (d < dmin)) {
                    dmin = d;
                    minpos = index;
                }
                i++;
            }
            return minpos;
        };

        GIFEncoder.prototype.getImagePixels = function () {
            var w = this.width;
            var h = this.height;
            this.pixels = new Uint8Array(w * h * 3);
            var data = this.image;
            var count = 0;
            for (var i = 0; i < h; i++) {
                for (var j = 0; j < w; j++) {
                    var b = (i * w * 4) + j * 4;
                    this.pixels[count++] = data[b];
                    this.pixels[count++] = data[b + 1];
                    this.pixels[count++] = data[b + 2];
                }
            }
        };

        GIFEncoder.prototype.writeGraphicCtrlExt = function () {
            this.out.writeByte(0x21);
            this.out.writeByte(0xf9);
            this.out.writeByte(4);
            var transp, disp;
            if (this.transparent === null) {
                transp = 0;
                disp = 0;
            } else {
                transp = 1;
                disp = 2;
            }
            if (this.dispose >= 0) {
                disp = this.dispose & 7;
            }
            disp <<= 2;
            this.out.writeByte(0 | disp | 0 | transp);
            this.writeShort(this.delay);
            this.out.writeByte(this.transIndex);
            this.out.writeByte(0);
        };

        GIFEncoder.prototype.writeImageDesc = function () {
            this.out.writeByte(0x2c);
            this.writeShort(0);
            this.writeShort(0);
            this.writeShort(this.width);
            this.writeShort(this.height);
            if (this.firstFrame || this.globalPalette) {
                this.out.writeByte(0);
            } else {
                this.out.writeByte(0x80 | 0 | 0 | 0 | this.palSize);
            }
        };

        GIFEncoder.prototype.writeLSD = function () {
            this.writeShort(this.width);
            this.writeShort(this.height);
            this.out.writeByte(0x80 | 0x70 | 0x00 | this.palSize);
            this.out.writeByte(0);
            this.out.writeByte(0);
        };

        GIFEncoder.prototype.writeNetscapeExt = function () {
            this.out.writeByte(0x21);
            this.out.writeByte(0xff);
            this.out.writeByte(11);
            this.out.writeUTFBytes("NETSCAPE2.0");
            this.out.writeByte(3);
            this.out.writeByte(1);
            this.writeShort(this.repeat);
            this.out.writeByte(0);
        };

        GIFEncoder.prototype.writePalette = function () {
            this.out.writeBytes(this.colorTab);
            var n = (3 * 256) - this.colorTab.length;
            for (var i = 0; i < n; i++)
                this.out.writeByte(0);
        };

        GIFEncoder.prototype.writeShort = function (pValue) {
            this.out.writeByte(pValue & 0xFF);
            this.out.writeByte((pValue >> 8) & 0xFF);
        };

        GIFEncoder.prototype.writePixels = function () {
            var enc = new LZWEncoder(this.width, this.height, this.indexedPixels, this.colorDepth);
            enc.encode(this.out);
        };

        GIFEncoder.prototype.stream = function () {
            return this.out;
        };

        module.exports = GIFEncoder;

    }, { "./lzw": 2, "./neuquant": 3 }], 2: [function (require, module, exports) {
        var LZWEncoder = function (width, height, pixels, colorDepth) {
            var EOF = -1;
            var imgW = width;
            var imgH = height;
            var pixAry = pixels;
            var initCodeSize = Math.max(2, colorDepth);
            var remaining = 0;
            var curPixel = 0;
            var n_bits = 0;
            var maxbits = 12;
            var maxcode = 0;
            var maxmaxcode = 1 << 12;
            var htab = [];
            var codetab = [];
            var hsize = 5003;
            var free_ent = 0;
            var clear_flag = false;
            var g_init_bits = 0;
            var ClearCode = 0;
            var EOFCode = 0;
            var cur_accum = 0;
            var cur_bits = 0;
            var masks = [0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F, 0x003F, 0x007F, 0x00FF, 0x01FF, 0x03FF, 0x07FF, 0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF, 0xFFFF];
            var a_count = 0;
            var accum = [];
            var MAXCODE = function (n_bits) {
                return (1 << n_bits) - 1;
            };

            var empty = function (out) {
                cur_accum = 0;
                cur_bits = 0;
                if (a_count > 0) {
                    out.writeByte(a_count);
                    out.writeBytes(accum, 0, a_count);
                    a_count = 0;
                }
            };

            var output = function (code, out) {
                cur_accum &= masks[cur_bits];
                if (cur_bits > 0) cur_accum |= (code << cur_bits);
                else cur_accum = code;
                cur_bits += n_bits;
                while (cur_bits >= 8) {
                    char_out((cur_accum & 0xff), out);
                    cur_accum >>= 8;
                    cur_bits -= 8;
                }
                if (free_ent > maxcode || clear_flag) {
                    if (clear_flag) {
                        maxcode = MAXCODE(n_bits = g_init_bits);
                        clear_flag = false;
                    } else {
                        ++n_bits;
                        if (n_bits == maxbits) maxcode = maxmaxcode;
                        else maxcode = MAXCODE(n_bits);
                    }
                }
                if (code == EOFCode) {
                    while (cur_bits > 0) {
                        char_out((cur_accum & 0xff), out);
                        cur_accum >>= 8;
                        cur_bits -= 8;
                    }
                    empty(out);
                }
            };

            var char_out = function (c, out) {
                accum[a_count++] = c;
                if (a_count >= 254) empty(out);
            };

            var cl_block = function (out) {
                cl_hash(hsize);
                free_ent = ClearCode + 2;
                clear_flag = true;
                output(ClearCode, out);
            };

            var cl_hash = function (hsize) {
                for (var i = 0; i < hsize; ++i) htab[i] = -1;
            };

            var compress = function (init_bits, out) {
                var fcode, c, i, ent, disp, hsize_reg, hshift;
                g_init_bits = init_bits;
                clear_flag = false;
                n_bits = g_init_bits;
                maxcode = MAXCODE(n_bits);
                ClearCode = 1 << (init_bits - 1);
                EOFCode = ClearCode + 1;
                free_ent = ClearCode + 2;
                a_count = 0;
                ent = nextPixel();
                hshift = 0;
                for (fcode = hsize; fcode < 65536; fcode *= 2)
                    ++hshift;
                hshift = 8 - hshift;
                hsize_reg = hsize;
                cl_hash(hsize_reg);
                output(ClearCode, out);
                outer_loop: while ((c = nextPixel()) != EOF) {
                    fcode = (c << maxbits) + ent;
                    i = (c << hshift) ^ ent;
                    if (htab[i] == fcode) {
                        ent = codetab[i];
                        continue;
                    } else if (htab[i] >= 0) {
                        disp = hsize_reg - i;
                        if (i === 0) disp = 1;
                        do {
                            if ((i -= disp) < 0) i += hsize_reg;
                            if (htab[i] == fcode) {
                                ent = codetab[i];
                                continue outer_loop;
                            }
                        } while (htab[i] >= 0);
                    }
                    output(ent, out);
                    ent = c;
                    if (free_ent < maxmaxcode) {
                        codetab[i] = free_ent++;
                        htab[i] = fcode;
                    } else cl_block(out);
                }
                output(ent, out);
                output(EOFCode, out);
            };

            var nextPixel = function () {
                if (remaining === 0) return EOF;
                --remaining;
                var pix = pixAry[curPixel++];
                return pix & 0xff;
            };

            this.encode = function (out) {
                out.writeByte(initCodeSize);
                remaining = imgW * imgH;
                curPixel = 0;
                compress(initCodeSize + 1, out);
                out.writeByte(0);
            };
        };

        module.exports = LZWEncoder;

    }, {}], 3: [function (require, module, exports) {
        function NeuQuant(thePicu, theSample) {
            var ncycles = 100;
            var netsize = 256;
            var maxnetpos = netsize - 1;
            var netbiasshift = 4;
            var intbiasshift = 16;
            var intbias = 1 << intbiasshift;
            var gammashift = 10;
            var gamma = 1 << gammashift;
            var betashift = 10;
            var beta = intbias >> betashift;
            var betagamma = intbias << (gammashift - betashift);
            var initrad = netsize >> 3;
            var radiusbiasshift = 6;
            var radiusbias = 1 << radiusbiasshift;
            var initradius = initrad * radiusbias;
            var radiusdec = 30;
            var alphabiasshift = 10;
            var initalpha = 1 << alphabiasshift;
            var alphadec;
            var radbiasshift = 8;
            var radbias = 1 << radbiasshift;
            var alpharadbshift = alphabiasshift + radbiasshift;
            var alpharadbias = 1 << alpharadbshift;
            var network;
            var netindex;
            var bias;
            var freq;
            var radpower;
            var samplefac;
            var pixels = thePicu;
            var lengthcount = pixels.length;

            this.process = function () {
                init();
                learn();
                unbiasnet();
                inxbuild();
                return colorMap();
            };

            this.map = function (b, g, r) {
                var i, j, dist, a, bestd;
                bestd = 1000;
                best = -1;
                i = netindex[g];
                j = i - 1;
                while ((i < netsize) || (j >= 0)) {
                    if (i < netsize) {
                        a = network[i];
                        dist = a[1] - g;
                        if (dist >= bestd) i = netsize;
                        else {
                            i++;
                            if (dist < 0) dist = -dist;
                            a = a[0] - b;
                            if (a < 0) a = -a;
                            dist += a;
                            if (dist < bestd) {
                                a = network[i - 1][2] - r;
                                if (a < 0) a = -a;
                                dist += a;
                                if (dist < bestd) {
                                    bestd = dist;
                                    best = network[i - 1][3];
                                }
                            }
                        }
                    }
                    if (j >= 0) {
                        a = network[j];
                        dist = g - a[1];
                        if (dist >= bestd) j = -1;
                        else {
                            j--;
                            if (dist < 0) dist = -dist;
                            a = a[0] - b;
                            if (a < 0) a = -a;
                            dist += a;
                            if (dist < bestd) {
                                a = network[j + 1][2] - r;
                                if (a < 0) a = -a;
                                dist += a;
                                if (dist < bestd) {
                                    bestd = dist;
                                    best = network[j + 1][3];
                                }
                            }
                        }
                    }
                }
                return (best);
            };

            this.getPalette = function () {
                var map = [];
                var index = 0;
                for (var i = 0; i < netsize; i++) {
                    map[index++] = network[i][0];
                    map[index++] = network[i][1];
                    map[index++] = network[i][2];
                }
                return map;
            };

            var init = function () {
                network = [];
                netindex = new Int32Array(256);
                bias = new Int32Array(netsize);
                freq = new Int32Array(netsize);
                radpower = new Int32Array(initrad);
                for (var i = 0; i < netsize; i++) {
                    var v = (i << (netbiasshift + 8)) / netsize;
                    network[i] = new Float64Array([v, v, v, 0]);
                    freq[i] = intbias / netsize;
                    bias[i] = 0;
                }
            };

            var unbiasnet = function () {
                for (var i = 0; i < netsize; i++) {
                    network[i][0] >>= netbiasshift;
                    network[i][1] >>= netbiasshift;
                    network[i][2] >>= netbiasshift;
                    network[i][3] = i;
                }
            };

            var alterneigh = function (rad, i, b, g, r) {
                var j, k, lo, hi, a, m, p;
                lo = i - rad;
                if (lo < -1) lo = -1;
                hi = i + rad;
                if (hi > netsize) hi = netsize;
                j = i + 1;
                k = i - 1;
                m = 1;
                while ((j < hi) || (k > lo)) {
                    a = radpower[m++];
                    if (j < hi) {
                        p = network[j++];
                        try {
                            p[0] -= (a * (p[0] - b)) / alpharadbias;
                            p[1] -= (a * (p[1] - g)) / alpharadbias;
                            p[2] -= (a * (p[2] - r)) / alpharadbias;
                        } catch (e) { }
                    }
                    if (k > lo) {
                        p = network[k--];
                        try {
                            p[0] -= (a * (p[0] - b)) / alpharadbias;
                            p[1] -= (a * (p[1] - g)) / alpharadbias;
                            p[2] -= (a * (p[2] - r)) / alpharadbias;
                        } catch (e) { }
                    }
                }
            };

            var altersingle = function (alpha, i, b, g, r) {
                var n = network[i];
                n[0] -= (alpha * (n[0] - b)) / initalpha;
                n[1] -= (alpha * (n[1] - g)) / initalpha;
                n[2] -= (alpha * (n[2] - r)) / initalpha;
            };

            var learn = function () {
                var i, j, b, g, r;
                var radius, rad, alpha, step, delta, samplepixels;
                if (lengthcount < minpicturebytes) samplefac = 1;
                alphadec = 30 + ((samplefac - 1) / 3);
                samplepixels = lengthcount / (3 * samplefac);
                delta = samplepixels / ncycles;
                alpha = initalpha;
                radius = initradius;
                rad = radius >> radiusbiasshift;
                if (rad <= 1) rad = 0;
                for (i = 0; i < rad; i++)
                    radpower[i] = alpha * (((rad * rad - i * i) * radbias) / (rad * rad));
                if (lengthcount < minpicturebytes) step = 3;
                else if ((lengthcount % prime1) !== 0) step = 3 * prime1;
                else {
                    if ((lengthcount % prime2) !== 0) step = 3 * prime2;
                    else {
                        if ((lengthcount % prime3) !== 0) step = 3 * prime3;
                        else step = 3 * prime4;
                    }
                }
                var pixelPos = 0;
                i = 0;
                while (i < samplepixels) {
                    b = (pixels[pixelPos] & 0xff) << netbiasshift;
                    g = (pixels[pixelPos + 1] & 0xff) << netbiasshift;
                    r = (pixels[pixelPos + 2] & 0xff) << netbiasshift;
                    j = contest(b, g, r);
                    altersingle(alpha, j, b, g, r);
                    if (rad !== 0) alterneigh(rad, j, b, g, r);
                    pixelPos += step;
                    if (pixelPos >= lengthcount) pixelPos -= lengthcount;
                    i++;
                    if (delta === 0) delta = 1;
                    if (i % delta === 0) {
                        alpha -= alpha / alphadec;
                        radius -= radius / radiusdec;
                        rad = radius >> radiusbiasshift;
                        if (rad <= 1) rad = 0;
                        for (j = 0; j < rad; j++)
                            radpower[j] = alpha * (((rad * rad - j * j) * radbias) / (rad * rad));
                    }
                }
            };

            var inxbuild = function () {
                var i, j, smallpos, smallval, p, q;
                var previouscol, startpos;
                previouscol = 0;
                startpos = 0;
                for (i = 0; i < netsize; i++) {
                    p = network[i];
                    smallpos = i;
                    smallval = p[1];
                    for (j = i + 1; j < netsize; j++) {
                        q = network[j];
                        if (q[1] < smallval) {
                            smallpos = j;
                            smallval = q[1];
                        }
                    }
                    q = network[smallpos];
                    if (i != smallpos) {
                        j = q[0];
                        q[0] = p[0];
                        p[0] = j;
                        j = q[1];
                        q[1] = p[1];
                        p[1] = j;
                        j = q[2];
                        q[2] = p[2];
                        p[2] = j;
                        j = q[3];
                        q[3] = p[3];
                        p[3] = j;
                    }
                    if (smallval != previouscol) {
                        netindex[previouscol] = (startpos + i) >> 1;
                        for (j = previouscol + 1; j < smallval; j++) netindex[j] = i;
                        previouscol = smallval;
                        startpos = i;
                    }
                }
                netindex[previouscol] = (startpos + maxnetpos) >> 1;
                for (j = previouscol + 1; j < 256; j++) netindex[j] = maxnetpos;
            };

            var colorMap = function () {
                var map = [];
                var index = 0;
                for (var i = 0; i < netsize; i++)
                    map[index++] = network[i];
                return map;
            };

            var contest = function (b, g, r) {
                var i, dist, a, biasdist, betafreq;
                var bestpos, bestbiaspos, bestd, bestbiasd;
                bestd = ~((1 << 31));
                bestbiasd = bestd;
                bestpos = -1;
                bestbiaspos = bestpos;
                for (i = 0; i < netsize; i++) {
                    a = network[i][0] - b;
                    if (a < 0) a = -a;
                    dist = a;
                    a = network[i][1] - g;
                    if (a < 0) a = -a;
                    dist += a;
                    a = network[i][2] - r;
                    if (a < 0) a = -a;
                    dist += a;
                    if (dist < bestd) {
                        bestd = dist;
                        bestpos = i;
                    }
                    biasdist = dist - ((bias[i]) >> (intbiasshift - netbiasshift));
                    if (biasdist < bestbiasd) {
                        bestbiasd = biasdist;
                        bestbiaspos = i;
                    }
                    betafreq = (freq[i] >> betashift);
                    freq[i] -= betafreq;
                    bias[i] += (betafreq << gammashift);
                }
                freq[bestbiaspos] += beta;
                bias[bestbiaspos] -= betagamma;
                return (bestbiaspos);
            };

            var minpicturebytes = (3 * prime4);
            var prime1 = 499;
            var prime2 = 491;
            var prime3 = 487;
            var prime4 = 503;
        }

        module.exports = NeuQuant;

    }, {}], 4: [function (require, module, exports) {
        self.onmessage = function (event) {
            var frame = event.data;
            var GIFEncoder = require('./gifEncoder');
            if (frame.type === "video/gif") {
                var encoder = new GIFEncoder(frame.width, frame.height);
                if (frame.globalPalette === true) encoder.setGlobalPalette(true);
                encoder.writeHeader();
                for (var i = 0; i < frame.frames.length; i++) {
                    encoder.setRepeat(0);
                    encoder.setDelay(frame.frames[i].delay);
                    encoder.addFrame(frame.frames[i].data);
                }
                encoder.finish();
                self.postMessage(new Blob([new Uint8Array(encoder.stream().pages)]));
            } else {
                var encoder = new GIFEncoder(frame.width, frame.height);
                if (frame.index === 0) {
                    encoder.writeHeader();
                } else {
                    encoder.firstFrame = false;
                }

                encoder.setTransparent(frame.transparent);
                encoder.setRepeat(frame.repeat);
                encoder.setDelay(frame.delay);
                encoder.setQuality(frame.quality);
                encoder.setDither(frame.dither);
                encoder.setGlobalPalette(frame.globalPalette);
                encoder.addFrame(frame.data);
                if (frame.last) {
                    encoder.finish();
                }
                if (frame.globalPalette === true) {
                    frame.globalPalette = encoder.getGlobalPalette();
                }
                if (frame.canTransfer) {
                    var transfer = (frame.data.buffer instanceof ArrayBuffer) ? [frame.data.buffer] : [];
                    self.postMessage(frame.globalPalette ? { globalPalette: frame.globalPalette } : encoder.stream().getData(), transfer);
                } else {
                    self.postMessage(frame.globalPalette ? { globalPalette: frame.globalPalette } : encoder.stream().getData());
                }
            }
        };

    }, { "./gifEncoder": 1 }]
}, {}, [4]);
