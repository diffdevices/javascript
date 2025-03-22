//Script for the Max Msp jsui object by Ahmed Hentati

this.autowatch = 1;
this.inlets = 1;
this.outlets = 2;

include("FFT");
include("colors");
include("mg");  //initializes mgraphics and transfers it to mg, also has the SVGIcon()

var width =  this.box.rect[2] - this.box.rect[0];
var height = this.box.rect[3] - this.box.rect[1];
var initW = width, initH = height;

var hpIcon = new SVGIcon("headphones.svg");
var incandescentIcon = new SVGIcon("incandescent.svg");

var doDispSourcePhase = true;
var doUseFreqMargin = true;
var freqMarginPix = 16;

var currentVersion = "1.1.0";
var currentDate = "17/01/2025";
var deviceUniqueId = jsarguments[1];
var dynaParamsBuff = new Buffer(deviceUniqueId + "dynaParams");


function clip(input, _min, _max){
    var min = Math.min(_min, _max);
    var max = Math.max(_min, _max);
    return input>max ? max : (input<min ? min : input);
}
function flatten(arrr){
    var ret = [];
    for(var i=0; i<arrr.length; i++){
        if(Array.isArray(arrr[i])) ret = ret.concat(flatten(arrr[i]))
        else                       ret.push(arrr[i]);
    }

    return ret;
}
function map(input, inMin, inMax, outMin, outMax, exp){
    if(exp) return Math.pow((input-inMin)/(inMax-inMin), exp) *(outMax - outMin) + outMin;
    return ((input-inMin)/(inMax-inMin)) *(outMax - outMin) + outMin;
}
function lerp(curr, val1, val2){
    return map(curr, 0 , 1, val1, val2);
}
function includes(arrayOrStr, element){
    if(!arrayOrStr) return false;
    return arrayOrStr.indexOf(element) != -1;
}
function isNotEmpty(obj){
    for(var i in obj) if(obj[i]) return true;
    return false;
}
function roundTo(number, round){
    if(!round) return number;
    return Math.round(number/round) * round;
}
function isInRect(xPos, yPos, coor){    
    return  xPos >= coor[0] &&
            xPos <= coor[2] &&
            yPos >= coor[1] &&
            yPos <= coor[3]
    ;
}
function applyOwn(obj, func){
    if(obj == undefined) return;

    if(typeof obj[func] != "function") return;

    return obj[func].apply(obj, flatten(arrayfromargs(arguments).slice(2)));
}
function iterateApplyOwn(obj, func){
    if(obj == undefined) return;

    var ret = [];
    var params = arrayfromargs(arguments).slice(2);
    
    for(var i in obj){
        if(typeof obj[i][func] != "function") return;
        ret[i] = applyOwn(obj[i], func, params)
    }

    return ret;
}
function replaceHyphen(val){
    return val.toString().replace("-", "–");
}
function getMaxOfArray(arr, min){
    // return Math.max.apply(null, arr); //this breaks if the array has undefined/null vals
    
    var max = min!=undefined ? min : -Infinity;

    for(var i in arr) if(max < arr[i]) max = arr[i];
    
    return max;
}

function floarToStr(val, precision){
    return (precision != undefined ? parseFloat/*in case val is a string*/(val).toFixed(precision) : val) + "" ;
}

var deb = 0;
function debug(val){
    deb = val;
}

var EQ_ALPHA_SPECT_IS_FOCUS = 0.2;
var SPECT_ALPHA_NOT_FOCUS = 0.8;

function paint(){
    mg.redraw();
    outlet(0, "fps");

    if(!script.isOn) return;

    script.display();
    general.display();
    
    background.display();
    grid.display();

    analyzer.display(false);    //spect is not in focus mode
    filters.display();
    analyzer.display(true);     //spect is in focus mode
    
    grid.displayFreqScale();
    keyboard.display();
    grid.displayFreqScaleLine();

    cursorCoor.display();
    
    incandescent.display();
    
    background.drawBorder();
}

function onresize(_newW, _newH){
    var newW = _newW - script.getDispOffset()*2;
    var newH = _newH - script.getDispOffset()*2;

    var 
        xFact = newW/width,
        yFact = newH/height
    ;

    var botMargin = grid.getBottomMargin();
    var specialFact = (newH-botMargin)/(height-botMargin);
    
    width = newW;
    height =  newH;

    
    mg.resize(xFact, specialFact);
    u.resize(xFact, specialFact);
    grid.resize(xFact, specialFact);
    cursorCoor.resize();

    filters.resize(xFact, specialFact);
    keyboard.resize(xFact, yFact);
    incandescent.resize();
    
}

function onidle(_x, _y, isMousePressed, ctrl, shift, capslock, alt){
    if(ctrl && alt) return;                     //ableton drag navigation
    if(!general.getDeviceEnabled()) return;
    var x=_x-script.getDispOffset(), y=_y-script.getDispOffset();

    
    lastX = x;
    lastY = y;
    
    cursorCoor.idle(x, y);

    if( incandescent.idle(x,y, ctrl, shift, alt) ) return;
    if( keyboard.idle(x,y, ctrl, shift, alt) ) return;
    if( filters.idle(x,y, ctrl, shift, alt) ) return;
}

function onidleout(_x, _y, ctrl, shift, alt){
    if(!general.getDeviceEnabled()) return;
    var x=_x-script.getDispOffset(), y=_y-script.getDispOffset();
    
    cursorCoor.idleout();

    incandescent.idle(-1,-1);
    filters.idleout(x,y, ctrl, shift, alt);
    keyboard.idleout(x,y, ctrl, shift, alt);
}

var itemClicked = true;
var rightClick = false;
function onclick(_x, _y, isMousePressed, ctrl, shift, capslock, alt){
    if(ctrl && alt) return;
    
    if(!general.getDeviceEnabled()) return;
    
    if(script.isWind) outlet(0, "click");
    
    var x=_x-script.getDispOffset(), y=_y-script.getDispOffset();
    rightClick = max.ctrlkeydown;
    
    itemClicked = true;

    if( filters.click(x, y, ctrl, shift, alt, max.ctrlkeydown) ) return;
    if( incandescent.click(x, y, ctrl, shift, alt, max.ctrlkeydown) ) return;    
    if( general.click(x, y, ctrl, shift, alt, max.ctrlkeydown) ) return;
    if( keyboard.click(x, y, ctrl, shift, alt, max.ctrlkeydown) ) return;
    if( analyzer.click(x, y, ctrl, shift, alt, max.ctrlkeydown) ) return;
    
    itemClicked = false;// -> double click opens window
    
}

function ondblclick(x, y, isMousePressed, ctrl, shift, capslock, alt){
    if(ctrl && alt) return;
    if(!general.getDeviceEnabled()) return;

    filters.dbclick(x, y, ctrl, shift, alt, rightClick);

    if(ctrl || shift || capslock || alt || rightClick) return;
    if(script.isWind || itemClicked) return;
    
    outlet(0, "dbclick");
}

var lastX = 0,
    lastY = 0;
function ondrag(_x, _y, isMousePressed, ctrl, shift, capslock, alt){
    if(ctrl && alt) return;
    if(!general.getDeviceEnabled()) return;
    var x=_x-script.getDispOffset(), y=_y-script.getDispOffset();

    if(!isMousePressed){onrelease(x, y);return}

    lastX = x; lastY = y;
    
    cursorCoor.drag(x, y);

    if( keyboard.drag(x, y, ctrl, shift, alt, rightClick)      ) return;
    if( filters.drag(x, y, ctrl, shift, alt, rightClick)  ) return;
    if( analyzer.drag(x, y, ctrl, shift, alt, rightClick)  ) return;
    
    
}
function onrelease(_x, _y){
    if(!general.getDeviceEnabled()) return;
    var x=_x-2, y=_y-2;

    filters.release(x, y);
    analyzer.release();
}


function input(func){               applyOwn(this,         func, arrayfromargs(arguments).slice(1));}
function analyzerParams(func){      applyOwn(analyzer,     func, arrayfromargs(arguments).slice(1));}
function generalParams(func){       applyOwn(general,      func, arrayfromargs(arguments).slice(1));}
function incandescentParams(func){  applyOwn(incandescent, func, arrayfromargs(arguments).slice(1));}
function scriptParams(func){        applyOwn(script,       func, arrayfromargs(arguments).slice(1));}
function keyboardParams(func){      applyOwn(keyboard,     func, arrayfromargs(arguments).slice(1));}
function filterParams(func){        applyOwn(filters,      func, arrayfromargs(arguments).slice(1));}
function dcBlocker(state){filters.setDcBlocker(state);}


var cursorCoor = {
    
    doDisplay: false,
    
    posThresh: 10,

    cursorX: 0,
    cursorY: 0,
    cursorFreqStr: "",
    cursorGainStr: "",

    x: 16,
    bMargin: 34,
    tMargin: 10.8,
    interiorXMargin: 5,
    interiorYMargin: 8,

    dispMinHeight: 294,
    fontSize: 9,

    minRW: 70,
    rAlpha: 0.7,
    lineW: 0.5,

    rRound: 8,

    idle: function(x, y){
        this.cursorX = x;
        this.cursorY = y;
        this.calcFreqAndGain();
    },
    click: function(x, y){
        this.idle(x, y);
    },
    drag: function(x, y){
        this.idle(x, y);
    },
    idleout: function(){
        this.setDoDisplay(false);
    },
    setSpectScale: function(){
        this.calcFreqAndGain();        
    },
    setGainScale: function(){
        this.calcFreqAndGain();
    },

    windBigEnough: false,
    resize: function(){
        this.windBigEnough = height >= this.dispMinHeight;

        this.setDoDisplay(false, true);
        this.yF = height - this.bMargin - this.tMargin;
        this.yG = height - this.bMargin;

        this.rY = mg.floorPos(this.yF - this.interiorYMargin);
        this.rH = this.tMargin + this.interiorYMargin*2;
    },

    calcFreqAndGain: function(){
        if(!this.windBigEnough) return;
        
        if(!isInRect(
                this.cursorX,
                this.cursorY,
                [this.posThresh, this.posThresh, width-this.posThresh, height-this.posThresh]
            )){

            this.setDoDisplay(false);
            return;
        }
        this.setDoDisplay(true);
        
        var idledBandFreqAndGain = filters.getIdledBandFreqAndGain();
        this.freq   = idledBandFreqAndGain != null ? idledBandFreqAndGain[0] : u.posToFreq(this.cursorX, true);
        this.eqGain = idledBandFreqAndGain != null ? idledBandFreqAndGain[1] : u.posToGain(this.cursorY, true);
        this.spectGain = u.spectPosToGain(this.cursorY, true);
        
        this.formatCoors();
    },
    
    formatCoors: function(){
        this.cursorFreqStr = this.formatFreq(this.freq);
        this.cursorGainStr = this.formatGain(this.eqGain) + " | " + this.formatGain(this.spectGain);
    },

    display: function(){
        if(!this.windBigEnough) return;

        var active = 
            this.count < this.displayOffFrameCount &&
            script.isWind &&
            this.doDisplay
        ;
        var alphaFact = active ? 1 : 0.15;

        var maxTextWidth = Math.max(mg.text_measure(this.cursorFreqStr)[0], mg.text_measure(this.cursorGainStr)[0]);
        this.rW = Math.max(this.minRW, maxTextWidth+this.interiorXMargin*2);

        mg.rectangle_rounded(this.rX, this.rY, this.rW, this.rH, this.rRound, this.rRound);
        mg.set_source_rgba(colors.get("lcdBg", this.rAlpha * alphaFact));
        mg.fill_preserve();
        
        mg.set_line_width(this.lineW);
        mg.set_source_rgba(colors.get("gridCColor", alphaFact));
        mg.stroke();

        if(!active) return;

        if(this.isCounting) this.count++;

        mg.set_font_size(this.fontSize);
        mg.text_path_centered(this.x, this.yF, this.cursorFreqStr, "left", null, true);
        mg.text_path_centered(this.x, this.yG, this.cursorGainStr, "left", null, true);
        mg.set_source_rgba(colors.get("gridCColor"));
        mg.fill();
    },
    
    isFixedLen: false,
    formatFreq: function(val){
        var ret = "";
        ret =  val>=1000 ? floarToStr(val/1000, 2) + " kHz" : (~~(val) + " Hz");

        return ret + " | " + u.freqToNoteName(val);
    },
    formatGain: function(val){
        var ret = "";
        ret =  (val).toFixed(val<=-100 ? 0 : 1) + " dB";
        
        // ret = replaceHyphen(ret);
        
        return ret;
    },
    initialize: function(){
        this.resize();
        this.rX = mg.floorPos(this.x - this.interiorXMargin);
    },
    
    isCounting: false,
    count: 0,
    displayOffFrameCount: 30,
    setDoDisplay: function(state, force){
        if(force){
            this.doDisplay = state;
            return;
        }
        if(state){
            this.doDisplay = true;
            this.isCounting = false;
            this.count = 0;
        }
        else{
            this.isCounting = true;
        }

    },
};

function Filter(_name, type, freq, noOs){

    this.name = _name || "default";
    this.noOs = false;// noOs;

    this.type = type || "lowpass";
    this._type = this.type;

    this.N = 2;
    this._N = 2;
    this.isCheby = false;
    this.isCut = false;
    this.isSpecialCut = false;
    this.hasGainClipped = false;
    this.Q = 1;
    this._Q = 1;
    this.noQ = false;
    this.A = 1;
    this.gain = 0;
    this.adaptQ = false;

    this.angFreq = Math.PI/2 * (freq || 1000)/(this.noOs ? u.nyq : u.nyqOS);
    this.tanAngFreq = Math.tan(this.angFreq);

    this.osFact = 1;
    this.QIsGain = false;
    this.isSource = this.name=="source";
    
    this.initialize = function(){
        this.cutARange = [u.dBToSqrtAmp(-32), u.dBToSqrtAmp(32)];
        
        this.typeParams();
    };

    this.setType = function(type){
        this._type = type;

        this.paramChanged("type");
        this.paramChanged("casc");
        this.paramChanged("A");
        this.paramChanged("Q");

    };
    this.setN = function(n){
        this._N = n;
        this.paramChanged("type");
        this.paramChanged("casc");
        this.paramChanged("Q");
    };
    this.typeParams = function(changed){
        
        this.noQ = includes(this._type, "NoQ");
        
        this.type = this._type.replace(/Q$|NoQ$/, "");
        
        this.isCut = includes(["lowpass", "highpass", "bandpass", "bandpass2", "notch", "bandstop", "bandstop2"], this.type);
        
        this.hasBWCut = includes(["bandpass", "bandpass2", "notch", "bandstop", "bandstop2"], this.type);
        this.isBandpass = includes(["bandpass", "bandpass2"], this.type);
        this.isShelf = includes(["lowshelf", "highshelf"], this.type);
        
        this.QIsGain = !includes(this._type, "Q") && this.isCut;

        this.hasGainClipped = this.isCut && !this.isSource;
        
        this.isCheby = this._N > 8 && this.isCut;
        
        // this.hasAQ = includes(["bell", "lowshelf", "highshelf"], this.type);
        this.hasAQ = this.type == "bell";
        
        this.isSpecialCut = this.hasBWCut && !this.isCheby && !/2/.test(this.type);
    };

    this.getIsCut = function(){
        return this.isCut;
    };

    this.setW0 = function(w0){
        this.angFreq = w0;
        this.tanAngFreq = Math.tan(w0);
        this.paramChanged();
    };
    this.setFreq = function(freq){
        this.freq = freq;
        
        this.paramChanged("w0");
    };
    this.w0Params = function(){
        
        this.angFreq = Math.PI/2 * this.freq/(this.noOs ? u.nyq : u.nyqOS);
        this.tanAngFreq = Math.tan(this.angFreq);
    };
    this.setCasc = function(casc){
        this._N = casc*2;
        this.paramChanged("type");
        this.paramChanged("casc");
        this.paramChanged("Q");
    };
    this.cascParams = function(){
        this.N = this.isCut ? this._N : Math.min(32, this._N);
    };
    this.setQ = function(Q){        
        this._Q = Q;
        this.paramChanged("Q");
    };
    this.getQ = function(){
        return this.Q;
    };
    this.setAdaptQ = function(state){
        this.adaptQ = state;
        this.paramChanged("Q");
    };
    this.QParams = function(){
        
        if(this.noQ){
            this.Q = 1;
            return;
        }

        if(this.QIsGain){
            this.Q = this.A * this.A;
        }
        else if(this.adaptQ && this.hasAQ){
            this.Q = this._Q * this.AAbs;
        }
        else{
            this.Q = this._Q;
        }
        
        this.normalizeQ();
        
    };
    this.shelfMaxQ = 5;
    this.shelfExp = Math.log(this.shelfMaxQ)/Math.log(18);
    this.normalizeQ = function(){
        // return;
        // this.Q = Math.SQRT1_2;
        // this.Q = Math.SQRT2;
        
        //2 octaves for bell, 1 octave for BFF and BSF
        var wantedBW = 1;
        var wantedAmp = Math.SQRT1_2;
        
        var QNamalizingFact = 1/(2*Math.sinh(Math.LN2/2 * wantedBW));

        if(this.isShelf){
            this.Q = Math.pow(this.Q, this.shelfExp);
            return;
        }
        
        if(this.type == "bell"){
            // this.Q *= 1/(2*Math.sinh(Math.LN2/2 * wantedBW));
            // this.Q *= Math.SQRT1_2;
            this.Q *= 2/3;
            
            return;
            /*------------------------------------------------------------------------------------------
            Bell's Q:
            - Implemented: Q = Qin * 2/3
            - Special: Q = 1/(e^(ln(2)/Qin) - e^(-ln(2)/Qin)), from the BW to Q formula, with BW=2/Qin

            both give 2 octaves for Q=1, but the special precisely doubles when Q halves
            and vice versa, it's a bit of a pain to implement tho
            --------------------------------------------------------------------------------------------*/
        }

        if(!this.hasBWCut){
            return;
            // this.Q *= Math.SQRT1_2;
            // this.Q  = 1;
        }


        if(!this.isSpecialCut){
            this.Q *= QNamalizingFact;
            return;
        }
        
        //maybe REFACTOR THIS!!!
        var G = Math.pow(wantedAmp, 1/(this._N/2));
        var wf2 = Math.pow(2, wantedBW); //(2^(BW/2))^2
        
        var normFact = wf2/(wf2*wf2 - 2*wf2 + 1);
        var BPFFact = Math.sqrt(normFact * (1/(G*G) - 1));
        
        var common = wf2*wf2 - 2*wf2 + 1;
        var BSFFact = Math.sqrt(wf2/(common/(G*G) - common));

        this.Q *= this.isBandpass ? BPFFact : BSFFact;
    },
    this.setGain = function(gain){
        this.gain = gain;
        this.paramChanged("A");
        this.paramChanged("Q");
    };
    
    this.AParams = function(changed){
        this.A = Math.sqrt(u.dBToAmp(this.gain));
        
        // if(this.hasBWCut) this.A = u.clip(this.A, this.cutARange[0], this.cutARange[1]); //initially only affecting the BPF and BSF
        if(this.hasGainClipped) this.A = u.clip(this.A, this.cutARange[0], this.cutARange[1]);    //but decided to include the LPF and HPF fro better filter stability with fast FM
        
        this.AAbs = Math.sqrt(u.dBToAmp(Math.abs(this.gain)));
    };

    this.setCalcPhase = function(state){
        this.doCalcPhase = state;
        this.paramChanged();
    };
    this.setSr = function(){
        // this.paramChanged();
    };
    this.setOsFact =function(fact){
        if(this.isNoOs) return;
        this.osFact = fact;
        // this.paramChanged();
    };

    this.paramChanged = function(param, change){
        this.changed[param || "_default"] = change || true;
    };
    this.recalc = function(){
        this.paramChanged();
    };
    
    this.changed = {};
    this.refreshFirst = ["type", "casc", "A", "Q"];
    this.refresh = function(){
        if(!isNotEmpty(this.changed)) return;
        
        for(var i in this.refreshFirst) if(this.changed[this.refreshFirst[i]]){
            this.refreshParam(this.refreshFirst[i]);
            delete this.changed[this.refreshFirst[i]];
        }
        
        for(var i in this.changed) this.refreshParam(i);
        
        
        this.calcResp();
        this.changed = {};
        
        return true;
    };
    this.refreshParam = function(parName){
        if(typeof this[parName+"Params"] == "function") this[parName+"Params"](this.changed[parName]);
    };
    
    this.resp = [];
    this.calcResp = function(){
        this.resp = [];

        
        var max = 0;
        var min = 1000;
        var maxIndex = 0;
        var minIndex = 0;
        
        for(var i in u.logTable){
            // var w = u.logTable[i].w / this.angFreq;
            var w = u.logTable[i].tanW / this.tanAngFreq; //with frequency warping : H( tan(w/2) / tan(w0/2) )
            
            this.resp[i] = this.getFilterResp(w, this.N, this.A, this.Q, this.doCalcPhase);
            
            
            if(max<this.resp[i]){
                max = this.resp[i];
                maxIndex = i;
            }
            if(min>this.resp[i]){
                min = this.resp[i];
                minIndex = i;
            }
        }
        if(this.angFreq > u.wProjectNyq) return;

        var minMaxArr = minMax[this.type](this.N, this.A, this.Q, this.doCalcPhase);

        if((minIndex!=0) && (minMaxArr[0]!=null)) this.resp[minIndex] = minMaxArr[0];
        if((maxIndex!=0) && (minMaxArr[1]!=null)) this.resp[maxIndex] = minMaxArr[1];
    };
    this.getFilterResp = function(w, N, A, Q, doCalcPhase){
        if(this.isCheby) return cheby2[this.type](w, N, A, Q, doCalcPhase)
        else             return butter[this.type](w, N, A, Q, doCalcPhase);
    };

    this.initialize();
}


