const canvasW = 800;
const canvasH = 800;
const fr = 30;



const imageNames = [
    "html_100.png",
    "js_100.png",
    "php_100.png",
    "rails_100.png",
    "aws_150.png",
    "unity_100.png",
    "cpp_100.png",
    "blender_100.png",
    "houdini_100.png",
    "live2d_100.png",
    "ue_100.png",
    "processing_100.png"
];

let icons = [];
function preload() {
    imageNames.forEach(name => {
        icons.push(
            new Icon(loadImage('img/skill/'+name))
        );
    });
}

function setup(){
    // 描画領域のセットアップ
    let canvasWidth = constrain(windowWidth - 30, 0, canvasW);
    let canvas = createCanvas(canvasWidth, canvasWidth);  //サイズ: 800px × 500px
    canvas.parent("skillCanvas");
    frameRate(fr);
    setupImg();
}

function windowResized() {
    let canvasWidth = constrain(windowWidth - 20, 0, canvasW);
    resizeCanvas(canvasWidth, canvasWidth);
}
  
function draw(){
    clear();
    background(220, 0);             // transparent
    drawImgs();
}

function setupImg()
{
    icons.forEach(icon => {
        if(width < 767)
        {
            icon.img.resize(50, 50);
        }
        else
        {
            icon.img.resize(100, 100);
        }
    });
}

let offsetRadian = 0;
const rotateSpeed = 5;
const t = 0.2;
function drawImgs()
{
    const center = new Position(width/2, height/2);
    const r = (height / 2) - 100;
    const radian = 2 * PI/imageNames.length;
    offsetRadian += 2 * PI * rotateSpeed/360 * deltaTime / 1000;

    icons.forEach((icon, i) => {
        // 円周の所定位置に戻る力
        const theta = i * radian + offsetRadian;
        let defaultPos = createVector(center.x + r * cos(theta), center.y + r * sin(theta));
        let goal = createVector(lerp(icon.pos.x, defaultPos.x, t), lerp(icon.pos.y, defaultPos.y, t));
        let dirDefault = createVector(goal.x - icon.pos.x, goal.y - icon.pos.y);
        
        // マウスから逃げる力
        let dirMouse = createVector(icon.pos.x - mouseX, icon.pos.y - mouseY);
        let distance = dirMouse.mag();
        dirMouse = dirMouse.normalize();
        let power = 100000 / ((distance + 10) * (distance + 10) + 0.00001);
        power = constrain(power, 0, 30);
        dirMouse = dirMouse.mult(power);
        icon.pos = icon.pos.add(dirMouse.add(dirDefault));
        image(icon.img, icon.pos.x - 50, icon.pos.y - 50);
    });
}

class Icon
{
    img;
    pos;
    vel;
    constructor(img)
    {
        this.img = img;
        this.pos = createVector(0, 0);
        this.vel = createVector(0, 0);
    }
}

function Position(x, y)
{
    this.x = x;
    this.y = y;
}
