const BLACK = 0x000000FF;

function getWidth(fs) { return fs.width }
function getHeight(fs) { return fs.height }

function getPixelRGBA(fs, x,y, f) {
    return fs.frames[f][y][x]
}
function setPixelRGBA(fs, x,y, f, c) {
    fs.frames[f][y][x] = c
    return c
}
function getFrameCount(fs) { return fs.frames.length }

module.exports.makeContext = function(frameset) {
    return {
        getHeight: function() { return getHeight(frameset)},
        getWidth: function() { return getWidth(frameset)},
        setPixelRGBA: function(x,y,f,c) { return setPixelRGBA(frameset, x,y,f,c) },
        getPixelRGBA: function(x,y,f  ) { return getPixelRGBA(frameset, x,y,f) },
        getFrameCount: function() { return getFrameCount(frameset)},
    }
}
module.exports.makeFrameset = function (w,h,frameCount) {
    const frames = []
    // const w = 44
    // const h = 36
    // const frameCount = 10;
    for(let i=0; i<frameCount; i++) {
        const frame = []
        for(let j = 0; j < h; j++) {
            let row = []
            for(let i = 0; i < w; i++) {
                row[i] = [BLACK,BLACK,BLACK]
            }
            frame.push(row)
        }
        frames.push(frame)
    }
    return {
        width:w,
        height:h,
        frames:frames
    }
}