function Band(n, freq){

    this.n = (n || n===0) ? n : -1;

    this.x = 50;
    this.y = u.zeroDBPos;
    this.y0 = 50;
    this.diam = 16;
    this.arrowDiam = 20;
    this.edgeMargin = 16;

    this.grCueRadius = (10+this.diam)/2;
    this.isIdled = false;

    this.freq = freq || 250;
    this.Q = 1;
    this.gain = 0;
    this.type = 0;
    this.typeName = "lowshelf";
    this.N = 2;
    this.stopbandAtten = 144;
    this.pan = "Stereo";
    
    this.scale = {glo: 1, gr: 1};
    // this.clip = {min: -24, max: 24};
    this.clip = {min: -32, max: 32};
    this.gainOffset = 0;
    this.freqOffsetFact = 1;

    this.ratio = 1;
    this.ratioAng = Math.atan2(this.ratio,1);
    this.threshold = 0;
    this.thresholdPos = u.zeroDBPosSpect;
    
    this.attackTime = 40;
    this.releaseTime = 100;
    
    this.isOn      = false;
    this.isDynamic = false;
    this.gr = 0;
    this.isSourceOn =   false;
    this.isSourceFree = false;

    this.calcPhase = false;
    this.resp = [];

    this.mainFilter = new Filter("main",    "bell");
    this.dynaFilter = new Filter("dynamic", "bell");
    this.sourFilter = new Filter("source",  "bandpass2", 1000, true);
    
    
    this.insertHere = function(x, y, typeName){
        if(this.isOn) return false;
        this.prevX = x;
        this.prevY = y;
        
        this.enable();
        this.isIdled = true;


        this.setTypeName(typeName, true);
        this.setPanIndex(0, true);
        this.setCasc(1, true);
        this.setQ(1, true);
        this.setAdaptQ(0, true);
        this.moveTo(x, y);

        this.setHasKeytrack(false);
        this.setHasAdsr(false);

        this.setHasGr(0, true);
        this.setThreshNoDisp(0, true);
        this.setRatioNoDisp(2, true);
        this.setAttackTime(40, true);
        this.setReleaseTime(100, true);
        
        this.source_setIsOn(0, true);
        this.source_setTypeIndex(0, true);
        this.source_setCasc(1, true);
        this.source_setFreq(1000, true);
        this.source_setGain(0, true);
        
        this.paramChanged("resetSettings")
        
        return true;
    };
    // this.setAndOutputFreq()

    this.resetSettingsParams = function(){//this must be inside the refresh()
        outlet(0, "ui", "filterParams", "setBand", this.n, "resetParams");
    };

    this.getPan = function(){
        return this.pan;
    };
    this.getIndex = function(){
        return this.pan;
    };

    this.initialize = function(){
        this.paramChanged("freq", {freq: this.freq});
        this.paramChanged("gain", {gain: this.gain});
        this.paramChanged("Q", {Q: this.Q});
        this.positionParams();
    };

    this.xFact = 1; this.yFact = 1;
    this.resize = function(xFact,yFact){
        this.xFact *= xFact;
        this.yFact *= yFact;
        
        this.x *= xFact;
        this.y *= yFact;
        this.thresholdPos *= yFact;
        // this.y0 *= yFact;
        this.positionParams();
    };

    this.display = function(){
        if(!this.isOn) return;
        var allBandsThresholds = arrayfromargs(arguments);
        
        this.drawGrCue();
        this.drawKtCue();
        this.drawGrParams(allBandsThresholds);
        this.drawHandle();
        this.drawAxisMovCue();
    };
    this.isOffScreen = false;

    this.drawHandle = function(){

        if(!this.isOffScreen) mg.circle_centered(this.x, this.y, this.diam)
        else                  mg.eqtri_centered(this.x, this.y0, this.arrowDiam, this.arrowDir);
        
    
        mg.set_source_rgba(this.isIdled || this.isEnclosed ? colors.get(this.getHandColorName()) : colors.get("lcdBg", 0.7));
        mg.fill_preserve();
        
        mg.set_source_rgba(colors.get(this.getHandColorName()));
        mg.set_line_width(1);
        mg.stroke();
        
        var bandText = this.isXAxisHL ? "↔" : this.isYAxisHL ? "↕" : (this.n+1) + this.panHandText;

        mg.set_font_size(this.isAxisCueIdled ? 14 : 9);
        mg.select_font_face("Ableton Sans" + (this.isAxisCueIdled ? "Bold" : "Medium"));
        
        mg.text_path_centered(this.x, this.y0+(this.isAxisCueIdled ? -0.5 : 0.5), bandText);
        
        mg.set_source_rgba(colors.get(this.getHandTextColorName()));
        mg.fill();
    };

    this.axisMovCueDiam = 3;
    this.drawAxisMovCue = function(){
        if(!this.isOn) return;
        
        
        mg.circle_centered(this.x, this.yAxisMov, this.axisMovCueDiam);

        mg.set_source_rgba(colors.get(this.getHandColorName()));
        mg.fill_preserve();
        mg.stroke();

    };

    this.isAxisCueIdled = false;
    this.isXAxisHL = false;
    this.isYAxisHL = false;
    this.idleAxisMovCue = function(x, y, ctrl, shift, alt, rClick){
        if(!this.isOn) return;
        var hlThresh = 0.7;
        
        this.setAxisMov(
            this.isIdled && ( this.isOffScreen && this.arrowDir ?
                y<this.y0 - (this.diam/2) * hlThresh:
                y>this.y0 + (this.diam/2) * hlThresh
            ),
            alt
        );
    };
    this.setAxisMov = function(state, dir){
        this.isAxisCueIdled = state;
        this.setAxisMovCueDir(dir);
        this.lastAxisCueIdled = this.isAxisCueIdled;
    };
    this.dragAxisMovCue = function(x, y, ctrl, shift, alt, rClick){
        this.isAxisCueIdled = !rClick && this.lastAxisCueIdled;
        this.setAxisMovCueDir(alt);
    };
    
    this.setAxisMovCueDir = function(dir){          //1 is vertical, 0 is horizontal
        this.isXAxisHL = !dir && this.isAxisCueIdled;
        this.isYAxisHL =  dir && this.isAxisCueIdled;
    },
    this.getIsAxisCueIdled = function(){return this.isAxisCueIdled};
    this.getIsXAxisHL = function(){return this.isXAxisHL};
    this.getIsYAxisHL = function(){return this.isYAxisHL};

    this.getHandColorName = function(){
        return (this.isSourceMonitored ? "green" : this.isMonitored ? ((this.pan=="Stereo"||this.pan=="R")?"LResp":this.pan+"Resp") : "lcd");
    };
    this.getHandTextColorName = function(){
        return this.isIdled || this.isEnclosed ? "lcdBg" : this.isSourceMonitored ? "green" : this.getHandColorName();
    };

    this.drawKtCue = function(){
        if(!this.hasKeytrack && !this.hasAdsr) return;

        var ktCurDist = 12;
        var ktCurRadi = 3;

        if(this.hasKeytrack){
            mg.circle_centered(this.x+ktCurDist, this.y0, ktCurRadi);
            mg.circle_centered(this.x-ktCurDist, this.y0, ktCurRadi);
            
            mg.set_source_rgba(colors.get(this.getHandColorName()));
            mg.fill();
        }
        
        if(this.canHaveGM && this.hasAdsr){
            mg.circle_centered(this.x+(ktCurDist-4), this.isOffScreen ? this.yGR : (this.y0+10), ktCurRadi);
            mg.circle_centered(this.x-(ktCurDist-4), this.isOffScreen ? this.yGR : (this.y0+10), ktCurRadi);
    
        // mg.set_source_rgba(colors.get(this.canHaveGM ?  this.getHandColorName() : "offResp"));
            mg.set_source_rgba(colors.get(this.getHandColorName()));
            mg.fill();
        }
    };

    this.grParamsDispTime = 16; //8; //in frames
    // this.grParamsDispTime = 100; //8; //in frames
    this.doDispGrParams = false;
    this.grParamsCount = 0;
    this.displayedGrParam = "thresh";
    
    this.grParamsLineW = 1.5,//2,//1.5;
    this.drawGrParams = function(allBandsThresholds){
        if(this.noGrParams){
            this.noGrParams = false;
            this.setDispGrParams(false);
            return;
        }

        if(!this.doDispGrParams) return;
        
        this.drawThresh(allBandsThresholds);
        this.drawRatio();
        
        mg.set_line_width(this.grParamsLineW);
        // mg.set_source_rgba(colors.get(this.canHaveGM ?  "green" : "offResp"));
        mg.set_source_rgba(colors.get("green"));
        mg.stroke();
            
        // post(this.stillDraggingDynamic);
        if(!this.stillDraggingDynamic) this.grParamsCount++;
        if(this.grParamsCount>=this.grParamsDispTime) this.setDispGrParams(false);
    };
    this.drawThresh = function(allBandsThresholds){
        // if(this.displayedGrParam!="thresh") return;
        var textPos = this.thresholdPos-6;

        var otherBandsThresh = allBandsThresholds.slice();
        otherBandsThresh.splice(this.n, 1);

        var manyFlag = this.isEnclosed && includes(otherBandsThresh, this.threshold);
        if(manyFlag && this.n != otherBandsThresh.lastIndexOf(this.threshold)) return;
        
        // var textW = 8;
        // var textH = 16;
        // mg.rectangle(width-textW, textPos-textH/2, textW, textH),
        // mg.set_source_rgba(colors.get("lcdBg"));
        // mg.fill();

        mg.set_font_size(9);
        mg.text_path_centered(width-2, textPos, manyFlag ? "m" : this.n+1, "right");
        mg.set_source_rgba(colors.get("green"));
        mg.fill();

        mg.set_line_width(this.grParamsLineW);
        mg.seg_line(0, this.thresholdPos, width, this.thresholdPos, 12, 0.5, false);
    };

    this.getThresh = function(){
        return this.isEnclosed && this.hasGr && this.canHaveGM ? this.threshold : undefined;
    };
    
    this.drawRatio = function(){
        if(this.displayedGrParam!="ratio") return;
        // var _radius = 400;
        var _radius = width + height;
        var distX =  _radius * Math.cos(this.ratioAng);
        var distY = -_radius * Math.sin(this.ratioAng);

        var kneeEndY = this.ratioNorm == 1 ? this.thresholdPos : this.thresholdPos-u.kneeW/this.ratio;

        mg.line(this.x-_radius, this.thresholdPos+_radius, this.x-u.kneeW, this.thresholdPos+u.kneeW);
        mg.curve_to(this.x, this.thresholdPos, this.x, this.thresholdPos, this.x+u.kneeW, kneeEndY);
        mg.line(this.x+u.kneeW, kneeEndY, this.x+distX,   this.thresholdPos+distY);

        // mg.seg_line(this.x, 0, this.x, height);
    };
    
    this.noGrParams = false;
    this.tameDispGrParams = function(){ 
        this.noGrParams = true;
    };
    this.setDispGrParams = function(state, param){
        if(state && !script.getState()) return;
        // post("\n", this.n, state);

        this.displayedGrParam = param || "thresh";
        this.doDispGrParams = state && this.isOn && this.canHaveGM && this.hasGr;
        this.grParamsCount = 0;
    };
    

    this.drawGrCue = function(){
        if(!(this.canHaveGM && this.hasGr)) return;
        var len = 0.35;
        var endAng = Math.PI*len/2;
        var startAng = -endAng;
        

        if(!this.isOffScreen) mg.arc(this.x, this.y, this.grCueRadius, Math.PI/2 + startAng, Math.PI/2 + endAng)
        else                  mg.line(this.x-8, this.yGR, this.x+8, this.yGR);

        mg.set_line_width(1.2);
        mg.set_line_cap("round");
        // mg.set_source_rgba(colors.get(this.canHaveGM ?  this.getHandColorName() : "offResp"));
        mg.set_source_rgba(colors.get(this.getHandColorName()));
        mg.stroke();
    };

    
    this.isMonIdled = false;
    this.displayMonitorHandle = function(){
        if(!this.isOn) return;
        
        hpIcon.draw(this.x, this.yMon, 10, colors.get((this.isMonIdled && !this.isMonitored && !this.isSourceMonitored) ? (includes(["Stereo", "L", "R"], this.pan) ? "lcdAlt" : this.pan+"Resp") : this.getHandColorName()));
    };
    
    this.idle = function(x, y, ctrl, shift, alt){
        if(!this.isOn) return;

        this.isIdled = this.isInSquare(x, y, this.x, this.y0, this.diam+4);
        
        this.idleAxisMovCue(x, y, ctrl, shift, alt);

        return this.isIdled || this.isMonIdled;
    };
    this.setIsIdled = function(state){
        this.isIdled = state;
    };
    this.idleMonitor = function(x, y, ctrl, shift, alt){
        this.isMonIdled = this.isInSquare(x, y, this.x, this.yMon, 10);
    };

    this.isInSquare = function(xPos, yPos, x, y, halfW){ //square
        return (
                xPos > x-halfW/2
            &&  xPos < x+halfW/2
            &&  yPos > y-halfW/2
            &&  yPos < y+halfW/2
        );
    };
    this.isEnclosed = false;
    this.prevIsEnclosed = false;
    this.enclose = function(coor, doToggle){
        if(!this.isOn) return;
        var inRect = 
            this.x > coor[0] &&
            this.x < coor[2] &&
            this.y0 > coor[1] &&
            this.y0 < coor[3]
        ;

        if(!doToggle){
            this.isEnclosed = inRect;
        }
        else{
            this.isEnclosed = inRect ? !this.prevIsEnclosed : this.prevIsEnclosed;
        }
        
        return this.isEnclosed;
        
    };
    this.resetIdled = function(){
        this.isIdled = false;    
        this.isMonIdled = false;

        this.isAxisCueIdled = false;
        this.isXAxisHL = false;    
        this.isYAxisHL = false;    
    };
    this.resetEnclosed = function(){
        this.prevIsEnclosed = false;
        this.isEnclosed = false;
    };
    this.releaseEnclosure = function(){
        this.prevIsEnclosed = this.isEnclosed;
    };
    this.getIsIdled = function(noMon){
        if(noMon) return this.isIdled;
        return this.isIdled || this.isMonIdled;
    };
    this.getMonIsIdled = function(){
        return this.isMonIdled;
    },
    this.getIsEnclosed = function(){
        return this.isEnclosed;
    };

    this.stillDraggingDynamic = false;
    this.prevX = 0;
    this.prevY = 0;
    this.lastGain = 1;
    this.click = function(x, y, ctrl, shift, alt, rClick){
        this.prevX = this.x;
        this.prevY = this.y;

        if(!this.isOn) return;

        this.stillDraggingDynamic = true;
        this.lastGain = this.gain;
        
        if(!(this.isIdled || this.isMonIdled || this.isEnclosed)){
            return;
        }


        if(ctrl && !shift){
            if(rClick && !this.isMonIdled){
                this.toggleHasGr();
                return true;
            }
            // if(alt){
            //     this.paramChanged("adaptQ", {adaptQ:!this.adaptQ, output:true});
            //     return true;
            // }

            // this.disable();
            return true;
        }
        

        if(rClick && !(ctrl && shift)){
            this.setDispGrParams(true, alt ? "ratio" : "thresh");
            return true;
        }
        
        return true;
    };
    this.undoDragMovement = function(){
        if(!this.isOn) return;
        if(!(this.isIdled || this.isMonIdled || this.isEnclosed)) return;
        
        
        this.moveTo(this.prevX, this.prevY);
    };

    this.release = function(){
        this.stillDraggingDynamic = false;
    };


    this.isSourceMonitored = false;
    this.isMonitored = false;
    this.monitor = function(state, mode){        
        this.isMonitored =       state && !mode ? true : false;
        this.isSourceMonitored = state &&  mode ? true : false;
    };

    this.relDrag = function(dX, dY, ctrl, shift, alt, rClick, specDX, specDY, gainFact){
        if(!this.isOn) return;
        
        if(!(this.isIdled || this.isMonIdled || this.isEnclosed)) return;

        
        if(rClick){
            // if(this.isIdled)
            this.moveDynamic(dX, dY, ctrl, shift, alt);
            return;
        }

        return this.move(dX, dY, ctrl, shift, alt, rClick, specDX, specDY, gainFact);
    };

    this.moveDynamic = function(dX, dY, ctrl, shift, alt){
        if(!(this.canHaveGM && this.hasGr)) return;

        // this.setDispGrParams(true, alt ? "ratio" : "thresh");
        
        if(alt){
            this.ratioNorm = u.clip(this.ratioNorm-dY*0.01 , 0, 1);   
            this.paramChanged("ratio",{ratioNorm:this.ratioNorm, output:true});
        }
        else{
            this.thresholdPos = u.clipBandThreshPos(this.thresholdPos+dY);
            this.paramChanged("threshold", {thresholdPos:this.thresholdPos, output:true});
        }
    };

    this.move = function(dX, dY, ctrl, shift, alt, rClick, specDX, specDY, gainFact){
        if(alt && !ctrl){
            this.QNorm = u.clip(this.QNorm - 0.01* dY, 0, 1),
            this.paramChanged("Q", {QNorm: this.QNorm, output: true});
            return;
        }
        
        if(gainFact){
            this.gainFactMove(specDX, gainFact);
            return;
        }

        this.moveTo(
            specDX != undefined ?  this.prevX + specDX : this.x + dX,
            specDY != undefined ?  this.prevY + specDY : this.y + dY
        );
        
        return [this.x - this.prevX, Math.abs(this.lastGain)<=1 ? 0 : u.posToGain(this.y, true) / this.lastGain];  //returns [specDX, gainFact]
    };

    this.gainFactMove = function(dX, gainFact){
        this.x    = u.clipBandX(this.prevX + dX);
        this.gain = u.clipBandGain(this.lastGain * gainFact);
        // post(gainFact);

        this.paramChanged("freq", {x:    this.x    , output: true});
        this.paramChanged("gain", {gain: this.gain , output: true});
        this.positionParams();
    };

    this.moveTo = function(x, y){
        this.x = u.clipBandX(x);
        this.y = u.clipBandY(y);

        this.paramChanged("freq", {x: this.x, output: true});
        this.paramChanged("gain", {y: this.y, output: true});
        this.positionParams();
    };

    this.positionParams = function(){

        var bottomEdge = grid.getBottomEdge();

        this.isOffScreen = this.y<=0 || this.y>=bottomEdge;
        this.arrowDir = this.y>0;
        
        this.y0 = !this.isOffScreen ? this.y : u.clip(this.y, this.edgeMargin, bottomEdge-this.edgeMargin);
        
        this.yMon = this.y0 - 15 *(this.arrowDir ? 1 : -1);
        if(this.yMon<0) this.yMon = this.y0 + 20;
        

        this.yGR = this.y0 + 10  *(!this.arrowDir ? 1 : -1);
        
        this.yAxisMov = this.y0 + (/*up or down*/this.isOffScreen && this.arrowDir ? -1 : 1) * (/*circle or triangle*/this.isOffScreen ? this.arrowDiam/3.33 : this.diam/2);
    };

    this.isOsPerband = true;
    this.osParams = function(changed){
        this.isOsPerband = changed.mode;

        this.mainFilter.setOsFact(changed.fact);
        this.dynaFilter.setOsFact(changed.fact);

        this.freqParams({freq: this.inputFreq || this.freq}); //maybe I'll refactor this at some point
        this.dynamicFreqParams({dynamicFreq: this.dynamicFreq || this.freq});
        this.sourceParamsFree({freq:true});
        
    };
    this.setOversampling = function(fact, mode){
        this.paramChanged("os", {fact: fact, mode:mode});
    };
    this.setSr = function(){
        this.paramChanged("sr");
    };
    this.srParams = function(){
        this.sourFilter.paramChanged("w0");

        this.freqParams({});
        this.dynamicFreqParams({dynamicFreq: this.dynamicFreq});
        // this.refreshDynaParams(true);
        
        this.recalcXPos();
    };

    this.recalcXPos = function(){
        this.x = u.freqToPos(this.freq, true);
    };
    this.recalcYPos = function(){
        this.y = u.gainToPos(this.gain, true);
        this.positionParams();
    };
    this.refreshPos = function(){
        this.positionParams();
    };
    this.recalcSpectPos = function(){
        this.thresholdPos = u.spectGainToPos(this.threshold, true);
    }
    
    this.freqFact = 1;
    this.freqDyn = 1000;
    this.setFreq = function(f, doOutput){
        this.paramChanged("freq", {freq: f, output:doOutput})
    };
    // this.setFreqFact = function(freqFact){this.paramChanged("freq",{freqFact: freqFact}) };
    // this.setFreqDyn = function(freqDyn){this.paramChanged("freq",{freqDyn: freqDyn}) };
    this.freqFactParams = function(changed){
        this.freqFact = changed.freqFact;
        this.dynaFilter.setW0(this.angFreq*this.freqFact);
    };
    this.dynamicFreq = this.freq;
    this.dynamicFreqParams = function(changed){
        if(!this.hasKeytrack) return;

        this.dynamicFreq = changed.dynamicFreq || this.freq;
        
        // if(this.dynamicFreq==-1){
        //     this.dynaFilter.setW0(this.angFreq);
        //     return;
        // }
        
        this.dynamicW0 = Math.PI/2 * u.clipBandFreq(this.dynamicFreq)/u.nyqOS;
        this.dynaFilter.setW0(this.dynamicW0);

    };
    // this.inputFreq = 40;
    this.freqParams = function(changed){

        if(changed.freq != undefined){
            this.inputFreq = changed.freq;
            this.x = u.clipBandX(u.freqToPos(this.inputFreq, true));
        }
        if(changed.x != undefined){
            this.inputFreq = u.posToFreq(changed.x/this.xFact);
        }

        this.freq = u.clipBandFreq(this.inputFreq);
        this.angFreq = Math.PI/2 * u.clipBandFreq(this.freqOffsetFact * this.freq)/u.nyqOS;   
        this.mainFilter.setW0(this.angFreq);
        
        // if(!this.hasKeytrack || this.dynamicFreq==-1) this.dynaFilter.setW0(this.angFreq);
        if(!this.hasKeytrack){
            this.dynaFilter.setW0(this.angFreq);
            this.dynamicFreq = this.freq;
        }

        this.sourceParamsFollow({freq:true});
        
        if(changed.output){
            this.outputParams("freq");
        }
    };

    this.setGain = function(g){
        this.paramChanged("gain", {gain: g});
    };
    this.setGr = function(gr){
        // post(this.n, gr);
        this.paramChanged("gain", {gr: gr});
    };
    this.grParams = function(changed){
        this.gr = changed.gr;
        if(!this.getGainIsDynamic()) return;
        this.dynaFilter.setGain(this.getProcessedGain(this.gain + this.gr*this.scale.gr));
    };
    this.gainParams = function(changed){
        
        if(changed.gain || changed.gain===0){
            this.gain = u.clipBandGain(changed.gain);
            this.y = u.gainToPos(this.gain, true);
            // this.y = u.clipBandY(u.gainToPos(changed.gain, true));
        }
        if(changed.y || changed.y===0){
            this.gain = u.posToGain(changed.y, true);
        }
        
        this.gainScaledClipped = this.getProcessedGain(this.gain)
        this.gainScaledClippedDyn = this.getProcessedGain(this.gain + this.gr*this.scale.gr);

        this.mainFilter.setGain(this.gainScaledClipped);
        this.dynaFilter.setGain(this.getGainIsDynamic() ? this.gainScaledClippedDyn : this.gainScaledClipped);
        // post(this.gr);

        this.positionParams();
        this.sourceParamsFollow({gain:true});
        
        if(changed.output) this.outputParams("gain");
    };
    this.getProcessedGain = function(gain){// offset -> scale -> clip
        return u.clip(this.scale.glo * (gain + this.gainOffset), this.clip.min, this.clip.max);
    };

    this.mainTypesList = ["bell", "lowshelf", "highshelf", "lowpass", "highpass", "bandpass", "bandstop"];
    this.setTypeName = function(typeName, output){this.paramChanged("type", {typeName: typeName, output:output})};
    this.setType = function(t, output){ this.paramChanged("type", {type: t, output:output})};
    this.typeParams = function(changed){
        if(changed.type || changed.type===0){
            this.type = changed.type;
            this.typeName = this.mainTypesList[this.type];
        }
        if(changed.typeName){
            this.typeName = changed.typeName;
            this.type = this.mainTypesList.indexOf(this.typeName);
        }
        
        this.mainFilter.setType(this.typeName);
        this.dynaFilter.setType(this.typeName);
        this.sourceParamsFollow({type:true});
        this.canHaveGMParams();

        if(changed.output) this.outputParams("type");
    };
    this.getCanMoveY = function(){
        return !this.isMonitored;
        // return this.isMonitored && this.type<5;
    };
    this.getIsCut = function(filter){
        if(filter=="main") return this.mainFilter.getIsCut();
        if(filter=="sour") return this.sourFilter.getIsCut();
    };
    this.getMaxOrder = function(){
        if(this.typeName=="bell") return 2;
        if(this.getIsCut("main")) return 64;
        return 32;
    };
    this.getFreqAndGain = function(){
        return [this.freq, this.gain];
    };
    
    this.setCasc = function(casc, output){        
        this.paramChanged("casc", {casc:casc, output:output});
    };
    this.cascParams = function(changed){
        if(changed.casc != undefined){
            this.casc = changed.casc;
            this.N = this.casc*2;
            this.mainFilter.setN(this.N);
            this.dynaFilter.setN(this.N);
        }
        
        this.canHaveGMParams();
        if(changed.output) this.outputParams("N");
    };

    this.setQ = function(q, output){ this.paramChanged("Q", {Q: q, output: output}) };
    this.QParams = function(changed){
        if(changed.Q){
            this.Q = changed.Q;
            this.QNorm = u.map(this.Q, 0.1, 18, 0, 1, 0.25);
        }
        if(changed.QNorm || changed.QNorm===0){
            this.QNorm = changed.QNorm;
            this.Q = u.map(this.QNorm, 0, 1, 0.1, 18, 4);            
        }

        
        this.mainFilter.setQ(this.Q);
        this.dynaFilter.setQ(this.Q);
        this.sourceParamsFollow({Q:true});

        if(changed.output) this.outputParams("Q");
    };
    this.setAdaptQ = function(state, output){
        this.paramChanged("adaptQ", {adaptQ: state, output: output});
    };
    this.adaptQParams = function(changed){
        if(typeof changed.adaptQ != "undefined") this.adaptQ = changed.adaptQ;

        this.mainFilter.setAdaptQ(this.adaptQ);
        this.dynaFilter.setAdaptQ(this.adaptQ);

        if(changed.output){
            this.outputParams("adaptQ");
        }
    };

    this.setThreshold    = function(thresh)        {this.setThresh(thresh)};
    this.setThresh       = function(thresh)        {this.paramChanged("threshold", {threshold:thresh}); /*this.setDispGrParams(true);*/};
    this.setThreshNoDisp = function(thresh, output){this.paramChanged("threshold", {threshold:thresh, output: output});};
    this.thresholdParams = function(changed){
        if(changed.thresholdPos){
            this.threshold = u.spectPosToGain(this.thresholdPos, true);
            this.setDispGrParams(true, "thresh");
        }
        
        if(changed.threshold != undefined &&  changed.threshold!=this.threshold){
            this.threshold = changed.threshold;
            this.thresholdPos = u.spectGainToPos(this.threshold, true);
            
            this.setDispGrParams(true, "thresh");
        }

        // this.roundedThrePos = this.n == 0 ? mg.floorPos(this.thresholdPos) : this.thresholdPos;

        if(changed.output) this.outputParams("threshold");
    };

    this.ratioNorm = 0.5;

    this.setRatioNorm   = function(ratioNorm)    {this.paramChanged("ratio", {ratioNorm:ratioNorm})};
    this.setRatio       = function(ratio)        {this.paramChanged("ratio", {ratio:ratio}); /*this.setDispGrParams(true, "ratio");*/};
    this.setRatioNoDisp = function(ratio, output){this.paramChanged("ratio", {ratio:ratio, output: output});};
    this.ratioParams = function(changed){
        if(changed.ratioNorm){
            this.ratio = u.ratioNormToVal(this.ratioNorm);
            this.setDispGrParams(true, "ratio");
        }
        if(changed.ratio != undefined && changed.ratio != this.ratio){
            this.ratio = changed.ratio;
            this.ratioNorm = u.ratioValToNorm(this.ratio);
            
            this.setDispGrParams(true, "ratio");
        }
        

        this.ratioAng = this.ratioNorm==1 ? 0 : Math.atan2(1, this.ratio);

        if(changed.output){
            // this.outputParams("ratioNorm");
            this.outputParams("ratio");
        }
    };
    this.setAttackTime = function(val, output){this.paramChanged("attackTime", {attackTime:val, output: output});};
    this.setReleaseTime = function(val, output){this.paramChanged("releaseTime", {releaseTime:val, output: output});};
    this.attackTimeParams = function(changed){
        if(changed.attackTime || changed.attackTime===0) this.attackTime = changed.attackTime;
        if(changed.output) this.outputParams("attackTime");
    };
    this.releaseTimeParams = function(changed){
        if(changed.releaseTime || changed.releaseTime===0) this.releaseTime = changed.releaseTime;
        if(changed.output) this.outputParams("releaseTime");
    };

    //-----------SOURCE-----------------

    this.sourceInput = function(target/*filter, gain...*/, func){
        if(target != "filter") return;
        var params = arrayfromargs(arguments).slice(2);
        if(typeof this["source_"+func] == "function") this["source_"+func].apply(this, params);
    };

    this.source_isOn = false;
    this.source_free = false;
    this.source_typeIndex = 0;
    this.source_typeName = "follow";
    this.source_casc = 2;
    this.source_freq = 1000;
    this.source_Q = 1;
    this.source_gain = 0;

    this.source_setIsOn = function(state, output){
        this.source_isOn = state;
        this.paramChanged("source_isOn", {output:output});
    };
    this.source_isOnParams = function(changed){
        this.sourceOnChanged = true;
        // this.sourceParams();
        if(changed.output) this.outputParams("source_isOn");
    };

    this.source_setCasc = function(casc, output){
        this.source_casc = casc;
        this.paramChanged("source_casc", {output:output});
    };
    this.source_cascParams = function(changed){
        // this.sourceParams();
        this.sourFilter.setCasc(this.source_casc);
        if(changed.output) this.outputParams("source_casc");
    };

    this.source_setTypeIndex = function(type, output){
        this.source_free = type!=0;
        this.source_typeIndex = type;
        this.paramChanged("source_type", {output:output});
    };
    this.source_typeParams = function(changed){
        this.sourceParams({free:true,type:true});
        if(changed.output) this.outputParams("source_typeIndex");
    };
    this.source_setFreq = function(freq, output){
        this.source_freq = freq;
        this.paramChanged("source_freq", {output:output});
    };
    this.source_freqParams = function(changed){
        this.sourceParamsFree({freq:true});
        if(changed.output) this.outputParams("source_freq");
    };

    this.source_setGain = function(gain, output){
        this.source_gain = gain;
        this.paramChanged("source_gain", {output:output});
    };
    this.source_gainParams = function(changed){
        this.sourceParamsFree({gain:true});
        if(changed.output) this.outputParams("source_gain");
    };
    this.source_setQ = function(Q, output){
        this.source_Q = Q;
        this.paramChanged("source_Q", {output:output});
    };
    this.source_QParams = function(changed){
        this.sourceParamsFree({Q:true});
        if(changed.output) this.outputParams("source_Q");
    };


    //------------------------------------

    this.sourceParamsFollow = function(changed){
        if(this.source_free) return;
        this.sourceParams(changed);
    };
    this.sourceParamsFree   = function(changed){
        if(!this.source_free) return;
        this.sourceParams(changed);
    };
    this.sourceParams = function(changed){
        if(!changed) return;

        if(changed.free || changed.type) this.sourFilter.setType(this.getSourceTypeName());
        if(changed.free || changed.freq) this.sourFilter.setFreq(this.getSourceFreq())
        if(changed.free || changed.gain) this.sourFilter.setGain(this.getSourceGain());
        if(changed.free || changed.Q)    this.sourFilter.setQ   (this.getSourceQ());
    };
    this.getSourceTypeName = function(){
        return this.source_free ?
            // ["follow", "bandpass2Q", "highpassQ", "lowpassQ", "bandstopQ"][this.source_typeIndex] :
            ["follow", "bandpass2", "highpass", "lowpass", "bandstop2"][this.source_typeIndex] :
            ["bandpass2Q", "lowpassNoQ", "highpassNoQ", "bandpass2", "bandpass2", "bandpass2", "bandpass2"][Math.min(6, this.type)];
    };
    this.getSourceFreq = function(){ return this.source_free ? this.source_freq : this.freq*this.freqOffsetFact};
    this.getSourceGain = function(){ return this.source_free ? this.source_gain : this.gainScaledClipped;};
    this.getSourceQ = function(){    return this.source_free ? this.source_Q    : this.Q;};

    // this._sourceParams = function(changed){  //copies main filter params to source filter
    //     if(this.isSourceFree) return;

    //     if(changed.free || changed.type) this.sourFilter.setType(["bandpass2Q", "lowpassNoQ", "highpassNoQ", "bandpass2", "bandpass2", "bandpass2", "bandpass2"][Math.min(4, this.type)])
    //     if(changed.free || changed.freq) this.sourFilter.setFreq(this.freq)
    //     if(changed.free || changed.Q)    this.sourFilter.setQ(this.Q);
    //     if(changed.free || changed.gain) this.sourFilter.setGain(this.gainScaledClipped);
    // };


    this.setIsOn = function(state, output){
        this.setOn(state, output);
    };

    this.enable  = function(){this.setOn(true, true);};
    this.disable = function(){this.setOn(false, true);};
    this.setOn = function(state, output){
        this.paramChanged("isOn", {state:state, output:output});
    };
    this.isOnParams = function(changed){
        this.isOn = changed.state;
        if(changed.output) this.outputParams("isOn");

        if(!this.isOn) this.resetDispState();
    };    
    this.resetDispState = function(){       //display state
        this.resetIdled();
        this.resetEnclosed();
        this.setAxisMov(false);
        this.setDispGrParams(false);
    };

    this.hasKeytrack = false;
    this.hasAdsr = false;
    this.hasGr = false;

    this.hasGM = false;
    this.canHaveGM = true;

    this.setHasKeytrack = function(state){
        this.hasKeytrack = state;
        this.paramChanged("isDynamic");
        this.paramChanged("freq");
    };
    this.setHasAdsr = function(state){
        this.hasAdsr = state;        
        this.paramChanged("isDynamic");
        this.paramChanged("gain");
    };
    
    this.toggleHasGr = function(){
        if(!this.canHaveGM) return;
        // this.tameDispGrParams();
        this.setHasGr(!this.hasGr, true);
    };
    this.setHasGr = function(state, output){
        this.hasGr = state;
        this.tameDispGrParams();
        this.paramChanged("hasGr", {output:output});
        this.paramChanged("isDynamic");
        this.paramChanged("gain");
    };

    this.canHaveGMParams = function(){
        this.canHaveGM = this.casc <= 4 || this.type <= 2;
        
        this.gainParams({});
        this.isDynamicParams();
    };
    this.hasGrParams = function(changed){
        if(changed && changed.output) this.outputParams("hasGr");
    };

    this.isDynamicParams = function(changed){
        this.isDynamic = this.getGainIsDynamic() || this.hasKeytrack;
    };
    this.getGainIsDynamic = function(){
        return this.canHaveGM && (this.hasGr || this.hasAdsr);
    };

    this.setScale = function(glo, gr){
        this.scale = {glo: glo, gr: gr};
        this.paramChanged("gain");
    };
    this.setClip = function(min, max){
        this.clip = {min: min, max: max};
        this.paramChanged("gain");
    };
    this.setGainOffset = function(val){
        this.gainOffset = val;
        this.paramChanged("gain");
    };
    this.setFreqOffset = function(val){
        this.freqOffsetFact = val;
        this.paramChanged("freq");
    };

    this.sourceOnChanged = false;
    this.setSourceOn = function(state){
        this.isSourceOn = state;

        this.sourceOnChanged = true;
    };
    this.setSourceFree = function(state){
        this.isSourceFree = state;
        this.paramChanged("source", {free:true});
    };

    this.panIndex = 0;
    this.setPanIndex = function(p, output){
        this.panIndex = p;
        
        this.paramChanged("panIndex", {output: output});
    };
    this.panIndexParams = function(changed){
        this.setPan(["Stereo","L","R","M","S"][this.panIndex]);
        this.panHandText = ["", "L", "R", "M", "Si"][this.panIndex];
        
        if(changed.output) this.outputParams("panIndex");
    };
    this.setPan = function(panText){
        this.pan = panText;
    };
    this.setPhase = function(state){
        this.calcPhase = state;
        
        this.mainFilter.setCalcPhase(state);
        this.dynaFilter.setCalcPhase(state);
        
        if(doDispSourcePhase)
        this.sourFilter.setCalcPhase(state);
        
        this.paramChanged("doCalcPhase");
    };
    this.changed = {};

    this.paramChanged = function(param, settings){
        var key = param || "default";
        
        if(this.changed[key]){
            if(settings) this.changed[key] = settings;
            return;
        }

        this.changed[key] = settings || {default: true};
    };
    this.refreshParam = function(paramName){
        if(typeof this[paramName+"Params"] == "function") this[paramName+"Params"](this.changed[paramName]);
    };
    this.refreshFirst =  ["freq", "gain", "casc", "type", "isOn", "threshold", "ratio", "hasGr"];
    this.refresh = function(){
        if(!script.isOn) return;
        
        if(this.isOn) this.refreshDynaParams();

        if(!isNotEmpty(this.changed)) return false;

        for(var i in this.refreshFirst) if(this.changed[this.refreshFirst[i]]){
            this.refreshParam(this.refreshFirst[i]);
            delete this.changed[this.refreshFirst[i]];
        }

        for(var i in this.changed) this.refreshParam(i);
    
        this.changed = {};
        
        if(this.isOn)                   this.mainFilter.refresh();
        if(this.isOn && this.isDynamic) this.dynaFilter.refresh();
        // post("\nrefresh, this.dynaFilter.gain = ", this.dynaFilter.gain);

        return true;
    };
    this.recalc = function(){
        this.mainFilter.recalc();
        this.dynaFilter.recalc();
        this.sourFilter.recalc();
        this.paramChanged();
    };

    
    this.refreshDynaParams = function(freqOnly){
        var banDynamParams = dynaParamsBuff.peek(1, this.n*2, 2);
        var _gr = banDynamParams[0];
        var _dynamicFreq = banDynamParams[1];

        // post("\nrefreshDynaParams");

        if(this.getGainIsDynamic() && _gr          != this.gr && !freqOnly) this.paramChanged("gr", {gr: _gr});
        if(this.hasKeytrack        && _dynamicFreq != this.dynamicFreq)     this.paramChanged("dynamicFreq", {dynamicFreq: _dynamicFreq});
    };

    this.getResp = function(resp, pixel){
        switch (resp){
            case "main": return  this.getMainResp(pixel);
            case "dyna": return  this.getDynaResp(pixel);
            case "sour": return  this.getSourResp(pixel);
            default    : return 1;
        }
    };
    this.getMainResp = function(pixel){
        if(!this.isOn) return 1;
        
        return this.mainFilter.resp[pixel] || 0;
    };
    this.getDynaResp = function(pixel){
        if(!this.isOn) return 1;
        if(!this.isDynamic) return this.getMainResp(pixel);
        return this.dynaFilter.resp[pixel]  || 0;
    };
    this.getSourResp = function(pixel){
        return this.sourFilter.resp[pixel] || 0;
    };

    this.outputParams = function(param){    //must be inside a abcParams function so it only outputs within this.refresh()
        if(typeof param != "string") param = param.toString();
        outlet(0, "ui", "filterParams", "setBand", this.n, "set"+param[0].toUpperCase() +param.slice(1), this[param]);
    };

    this.setSource = function(func){    //in Free mode only
        var params = arrayfromargs(arguments).slice(1);
        if(typeof this.sourFilter[func] == "function") this.sourFilter[func].apply(this.sourFilter, params);
    };

    this.sourceTypes = ["Follow", "bandpass2Q", "lowpassQ", "highpassQ", "bandstop2Q"];
    this.sourceMenu = function(param, val){
        if(param == "type"){

        }
        if(param == "order"){
            
        }
    };
    

    this.refreshSource = function(){
        var _changed = this.sourceOnChanged;
        
        if(this.sourceOnChanged){
            this.sourceOnChanged = false;
        }

        // if(!this.isSourceOn)         return _changed;
        if(!this.source_isOn)         return _changed;
        if(!this.isSourceFilterView) return _changed;

        return this.sourFilter.refresh() || _changed;

    };

    this.getIsOn = function(filterName){
        if(filterName == "main") return this.isOn;
        if(filterName == "dyna") return this.isDynamic;
        // if(filterName == "sour") return this.isSourceOn;
        if(filterName == "sour") return this.source_isOn;
    };

    this.isSourceFilterView = true;
    this.getIsSourceFilterView = function(){
        return this.isSourceFilterView;
    };
    this.setSourceView = function(val){
        this.isSourceFilterView = val==0;
    };
    
    this.copyFrom = function(band, copyDynamic){
        if(copyDynamic){
            this.paramChanged("threshold",  {output: true, threshold:  band.threshold});
            this.paramChanged("ratio",      {output: true, ratio:      band.ratio});
            this.paramChanged("attackTime", {output: true, attackTime: band.attackTime});
            this.paramChanged("releaseTime",{output: true, releaseTime:band.releaseTime});
            return;
        }
        this.paramChanged("freq",  {output: true, freq:  band.freq});
        this.paramChanged("gain",  {output: true, gain:  band.gain});
        this.paramChanged("Q",     {output: true, Q:     band.Q});
        this.paramChanged("adaptQ",{output: true, adaptQ:band.adaptQ});
    };
    
    this.initialize();
}


