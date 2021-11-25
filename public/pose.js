const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

function _calDegree(degree){
    const pi = Math.PI;
    let angle =  degree * (180/pi);
    if (angle < 0)
       angle = angle +360;
    return angle;
}

function calAngle(land1, land2, land3) {
    let degree = _calDegree(Math.atan2(land3['y'] - land2['y'], land3['x'] - land2['x']) - Math.atan2(land1['y'] - land2['y'], land1['x'] - land2['x']));
    return degree;
}

function normaliseCor(input) {
    let shift_byX = (input[0]['x'] > 0)? -input[0]['x'] : input[0]['x'];
    let shift_byY = (input[0]['y'] > 0)? -input[0]['y'] : input[0]['y'];

    for(let i=0 ; i<input.length ; i++){
        if(input[i]['visibility'] < 0.7) {
            input[i] = null;
            continue;
        }
        input[i]['x'] += shift_byX;
        input[i]['y'] += shift_byY;
    }

    return input;
}

function poseClassification(cors) {
    let shoulder;
    if(!cors[11])
        shoulder = (!cors[12]) ? null : cors[12];
    else
        shoulder = cors[11];

    let wrist;
    if(!cors[15])
        wrist = (!cors[16]) ? null : cors[16];
    else
        wrist = cors[15];

    let hip;
    if(!cors[23])
        hip = (!cors[24]) ? null : cors[24];
    else
        hip = cors[23];

    let knee;
    if(!cors[25])
        knee = (!cors[26]) ? null : cors[26];
    else
        knee = cors[25];

    if(!cors[0])
        return 'error';


    bothArmForward = () => {
        if( (cors[15].x > cors[0].x && cors[16].x > cors[0].x) || (cors[15].x < cors[0].x && cors[16].x < cors[0].x) )
            return true;
        return false;
    }
    //forward
    if(cors[11]&&cors[12]&&cors[25]&&cors[26]&&cors[27]&&cors[28])
    {
        let shoulder_len = cors[11].x - cors[12].x;
        let ankle_len = cors[27].x - cors[28].x;
        if(((cors[28].x<cors[26].x && cors[26].x < cors[12].x && cors[12].x < cors[11].x && cors[11].x < cors[25].x && cors[25].x < cors[27].x)||(cors[28].x>cors[26].x && cors[26].x > cors[12].x && cors[12].x > cors[11].x && cors[11].x > cors[25].x && cors[25].x > cors[27].x)) && (shoulder_len*2 < ankle_len)) {
            return "forward";
        }
    }
    //backward
    if(cors[11]&&cors[12]&&cors[13]&&cors[14]&&cors[15]&&cors[16]&&cors[23]&&cors[24]){
        if((cors[15].y < cors[11].y && cors[11].y<cors[13].y && cors[13].y<cors[23].y) && (cors[16].y < cors[12].y && cors[12].y < cors[14].y && cors[14].y <cors[24].y)) {
            return "backward";
        }
    }
    // jump
    if(cors[15]&&cors[13]&&cors[16]&&cors[14]&& (cors[12] || cors[11]) ) {
        if((cors[15].y < cors[0].y && cors[13].y < cors[0].y && cors[16].x < cors[12].x && cors[12].x < cors[0].x) || (cors[16].y < cors[0].y && cors[14].y < cors[0].y && cors[15].x > cors[11].x && cors[11].x > cors[0].x) ) {
            return 'jump';
        }
    }
    //punch
    let midpoint;
    //punchR
    if(cors[11]&&cors[13]&&cors[15]&&cors[23])
    {
        midpoint = (cors[11].y + cors[23].y) / 2;
        if(((cors[0].x>cors[13].x && cors[13].x >cors[15].x && calAngle(cors[11],cors[13],cors[15]) > 175) ||(cors[0].x < cors[13].x && cors[13].x<cors[15].x && calAngle(cors[11],cors[13],cors[15])> 160)) && (cors[11].y < cors[15].y) && (midpoint > cors[15].y)) {
          return "punchR";
        }
    }
    //punchL
    if(cors[12]&&cors[14]&&cors[16]&& cors[24])
    {   midpoint = (cors[12].y + cors[24].y) / 2;
        if(((cors[0].x>cors[14].x && cors[14].x >cors[16].x && calAngle(cors[12],cors[14],cors[16]) > 175 ) ||(cors[0].x < cors[14].x && cors[14].x<cors[16].x && calAngle(cors[12],cors[14],cors[16])> 160)) && (cors[12].y < cors[16].y) && (midpoint > cors[16].y)) {
          return "punchL";
        }
    }
    //kick
    //kickL
    if(cors[24] && cors[25] && cors[26] && cors[28])
    {
        if((cors[26].y < cors[25].y) && (cors[28].y < cors[25].y)){
            return "kickL";
        }
    }
    //kickR
    if(cors[23] && cors[25] && cors[26] && cors[27])
    {
        if((cors[25].y< cors[23].y) && (cors[27].y < cors[26].y)) {
            return "kickR";
        }
    }
    //skill
    if(cors[15]&&cors[16]&&hip&&shoulder) {
        if( ((cors[15].y < cors[0].y && cors[16].y > shoulder.y && cors[16].y < hip.y) || (cors[16].y < cors[0].y && cors[15].y > shoulder.y && cors[15].y < hip.y)) && bothArmForward() )
            return 'skill';
    }
    // crouch
    if(wrist&&knee) {
        if(wrist.y > knee.y) {
            return 'crouch';
        }
    }
    return "unknown";
}

async function onResults(results) {
    if (!results.poseLandmarks) {
        return;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.segmentationMask, 0, 0,
            canvasElement.width, canvasElement.height);
    canvasCtx.fillStyle = '#000000';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    // Only overwrite missing pixels.
    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.drawImage(
            results.image, 0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = 'source-over';
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
            {color: '#00FF00', lineWidth: 3});
    drawLandmarks(canvasCtx, results.poseLandmarks,
            {color: '#FF0000', radius: 1});

    let cors = normaliseCor(results.poseLandmarks);

    //poseClassification(cors);
    console.log(poseClassification(cors));
}

const pose = new Pose({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});
pose.setOptions({
    selfieMode: true,
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: true,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
pose.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({image: videoElement});
    },
    width: 100,
    height: 100
});
camera.start();