function toBandpass(w, Q){
    return Q * (w - 1/w);
}
function toBandstop(w, Q){
    // return w / (Q*(w*w - 1));
    return 1/toBandpass(w, Q);
}
function toBandstopQCliped(w, Q, order){
    return toBandstop(w, u.clip(Q, 0, getBSFMaxQ(order)));
}

var BSFMaxQ = {
    dBVals : {
        // 16: 40,
        32: 20,
        64: 18,
    },
    linVals: {},
    get: function(order){
        if(this.dBVals[order] == undefined) return 100;
        if(this.linVals[order]== undefined) this.linVals[order] = u.dBToAmp(this.dBVals[order]) * Math.SQRT2;
        
        return this.linVals[order];
    },
}

function getBSFMaxQ(order){
    return BSFMaxQ.get(order);
}


var minMax = {
    __noSuchMethod__: function(){
        return [null, null];
    },
    lowpass: function(n, A, Q, calcPhase){
        return [null, null];
        if(Q<5) return [null, null];
        return [null, Q*Math.SQRT1_2];//this is mag at cutoff, i need the actual peak
    },
    highpass: function(n, A, Q, calcPhase){
        return [null, null];
    },
    bandpass: function(n, A, Q, calcPhase){
        if(calcPhase) return [null, null];
        return [null, 1];
    },
    bandpass2: function(n, A, Q, calcPhase){
        return this.bandpass(n, A, Q, calcPhase);
    },
    bandpass3: function(w, n, A, Q, calcPhase){
        return this.bandpass2(w, n, A, Q, calcPhase);
    },
    bandstop: function(n, A, Q, calcPhase){
        if(calcPhase) return [null, null];
        return [0, null];
    },
    bandstop2: function(n, A, Q, calcPhase){
        return this.bandstop(n, A, Q, calcPhase);
    },
    notch: function(n, A, Q, calcPhase){
        return this.bandstop(n, A, Q, calcPhase);
    },
    bell: function(n, A, Q, calcPhase){
        // return [null, null];
        if(calcPhase) return [null, null];
        
        var amp = A*A;
        return [Math.min(1, amp), Math.max(1, A*A), 1];
    },
    lowshelf: function(n, A, Q, calcPhase){
        return [null, null];    //couldn't get acurate values
        if(calcPhase) return [null, null];
        if(Q<3) return [null, null];
        
        var peakWs = this.getShelfPeakFreqs(n, A, Q, calcPhase);

        var peakAmpLo = butter.lowshelf(peakWs[0], 2, A, Q, calcPhase);
        var peakAmpHi = butter.lowshelf(peakWs[1], 2, A, Q, calcPhase);

        return [peakAmpHi, peakAmpLo, peakWs[1]];
    },
    highshelf: function(n, A, Q, calcPhase){
        return this.lowshelf(n, A, Q, calcPhase);
    },
    
    getShelfPeakFreqs: function(n, A, Q, calcPhase){
        var A2 = A*A;
        var _Q2 = Q*Q;
        var exp2 = _Q2*A2*A;
        var exp1 = _Q2 + A - exp2*A - A2*A;
        var peakFDen = 2*(exp2 - _Q2*A);

        var exp3 = Math.sqrt(exp1*exp1 - 4*(exp2 - _Q2*A)*(exp2 + A2 - _Q2*A - A2));
        var peakFNumLo = -exp1 - exp3;
        var peakFNumHi = -exp1 + exp3;
        
        var peakFLo = Math.sqrt(peakFNumLo/peakFDen);
        var peakFHi = Math.sqrt(peakFNumHi/peakFDen);
        
        return [peakFLo, peakFHi];
    },
};

function biquadResp(wZ, b0,b1,b2,a1,a2, calcPhase){

    var
        cosW =  Math.cos(wZ),
        cos2W = Math.cos(wZ*2),
        sinW =  Math.sin(wZ),
        sin2W = Math.sin(wZ*2),

        Br = b0 + b1*cosW + b2*cos2W,
        Bi =    - b1*sinW - b2*sin2W,
        Ar = 1  + a1*cosW + a2*cos2W,
        Ai =    - a1*sinW - a2*sin2W
    ;

    return calcPhase ?
        Math.atan2(Bi*Ar - Br*Ai, Br*Ar + Bi*Ai) :
        Math.sqrt(Math.abs((Br*Br + Bi*Bi)/(Ar*Ar + Ai*Ai)))
    ;
}

var dcFilter = {
    b0: 1,
    b1: -1,
    b2: 0,
    a1: -0.9997,
    a2: 0,

    _blocker: function(wZ, calcPhase){
        return biquadResp(wZ, this.b0,this.b1,this.b2,this.a1,this.a2, calcPhase);
    },

    blocker: function(pixel, calcPhase){
        if(!this.init) this.initialize();


        return calcPhase ? (this.phase[pixel] || 0) : (this.mag[pixel] || 1);
    },

    recalc: function(){
        this.mag = [];
        this.phase = [];
        
        for(var i in u.logTable){
            this.mag[i] =   this._blocker(u.logTable[i].wZNoOs, false);
            this.phase[i] = this._blocker(u.logTable[i].wZNoOs, true);
        }
    },

    initialize: function(){
        this.recalc();
        this.init = true;
    },
    setSr: function(){
        this.recalc();
    },
};

var butter = {
    onePoleLowpass: function(w, calcPhase){
        var w2 = w*w;
        return calcPhase ? Math.atan2(-w, 1) : Math.sqrt(1/(1 + w2));
    },

    lowpass: function(w, n, A, Q, calcPhase){
        if(n==1) return this.onePoleLowpass(w, calcPhase);

        this.calcQs(n);
        
        // Q = A*A;
        var w2 = w*w;

        if(calcPhase){
            var phase = 0;

            for(var i in this.Qs[n]){
                phase -= Math.atan2(w/(this.Qs[n][i].Q * (i==0 ? Q : 1)) , 1 - w2);
            }

            return phase;
        }

        var mag2 = 1/(1 + Math.pow(w, 2*n));
        if(w==0) return Math.sqrt(mag2);
        
        
        var w2 = w*w;
        var commonAdd = w2 - 2 +  1/w2;
        var fact = (commonAdd + this.Qs[n][0].iQ2)/(commonAdd + this.Qs[n][0].iQ2/(Q*Q));

        var mag  = Math.sqrt(mag2 * fact);

        return mag;
    },
    highpass: function(w, n, A, Q, calcPhase){
        var resp = this.lowpass(1/w, n, A, Q, calcPhase);
        return calcPhase && calcPhase!="Complex" ? -resp : resp;
    },

    lowshelfBiq: function(w, A, Q, calcPhase){
        var w2 = w*w;

        if(calcPhase){
            var commonIm = w * Math.sqrt(A)/Q;
            return Math.atan2(commonIm , -w2 + A) - Math.atan2(commonIm , -A*w2 + 1);
        }

        var 
            w4 = w2*w2,
            Q2 = Q*Q,
            A2 = A*A,
            commonAdd = -2*A*w2 + A*w2/Q2,
            frac = (w4 + A2 + commonAdd) / (A2*w4 + 1 + commonAdd)
        ;

        return A * Math.sqrt(frac);
    },
    lowshelf: function(w, n, A, Q, calcPhase){
        this.calcQs(n);

        var lastA = Math.pow(A, 2/n)

        if(calcPhase){
            var phase = 0;

            for(var i in this.Qs[n]){
                var currentQ = this.Qs[n][i].Q * (i== n/2 - 1 ? Q : 1);
                phase += this.lowshelfBiq(w, lastA, currentQ, true);
            }

            return phase;
        }

        var lastQ = this.Qs[n][(n/2 - 1)].Q;
        var lastA = Math.pow(A, 2/n)
        var fact = this.lowshelfBiq(w, lastA, Q*lastQ)/this.lowshelfBiq(w, lastA, lastQ);

        var w2n = Math.pow(w, 2*n);
        var A2 = A*A;
        
        var num = A2 * (w2n + A2);

        var mag2;
        if(num == Infinity) mag2 = 1
        else mag2 = num / (A2*w2n + 1);

        var mag = fact * Math.sqrt(mag2);
        

        return mag;
    },
    highshelf: function(w, n, A, Q, calcPhase){
        return (calcPhase ? -1 : 1) * this.lowshelf(1/w, n, A, Q, calcPhase);
    },

    bandpass: function(w, n, A, _Q, calcPhase){
        // var Q = _Q*0.7071;// A*A*0.7071;
        // var Q = _Q * Math.SQRT1_2;// A*A*0.7071;
        var Q = _Q;// A*A*0.7071;
        
        var w2 = w*w;

        if(calcPhase){
            var phase = Math.PI/2 - Math.atan2(w/Q, -w2 + 1);
            return phase*n/2;
        }

        var mag = w/ (Q*Math.sqrt(w2*w2 + 1 - 2*w2 + w2/(Q*Q)));
        mag = Math.pow(mag, n/2);// * A*A;

        return mag;
    },
    bandpass2: function(w, n, A, Q, calcPhase){
        var newW = toBandpass(w, Q);

        var resp = this.lowpass(newW, n/2, 1, 1, calcPhase);
        return resp;
    },
    bandpass3: function(w, n, A, Q, calcPhase){
        return this.bandpass2(w, n, A, Q, calcPhase);
    },
    bandstop2: function(w, n, A, Q, calcPhase){
        var newW = toBandstopQCliped(w, Q);
        var resp = this.lowpass(newW, n/2, 1, 1, calcPhase);
        
        if(calcPhase)  resp = -resp;
        
        return resp;
    },
    notch: function(w, n, A, _Q, calcPhase){
        // var Q = _Q*0.7071;
        var Q = _Q;
        var w2 = w*w;

        if(calcPhase){
            var phase = (1>w2 ? 0 : Math.PI) - Math.atan2(w/Q, -w2 + 1);
            return phase*n/2;
        }

        var commonAdd = w2*w2 + 1 - 2*w2;
        var mag2 = (commonAdd) / (commonAdd + w2/(Q*Q))
        var mag = Math.sqrt(mag2);
        mag = Math.pow(mag, n/2);

        return mag;
    },
    bandstop: function(w, n, A, Q, calcPhase){
        return this.notch(w, n, A, Q, calcPhase);
    },
    bell: function(w, n, A, _Q, calcPhase){
        // var Q = _Q*0.7071;
        var Q = _Q;

        var w2 = w*w;

        if(calcPhase){
            var im = re = 1 - w2;
            return Math.atan2(w*A/Q, re) - Math.atan2(w/(A*Q), re);
        }

        var
            A2 = A*A,
            Q2 = Q*Q,
            commonAdd = w2*w2 + 1 - 2*w2,
            mag2 = (commonAdd + w2*A2/Q2) / (commonAdd + w2/(A2*Q2))
        ;

        return Math.sqrt(mag2);
    },
    specialBell: function(w, n, _A, Q, calcPhase){
        this.calcQs(n);

        var A = Math.sqrt(Q);
        return this.bell(w, 2, A, A*this.Qs[n][0].Q, calcPhase);
    },
    bell2 : function(w, n, A, BW, calcPhase){
        var 
            filter1 = this.lowshelf(w*BW, n, 1/A, 1, calcPhase),
            filter2 = this.lowshelf(w/BW, n, A,   1, calcPhase)
        ;
        return calcPhase ? filter1 + filter2 : filter1 * filter2;
    },

    bp2: function(w, n, A, BW, calcPhase){
        var 
            filter1 = this.highpass(w*BW, n, 1, 1, calcPhase),
            filter2 = this.lowpass (w/BW, n, 1, 1, calcPhase)
        ;
        return calcPhase ? filter1 + filter2 : A*A* filter1 * filter2;
    },
    
    no2: function(w, n, A, BW, calcPhase){  //Complex addition*
        var 
            filter1 = this.lowpass (w*BW, n, 1, 1, "Complex"),
            filter2 = this.highpass(w/BW, n, 1, 1, "Complex")
        ;
        return calcPhase ? 
            // atan2(f1.r*sin(f1.ang) + f2.r*sin(f2.ang), f1.r*cos(f1.ang) + f2.r*cos(f2.ang))
            Math.atan2(
                filter1.rad*Math.sin(filter1.ang) + filter2.rad*Math.sin(-filter2.ang),
                filter1.rad*Math.cos(filter1.ang) + filter2.rad*Math.cos(-filter2.ang)
            )     
                : 
            
            Math.sqrt(filter1.rad*filter1.rad + filter2.rad*filter2.rad)
        ;
    },
    

    Qs: {},
    calcQs: function(n){
        if(this.Qs[n]) return;

        this.Qs[n] = [];

        for(var i=0; i<n/2; i++){
            var theta = (i*2 + 1)*Math.PI/(n*2);
            var Q = 1/(2*Math.cos(theta));
            var iQ = 1/Q;

            this.Qs[n][i] = {
                Q   : Q,
                iQ  : iQ,
                iQ2 : iQ*iQ,
            }
        }
        
    },
};

var cheby2 = {
    lowpass: function(w, n, A, Q, calcPhase){
        this.calcParams(n);

        var resp = this.transLowpass("lowpass", w, n, A, Q, calcPhase);


        var bellResp = butter.specialBell(w, n, 0, Q, calcPhase);
        if(!calcPhase) resp *= bellResp;
        if(calcPhase)  resp += bellResp;

        return resp;
    },

    highpass: function(w, n, A, Q, calcPhase){
        this.calcParams(n);

        var resp = this.transLowpass("highpass", w, n, A, Q, calcPhase);

        var bellResp = butter.specialBell(w, n, 0, Q, calcPhase);
        if(!calcPhase) resp *= bellResp;
        if(calcPhase)  resp =  -resp+bellResp;

        return resp;
    },
    bandpass: function(w, _n, A, Q, calcPhase){
        n = _n/2;
        this.calcParams(n);

        if(!calcPhase) return this.transLowpass("bandpass", w, n, A, Q, calcPhase);// *  A*A;
        if(calcPhase)  return this.transLowpass("bandpass", w, n, A, Q, calcPhase);
    },
    bandpass2:function(w, n, A, Q, calcPhase){
        return this.bandpass(w, n, A, Q, calcPhase);
    },
    bandpass3: function(w, n, A, Q, calcPhase){
        return this.bandpass2(w, n, A, Q, calcPhase);
    },
    notch: function(w, _n, A, Q, calcPhase){
        n = _n/2;
        this.calcParams(n);
        
        var resp = this.transLowpass("notch", w, n, A, Q, calcPhase);
        
        if(calcPhase)  resp = -resp;

        return resp;
    },
    bandstop: function(w, n, A, Q, calcPhase){
        return this.notch(w, n, A, Q, calcPhase);
    },
    bandstop2: function(w, n, A, Q, calcPhase){
        return this.notch(w, n, A, Q, calcPhase);
    },

    transLowpass: function(type, w, n, A, Q, calcPhase){
        var wT = this.transformedW(type, w, this.params[n].passFact, Q, n);
        return this.lowpassNorm(wT, n, A, Q, calcPhase);
    },

    lowpassNorm: function(w, n, A, Q, calcPhase){
/***************************************************************

H(s)  = H0(s)*H1(s)*...Hm(s) , m = 1,2,...,n/2

        B2m*(s² + A1m*s + A2m)
Hm(s) = ----------------------
        A2m*(s² + B1m*s + B2m)

H0(s) =      1         : if n is even
        
            sinh(Di)⁻¹  
        -------------- : if n i odd
        s + sinh(Di)⁻¹

Practical Analog and Digital Filter Design (by Les Thede) : p38

***************************************************************/

        if(calcPhase){

            var phase = 0;
            for(var i in this.coeffs[n]){
                var c = this.coeffs[n][i];

                phase -= Math.atan2(
                    (c.A2 - w*w) * (c.B1*w),
                    (c.A2 - w*w) * (c.B2 - w*w)
                );
            }
            
            if(n%2 == 1){
                phase -= Math.atan2(w, this.params[i].iSinhDi);
            }
            
            return phase;
        }

        var T2nw = Math.pow(Tn(n, 1/w), 2);

        if(T2nw == Infinity) return 1;
        //lim x->+inf x/(1+x) = 1

        return Math.sqrt(this.e2 * T2nw / (1 + this.e2 * T2nw));
    },
    
    stopbandAtten: 144,
    initialize: function(){
        this.e = 1/ Math.sqrt(Math.pow(10, this.stopbandAtten/10) - 1);
        this.e2 = this.e*this.e;
        this.init = true;
    },

    params: [],
    coeffs: [],
    calcParams: function(n){
        if(this.params[n]) return;
        if(!this.init) this.initialize();
        
        var Di = 1/n * Math.asinh(1/this.e);
        var sinhDi = Math.sinh(Di);        
        var coshDi = Math.cosh(Di);
        var passFact =  Math.cosh(1/n * Math.acosh(1/this.e));//lowpass

        this.params[n] = {
            passFact: passFact,
            iSinhDi: 1/sinhDi,
        };

        this.coeffs[n] = [];//analog
        
        var phiStep = Math.PI/(2*n);

        for(var i=0; i<(n-n%2)/2; i++){
            var phi = phiStep * (2*i + 1);
            var thetaPrime = -sinhDi*Math.sin(phi);
            var omegaPrime =  coshDi*Math.cos(phi);
            var commonD = (thetaPrime*thetaPrime) + (omegaPrime*omegaPrime)
            var theta =  thetaPrime/commonD;
            var omega = -omegaPrime/commonD;
            var omegaZ = 1/Math.cos(phi);

            var B1 = -2*theta;
            var B2 = theta*theta + omega*omega;
            var A2 = omegaZ*omegaZ;

            this.coeffs[n][i] = {
                B1: B1,
                B2: B2,
                A2: A2,
            };
        }
    },
    
    transformedW: function(type, w, passFact, Q, n){
        switch (type){
            case "lowpass":  return w/passFact;
            case "highpass": return 1/(w*passFact);
            case "bandpass": return toBandpass       (w, Q/passFact);
            case "notch":    return toBandstopQCliped(w, Q*passFact, n*2);
            default:         return w;
        }
    },
};

function Tn(n, w){ //nth Chebyshev polynomials
    if(w < -1) return Math.cosh(n * Math.acosh(-w)) * Math.pow(-1, n);
    if(w > 1)  return Math.cosh(n * Math.acosh(w));
               return Math.cos (n * Math.acos(w));
}

Math.cosh = function(x){
    return (this.exp(x) + this.exp(-x)) / 2;
};
Math.acosh = function(x){
    return this.log(x + this.sqrt(x*x - 1));
};
Math.sinh = function(x){
    return 1/2 * (this.exp(x) - this.exp(-x));
};
Math.asinh = function(x){
    return this.log(x + this.sqrt(x*x + 1));
};
Math.log2 = function(x){
    return this.log(x)/this.LN2;
};
Math.sign = function(x){
    return !x ? 0 : (x>0 ? 1 : -1);
};


function Tab(params){
    this.items = [];
    this.itemList = (params.itemList || ["A", "B", "C"]).slice();
    this.startPosX = params.x || 0;
    this.startPosY = params.y || 0;
    this.itemW = params.itemW || 40;
    this.itemH = params.itemH || 20;
    this.justif = params.justif;
    this.hMargin = 4;
    this.vMargin = 2;

    this.selectedItem = params.initial ? clip(params.initial, 0, this.itemList.length-1) :  0;
    
    this.setupItems = function(){
        var tabW = this.itemList.length * (this.itemW + this.hMargin);
        var tabH = this.itemH + this.vMargin;

        if(/bottom/.test(this.justif)) this.startPosX -= tabW;
        if(/right/.test(this.justif))  this.startPosY -= tabH;

        for(var i in this.itemList){
            var xPos = this.startPosX+ this.hMargin/2 + i*(this.itemW+this.hMargin);
            var yPos = this.startPosY + this.vMargin/2 ;
            var textPosX = xPos + this.itemW/2;
            var textPosY = yPos + this.itemH/2;

            this.items[i] = {
                rCor: 4,
                x: xPos,
                y: yPos,
                w: this.itemW,
                h: this.itemH,
                isIdled: false,
                text: this.itemList[i],
                xText: textPosX,
                yText: textPosY,
                coor: [xPos, yPos, xPos + this.itemW, yPos + this.itemH],
                isSelected: i==this.selectedItem,

                idle: function(x, y){
                    this.isIdled = isInRect(x, y, this.coor);
                    return this.isIdled;
                },
                click: function(x, y){
                    // this.isSelected = this.isIdled;
                    // return this.isSelected;
                    return this.isIdled;
                },
                display: function(){
                    mg.rectangle_rounded(this.x, this.y, this.w, this.h, this.rCor, this.rCor);
                    // mg.set_source_rgba(this.isIdled ? colors.get("tabItemBgIdled") : (this.isSelected ? colors.get("tabItemBgSelected") : colors.get("tabItemBg")));
                    mg.set_source_rgba(colors.get("tabItemBg", this.isIdled || this.isSelected ? 0.75 : 0.3));
                    mg.fill();
                    
                    mg.text_path_centered(this.xText, this.yText, this.text);
                    mg.set_source_rgba(colors.get("tabItemText"));
                    mg.fill();
                },
                setSelected: function(state){
                    this.isSelected = state;
                },
            }
        }
    }

    this.initialize = function(){
        this.setupItems();
    };
    
    this.get = function(){
        return this.selectedItem;
    };
    this.click = function(x, y){
        var retArr = this.itemsIter("click", x, y);
        var newlySelected = retArr.indexOf(true);
        if(newlySelected != -1){
            this.set(newlySelected);
            return newlySelected;
        }

    };
    this.set = function(newVal){
        var newValCliped = clip(newVal, 0, this.itemList.length-1);

        this.selectedItem = newValCliped; 
        this.itemsIter("setSelected", false);
        this.items[newValCliped].setSelected(true);
    };
    this.idle = function(x, y){
        var retArr = this.itemsIter("idle", x, y);
        return includes(retArr, true);
    };
    this.display = function(){
        this.itemsIter("display");
    };
    this.itemsIter = function(func){
        return iterateApplyOwn(this.items, func, arrayfromargs(arguments).slice(1));
    };
    this.resetPos = function(w, h){
        this.startPosX = w || 0;
        this.startPosY = h || 0;
        this.setupItems();
    };
    this.initialize();
}


var operatingSystem = max.os;
// var operatingSystem = "macos";
var MOD1     = operatingSystem == "windows" ? "Ctrl + "             : "Cmd + " //"⌘ + ";
var MOD2     = operatingSystem == "windows" ? "Alt + "              : "Opt + " //"⌥ + ";
var CLICK2   = operatingSystem == "windows" ? "Right-Click "        : "Ctrl + Click ";
var DRAG2    = operatingSystem == "windows" ? "Right Button Drag "  : "Ctrl + Drag ";
var DBCLICK2 = operatingSystem == "windows" ? "Double Right-Click " : "Ctrl + Double-Click ";

var incandescent = {
    isShown: false,
    activeTab: 0,

    left: 20, right: 20,
    
    titleTop: 30,
    titleFontsize: 32,
    
    headingTop: 26,
    headingFontsize: 22,
    
    textTop: 50,
    textFontsize: 10,
    hotkeyDist: 170,

    iconSize: 62,
    iconJust: "top_right",
    iconTop: 40,
    iconRight: 20,

    tabRightDist: 10,
    tabTopDist: -2,
    tabItemW: 40,
    tabItemH: 20,

    initialize: function(){
        this.icon = incandescentIcon;
        this.tab = new Tab({itemList: ["Display", "Band", "About"], x:width-this.tabRightDist, y:height-this.tabTopDist, itemW:this.tabItemW, itemH: this.tabItemH, justif:"bottom right", initial: this.activeTab});

    },
    displayAbout: function(){
        mg.set_font_size(this.titleFontsize);
        mg.text_path_centered(this.left-2, this.titleTop, "EQUATION", "left", null, true);
        
        mg.set_font_size(this.textFontsize);
        mg.pragraph_path_centered(this.left, this.textTop, this.aboutText, "left", null, true);
        
        mg.fill();

    },
    display: function(){
        if(!this.isShown) return;
        this.refreshSize();


        mg.rectangle(0,0,width, height);
        mg.set_source_rgba(colors.get("aboutBg", 0.85));
        mg.fill();
        
        this.icon.draw(width - this.iconRight, this.iconTop, this.iconSize, colors.get("gridCColor"), "right");
        this.tab.display();
        
        mg.set_source_rgba(colors.get("gridCColor"));


        if(     this.tab.get()==2) this.displayAbout()
        else if(this.tab.get()==1) this.displayHK(this.bandHotkeys)
        else                       this.displayHK(this.dispHotkeys);
    },
    separatorStr: "<>",
    separatorLen: 320,
    displayHK: function(hkObj){

        var posY = this.headingTop -10;

        for(var i in hkObj){
            posY += 10;
            mg.set_font_size(this.headingFontsize);
            mg.text_path_centered(this.left-1, posY, i/*+" :"*/, "left", null, true);                                   //Heading
            mg.fill();
            
            mg.set_font_size(this.textFontsize);
            posY = this.textTop;
            
            for(var j in hkObj[i]){
                
                if(hkObj[i][j][0] == this.separatorStr){
                    var posYFloored = mg.floorPos(posY);
                    mg.line(this.left, posYFloored, this.left + this.separatorLen, posYFloored);                        //Separator
                    mg.stroke();
                }
                else{
                    mg.text_path_centered(this.left,                 posY, hkObj[i][j][0], "left", null, true);         //Left text 
                    mg.text_path_centered(this.left+this.hotkeyDist, posY, hkObj[i][j][1], "left", null, true);         //Right text
                    mg.fill();
                }

                posY += mg.getLineBreak();
            }
        }

        return;
    },
    click: function(x, y,  ctrl, shift, alt, rClick){
        if(this.isShown && !this.isIdled){
            this.setIsShown(false, true);
            return true;
        }
        
        if(alt && shift && !this.isShown){
            this.setIsShown(true, true);
            return true;
        }
        
        if(!this.isShown) return;
        
        var newActiveTab = this.tab.click(x, y);

        if(this.activeTab !=  newActiveTab){
            this.activeTab =  newActiveTab;
            outlet(0, "internal", "incandescentParams", "setActiveTab", this.activeTab);
        }
        return true;
    },
    setActiveTab: function(val){
        this.activeTab = clip(val, 0, 2);
        this.tab.set(this.activeTab);
    },
    drag: function(x, y){
        if(!this.isShown) return;
        this.tab.idle(x, y);
        return true;
    },
    isIdled: false,
    idle: function(x, y){
        if(!this.isShown) return;
        this.isIdled = this.tab.idle(x, y);
        return true;
    },
    setIsShown: function(state, doOutput){
        this.isShown = state;
        
        if(doOutput) outlet(0, "internal", "incandescentParams", "setIsShown", state);
    },
    getIsShown: function(){
        return this.isShown && !this.isIdled;
    },
    hasResized: false,
    resize: function(){
        this.hasResized = true;
    },
    refreshSize: function(){
        if(!this.hasResized) return;
        this.tab.resetPos(width-this.tabRightDist, height-this.tabTopDist);
        this.hasResized = false;
    },
    aboutText: 
        // "M4L Dynamic Eqializer\n"+
        "Version "+currentVersion+" -- "+currentDate+"\n\n"+
        "Hi there, I'm Ahmed, the creative mind behind Incadescent.\n\n"+
        "Thanks for buying this device, your support makes this\n"+
        "adventure possible for me.\n\n"+
        "Have fun using this!"
    ,
    dispHotkeys: {
        "Display controls": [
            // ["<>",     ""],
            [MOD2 + "Click on the Display",                     "Toggles the phase response display"],
            [MOD2 + "Click on a gain scale",                    "Toggles the scale's range"],
            [MOD2 + "Click on the frequency scale",             "Toggles the Keyboard interface"],
            [MOD2 +  CLICK2 + "on the Display",                 "Toggles the Source View"],
            ["Double-Click on the Main Display",                "Expands the Window Display"],
            ["",     ""],
            // ["<>",     ""],
            // ["–––––––––––––––––––––––––––––––––––––––––––––––",     ""],
            [MOD1 + "Click on the Display",                     "Inserts a band"],
            [MOD1 + "Click on a band's handle",                 "Disables the band"],
            ["Shift + Drag",                                    "Fine-tune editing"],
        ],
    },
    bandHotkeys: {
        "Band controls": [
            // ["<>",     ""],
            [MOD2 + "Drag",              "Sets the Q"],
            [MOD1 + "Shift + Click",     "Expands the Main Filter Menu"],
            ["Double-Click",             "Expands the Copy/Paste Menu"],
            ["",     ""],
            // ["<>",     ""],
            // ["–––––––––––––––––––––––––––––––––––––––––––––––",     ""],
            [MOD1 +  CLICK2,             "Enables the GR|B"],
            [DRAG2,                      "Sets the Threshold"],
            [MOD2 + DRAG2,               "Sets the Ratio"],
            [MOD1 + "Shift + " + CLICK2, "Expands the Source Filter Menu"],
            [DBCLICK2,                   "Expands the GR|B Copy/Paste Menu"],
        ],
    },
    displayHelpText: "Here are displayed the spectrum analyses, the frequency responses and a few other settings. Shift + " + MOD2 + "Click displays the shortcuts.",
};


function Ramp(initalValue, speed, min, max){

    this.time = speed;

    this.speed = speed       || 1;
    this.value = initalValue || 0;
    this.isActive = false;
    this.dir = 1;
    this.count = 0;
    this.isOn = script.getState();
    
    this.setOn = function(state){
        this.isOn = state;
        
        if(this.isActive && !this.isOn){
            this.endRamp();

            this.changed = true;
        }
    },
    this.goTo = function(newValue){
        this.dir = Math.sign(newValue-this.value);
        this.speed = Math.abs(newValue-this.value)/this.time;
        // post("\n", this.value, newValue, this.speed);
        if(!this.dir) return;
        
        if(this.isOn) this.startRamp(newValue)
        else          this.setValue(newValue);
        
    };

    this.setValue = function(value){
        this.target = value;
        this.endRamp();
        this.changed = true;
    };

    this.getValue = function(){
        return this.value;
    };
    
    this.refresh = function(){
        if(!this.changed) return false;

        if(!this.isActive){
            this.changed = false;
            return true;
        }

        this.value += this.dir * this.speed;
        this.count++;

        if(this.valOutOfBound(this.value)) this.endRamp();        
        return true;
    };

    this.valOutOfBound = function(val){
        return (this.count>=1000) || (this.dir>0 ? (val >= this.target) : (val <= this.target));
    };

    this.startRamp = function(newValue){
        if(typeof newValue == "undefined") return;
        this.target = newValue;
        this.isActive = true;
        this.changed = true;
    };
    this.endRamp = function(){
        this.isActive = false;
        this.changed = false;
        this.value = this.target;
        this.count = 0;
    };
    this.getState = function(){
        return this.isActive;
    };
    this.getIsLastStep = function(){
        if(this.target == undefined)  return false;
        if(!this.isActive) return false;

        return this.valOutOfBound(this.value + this.dir * this.speed);
    };
}

function MenuMan(name){
    this.name = name;
    this.output = function(){
        outlet(0, "menu", this.name, arrayfromargs(arguments));
    };
    this.__noSuchMethod__ = function(){
        // this.output.apply(this, [arguments[0]].concat(arguments[1]));
        outlet(0, "menu", this.name, arguments[0], flatten(arguments[1]));
    };
    this.setColor = function(colorName, alpha){        
        this.colorsParams("set", "text",          colors.get(colorName, alpha));
        this.colorsParams("set", "bgHighlight",   colors.get(colorName, alpha));
        this.colorsParams("set", "bg",            colors.get("lcdBg", 1 /*0.7*/));
        this.colorsParams("set", "textHighlight", colors.get("lcdBg", 1 /*0.7*/));
    };
    this.replaceCell = function(){
        // this.output.apply(this, ["menuParams", "replaceCell"].concat(arrayfromargs(arguments)));
        this.menuParams("replaceCell", arrayfromargs(arguments));
    };
    this.setFormated = function(str){
        var params = arrayfromargs(arguments);
        this.menuParams("setCellListStr", str.replace(/\$(\d)/g, function(match, $1){
            return params[$1]!=undefined ? params[$1] : match;
        }));
    };

}


var general = {

    isGScaleExtended: 0.5,
    getGStep: function(ramp){return ramp< 0.45 ? 3 : (ramp<0.95 ? 6 : 12)},
    getGMax: function(ramp){return u.map(ramp, 0,1, 9,36, 1.585107 /*ln(1/3)/ln(1/2)*/)},
    getGMin: function(ramp){return -this.getGMax(ramp)},

    isSScaleExtended: 0,
    getSStep: function(ramp){return ramp< 0.95 ? 18 : 36},
    getSMax: function(ramp){return lerp(ramp, 18, 36)},
    getSMin: function(ramp){return lerp(ramp, -(18*5), -(36*5))},
    
    getIsSScaleExtended: function(){return this.spectRamp ? this.spectRamp.getValue() :  +this.isSScaleExtended},

    initialize: function(){
        var speed = 1;
        var rampsTimeInFrames = 24/speed;

        this.setGainScale(+this.isGScaleExtended);
        this.gainRamp = new Ramp(+this.isGScaleExtended, rampsTimeInFrames);

        this.setSpectScale(+this.isSScaleExtended);
        this.spectRamp = new Ramp(+this.isSScaleExtended, rampsTimeInFrames);


        this.copyMenu       = new MenuMan("copyMenu");
        this.mainTypeMenu   = new MenuMan("mainTypeMenu");
        this.sourceTypeMenu = new MenuMan("sourceTypeMenu");

    },
    setOn: function(state){
        this.gainRamp.setOn(state);
        this.spectRamp.setOn(state);
    },
    setGainScale: function(currRamp){
        this.currGMax = this.getGMax(currRamp);
        this.currGMin = this.getGMin(currRamp);
        this.currGStep = this.getGStep(currRamp);
    },
    setSpectScale: function(currRamp){
        this.currSMax = this.getSMax(currRamp);
        this.currSMin = this.getSMin(currRamp);
        this.currSStep = this.getSStep(currRamp);
    },
    
    getGScale: function(){return [this.currGMin, this.currGMax, this.currGStep];},
    getSScale: function(){return [this.currSMin, this.currSMax, this.currSStep];},

    click: function(x, y, ctrl, shift, alt, rClick){

        if(!alt) return;

        if(rClick){
            outlet(0, "toggleSourceView");
            return true;
        }

        if(grid.isOnBottomScale(x, y)){
            this.toggleKeyboardDisplay();
            return true;
        }
        
        if(grid.isOnRightScale(x, y)){
            // this.toggleSpectScaleState(y>u.zeroDBPos);
            this.toggleSpectScaleState(!this.isSScaleExtended);
            return true;
        }

        if(grid.isOnLeftScale(x, y)){
            if(this.isDispPhase) return;            
            this.toggleGainScaleState(y<u.zeroDBPos);
            return true;
        }

        this.togglePhaseDisplay();
    },

    menuExpanded: false,
    expandCopyMenu: function(band, mode){
        if(this.menuExpanded) return;
        this.menuExpanded = true;

        this.copyMenu.setColor(mode? "green" : "lcd");
        
        this.copyMenu.replaceCell(0, "%Band "+(+band+1) + (mode?" GR|B": " Filter"));
        this.copyMenu.expandHere();
    },
    menuRItems: "   @JR",
    typeMenuIconList: ["bell", "lowshelf", "highshelf", "highpass", "lowpass", "bandpass", "bandstop"],
    expandMainTypeMenu: function(band, maxOrder, selBandType, selBandOrder, panStr){
        if(this.menuExpanded) return;
        this.menuExpanded = true;
        this.mainTypeMenu.setColor("lcd");


        var bandVal = ""+(1+band);
        var typeVal = +this.typeMenuIconList.indexOf(selBandType);
        var orderVal = Math.min(+maxOrder , +selBandOrder);
        var panVal = panStr;
        var n64Val = maxOrder>32 ? "64" : "%";

        this.mainTypeMenu.setFormated(maxOrder==2 ? this._mainTypeMenuListBell : this._mainTypeMenuList, bandVal, typeVal, orderVal, n64Val, panVal, this.menuRItems);

        this.mainTypeMenu.expandHere();
    },
    _mainTypeMenuList:     "%Band $1||%Main$6;<>;%Type||%@Icon$2;bell@Icon0;lowshelf@Icon1||highshelf@Icon2;highpass@Icon3||lowpass@Icon4;bandpass@Icon5||bandstop@Icon6;<>;%Order||%$3$6;2@JC||4@JC||8@JC;16@JC||32@JC||$4@JC;<>;%S-Place||%$5$6;Stereo@JC;L@JC||R@JC||M@JC||Si@JC",
    _mainTypeMenuListBell: "%Band $1||%Main$6;<>;%Type||%@Icon$2;bell@Icon0;lowshelf@Icon1||highshelf@Icon2;highpass@Icon3||lowpass@Icon4;bandpass@Icon5||bandstop@Icon6;<>;%Order||%$3$6;<>;%S-Place||%$5$6;Stereo@JC;L@JC||R@JC||M@JC||Si@JC", 
    expandSourceTypeMenu: function(band, isFilterOn, curSourceTypeIndex, curSourceOrder){
        if(this.menuExpanded) return;
        this.menuExpanded = true;
        this.sourceTypeMenu.setColor("green");
        
        var bandVal = ""+(1+band);
        var onOffVal = isFilterOn ? "  Off@JC||• On@JC" :"• Off@JC||  On@JC";
        var typeVal = this.typeMenuIconList.indexOf(["follow", "bandpass", "highpass", "lowpass", "bandstop"][curSourceTypeIndex]);
        var orderVal = curSourceOrder;

        this.sourceTypeMenu.setFormated(this._sourceTypeMenuList, bandVal, onOffVal, typeVal, orderVal, null, this.menuRItems);

        this.sourceTypeMenu.expandHere();
    },
    _sourceTypeMenuList: "%Band $1||%Source$6;$2;<>;%Type||%Follow@JC@Icon$3;Follow@JC;bandpass@Icon5||bandstop@Icon6;highpass@Icon3||lowpass@Icon4;<>;%Order||%$4$6;2@JC||4@JC||8@JC;16@JC||32@JC||64@JC",
    menuFreed: function(){
        this.menuExpanded = false;
    },
    
    isKeyboardDisplay: false,
    toggleKeyboardDisplay: function(){
        this.setKeyboardDisplay(!this.isKeyboardDisplay, true);
        outlet(0, "generalParams", "keyboardDisplay", this.isKeyboardDisplay);
    },
    keyboardDisplay: function(state){
        this.setKeyboardDisplay(state, true);
    },
    setKeyboardDisplay: function(state){
        this.isKeyboardDisplay = state;

        keyboard.setIsOn(this.isKeyboardDisplay);
        // filters.keyboardDisplayed(this.isKeyboardDisplay);
    },

    gridIsChanging: false,
    display: function(){
        // if(!script.getState()) return;

        var 
            gainIsChanging = this.gainRamp.getState(),
            spectIsChangin = this.spectRamp.getState(),
            isChanging = gainIsChanging || spectIsChangin,
            gainLastStep = false, spectLastStep = false, isLastStep = false
        ;

        if(isChanging){
            gainLastStep = this.gainRamp.getIsLastStep();
            spectLastStep = this.spectRamp.getIsLastStep();            
            isLastStep = (gainIsChanging != spectIsChangin && (gainLastStep || spectLastStep)) || (gainLastStep && spectLastStep);
        }

        if(isChanging && !this.gridIsChanging) grid.setIsChanging(true);
        if(isLastStep)                         grid.setIsChanging(false);

        this.gridIsChanging = isChanging;

        if(this.gainRamp.refresh()){
            this.setGainScale(this.gainRamp.getValue());
            this.updateGainScale();
        }

        if(this.spectRamp.refresh()){
            this.setSpectScale(this.spectRamp.getValue());
            this.updateSpectScale();
        }

        this.refresh();
    },
    
    toggleGainScaleState: function(dir){
        var newVal = this.isGScaleExtended>0 && dir ? 1 : (this.isGScaleExtended<1 && !dir ? 0 : 0.5);

        this.setGainScaleState(newVal, true);
        outlet(0, "generalParams", "gainScaleState", this.isGScaleExtended);
    },
    setGainScaleState: function(state, doRamp){        
        if(this.isGScaleExtended == state) return;

        this.isGScaleExtended = state;
        if(doRamp) this.gainRamp.goTo(+this.isGScaleExtended)
        else       this.gainRamp.setValue(+this.isGScaleExtended);
        
    },
    updateGainScale: function(state){
        u.setGainScale(this.currGMin, this.currGMax, this.currGStep);
        filters.paramChanged("gainScale");
        grid.setupGainGrid();
        cursorCoor.setGainScale();
    },
    
    toggleSpectScaleState: function(dir){
        var newVal = +dir;
        
        this.setSpectScaleState(newVal, true);
        outlet(0, "generalParams", "spectScaleState", this.isSScaleExtended);
    },
    setSpectScaleState: function(state, doRamp){
        // if(this.isSScaleExtended == state) return;

        this.isSScaleExtended = state;
        if(doRamp) this.spectRamp.goTo(+this.isSScaleExtended)
        else       this.spectRamp.setValue(+this.isSScaleExtended);
    },
    updateSpectScale: function(){
        u.setSpectScale(this.currSMin, this.currSMax, this.currSStep);
        filters.paramChanged("spectScale");
        grid.setupSpectGrid();
        cursorCoor.setSpectScale();
    },
    getIsScaleRamping: function(scale){
        if(scale=="gain")  return this.gainRamp.getState();
        if(scale=="spect") return this.spectRamp.getState();
        return this.spectRamp.getState() || this.gainRamp.getState();
    },
    
    gainScaleState: function(state){
        this.setGainScaleState(state);
    },
    spectScaleState: function(state){
        this.setSpectScaleState(state);
    },
    
    changed: {},
    refresh: function(){
        if(!isNotEmpty(this.changed)) return;

        for(var i in this.changed) if(typeof this[i+"Params"] == "function") this[i+"Params"](this.changed[i]);
        
        this.changed = {};
    },
    paramChanged: function(param, change){
        this.changed[param || "_default"] = change || true;
    },

    samplingRate: 44100,
    setSr: function(sr){
        if(this.samplingRate == sr) return;
        this.samplingRate = sr;
        this.paramChanged("sr");
    },
    srParams: function(){
        u.setSr(this.samplingRate);
        dcFilter.setSr();
        keyboard.setSr();
        grid.setupFreqGrid();
        filters.setSr();
        analyzer.setSr();
    },
    osFact: 1,
    setOversampling: function(fact, mode){
        if(this.osFact == fact) return;
        this.osFact = fact;
        
        outlet(0, "dsp", "os", this.osFact);
        this.paramChanged("oversampling");
    },
    oversamplingParams: function(fact, mode){
        u.setOversampling(this.osFact);
        filters.setOversampling(this.osFact);
        analyzer.setSr();
    },
    kneeDB: 6,
    setKnee: function(knee){
        this.kneeDB = knee;
        this.outputToAll("knee", this.kneeDB);
        
        this.paramChanged("knee");
    },
    kneeParams: function(){
        u.setKnee(this.kneeDB);
    },

    isDispPhase: false,
    phaseDisplay: function(state){
        this.isDispPhase = state;
        
        filters.setPhase(this.isDispPhase);
        grid.setDispPhase(this.isDispPhase);
        
    },
    togglePhaseDisplay: function(){
        this.phaseDisplay(!this.isDispPhase);
        outlet(0, "generalParams", "phaseDisplay", this.isDispPhase);
    },


    gainScale: function(global, gr){
        this.outputToAll("gainScale", global, gr);
        filters.setGainFact(global, gr);
    },
    gainClip: function(min, max){
        this.outputToAll("gainClip", min, max);
        filters.setGainClip(min, max);
    },
    globalGainOffset: function(val){
        this.outputToAll("globalGainOffset", val);
        filters.setGainOffset(val);
    },
    globalFreqOffset: function(val){
        this.outputToAll("globalFreqOffset", val);
        filters.setFreqOffset(val);
    },
    outputToAll: function(){
        outlet(0, "dsp", "all", arrayfromargs(arguments));
    },

    deviceEnabled: true,
    setDeviceEnabled: function(state){
        this.deviceEnabled = state;
        colors.setDeviceEnabled(state);
        // if(state) this.timeout();
    },
    timeout: function(){
        filters.timeout();
        analyzer.timeout();
    },
    getDeviceEnabled: function(){
        return this.deviceEnabled;
    },
};

function ComplexResp(calcPhase){

    this.isPhase = calcPhase;
    this.val = this.isPhase ? 0 : 1;

    this.mult = function(newVal){
        if( this.isPhase) this.val += newVal;
        if(!this.isPhase) this.val *= newVal;
    };
    this.get = function(){
        return this.val;
    };
}

var filters = {
    sourceLineW: 1.5,
    mainLineW: 1.5,
    mainLineWThin: 1.3,
    repsAlpha: 0.35,
    dynaAlpha: 0.5,
    // bands: [],
    initialize: function(){
        this.bands = [
            new Band(0, 40),
            new Band(1, 100),
            new Band(2, 300),
            new Band(3, 1000),
            new Band(4, 3000),
            new Band(5, 8500),
        ];
        this.activeBandsCount = 0;
        this.revBandsIndices = [5,4,3,2,1,0];

        this.filterIcon.initialize();
        this.paramChanged("selectedBand");
    },

    setScriptOn: function(state){
        if(state) return;
        this.bandsIter("resetDispState");
        this.monitorBand(-1);
    },
    timeout: function(){
        this.bandsIter("resetDispState");
        this.filterIcon.timeout();

        if(!this.isSourceMon){
            this.monitorBand(-1);
        }
    },

    display: function(){
        this.refresh();
        
        if(analyzer.getIsFocus()) colors.applyGlobalAlpha(EQ_ALPHA_SPECT_IS_FOCUS);

        this.drawResp();
        this.bandsIter("display", this.bandsIter("getThresh"));

        this.applyToSelectedBand("displayMonitorHandle");
        
        this.filterIcon.display();
        this.enclosure.draw();
        
        colors.resetGlobalAlpha();
    },

    filterIcon: {
        doDisplay: false,
        isActive: true,

        x: 0, y:0,
        displayedIcon: "bell",
        initialize: function(){
            this.icons = {
                bell:      new SVGIcon("b_bell.svg",   [40,15]),
                lowshelf:  new SVGIcon("b_lowshelf.svg"),
                highshelf: new SVGIcon("b_highshelf.svg"),
                lowpass:   new SVGIcon("b_lowpass.svg"),
                highpass:  new SVGIcon("b_highpass.svg"),
                bandpass:  new SVGIcon("b_bandpass.svg"),
                bandstop:  new SVGIcon("b_bandstop.svg"),
            };
            // post(this.icons.bell.size);
            this.init = true;
        },
        display: function(){
            // return;
            if(!this.init) this.initialize();
            if(!(this.doDisplay && this.isActive)) return;

            this.icons[this.displayedIcon].draw(this.x, this.y-5, 8, colors.get("lcd"));
        },
        idle: function(x, y, ctrl, shift, alt, rClick){
            if(!ctrl){
                this.doDisplay = false;
                return;
            }

            this.displayedIcon = this.getIconName(x, y);
            
            this.doDisplay = true;
            this.x = x;
            this.y = y;
        },
        click: function(x, y, ctrl, shift, alt, rClick){
            this.doDisplay = false;
        },
        idleout: function(){
            this.doDisplay = false;
        },
        setOn: function(state){
            this.doDisplay = state;
        },
        setActive: function(state){
            this.isActive = state;
        },
        getIconName: function(x, y){
            var onLeftScale  = grid.isOnLeftScale(x,y);
            var onRightScale = grid.isOnRightScale(x,y);
            var onTopSide = y<16;
            var onBotSide = y>grid.getBottomEdge()-16;

            if     (onLeftScale  && y <= height/2) return "lowshelf"
            else if(onLeftScale  && y >  height/2) return "highpass"
            else if(onRightScale && y <= height/2) return "highshelf"
            else if(onRightScale && y >  height/2) return "lowpass"
            else if(onTopSide)                     return "bandpass"
            else if(onBotSide)                     return "bandstop"
            else                                   return "bell";
        },
        timeout: function(){
            this.doDisplay = false;
        },
    },

    resize: function(xFact,yFact){
        this.bandsIter("resize",xFact,yFact);
    },

    currIdledBand: -1,
    lastIdledBand: 0,
    
    lastAlt:0,lastX:0,lastY:0,prevX:0,prevY:0,
    idle: function(x, y, ctrl, shift, alt){
        this.currIdledBand = -1;
        this.lastAlt = alt; this.lastX = x; this.lastY = y;
        this.bandsIter("resetIdled");

        this.applyToSelectedBand("idleMonitor",x, y, ctrl, shift, alt);
        // this.bandsIter("idleAxisMovCue",x, y, ctrl, shift, alt);

        for(var i in this.revBandsIndices) if(this.bands[this.revBandsIndices[i]].idle(x, y, ctrl, shift, alt)){
            keyboard.resetIdled();

            this.filterIcon.setOn(false);
            this.currIdledBand = +this.revBandsIndices[i];
            this.lastIdledBand = this.currIdledBand;
            return true;
        };
        
        if(keyboard.getIsIdled(x, y)){
            this.filterIcon.setOn(false);
            return;
        }
        
        this.filterIcon.idle(x, y, ctrl, shift, alt);
    },
    idleout: function(x, y, ctrl, shift, alt, rClick){
        this.filterIcon.idleout(x, y, ctrl, shift, alt, rClick);
        this.bandsIter("resetIdled");
    },
    
    rightClick: false,
    click: function(x, y, ctrl, shift, alt, rClick){
        this.lastAlt = alt; this.lastX = x; this.lastY = y;
        this.prevX = x; this.prevY = y;
        this.rightClick = rClick;

        if(y>=height - grid.getBottomMargin()){
            this.bandsIter("resetEnclosed");
            return;
        }

        this.filterIcon.click(x, y, ctrl, shift, alt, rClick);

        if(!this.isBandIdled()){
            this.monitorBand(-1);

            if(ctrl  && !shift && !rClick && this.canInsertBand){   //tries to insert a band
                var newFilterName = this.filterIcon.displayedIcon;
                
                for(var i in this.bands) if(this.bands[i].insertHere(x,y, newFilterName)){
                    this.lastIdledBand = +i;

                    this.enclosure.reset();
                    this.bandsIter("resetEnclosed");
                    
                    this.selectBand(i);
                    this.paramChanged("activeBandsCount");
                    return;
                }
            }
            else{
                if(!shift) this.bandsIter("resetEnclosed");
                this.enclosure.click(x, y, ctrl, shift, alt, rClick);
            }

            return false;
        }

        if(!this.bands[this.currIdledBand].getIsEnclosed()){
            this.bandsIter("resetEnclosed");
        }

        var doExpandMenu = this.currIdledBand == this.selectedBand && ctrl && shift && !alt;
        
        var retArr = this.bandsIter("click",x, y, ctrl, shift, alt, rClick);

        if(isNotEmpty(retArr)){

            if(ctrl && !(shift || alt || rClick)){ //removes the band
                
                this.monitorBand(-1);
                this.bands[this.currIdledBand].disable();
                this.paramChanged("activeBandsCount");
            }
            
            else if(this.currIdledBand != this.selectedBand){ //selects the band
                this.monitorBand(-1);
                this.selectBand(this.currIdledBand);
            }

            else if(doExpandMenu){   //expands the menu

                var maxOrder = this.bands[this.currIdledBand].getMaxOrder("main");
                this.currBandIsBell = maxOrder==2;

                if(rClick) general.expandSourceTypeMenu(+this.currIdledBand, this.bands[this.currIdledBand].getIsOn("sour"), this.bands[this.currIdledBand].source_typeIndex, this.bands[this.currIdledBand].source_casc*2);
                else       general.expandMainTypeMenu  (+this.currIdledBand, maxOrder, this.bands[this.currIdledBand].typeName, this.bands[this.currIdledBand].N, this.bands[this.currIdledBand].getPan());
            }
        }

        var selBandMonIdled = this.applyToSelectedBand("getMonIsIdled", true);
        if(!doExpandMenu && selBandMonIdled) this.monitorBand(this.selectedBand, rClick);
        
        return true;
    },

    dbclick: function(x, y, ctrl, shift, alt, rClick){
        if(!this.applyToSelectedBand("getIsIdled", true)) return;


        general.expandCopyMenu(this.selectedBand, this.rightClick);
    },

    keyboardClicked: function(freq){
        this.bands[this.selectedBand].setFreq(freq, true);
    },
    keyboardDisplayed: function(){
        // this.bandsIter("refreshPos");
    },

    isBandIdled: function(){
        return this.currIdledBand != -1;

        for(var i in this.bands){
            if(this.bands[i].getIsIdled()) return true;
        }

        return false;
    },
    getIdledBand: function(noMon){
        return this.currIdledBand;
        return this.bandsIter("getIsIdled", noMon).indexOf(true);
    },
    getIdledBandFreqAndGain: function(){
        if(this.currIdledBand == -1) return null;
        return this.bands[this.currIdledBand].getFreqAndGain();
    },
    
    tinyChangeFact: 0.1,
    drag: function(x, y, ctrl, shift, alt, rClick){
        
        var altChanged = alt != this.lastAlt, dX=x-this.lastX, dY=y-this.lastY;
        this.lastAlt = alt; this.lastX = x; this.lastY = y;
        
        if(this.enclosure.relDrag(dX, dY, ctrl, shift, alt)){

            for(var i in this.bands){
                var isEnclosed = this.bands[i].enclose(this.enclosure.actualCoor, shift);
                var doSelect = this.enclosure.setBandEnclosed(i, isEnclosed);
                if(doSelect) this.selectBand(i);
            }
            return;
        }

        var axisMov  = this.bands[this.lastIdledBand].getIsAxisCueIdled();
        var canMoveY = this.bands[this.lastIdledBand].getCanMoveY();
        
        var movX =                                  (axisMov &&  (alt||rClick)) ? 0 : dX * (shift ? this.tinyChangeFact : 1);
        var movY = (!canMoveY && !(alt||rClick)) || (axisMov && !(alt||rClick)) ? 0 : dY * (shift ? this.tinyChangeFact : 1);
        
        if(axisMov && altChanged) this.bandsIter("undoDragMovement");
        
        this.bands[this.lastIdledBand].dragAxisMovCue(x, y, ctrl, shift, alt, rClick);
        
        var movArr =
        this.bands[this.lastIdledBand].relDrag(movX, movY, ctrl, shift, alt && !axisMov, rClick) || [undefined, undefined];


        for(var i in this.bands){
            if(+i == this.lastIdledBand) continue;
            this.bands[i].relDrag(movX, movY, ctrl, shift, alt && !axisMov, rClick, movArr[0], null, movArr[1])
        }
        
    },

    release: function(x, y, ctrl, shift, alt){
        
        if(this.enclosure.release(x, y, ctrl, shift, alt)){
            this.bandsIter("releaseEnclosure");
            return;
        }

        this.bandsIter("release");

        if(!this.isSourceMon) this.monitorBand(-1);
    },

    enclosure: {
        lineW: 1,//1.2,
        coor: [0,0,0,0],       //[x,y,w,h]
        actualCoor: [0,0,0,0], //[x0,y0,x1,y1]
        isActive: false,
        draw: function(){
            if(!this.isActive) return;
            mg.seg_rect(this.coor);
            mg.set_source_rgba(colors.get("lcd"));
            mg.set_line_width(this.lineW);
            mg.stroke();
        },
        click: function(x, y, ctrl, shift, alt, rClick){
            this.coor = [x,y,0,0];
            this.actualCoor = [x,y,x,y];
            this.pixelRoundCoor();
            this.isActive = true;
        },
        relDrag: function(x, y, ctrl, shift, alt, rClick){
            if(!this.isActive) return;
            this.coor[2] += x;
            this.coor[3] += y;
            this.pixelRoundCoor();
            this.calcActualCoor();
            return true;
        },
        release: function(x, y, ctrl, shift, alt, rClick){
            if(!this.isActive) return;
            this.reset();
            return true;
        },
        reset: function(){
            this.coor = [0,0,0,0];
            this.isActive = false;
            this.currEnclosedBands = [];
        },
        pixelRoundCoor: function(){
            this.coor[0] = mg.floorPos(this.coor[0]);
            this.coor[1] = mg.floorPos(this.coor[1]);
        },
        calcActualCoor: function(){
            var 
                _x1 = this.coor[0]+this.coor[2],
                _y1 = this.coor[1]+this.coor[3],
                x0 = Math.min(this.coor[0], _x1),
                y0 = Math.min(this.coor[1], _y1),
                x1 = Math.max(this.coor[0], _x1),
                y1 = Math.max(this.coor[1], _y1)
            ;

            this.actualCoor = [x0,y0,x1,y1];
        },
        currEnclosedBands: [],
        setBandEnclosed: function(index, state){
            if(state && !includes(this.currEnclosedBands, index)){
                this.currEnclosedBands.push(index);
                return true;
            }
            if(!state){
                var arrIndex = this.currEnclosedBands.indexOf(index);
                if(arrIndex == -1) return;
                this.currEnclosedBands.splice(arrIndex, 1);
            }
            return false;
        },
        getLastEnclosedBand: function(){
            return this.lastEnclosedBand;
        },
    },

    currMonBand: -1,
    isSourceMon: false,
    monitorBand: function(n, mode){ //mode: false=main, true=source
        if(this.currMonBand == n) return;
        this.currMonBand = n;

        if(n==-1){
            outlet(0, "dsp", "topLevel", "monitorRouting", 0);
            outlet(0, "dsp", "all", "monitorSource", 0);
            outlet(0, "dsp", "all", "monitorBand", -1); //-1: no mon, 0: bypass: 1: monitoring
            
            analyzer.disableSource(false);

            this.bandsIter("monitor", false);
            this.isMainMon   = false;
            this.isSourceMon = false;

            return;
        }

        
        outlet(0, "dsp", "topLevel", "monitorRouting", mode);
        outlet(0, "dsp", "all", "monitorSource", mode);
        for(var i in this.bands) outlet(0, "dsp", +i, "monitorBand", i == n ? 1 : 0);

        if(!mode) analyzer.disableSource(true);
        
        this.isMainMon   = !mode;
        this.isSourceMon =  mode;
        this.bands[n].monitor(true, this.isSourceMon);

        return;
    },
    
    getIsMonitored: function(mode){
        return this[mode ? "isSourceMon" : "isMainMon"];
    },


    setBand: function(n, func){
        if(!this.bands[n]) return;
        if(typeof this.bands[n][func] != "function") return;
        
        var params = arrayfromargs(arguments).slice(2);
        this.bands[n][func].apply(this.bands[n], params);

        if(func == "setPanIndex")    this.paramChanged("pan");
        if(func == "setSourceView")  this.paramChanged();
        if(func == "setOn")          this.paramChanged("activeBandsCount");
    },

    bandsIter: function(func){
        return iterateApplyOwn(this.bands, func, arrayfromargs(arguments).slice(1));
    },

    isBandSelectionLocked: false,
    lockBandSelection: function(state){
        this.isBandSelectionLocked = state;
    },
    selectBand: function(index){
        if(this.isBandSelectionLocked) return;
        this.selectedBand = index;
        this.paramChanged("selectedBand", {doOutput: true});
    },
    selectedBandParams: function(changed){
        this.calcSelBandRespPos();
        this.calcSelBandSourcePos();

        // post(changed.doOutput);

        if(changed.doOutput){
            outlet(0, "ui", "filterParams", "setSelectedBand", +this.selectedBand);
            // outlet(0, "ui", "selectBand",      +this.selectedBand);
        }
    },
    canInsertBand: true,
    activeBandsCountParams: function(){
        var strRetArr = this.bandsIter("getIsOn", "main").toString();
        var matches = strRetArr.match(/true|1/g);
        this.activeBandsCount = matches==null ? 0 : matches.length;

        this.canInsertBand = this.activeBandsCount<this.bands.length;
        this.filterIcon.setActive(this.canInsertBand);
        // post(this.activeBandsCount);
    },

    panParams: function(){
        this.recalcResp = true;
    },
    gainScaleParams: function(){
        this.bandsIter("recalcYPos");
        this.calcSelBandRespPos();
        this.recalcResp = true;
    },
    spectScaleParams: function(){
        this.bandsIter("recalcSpectPos");
        this.calcSelBandSourcePos();
        this.recalcResp = true;
    },
    srParams: function(){
        this.bandsIter("setSr");
        this.recalcResp = true;
    },
    setSr: function(){
        this.paramChanged("sr");
    },
    isOsPerband: false,
    isOsEnabled: false,
    osParams: function(changed){
        this.isOsPerband = changed.mode;
        this.isOsEnabled = changed.fact != 1;
        this.bandsIter("setOversampling", changed.fact, changed.mode);
        // this.recalcResp = true;
    },
    setOversampling: function(fact, mode){
        this.paramChanged("os", {fact:fact, mode:mode});
    },
    
    dcBlocker: false,
    setDcBlocker: function(state){
        this.dcBlocker = state;
        this.paramChanged("dcBlocker");
        // outlet(0, "dsp", "dcBlocker", this.dcBlocker);
    },
    dcBlockerParams: function(){
        this.recalcResp = true;
    },


    doDispSource: false,
    selectedBand: 0,
    selectedBandChan: "L",
    changed: {},
    recalcResp: false,

    paramChanged: function(param, settings){
        this.changed[param || "default"] = settings || true;
    },

    
    refresh: function(){
        var _changed = false;
        for(var i in this.bands){   //this.bands
            var currBandChanged = this.bands[i].refresh()

            if(currBandChanged) _changed = true;

            if(i == this.selectedBand && currBandChanged){
                this.calcSelBandRespPos();
            }
        }

        if(isNotEmpty(this.changed)){   //this
            for(var i in this.changed){
                if(typeof this[i+"Params"] != "function") continue;
                this[i+"Params"](this.changed[i]);
            }
        
            this.changed = {};
        }

        
        if(_changed || this.recalcResp) this.sumResp();
        
        if(this.recalcResp) this.recalcResp = false;

        if(this.bands[this.selectedBand] && this.doDispSource && this.bands[this.selectedBand].getIsOn("main")){
            if(        
            this.bands[this.selectedBand].refreshSource())
            this.calcSelBandSourcePos();
        }
    },
    recalc: function(){
        this.bandsIter("recalc");
        this.recalcResp = true;
    },

    shownResps: {},
    sumResp: function(){

        
        this.resp = {
            main: {S:[],M:[],R:[],L:[]},
            dyna: {S:[],M:[],R:[],L:[]},
        };

        this.shownResps = {};
        this.isRespStereo = true;
        this.isDynamic = this.bandsIter("getIsOn", "dyna").toString().match(/true|1/g) != null;
        // this.isDynamic = true;

        for(var pixel in u.logTable){   for(var resp in this.resp){
            if(!this.isDynamic && resp=="dyna") continue;
            for(var band in this.bands){
                if(!this.bands[band].getIsOn("main")) continue;
                
                if(includes(["L", "R"], this.bands[band].getPan())) this.isRespStereo = false;
                
                for(var chan in this.getBandPanObj(band)){
                    this.shownResps[chan] = true;

                    if(!this.resp[resp][chan][pixel]){
                        this.resp[resp][chan][pixel] = new ComplexResp(this.dispPhase);
                    }

                    this.resp[resp][chan][pixel].mult( this.bands[band].getResp(resp, pixel) );
                } 
            }
            
            if(!this.dcBlocker) continue;

            if(!isNotEmpty(this.shownResps)) this.shownResps.L = true;

            for(var chan in this.shownResps){
                if(chan == "S") continue;

                if(!this.resp[resp][chan][pixel]){
                    this.resp[resp][chan][pixel] = new ComplexResp(this.dispPhase);
                }

                this.resp[resp][chan][pixel].mult( dcFilter.blocker(pixel, this.dispPhase) );
            }
        }}

        this.calcRespPos();

    },
    getBandPanObj: function(bandNum){
        var pan = this.bands[bandNum].getPan();
        var panObj = {};
        if(pan == "Stereo"){
            panObj.L = true;
            panObj.R = true;
        }
        else panObj[pan] = true;

        return panObj;
    },
    applyResp: function(_resp1, _resp2){    //complex mult

        var resp1 = this.intiResp(_resp1);
        // var resp2 = this.intiResp(_resp2);
        
        return this.dispPhase ?
            resp1 + _resp2 :
            resp1 * _resp2
        ;
    },

    intiResp: function(resp){
        return (typeof resp != "undefined") ? resp : (this.dispPhase ? 0 : 1);
    },


    selBandRespPos: [],
    calcRespPos: function(){
        this.respPos = {
            dyna: {S: [], M: [], R:[], L:[]},
            main: {S: [], M: [], R:[], L:[]},
        };
    

        for(var dyn in this.resp){
            if(!this.isDynamic && dyn=="dyna") continue;
            
            for(var chan in this.resp[dyn]){
                if(chan == "R" && this.isRespStereo) continue;
                
                for(var i in this.resp[dyn][chan]){
                    this.respPos[dyn][chan][i] = this.toPos(this.resp[dyn][chan][i].get(), this.dispPhase);
                    this.correctPhasePos(this.respPos[dyn][chan], i);
                }
                
            }
        }

    },

    calcSelBandRespPos: function(){
        // return;
        this.selBandRespPos = [];
        
        if(!this.bands[this.selectedBand]) return;
        if(!this.bands[this.selectedBand].getIsOn("main")) return;

        for(var i in u.logTable){
            this.selBandRespPos[i] = this.toPos(this.bands[this.selectedBand].getResp("dyna", i), this.dispPhase);
            this.correctPhasePos(this.selBandRespPos, i);
        }
    },
    correctPhasePos: function(posArray, index){ //SIDE EFFECTs!!
        if(!this.dispPhase) return;
        if(index==0) return;

        var posThresh = 40;
        var diff = posArray[index-1]-posArray[index];
        var usableH = u.getRespHeight(false);

        if(diff < usableH-posThresh) return;

        posArray[index-1] = usableH; 
        posArray[index]   = 0;
    },
    selBandSourcePos: [],
    calcSelBandSourcePos: function(){
        // return;
        this.selBandSourcePos = [];
        if(!this.bands[this.selectedBand]) return;
        if(!this.bands[this.selectedBand].getIsOn("sour")) return;
        // if(!this.bands[this.selectedBand].getIsSourceFilterView()) return;

        for(var i in u.logTable){
            this.selBandSourcePos[i] = this.toPos(this.bands[this.selectedBand].getResp("sour", i), doDispSourcePhase && this.dispPhase, true);
            this.correctPhasePos(this.selBandSourcePos, i);
        }
    },

    toPos: function(val, doCalcPhase, isOnSpectScale){
        return u[doCalcPhase ? "phaseToPos" : (isOnSpectScale ? "spectAmpToPos" : "ampToPos")](val);
    },

    orderedResp: {S:null,M:null,R:null,L:null},
    drawResp: function(){
        mg.set_line_join("round");
        this.drawSourceResp();
        this.drawSelBandResp();


        if(!isNotEmpty(this.shownResps)){
            mg.line(0, u.zeroDBPos, u.fMaxPos, u.zeroDBPos);
            mg.set_source_rgba(colors.get("LResp"));
            mg.set_line_width(this.mainLineW);
            mg.stroke();
            return;
        }

        for(var chan in this.orderedResp){
            if(!this.shownResps[chan]) continue;
            // if(chan == "R" && this.isRespStereo) continue;

            for(var dyn in this.respPos){
                
                if(!this.isDynamic && dyn=="dyna") continue;

                mg.beginScaling();
                
                var posY;// = u.zeroDBPosI;
                // mg.move_to(0, posY);
                for(var i in this.respPos[dyn][chan]){

                    posX = i;
                    posY = this.respPos[dyn][chan][i];
                    
                    if(i==0){
                    mg.move_to(posX, posY); continue;}
                    mg.line_to(posX, posY);

                }
                // mg.line_to(u.fMaxPos, posY);

                mg.endScaling();
                mg.set_source_rgba(colors.get(chan+"Resp", dyn=="main" ? 1 : this.dynaAlpha));
                // mg.set_line_width(chan=="R" ? 2.5 : 1.4);
                mg.set_line_width(chan=="L" ? this.mainLineW : this.mainLineWThin);
                mg.stroke();
                
            }

        }
    },

    drawSelBandResp: function(){
        if(!isNotEmpty(this.selBandRespPos)) return;
        
        mg.beginScaling();

        var posY;
        for(var i in this.selBandRespPos){
            posY = this.selBandRespPos[i];
            if(i==0){
            mg.move_to(i, posY); continue;}
            mg.line_to(i, posY);
        }

        mg.line_to(u.fMaxPosI, posY);
        mg.line_to(u.fMaxPosI, u.zeroDBPosI);
        mg.line_to(0, u.zeroDBPosI);
        mg.close_path();

        mg.endScaling();

        this.selectedBandChan = this.bands[this.selectedBand].getPan();
        if(this.selectedBandChan == "Stereo") this.selectedBandChan = "L";

        mg.set_source_rgba(colors.get(this.selectedBandChan+"Resp", this.repsAlpha));
        // mg.stroke_preserve();
        mg.fill();
    },
    drawSourceResp: function(){
        if(!this.doDispSource) return;
        if(!this.bands[this.selectedBand].getIsSourceFilterView()) return;
        
        var sourceRespPos = this.selBandSourcePos;
        if(!isNotEmpty(sourceRespPos) || !this.bands[this.selectedBand].getIsOn("main")){

            var yPos = (doDispSourcePhase && this.dispPhase) ? u.zeroDBPos : u.zeroDBPosSpect;
            mg.line(0, yPos, u.fMaxPos, yPos);

        }
        else{
            mg.beginScaling();
            
            for(var i in sourceRespPos){
                if(i==0){
                mg.move_to(i, sourceRespPos[i]); continue;}
                mg.line_to(i, sourceRespPos[i]);
            }
            
            mg.endScaling();
            
        }
        
        mg.set_source_rgba(colors.get("green"));
        mg.set_line_width(this.sourceLineW);
        mg.stroke();

    },

    dispPhase: false,
    setPhase: function(state){
        this.dispPhase = state;
        this.bandsIter("setPhase", state);
        // this.paramChanged();
    },

    displaySource: function(state){
        this.doDispSource = state;
        this.paramChanged("source");
    },

    setSelectedBand: function(bandNum){
        var newlySelected = u.clip(bandNum, 0, 5);
        if(this.selectedBand == newlySelected) return;
        
        this.selectedBand = newlySelected;
        this.paramChanged("selectedBand");
        
        if(this.getIsMonitored(true)) this.monitorBand(-1);
    },
    setGainFact: function(glo, gr){
        this.bandsIter("setScale", glo, gr);
    },
    setGainClip: function(min, max){
        this.bandsIter("setClip", min, max);
    },
    setGainOffset: function(val){
        this.bandsIter("setGainOffset", val);
    },
    setFreqOffset: function(val){
        this.bandsIter("setFreqOffset", val);
    },

    copyMenu: function(setting){
        if(setting==0 || setting==1 || setting==8) return;
        var targetIndex = (setting-1)%7 - 1;
        // post(setting, targetIndex);
        if(!this.bands[targetIndex]) return;
        if(targetIndex == this.selectedBand) return;

        if(setting<=7) this.applyToSelectedBand("copyFrom", this.bands[targetIndex], this.rightClick);
        if(setting>7) this.bands[targetIndex].copyFrom(this.bands[this.selectedBand], this.rightClick);
    },
    mainTypeMenu: function(setting){
        var typeFirstIndex = 4;
        var orderFirstIndex = 13;
        var panFirstIndex = this.currBandIsBell ? 15 : 21;


        if(setting<typeFirstIndex) return;
        

        if(setting<orderFirstIndex){ //type
            var targetIndex = (setting-typeFirstIndex);
            var newType = ["bell", "lowshelf", "highshelf", "highpass", "lowpass", "bandpass", "bandstop"][targetIndex];
            this.applyToSelectedBand("setTypeName", newType, true);
        }
        else if(setting<panFirstIndex){ //order
            var targetIndex = setting-orderFirstIndex;
            var newOrder = [2,4,8,16,32,64][targetIndex];
            this.applyToSelectedBand("setCasc", newOrder/2, true);
        }
        else {  //pan
            var targetIndex = setting - panFirstIndex;
            this.applyToSelectedBand("setPanIndex", targetIndex, true);
            this.panParams();
        }
    },
    sourceTypeMenu: function(setting){
        var onOffFirstIndex = 2;
        var typeFirstIndex = 6;
        var orderFirstIndex = 13;

        if(setting<onOffFirstIndex) return;

        if(setting<typeFirstIndex){
            this.applyToSelectedBand("source_setIsOn", setting>onOffFirstIndex, true);
        }
        else if(setting<orderFirstIndex){
            var targetIndex = setting-typeFirstIndex;
            var newType = ["Follow", "bandpass", "bandstop", "highpass", "lowpass"][targetIndex];
            var newTypeIndex = [0,1,4,2,3][targetIndex];
            this.applyToSelectedBand("source_setTypeIndex", newTypeIndex, true);
        }
        else{
            var targetIndex = setting-orderFirstIndex;
            var newOrder = [2,4,8,16,32,64][targetIndex];
            this.applyToSelectedBand("source_setCasc", newOrder/2, true);
        }
        
    },
    applyToSelectedBand: function(func){
        if(!this.bands[this.selectedBand]) return;

        var params = arrayfromargs(arguments).slice(1);
        return this.bands[this.selectedBand][func].apply(this.bands[this.selectedBand], params);
    },
};

function Spectrum(parent, name, isOn){

    this.parent = parent;
    this.name = name;
    this.isOn = isOn;

    this.bufferObj = new Buffer(deviceUniqueId + this.name+"Spect");
    
    
    // this.subsampSize = 2;// 1.5; //in pixels
    // this.frameSkip = 0;
    // this.pixDClip = 6;//pixels per frame, 0 is no deltaclip
    // this.roundCorners = 5;
    
    this.count = -1;
    this.noInput = true;
    this.noSpect = true;
    this.spectPos = [];
    
    this.spectPosPeaks = [];

    this.spectMag = [];
    this.complexSpect = [];
    
    this.initialize = function(){

    };

    this.dispOffs = 4;
    this.display = function(drawPeaks){
        if(!this.isOn || this.isDisabled) return;
        
        //must draw all spectra then draw tehir peaks for correct alpha blending
        if(!drawPeaks && !this.noSpect) this.drawSpect(1, this.name+"Spect",      this.parent.lineW);
        if(drawPeaks)                   this.drawSpect(0, this.name+"SpectPeaks", this.parent.lineWPeaks, this.spectPosPeaks);
    };

    this.drawSpect = function(mode /*0 or undefined: line, 1: fill*/, colorName, lineW, altBuffer){

        mg.beginScaling();

        mg.save();
        mg.translate(0, u.zeroDBPosSpectI);
        mg.scale(1, parent.spectZoomY);
        mg.translate(0, -u.zeroDBPosSpectI);

        for(var i in this.spectPos){
            var posX = (i==0) ? -this.dispOffs : (i==this.spectPos.length-1 ? u.fMaxPosI : this.spectPos[i][0]);;
            var posY = altBuffer && altBuffer[i] ? altBuffer[i] : this.spectPos[i][1];

            if(i==0){
            mg.move_to(posX, posY); continue};
            mg.line_to(posX, posY);
            
        }

        if(mode){
            mg.line_to(u.fMaxPosI    , initH+this.dispOffs);
            mg.line_to(-this.dispOffs, initH+this.dispOffs);
            mg.close_path();
        }

        mg.set_line_join("round");
        if(parent.roundCorners) mg.path_roundcorners(parent.roundCorners);

        mg.restore();
        mg.endScaling();
        
        if(mode){
            mg.set_source_rgba(colors.get("spectrumFill"));
            mg.fill_preserve();
        }

        mg.set_source_rgba(colors.get(colorName));
        mg.set_line_width(lineW);
        mg.stroke();
    };
    
    this.calc = function(){
        
        if(!this.isOn) return;
        if(this.noInput && this.noSpect) return false;
        if(this.isDisabled) return;
        
        this.checkForResetSilent();

        this.calcBuffer();

        this.applyWindow();

        this.parent.FFT.realTransform(this.complexSpect, this.buffer);

        this.calcMag();
        
        this.applyTilt();

        this.calcPos();
        
        return !(this.noInput && this.noSpect);

    };
    this.getInpBuffer = function(){
        if(!this.isOn) return;
        if(this.isDisabled) return;

        this.inpBuffer = this.bufferObj.peek(1, 0, this.parent.size+2);
        this.noInput = this.inpBuffer[0] ? 0 : 1;
    },
    this.calcBuffer = function(){
        this.buffer = this.inpBuffer.slice(this.inpBuffer[1]).concat(this.inpBuffer.slice(2, this.inpBuffer[1]));
    };
    this.applyWindow = function(){
        for(var i in this.buffer) this.buffer[i] *= this.parent.getWindowFunc(i);
    };

    this.calcMag = function(){

        var currMax = 0;
        var currMaxI = 0;

        var subsampCount = 0;
        for(var i in this.parent.binToPixel){

            var re = this.complexSpect[2*i   ] || 0;
            var im = this.complexSpect[2*i +1] || 0;
            var mag2 =  re*re + im*im;

            if(i==0) currMax = mag2;

            if(i==0 || i==this.parent.binToPixel.length-1 || this.parent.binToPixelR[i] != this.parent.binToPixelR[i-1]){    //writes the current max
                

                var posX = this.parent.binToPixelR[currMaxI];
                var binMag = Math.sqrt(currMax);
    
                this.spectMag[subsampCount] = [posX, binMag];

                currMax = mag2;
                currMaxI = i;

                subsampCount++;

                continue;
            }

            if(currMax < mag2){ //saves the current max
                currMax = mag2;
                currMaxI = i;
            }
        }

    };

    this.applyTilt = function(){
        if(!parent.pixToTilt) return;
        
        for(var i in this.spectMag){
            // var pixel = Math.max(0, this.spectMag[i][0]);
            var pixel = this.spectMag[i][0] > 0 ? this.spectMag[i][0] : 0; //ternary performed 25% better than Mah.max, with direct comparison slightly better than the or equals

            this.spectMag[i][1] *= parent.pixToTilt[pixel] || 1;
        }
    };

    this.calcPos = function(){
        this.noSpect = true;

        for(var i in this.spectMag){

            var posX = this.spectMag[i][0];
            var posY = this.magToPos(this.spectMag[i][1]);

            posY = u.clip(posY, 0, initH+this.dispOffs);
            posY = this.ramp(i, posY);

            
            if(posY<initH) this.noSpect = false;
            
            this.spectPos[i] = [posX, posY];
            if(this.spectPosPeaks[i] == undefined || posY < this.spectPosPeaks[i]) this.spectPosPeaks[i] = posY;
        }
    };

    this.ramp = function(index, poY){
        if(!parent.pixDClipU && !parent.pixDClipD) return poY;
        if(typeof this.spectPos[index] == "undefined") return poY;

        var clipedUp   = !parent.pixDClipU ? poY      : Math.max(poY,      this.spectPos[index][1] - parent.pixDClipU);
        var clipedDown = !parent.pixDClipD ? clipedUp : Math.min(clipedUp, this.spectPos[index][1] + parent.pixDClipD);

        return clipedDown;
    };

    this.magToPos = function(mag){
        return u.specialSpectAmpToPos(2*mag/this.parent.size);
        return u.spectAmpToPos(2*mag/this.parent.size);
    };
    this.setSize = function(size){
        this.parent.size = size;
        this.initialize();
    };
    this.setWindFunc = function(){

    };
    this.isResetSilent = false;
    this.resetSilent = function(){
        this.isResetSilent = true;
    };

    this.checkForResetSilent = function(){        
        if(!this.isResetSilent) return;
        this.isResetSilent = false;
        
        this.reset(true);
    };
    this.resetSpect = function(silent){
        this.spectMag = [];
        this.spectPos = [];

        if(!silent) this.noSpect = true;
    };    
    this.resetPeaks = function(){
        this.spectPosPeaks = [];
    };
    this.reset = function(silent){
        this.resetSpect(silent);
        this.resetPeaks();
    };
    this.timeout = function(){
        this.resetSpect();
    };
    this.setIsOn = function(state){
        this.isOn = state;

        if(!this.isOn){
            this.bufferObj.send("clear");
            this.reset();
        }
    };
    this.disable = function(state){
        this.isDisabled = state;
    };

    this.initialize();

};

// var windowsGainComp = {      //actual values
//     none: 1,
//     hann: 2,
//     hamming: 1.84,
//     blackman: 2.344,
//     triangle: 2,
//     flatTop: 4.638,
//     gaussian: 3.192,
//     nuttall: 2.81,
// };
var constGainComp = 1.15;
var windowsGainComp = {         //values that give acurate plotting with path_roundcorners()
    none:      constGainComp * 1,
    hann:      constGainComp * 2,
    hamming:   constGainComp * 1.87,
    blackman:  constGainComp * 2.29,
    triangle:  constGainComp * 2.03,
    flatTop:   constGainComp * 3.9,
    gaussian:  constGainComp * 2.95,
    nuttall:    constGainComp * 2.64,
};
var windFunc = {
    none: function(norm){
        return windowsGainComp.none     * ( 1 );
    },
    hann: function(norm){
        return windowsGainComp.hann     * ( Math.pow(Math.sin(Math.PI * norm), 2) );
    },
    hamming: function(norm){
        return windowsGainComp.hamming  * ( 0.54347826 - (1-0.54347826)* Math.cos(2*Math.PI*norm) );
    },
    blackman: function(norm){
        return windowsGainComp.blackman * ( 0.42659 - 0.49656*Math.cos(2*Math.PI*norm) + 0.076849*Math.cos(4*Math.PI*norm) );
    },
    triangle: function(norm){
        return windowsGainComp.triangle * ( norm<0.5 ? norm*2 : 2- norm*2 );
    },
    flatTop: function(norm){
        return windowsGainComp.flatTop  * ( 0.21557895- 0.41663158*Math.cos(2*Math.PI*norm) + 0.277263158*Math.cos(4*Math.PI*norm) - 0.083578947*Math.cos(6*Math.PI*norm) + 0.006947368*Math.cos(8*Math.PI*norm) );
    },
    gaussian: function(norm){
        return windowsGainComp.gaussian * ( Math.exp(-32*Math.pow(norm-0.5, 2)) );
    },
    nuttall: function(norm){
        return windowsGainComp.nuttall  * ( 0.355768- 0.487396*Math.cos(2*Math.PI*norm) + 0.144232*Math.cos(4*Math.PI*norm) - 0.012604*Math.cos(6*Math.PI*norm) );
    },
};

var targetFPS = 30;
var iTargetTime = targetFPS/(1000) * 2;// 4;
var analyzer = {

    size: 2048,
    currentWindow: "hann",
    
    windowsList: ["none","hann","hamming","blackman","triangle","flatTop","gaussian","nuttall"],
    spectraList: ["input", "output", "source"],

    isOn: {
        input: false,
        output: false,
        source: false,
    },
    
    lineW: 1,
    lineWPeaks: 1,
    subsampSize: 2,// 1.5; //in pixels
    _pixDClipU: 0,//pixels per frame, 0 is no deltaclip
    _pixDClipD: 6,
    roundCorners: 5,
    frameSkip: 0,
    autoFrameSkip: true,
    tilt: 0,// dB/Octaves
    doDisplayPeaks: false,
    isFocus: false,

    timeout: function(){
        this.spectIter("timeout");
    },

    initialize: function(){        
        this.FFT = new FFT(this.size);
        
        this.calcPixDClip();
        this.calcBinToPixel();
        this.calcWindowFunc();
        this.calcPixToTilt();

        this.spectra = [
            new Spectrum(this, "input",  this.isOn.input),
            new Spectrum(this, "output", this.isOn.output),
            new Spectrum(this, "source", this.isOn.source),
        ];
    },
    

    calcBinToPixel: function(){
        this.binToPixel = [];
        this.binToPixelR = [];

        for(var bin=0; bin< this.size/2; bin++){    //real FFT, from 0 to nyq instead of sr
            
            var currFreq = 2*u.nyq * bin/this.size;

            var pixel = u.freqToPos(currFreq);
            
            this.binToPixel[bin] = pixel;
            this.binToPixelR[bin] = bin==0 ? 0 : ~~(Math.round(pixel/this.subsampSize) * this.subsampSize); //~~ (double bitwise not) floors the value, avoinding 17.0000458 like floating point errors
            
            // if(!script.isWind) post("\n", bin, this.binToPixelR[bin].toFixed(10));
        }
    },
    
    calcWindowFunc: function(){
        
        this.windows = {};
        for(var i in windFunc) this.windows[i] = [];
        
        for(var bin=0; bin< this.size; bin++){    //input still is of size this.size
            var norm = bin/this.size;
            for(var i in windFunc) this.windows[i][bin] = windFunc[i](norm);
        }
    
    },
    calcPixToTilt: function(){
        this.pixToTilt = [];

        var slopeDB = this.tilt * u.numberOfOctaves;

        for(var i=0; i<=u.fMaxPosI; i++){
            var pixelGainDB = slopeDB * (i/u.fMaxPosI - 0.5);
            this.pixToTilt[i] = u.dBToAmp(pixelGainDB);
        }
    },

    setSr: function(){
        this.initialize();
    },
    setSize: function(size){
        this.size = size;
        this.initialize();
    },
    setWindFuncIndex: function(windowIndex){
        if(windowIndex == undefined) return;

        this.currentWindow = this.windowsList[windowIndex] || "hann";
    },
    getWindowFunc: function(bin, useHann){
        return this.windows[this.currentWindow][bin];
    },
    setOn: function(spect, state){
        this.isOn[spect] = state;
        
        var spectIndex = this.spectraList.indexOf(spect);
        if(spectIndex == -1) return;

        this.spectra[spectIndex].setIsOn(state);

    },
    calcPixDClip: function(){   //should add 2 callback functions to optimize and reduce a single multiplication each frame
        var dClipFact = (1 - general.getIsSScaleExtended()*0.5) * (this.frameSkip+1);
        this.pixDClipU = this._pixDClipU * dClipFact;
        this.pixDClipD = this._pixDClipD * dClipFact;
    },
    
    count: 0,
    spectZoomY: 2,
    display: function(calledOnFocus){
        if(!general.getDeviceEnabled()) return;
        if(+calledOnFocus != this.isFocus) return;

        if(!this.getIsFocus()) colors.applyGlobalAlpha(SPECT_ALPHA_NOT_FOCUS);

        this.count++;
        this.spectZoomY = 2/(1 + general.getIsSScaleExtended());
        
        if(this.count % (this.frameSkip + 1) == 0){
            
            var time0 = max.time;
            this.spectIter("getInpBuffer");                                             //gets the input
            var calcRet = this.spectIter("calc");                                       //calcs FFT
            
            if(this.autoFrameSkip && includes(calcRet, true)){                          //sets lag acording to calc time
                var timeInterval = max.time - time0;
                this.frameSkip = Math.max(0, Math.round(timeInterval * iTargetTime) - 1);    
                // post("\n", this.frameSkip);
            }

            this.calcPixDClip();
        }

        this.spectIter("display");
        if(this.doDisplayPeaks) this.spectIter("display", true);

        colors.resetGlobalAlpha();
    },

    resize: function(){

    },
    mouseDrag: false,
    hasBeenClicked: false,
    click: function(){
        this.mouseDrag = false;
        this.hasBeenClicked = true;
        return false;
    },
    drag: function(){
        this.mouseDrag = true;
        return false;
    },
    release: function(){
        if(this.mouseDrag) return;
        if(!this.hasBeenClicked) return;
        this.hasBeenClicked = false;
        
        this.spectIter("resetPeaks");
    },
    calc: function(){
        this.spectIter("calc");
    },
    spectIter: function(func){
        return iterateApplyOwn(this.spectra, func, arrayfromargs(arguments).slice(1));
    },
    disableSource: function(state){
        this.spectra[2].disable(state);
    },
    setScriptOn: function(state){
        if(!state) this.spectIter("reset");
    },

    /*---------------- v1.1 New feature ----------------*/

    setTilt: function(val){
        // post("setTilt");
        this.tilt = val;
        this.calcPixToTilt();
    },

    setRise: function(val){
        this._pixDClipU = this.normToPixDClip(val);
        // this.calcPixDClip(); //called on display()
    },
    setFall: function(val){
        this._pixDClipD = this.normToPixDClip(val);
        // this.calcPixDClip(); //called on display()
    },
    normToPixDClip: function(val){
        var floatVal = !val ? 0 : map(val, 0, 1, 45, 0.25, 0.198413);
        // post(floatVal);
        // floatVal = Math.round(floatVal);
        return floatVal;
    },

    setAcc: function(val){
        this.subsampSize = map(val, 0, 1, 10, 0.5, 0.247928);
        
        this.calcBinToPixel();
        this.spectIter("resetSilent");
    },
    setEcoMode: function(state){
        if(this.autoFrameSkip == +state) return;

        this.autoFrameSkip = state;
        this.frameSkip = 0;
    },
    setDisplayPeaks: function(state){
        this.spectIter("resetPeaks");
        this.doDisplayPeaks = state;
    },

    setFocus: function(state){
        this.isFocus = state;
    },
    getIsFocus: function(){
        return +this.isFocus;
    },
};


var grid = {
    freqUnit: 1, //2 gives 20, 200, 2000 ...

    dispPhase: false,
    dispNote: false,
    fontSize: 9,

    freqLineLim: 46,//44,
    tMarginL: 29, tMarginR: 29,
    lMarginL: 41, lMarginR: 41,
    tMarginB: 8.2,  lMarginB: 16,
    lMarginT: 0,

    textBGW: 18,  textBGH: 22,
    gainMarginTop: 0,

    getBottomMargin: function(){
        return this.lMarginB;
    },
    getRightMargin: function(){
        return this.lMarginR;
    },
    getTextRightMargin: function(){
        return this.tMarginR;
    },

    getBottomEdge: function(){
        return height - this.lMarginB;
    },

    initialize: function(){
        this.lines = {};
        this.texts = {};

        this.setupSpectGrid();
        this.setupGainGrid();
        this.setupPhaseGrid();
        this.setupFreqGrid();
    },
    xFact: 1, yFact: 1,
    resize: function(xFact, specialFact){
        this.xFact *= xFact;
        this.resetFreqScaleLineY();

        for(var type in this.lines) for(var j in this.lines[type]) this.lines[type][j].resize(xFact, specialFact, this);
        for(var type in this.texts) for(var j in this.texts[type]) this.texts[type][j].resize(xFact, specialFact, this);
    },
    pushGainItems: function(gain){
        var posY = u.gainToPos(gain, true);
        if(!this.isChanging) posY = mg.floorPos(posY); //to avoid a ladder like transition
        
        if(posY<this.lMarginT) return;
        if(posY>height-this.lMarginB) return;

        this.lines.gain.push({
            type: "gain",
            x0: this.lMarginL,
            y0: posY,
            x1: width-this.lMarginR,
            y1: posY,
            resize: function(xFact, yFact, parent){
                this.x1 = width-parent.lMarginR;
                
                if(!this._currY0) this._currY0 = this.y0;
                this._currY0 *= yFact;
                this.y0 = mg.floorPos(this._currY0);
                this.y1 = this.y0;
            },
        });

        this.texts.gain.push ({
            type: "gain",
            x: this.tMarginL,
            y: posY,
            text: replaceHyphen(gain),
            justif: "right",
            resize: function(xFact, yFact, parent){
                this.y *= yFact;
            },
        });
    },
    setupGainGrid: function(){
        this.lines.gain = [];
        this.texts.gain = [];
        
        if(u.gainMin+u.gainStep>u.gainMax) return;
        for(var gain = u.gainStep; gain<u.gainMax; gain+=u.gainStep) this.pushGainItems(gain);    
        for(var gain = 0         ; gain>u.gainMin; gain-=u.gainStep) this.pushGainItems(gain);    

    },
    pushSpectItems: function(gain){

        var posY = u.spectGainToPos(gain, true);
        
        if(posY<this.lMarginB) return;
        if(posY>height-this.lMarginB) return;
        
        this.lines.spect.push({
            type: "spect",
            x0: this.lMarginL,
            y0: posY,
            x1: width-this.lMarginR,
            y1: posY,
            resize: function(xFact, yFact, parent){
                this.x1 = width-parent.lMarginR;
                this.y0 *= yFact;
                this.y1 *= yFact;
            },
        });

        this.texts.spect.push({
            type: "spect",
            x: width-this.tMarginR,
            y: posY,
            text: replaceHyphen(gain==0 ? "    0" : gain),
            justif: "left",
            resize: function(xFact, yFact, parent){
                this.x = width-parent.tMarginR;
                this.y *= yFact;
            },
        });
    },
    setupSpectGrid: function(){
        this.lines.spect = [];
        this.texts.spect = [];
        
        // for(var gain = 0; gain<u.spectMax;  gain+=u.spectStep) this.pushSpectItems(gain);
        for(var gain = 0; gain>u.spectMin; gain-=u.spectStep) this.pushSpectItems(gain);
            
        
    },
    setupPhaseGrid: function(){
        this.lines.phase = [];
        this.texts.phase = [];

        var phaseList = [
            {text: "2π/3",  pos: 1*(height/*initH*/-this.lMarginB)/6},
            {text: "π/3",   pos: 2*(height/*initH*/-this.lMarginB)/6},
            {text: "0",     pos: 3*(height/*initH*/-this.lMarginB)/6},
            {text: "-π/3",  pos: 4*(height/*initH*/-this.lMarginB)/6},
            {text: "-2π/3", pos: 5*(height/*initH*/-this.lMarginB)/6},
        ];
        
        for(var i in phaseList){
            
            var text = phaseList[i].text;
            var posY = phaseList[i].pos;

            this.texts.phase.push({
                type: "phase",
                x: this.tMarginL,
                y: posY,
                text: text,
                justif: "right",
                resize: function(xFact, yFact, parent){
                    this.y *= yFact;
                },
            });
        }
    },
    
    setupFreqGrid: function(){
        this.lines.freq = [];
        this.texts.freq = [];

        this.resetFreqScaleLineY();

        var fact10 = this.freqUnit * Math.pow(10, Math.floor(Math.log(u.fMin)/Math.log(10)));
        var freq = fact10;

        while(freq<u.fMax){
            
            freq = roundTo(freq+fact10, 0.01);
            var newFact10 = roundTo(fact10*10, 0.01);
            if(newFact10 == freq) fact10 = newFact10;

            var pos = u.freqToPos(freq, true);
            pos = mg.floorPos(pos);


            if(pos<       this.xFact * this.freqLineLim) continue;
            if(pos>width- this.xFact * this.freqLineLim) return;

            this.lines.freq.push({
                type: "freq",
                isFreq: true,
                x0: pos,
                y0: 0,
                x1: pos,
                y1: height,
                color: (fact10==freq) ? "gridCColor" : null,
                resize: function(xFact, yFact, parent){
                    
                    if(!this._currX0) this._currX0 = this.x0;
                    this._currX0 *= xFact;
                    this.x0 = mg.floorPos(this._currX0);
                    this.x1 = this.x0;
                    
                    this.y1 = height;
                },
            });
            
            // var textPosY = Math.round(height-this.tMarginB) + 0.5;
            var textPosY = height-this.tMarginB;
            if(fact10==freq){
                this.texts.freq.push({
                    type: "freq",
                    isFreq: true,
                    x: pos,
                    y: textPosY,
                    text: freq/1000 < 1 ? freq : freq/1000+"K",
                    justif: "capital",
                    color: (fact10==freq) ? "gridCColor" : null,
                    resize: function(xFact, yFact, parent){
                        this.x *= xFact;
                        this.y = height-parent.tMarginB;
                    },
                });
            }
        }
    },
    resetFreqScaleLineY: function(){
        // this.freqScaleLineY = height-this.lMarginB;
        this.freqScaleLineY = mg.floorPos(height-this.lMarginB, -0.5);
    },
    display: function(){
        for(var type in this.lines) for(var j in this.lines[type]){
            if(type=="spect" && !general.getIsScaleRamping("spect")) continue;
            if(type=="gain"  &&  general.getIsScaleRamping("spect") && !general.getIsScaleRamping("gain")) continue;
            
            mg.line(
                this.lines[type][j].x0,
                this.lines[type][j].y0,
                this.lines[type][j].x1,
                this.lines[type][j].y1
            );

            mg.set_source_rgba(colors.get(this.lines[type][j].color || "gridColor"));
            // mg.set_line_width(this.lines[type][j].lineW || 0.5);
            mg.set_line_width(0.5);
            mg.stroke();
        }
        
        mg.select_font_face("Ableton Sans Medium");
        mg.set_font_size(this.fontSize);

        for(var type in this.texts) for(var j in this.texts[type]){
            if(type == (this.dispPhase ? "gain" : "phase")) continue;
            if(type == "freq") continue;

            mg.text_path_centered(
                this.texts[type][j].x,
                this.texts[type][j].y,
                this.texts[type][j].text,
                this.texts[type][j].justif,
                null, !this.isChanging
            );
        }
        mg.set_source_rgba(colors.get("gridCColor"));
        mg.fill();
    },

    dispOffs: 4,
    displayFreqScale: function(){
        mg.set_line_width(1);
    
        mg.rectangle(
            -this.dispOffs,
            this.freqScaleLineY,
            width               + this.dispOffs*2,
            this.lMarginB       + this.dispOffs
        );
        
        mg.set_source_rgba(colors.get("lcdBg"));
        mg.fill();
        
        mg.select_font_face("Ableton Sans Medium");
        mg.set_font_size(this.fontSize);
        for(var i in this.texts.freq){            
            mg.text_path_centered(
                this.texts.freq[i].x,
                this.texts.freq[i].y,
                this.texts.freq[i].text,
                this.texts.freq[i].justif,
                null, !this.isChanging
            );
        }
    
        mg.set_source_rgba(colors.get("gridCColor"));
        mg.fill();
        
    },

    displayFreqScaleLine: function(){
        // mg.set_line_width(1);
        mg.set_line_width(0.5);
        mg.line(0, this.freqScaleLineY, width, this.freqScaleLineY);
        mg.set_source_rgba(colors.get("gridCColor"));
        mg.stroke();
    },

    setDispPhase: function(state){
        this.dispPhase = state;
    },
    isChanging: false,
    setIsChanging: function(state){
        this.isChanging = state;
    },

    isOnLeftScale: function(x, y){
        return x < this.lMarginL;
    },
    isOnRightScale: function(x, y){
        return x > width - this.lMarginR;
    },
    isOnBottomScale: function(x, y){
        return y > height - this.lMarginB;
    },
};


function Key(_noteNum, _x, _y, _w, _h, _isBlackKey){
    
    this.noteNumber = _noteNum;
    this.isBlackKey = _isBlackKey;
    this.freq = u.midiToFreq(this.noteNumber);
    this.noteName = u.midiToNoteName(this.noteNumber);
    
    this.velocities = [];
    this.color = this.isBlackKey ? "blackKey" : "whiteKey"; //: (false && this.noteName[0] == "C" ? "lcdBgDark" : "lcdBg");
        
    this.x = _x;
    this.y = _y;
    this.w = _w;
    this.h = (this.isBlackKey ? 0.5 : 1.2) * _h;
    
    this.h0 = _h;
    this.x0 = this.x-this.w/2;
    this.w0 = _w;
    
    this.setupWKCoors = function(){ //grow dir
        if(this.isBlackKey){
               return;
        }
        else if(this.noteNumber%12==4 || this.noteNumber%12==11){        //Left
            this.x0 -= this.w0/2;
            this.w  += this.w0/2;
            return;
        }
        else if(this.noteNumber%12==5 || this.noteNumber%12==0 ){        //Right
            this.x0 -= 0;
            this.w  += this.w0/2;
            return;
        }
        else{                                                            //Both
            this.x0 -= this.w0/2;
            this.w  += this.w0;
            return;
        }
    };
    this.calcCoors = function(){
        this.coor = [this.x0, this.y, this.x0+this.w, this.y+this.h];
        this.rectCoor = [this.x0, this.y-0.5, this.w, this.h+0.5];
    };
    

    this.setupWKCoors();
    this.calcCoors();

    this.display = function(){
        if(this.isIdled) this.drawNoteName();
        
        mg.rectangle(this.rectCoor);
        
        mg.set_source_rgba(colors.get(this.getColorName()));
        mg.fill();

        if(!this.isBlackKey){
            mg.line(this.coor[0], this.coor[1]-0.5, this.coor[0], this.coor[3]);
            mg.line(this.coor[2], this.coor[1]-0.5, this.coor[2], this.coor[3]);
            
            mg.set_line_width(0.5);
            mg.set_source_rgba(colors.get("gridColor"));
            mg.stroke();
        }

        return;
        if(!this.isIdled) return;
        mg.line(this.x, 0, this.x, height);
        mg.set_source_rgba(0,1,0,0.5);
        mg.stroke();

    };
    this.drawNoteName = function(){
        
        var dist = 4;
        var hudW = 20;
        var hudH = 12;
        var hudY = this.y-dist-hudH/2;
        var fontSize = 9.5;

        mg.rectangle_rounded_centered(this.x, hudY, hudW, hudH, 8, 8);
        mg.set_source_rgba(colors.get("lcdBgDark", 0.7));
        mg.fill();
        
        mg.text_path_centered(this.x, hudY, this.noteName, "", fontSize);
        mg.set_source_rgba(colors.get("gridCColor"));
        mg.fill();
    };
    this.getColorName = function(){
        return this.isIdled ? "lcd" : (getMaxOfArray(this.velocities, 0)>0 ? "lcdAlt" :  this.color);
    };
    this.isIdled = false;
    this.idle = function(x, y){
        // post(this.noteNum, "heyy");
        this.isIdled = isInRect(x, y, this.coor);
        return this.isIdled;
    };
    this.resetIsIdled = function(){
        this.isIdled = false;
    };
    
    this.click = function(x, y){
        if(!this.isIdled) return;
        // post(this.noteNumber);
    };
    this.drag = function(x, y){
        this.idle(x,y);

        if(this.isIdled) {
            // post(this.noteNumber);
            return true;
        }

        return false;
    };
    this.release = function(x, y){
    };
    this.idleout = function(x, y){
        this.resetIsIdled();
    };
    this.resize = function(xFact, yFact){
        this.x  *= xFact;
        this.w  *= xFact;
        this.x0  *= xFact;
        this.y = height - this.h0;
        
        this.calcCoors();
    };
    this.getPosX = function(){
        return this.x;
    };
    this.getMidiNote = function(){
        return this.noteNumber;
    };
    this.getFreq = function(){
        return this.freq;
    };
    this.setVelocity = function(chan, vel){
        this.velocities[chan] = vel;
    };

}


var keyboard = {
    isOn: false,
    firstNote: 6, //12,
    range: 128,//116,

    keyW: 3.4,
    keyH: 14,

    xPos: 10,

    initialize: function(){
        this.midiIndices = [];
        this.keys = {
            black: [],
            white: [],
        };

        this.keyH = grid.getBottomMargin();
        this.keyW = width / ((Math.log2(u.fMax) - Math.log2(u.fMin))*12)
        
        this.yPos = height - this.keyH;
        this.lastNote = this.firstNote + this.range;
        

        for(var i=0; i<this.range; i++){
            var currNote = i+this.firstNote;
            var currXPos = u.midiToPos(currNote);

            var isBlackKey = u.midiIsBlackKey(currNote);
            var color = isBlackKey ? "black" : "white";
            var index = this.keys[color].length;
            
            this.keys[color][index] = new Key(currNote, currXPos*this.xFact, this.yPos, this.keyW, this.keyH, isBlackKey);
            
            this.midiIndices[currNote] = {color: color, index: index};
            
        }
    },

    setSr: function(){
        this.initialize();
    },
    currFreq: 500,
    idledKey: null, 
    getCurrFreq: function(){
        return this.currFreq;
    },
    display: function(){
        if(!this.isOn) return;

        this.keysIter("display");
    },
    idle: function(x, y){
        if(!this.isOn) return;
        this.keysIter("resetIsIdled");

        for(var color in this.keys) for(var i in this.keys[color]) if( this.keys[color][i].idle(x,y) ){
            this.currFreq = this.keys[color][i].getFreq();
            this.idledKey = {color: color, index: i};
            return;
        }
        this.idledKey = null;
    },
    yClick: 0,
    click: function(x, y){
        if(!this.isOn) return;
        if(y<this.yPos) return;
        if(this.idledKey == null) return;

        this.yClick = y;

        filters.keyboardClicked(this.keys[this.idledKey.color][this.idledKey.index].getFreq());
        return true;
    },
    drag: function(x, y){
        // return;
        if(!(this.isOn && this.idledKey != null)) return false;

        this.idle(x, this.yClick);
        this.click(x, this.yClick);
        
        return true;
    },
    release: function(x, y){
        if(!this.isOn) return;

    },
    resetIdled: function(){
        if(!this.isOn) return;
        this.currFreq = -1;
        this.keysIter("resetIsIdled");
    },
    getIsIdled: function(x, y){
        return this.isOn && y>= this.yPos;
    },
    idleout: function(x, y){
        if(!this.isOn) return;
        this.keysIter("resetIsIdled");
    },
    xFact:1, yFact:1,
    resize: function(xFact, yFact){
        this.xFact *= xFact;
        this.yPos = height - this.keyH;
        this.keysIter("resize", xFact /*, yFact*/);
    },
    keysIter: function(func){
        var params = arrayfromargs(arguments).slice(1);
        iterateApplyOwn(this.keys.white, func, params);
        iterateApplyOwn(this.keys.black, func, params);
    },
    setIsOn: function(state){
        this.isOn = state;
        if(!state) this.currFreq = -1;
    },
    note: function(band, noteNumber, vel){
        if(!this.midiIndices[noteNumber]) return;

        var color = this.midiIndices[noteNumber].color;
        var index = this.midiIndices[noteNumber].index;

        this.keys[color][index].setVelocity(band, vel);
        return;
    },
    pitchbend: function(/*band, pbVal*/){},
};

var background = {
    init: false, offset: 0,
    display: function(){
        if(!this.init) this.initialize();
        if(script.isWind) return;

        mg.save();
        
        mg.translate(this.offset,this.offset);


        mg.rectangle(0,0,width, height);
        mg.set_source_rgba(colors.get("lcdBg"));
        mg.fill();
    },
    drawBorder: function(){
        if(!this.init) this.initialize();
        if(script.isWind) return;

        var rCor = 8*2;

        mg.rectangle_rounded(-this.offset*2,-this.offset*2,width+this.offset*4, height+this.offset*4, rCor, rCor);
        mg.set_source_rgba(colors.get("patcherBg"));
        mg.set_line_width(this.offset*4);
        mg.stroke();
        
        mg.restore();
        return;
    },

    initialize: function(){
        this.offset = script.getDispOffset();
        this.init = true;
    }
};


var script = {
    dispOffset: 2, //everything is translated (x and y) by this and scaled accordingly
    margin: 80,
    doUseMarging: false,
    initialSize: [448, 169],

    initialize: function(parent){
        this.isWind = parent.jsarguments[2];
        this.isOn = !this.isWind;
        this.patcher = parent.patcher;
        this.patWind = this.patcher.wind;
        this.box = parent.box;
        this.copyMenu = this.patcher.getnamed("copyMenu");

        // if(this.isWind) this.patWind.title = "Equation Window Display";

        this.box.message("annotation", incandescent.displayHelpText);
                
        if(!this.isWind){
            width  -= this.dispOffset*2;
            height -= this.dispOffset*2;
            initW = width; initH = height;
        }
    },
    display: function(){
        if(this.isWind && this.isOn) this.resizeDisp();
    },
    getState: function(){
        return this.isOn;
    },
    getDispOffset: function(){
        return this.isWind ? 0 : this.dispOffset;
    },
    
    setWind: function(state, doOpenWind){
        this.isOn = state==this.isWind;
        general.setOn(this.isOn);
        filters.setScriptOn(this.isOn);
        analyzer.setScriptOn(this.isOn);
        
        if(this.isOn)   mg.redraw();
        
        if(this.isWind){
            outlet(1, doOpenWind ? "front" : "wclose");
        }
        else{
            this.patcher.box.hidden = !this.isOn;
        }
    },

    setupWind: function(state){
        outlet(1, "window", "flags", state?"float":"nofloat");
        outlet(1, "window", "constrain", this.initialSize, 3840, 2160); //window constrain  <minwidth> <minheight> <maxwidth> <maxheight>, window exec
        outlet(1, "window", "exec");
    
        outlet(1, "enablevscroll", !state);
        outlet(1, "enablehscroll", !state);
    },

    windSize: [width, height],
    resizeDisp: function(){
        var marg = this.doUseMarging ? this.margin : 0;

        this.windSize = [
            this.patWind.size[0] - marg,
            this.patWind.size[1] - marg
        ];

        if(this.windSize.toString() == [width, height].toString()) return;
        
        // post("RESIZING!!");
        this.box.presentation_rect(0,0,this.windSize);
        onresize(this.windSize[0], this.windSize[1]);
    },

    resetSize: function(){
        this.box.presentation_rect(0,0, this.initialSize);
        onresize(this.initialSize[0], this.initialSize[1]);
    },
    setUseMargin: function(state){
        this.doUseMarging = state;
    },

};

function setWind(state, doShowWind){
    script.setWind(state, doShowWind);
}

var u = {
    fMin: 10,
    fMax: 22050,        //display

    nyq:  22050,        //calc
    upsampFact: 1,
    
    gainMin:  -24, gainMax: 24, gainStep: 8,
    phaseMin: -Math.PI, phaseMax: Math.PI, phaseStep: Math.PI/4,
    spectMin: -60, spectMax: 12, spectStep: 12,
    
    bandDiam: 16,
    bandRadius: 8,
    bandGainMin: -32,
    bandGainMax: 32,
    bandFreqMax: 20000,
    ratioMin: 0.5,
    ratioMax: 20,
    knee: 6,
    kneeW: 0,//pixels

    initialize: function(){

        this.ratioExp = Math.log((1-this.ratioMin)/(this.ratioMax-this.ratioMin))/Math.log(0.5);
        this.ratioIExp = 1/this.ratioExp;

        this.usableHeight = height - grid.getBottomMargin();
        this.usableInitH  = initH -  grid.getBottomMargin();
        
        var gScale = general.getGScale();
        this.gainMin  = gScale[0];
        this.gainMax  = gScale[1];
        this.gainStep = gScale[2];
        
        var sScale = general.getSScale();
        this.spectMin  = sScale[0];
        this.spectMax  = sScale[1];
        this.spectStep = sScale[2];
        
        this.nyqOS = this.nyq*this.upsampFact;

        this.logMin = Math.log(this.fMin);
        this.logMax = Math.log(this.fMax);
        
        // some calcs to figure out the min and max freqs knowing that this.fMin will be at freqMarginPix (16 pixels)
        if(doUseFreqMargin){
            var newLRange = (this.logMax - this.logMin) / (1 - 2*freqMarginPix/initW);
            this.logMin = (this.logMin + this.logMax)/2 - newLRange/2;
            this.logMax = this.logMin + newLRange;
            // this.fMin and this.fMax are not used in the calcs
        }

        this.logRange = this.logMax - this.logMin;
        this.ilogRange = 1/this.logRange
        this.ilog10 = 1/Math.LN10;

        this.phaseRange = this.phaseMax - this.phaseMin;
        this.zeroDBPos      = this.ampToPos(1, true);
        this.zeroDBPosSpect = this.spectAmpToPos(1, true);
        
        this.zeroDBPosI      = this.ampToPos(1);
        this.zeroDBPosSpectI = this.spectAmpToPos(1);

        this.bandMinPosY = this.gainToPos( 32, true);
        this.bandMaxPosY = this.gainToPos(-32, true);


        this.calcBandFreqMax();
        this.bandMinPosX = this.freqToPos(10, true);               // this.bandRadius;
        
        this.bandMaxThreshPosY = this.spectGainToPos(-120, true);
        
        this.refreshKneeW();
        
        this.resetFMaxPos();
        this.resetLogTable();
    },
    
    display: function(){
    },
    freqToPos: function(f, currentPos){
        // return this.map(this.freqToNormPos(f), 0, 1, this.bandRadius, (currentPos ? width : initW)-this.bandRadius);
        return this.freqToNormPos(f) * (currentPos ? width : initW);
    },
    posToFreq: function(x, currentPos){
        // return this.normPosToFreq(this.map(x, this.bandRadius, (currentPos ? width : initW)-this.bandRadius, 0, 1));
        return this.normPosToFreq(x/(currentPos ? width : initW));
    },
    

    freqToNormPos: function(f){ // (log10(f)-log10fMin) / (log10fMax-log10fMin)
        return (Math.log(f)-this.logMin)*this.ilogRange;
    },
    normPosToFreq: function(n){ //10^(n*(log10fMax-log10fMin) + log10fMin)
        return Math.exp(n*this.logRange + this.logMin);
    },
    
    gainToPos: function(gain, currentPos){
        return this.map(gain, this.gainMin, this.gainMax, (currentPos ? this.usableHeight : this.usableInitH), 0);
    },
    posToGain: function(y, currentPos){
        return this.map(y, (currentPos ? this.usableHeight : this.usableInitH), 0, this.gainMin, this.gainMax);
    },

    spectPosToGain: function(y, currentPos){
        return this.map(y, (currentPos ? this.usableHeight : this.usableInitH), 0, this.spectMin, this.spectMax);
    },
    spectGainToPos: function(g, currentPos){
        return this.map(g, this.spectMin, this.spectMax, (currentPos ? this.usableHeight : this.usableInitH), 0);
    },
    spectAmpToPos: function(amp, currentPos){
        return this.spectGainToPos(this.ampToDB(amp), currentPos);
    },
    specialSpectGainToPos: function(g, currentPos){         //returns pos as if the spect scale is always extended, used by Spectrum
        return this.map(g, -180, 36, (currentPos ? this.usableHeight : this.usableInitH), 0);
    },
    specialSpectAmpToPos: function(amp, currentPos){        //returns pos as if the spect scale is always extended, used by Spectrum
        return this.specialSpectGainToPos(this.ampToDB(amp), currentPos);
    },
    dBToAmp: function(gain){
        return Math.pow(10, gain/20);
    },
    dBToSqrtAmp: function(gain){
        return Math.sqrt(this.dBToAmp(gain));
    },    
    ampToDB: function(amplitude){
        if(!amplitude || amplitude===0) return -999;
        return 20 * Math.log(Math.abs(amplitude))*this.ilog10;
    },
    ampToPos: function(amp, currentPos){
        return this.gainToPos(this.ampToDB(amp), currentPos);
    },
    midiToFreq: function(noteNum){
        return Math.pow(2, (noteNum-69)/12) * 440;
    },
    midiToPos: function(noteNum){
        return this.freqToPos(this.midiToFreq(noteNum));
    },
    freqToMidi: function(freq){
        return (Math.log2(freq/440) * 12) + 69;
    },
    freqToNoteName: function(freq){
        return this.midiToNoteName(~~(this.freqToMidi(freq)));
    },
    midiToNoteName: function(noteNum){
        var number = Math.floor(noteNum/12) - 1;
        var degree = ((noteNum%12)+12)%12;
        var note = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][degree];
        return note+number;
    },
    midiIsBlackKey: function(noteNum){
        return includes([1,3,6,8,10], noteNum%12);
    },

    wrap: function(phase){
        return -this.phaseMax + (((phase+this.phaseMax)%this.phaseRange)+this.phaseRange)%this.phaseRange;
    },
    phaseToPos: function(phase, currentPos){
        var halfthresh = 0.3;
        var phaseWraped = this.wrap(phase)
        
        // if(phaseWraped>this.phaseMax-halfthresh) return 0;
        // if(phaseWraped<this.phaseMin+halfthresh) return currentPos ? this.usableHeight : this.usableInitH;

        return this.map(phaseWraped, this.phaseMin, this.phaseMax, (currentPos ? this.usableHeight : this.usableInitH), 0);
    },
    getRespHeight: function(currentPos){
        return (currentPos ? this.usableHeight : this.usableInitH);
    },

    map: function(input, inMin, inMax, outMin, outMax, exp){
        if(exp) return Math.pow((input-inMin)/(inMax-inMin), exp) *(outMax - outMin) + outMin;
        return ((input-inMin)/(inMax-inMin)) *(outMax - outMin) + outMin;
    },    
    clip: function(input, _min, _max){
        var min = Math.min(_min, _max);
        var max = Math.max(_min, _max);
        return input>max ? max : (input<min ? min : input);
    },
    resetLogTable: function(calledOnSetOs){//pixel to S Plane angular frequency (in log scale)

        this.logTable = [];
        
        for(var i=0; i<this.fMaxPosI-0; i++){            

            var wNoOs = Math.PI * this.posToFreq(i)/this.nyq;
            var w = wNoOs/this.upsampFact;

            this.logTable[i] = {
                w: w/2,
                tanW: Math.tan(w/2),
                wZ: w,

                wNoOs: wNoOs/2,
                tanWNoOs: Math.tan(wNoOs/2),
                wZNoOs: wNoOs,
            };
        }
    },
    resetFMaxPos: function(){
        this.fMaxPos  = this.freqToPos(Math.min(this.fMax, this.nyq), true);
        this.fMaxPosI = this.freqToPos(Math.min(this.fMax, this.nyq));
        
        this.numberOfOctaves = Math.log2(this.fMax - this.fMin);
        // this.octWInPixelsI = this.fMaxPosI/this.numberOfOctaves;
    },
    setSr: function(sr){
        this.nyq = sr/2;
        this.fMax = Math.max(22050, sr/2);
        this.calcBandFreqMax();
        this.initialize();
    },
    calcBandFreqMax: function(){
        this.actualBandMaxFreq = Math.floor(20000 * Math.min(1, this.upsampFact * this.nyq / 22050));
        this.bandMaxPosX = this.freqToPos(this.actualBandMaxFreq, true);
    },
    setOversampling: function(fact){
        this.upsampFact = fact;
        this.nyqOS = this.nyq*this.upsampFact;
        
        this.wProjectNyq = Math.PI/(2 * this.upsampFact);
        
        this.calcBandFreqMax();
        this.resetLogTable(true);
    },
    xFact: 1, yFact: 1,
    resize: function(xFact, yFact){

        this.xFact *= xFact;
        this.yFact *= yFact;
        
        this.fMaxPos *= xFact;
        this.zeroDBPos *= yFact;
        this.zeroDBPosSpect *= yFact;
        
        this.bandMaxPosY *= yFact;
        this.bandMinPosY *= yFact;
        this.bandMaxThreshPosY *= yFact;

        this.bandMaxPosX *= xFact;
        this.bandMinPosX *= xFact;

        this.usableHeight = height - grid.getBottomMargin();
        this.refreshKneeW();
    },
    setKnee: function(knee){
        this.knee = knee;
        this.refreshKneeW();
    },
    refreshKneeW: function(){
        this.kneeW = width * this.knee/(this.spectMax-this.spectMin);
    },

    setGainScale: function(min, max, step){
        this.gainMin =  min  || -24;
        this.gainMax =  max  ||  24;
        this.gainStep = step ||  8;
        
        this.zeroDBPos = this.ampToPos(1, true);
        this.zeroDBPosI = this.ampToPos(1);
        
        this.bandMaxPosY = this.gainToPos(this.bandGainMax, true);
        this.bandMinPosY = this.gainToPos(this.bandGainMin, true);
    },
    setSpectScale: function(min, max, step){
        this.spectMin =  min  || -60;
        this.spectMax =  max  ||  12;
        this.spectStep = step ||  12;
        
        this.zeroDBPosSpect = this.spectAmpToPos(1, true);

        this.bandMaxThreshPosY = this.spectGainToPos(-120, true);

        this.refreshKneeW();
    },
    clipBandX: function(x){
        return this.clip(x, this.bandMinPosX, this.bandMaxPosX);
    },
    clipBandY: function(y){
        return this.clip(y, this.bandMinPosY, this.bandMaxPosY);
        return y;
    },
    clipBandThreshPos: function(y){
        return this.clip(y, this.zeroDBPosSpect, this.bandMaxThreshPosY);
    },
    clipBandFreq: function(freq){
        return this.clip(freq, this.fMin, this.actualBandMaxFreq);
    },
    clipBandGain: function(Gain){
        return this.clip(Gain, this.bandGainMin, this.bandGainMax);
    },
    clipBandRatio: function(ratio){
        return this.clip(ratio, this.ratioMin, this.ratioMax);
    },
    ratioNormToVal: function(norm){
        return this.map(norm, 0, 1, this.ratioMin, this.ratioMax, this.ratioExp);
    },
    ratioValToNorm: function(val){
        return this.map(val, this.ratioMin, this.ratioMax, 0, 1, this.ratioIExp);
    },
};


script.initialize(this);
general.initialize();
u.initialize();
grid.initialize();
keyboard.initialize();
filters.initialize();
analyzer.initialize();
incandescent.initialize();
cursorCoor.initialize()
