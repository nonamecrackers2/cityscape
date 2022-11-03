var canvas = document.getElementById('main');
gl = canvas.getContext('experimental-webgl');
var allSides = [0, 1, 2, 3, 4, 5];
var randoms = [];
var currentRandomIndex = 0;

var slider = document.getElementById('time');
var programTimeO;
var programTime;

function getRandom()
{
   if (randoms[currentRandomIndex] !== undefined)
   {
      var prevIndex = currentRandomIndex;
      this.currentRandomIndex++;
      return randoms[prevIndex];
   }
   else
   {
      var random = Math.random();
      randoms.push(random);
      currentRandomIndex++;
      return random;
   }
}

window.addEventListener('resize', resize, false);
resize()

function resize()
{
   canvas.height = window.innerHeight-document.getElementById('info').offsetHeight;
   canvas.width = window.innerWidth;
}

function isPowerOf2(value) {
   return (value & (value - 1)) === 0;
}

function rotateZ(m, angle, matrixIndex = 0)
{
   var indexOffset = matrixIndex*16;
   var c = Math.cos(angle);
   var s = Math.sin(angle);
   var mv0 = m[0+indexOffset], mv4 = m[4+indexOffset], mv8 = m[8+indexOffset];

   m[0+indexOffset] = c*m[0+indexOffset]-s*m[1+indexOffset];
   m[4+indexOffset] = c*m[4+indexOffset]-s*m[5+indexOffset];
   m[8+indexOffset] = c*m[8+indexOffset]-s*m[9+indexOffset];

   m[1+indexOffset]=c*m[1+indexOffset]+s*mv0;
   m[5+indexOffset]=c*m[5+indexOffset]+s*mv4;
   m[9+indexOffset]=c*m[9+indexOffset]+s*mv8;
}

function rotateX(m, angle, matrixIndex = 0) 
{
   var indexOffset = matrixIndex*16;
   var c = Math.cos(angle);
   var s = Math.sin(angle);
   var mv1 = m[1+indexOffset], mv5 = m[5+indexOffset], mv9 = m[9+indexOffset];

   m[1+indexOffset] = m[1+indexOffset]*c-m[2+indexOffset]*s;
   m[5+indexOffset] = m[5+indexOffset]*c-m[6+indexOffset]*s;
   m[9+indexOffset] = m[9+indexOffset]*c-m[10+indexOffset]*s;

   m[2+indexOffset] = m[2+indexOffset]*c+mv1*s;
   m[6+indexOffset] = m[6+indexOffset]*c+mv5*s;
   m[10+indexOffset] = m[10+indexOffset]*c+mv9*s;
}

function rotateY(m, angle, matrixIndex = 0) 
{
   var indexOffset = matrixIndex*16;
   var c = Math.cos(angle);
   var s = Math.sin(angle);
   var mv0 = m[0+indexOffset], mv4 = m[4+indexOffset], mv8 = m[8+indexOffset];

   m[0+indexOffset] = c*m[0+indexOffset]+s*m[2+indexOffset];
   m[4+indexOffset] = c*m[4+indexOffset]+s*m[6+indexOffset];
   m[8+indexOffset] = c*m[8+indexOffset]+s*m[10+indexOffset];

   m[2+indexOffset] = c*m[2+indexOffset]-s*mv0;
   m[6+indexOffset] = c*m[6+indexOffset]-s*mv4;
   m[10+indexOffset] = c*m[10+indexOffset]-s*mv8;
}

function translate(t, x, y, z, index = 0)
{
   var indexOffset = index*3;
   t[0+indexOffset] = x;
   t[1+indexOffset] = y;
   t[2+indexOffset] = z;
}

class ImageHolder
{
   constructor(loc, index)
   {
      this.loc = loc;
      this.index = index;
   }

   bind()
   {
      this.texture = gl.createTexture();
      if (this.loc == 'blank')
      {
         gl.bindTexture(gl.TEXTURE_2D, this.texture);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
         gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      }
      else
      {
         this.image = new Image();
         this.image.src = this.loc;
         this.image.onload = ()=> 
         {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
         };
      }
   }
}

class Buffer
{
   constructor(images)
   {
      images.unshift('blank');
      this.images = images;
      this.compiledImages = [];
      this.seed

      this.clear();
      
      this.initialSpin = Math.random() * (Math.PI*2);

      this.vertCode = 
         'attribute vec3 position;'+
         'uniform mat4 Mmatrix[20];'+
         'uniform vec3 TransformVec[20];'+
         'uniform float Wwidth;'+
         'uniform float Wheight;'+
         'uniform float Scale;'+
         'attribute vec4 color;'+
         'varying vec4 vColor;'+
         'attribute vec2 texCoord;'+
         'varying vec2 vTexCoord;'+
         'attribute float matrixIndex;'+
         'varying float vFogDepth;'+
         'attribute float fogIntensity;'+
         'varying float vFogIntensity;'+
         'attribute float textureIndex;'+
         'varying float vTextureIndex;'+
         'varying vec4 texColor;'+
         'attribute float transformIndex;'+

         'void main(void) { '+
            'float s = Scale/2.0;'+
            'gl_Position = Mmatrix[int(matrixIndex)]*vec4(position, 1.0)/vec4(Wwidth/Wheight*s,s,8.0+128.0,1.0)-vec4(TransformVec[int(transformIndex)].x,TransformVec[int(transformIndex)].y,8.0/(128.0+8.0),TransformVec[int(transformIndex)].z);'+
            'vColor = color;'+
            'vTexCoord = texCoord;'+
            'vFogDepth = (Mmatrix[int(matrixIndex)] * vec4(position, 0.0)).z;'+
            'vFogIntensity = fogIntensity;'+
            'vTextureIndex = textureIndex;'+
         '}';

      this.fragCode = 
         'precision mediump float;'+
         'uniform sampler2D Usampler[16];'+
         'uniform vec4 UfogColor;'+
         'uniform float UfogIntensity;'+
         'uniform float UfogStart;'+
         'uniform float UfogEnd;'+
         'varying vec4 vColor;'+
         'varying vec2 vTexCoord;'+
         'varying float vFogDepth;'+
         'varying float vFogIntensity;'+
         'varying float vTextureIndex;'+

         'vec4 getTexFrom(sampler2D samplers[16], int index, vec2 uv) {'+
            'vec4 color = vec4(0.0);'+
            'for (int i = 0; i < 16; ++i) {'+
               'vec4 c = texture2D(Usampler[i], uv);'+
               'if (i == index) {'+
                  'color += c;'+
               '}'+
            '}'+
            'return color;'+
         '}'+

         'void main(void) {'+
            'vec4 color = getTexFrom(Usampler, int(vTextureIndex), vTexCoord)*vColor;'+
            'float amount = smoothstep(UfogStart, UfogEnd, vFogDepth);'+
            'gl_FragColor = mix(color, UfogColor, amount*UfogIntensity*vFogIntensity);'+
         '}';
   }

   redraw()
   {
      this.clear();
      draw();
   }

   clear()
   {
      this.vertices = [];
      this.colors = [];
      this.uvs = [];
      this.indices = [];
      this.matrices = [-1,0,0,0, 0,-1,0,0, 0,0,-1,0, 0,0,0,1];
      this.transformations = [0.0, 0.0, 0.0];
      this.matrixIndices = [];
      this.transformationIndices = [];
      this.fogIntensity = [];
      this.textureIndices = [];
      this.pushedFog = 1.0;
      this.textureIndex = 0;
   }

   compile()
   {
      this.vertShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(this.vertShader, this.vertCode);
      gl.compileShader(this.vertShader);
      
      this.fragShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(this.fragShader, this.fragCode);
      gl.compileShader(this.fragShader);
      
      this.shaderProgram = gl.createProgram();
      gl.attachShader(this.shaderProgram, this.vertShader);
      gl.attachShader(this.shaderProgram, this.fragShader);
      gl.linkProgram(this.shaderProgram);

      gl.useProgram(this.shaderProgram);

      this.Mmatrix = gl.getUniformLocation(this.shaderProgram, "Mmatrix");
      this.TransformVec = gl.getUniformLocation(this.shaderProgram, "TransformVec");
      this.Wwidth = gl.getUniformLocation(this.shaderProgram, "Wwidth");
      this.Wheight = gl.getUniformLocation(this.shaderProgram, "Wheight");
      this.Scale = gl.getUniformLocation(this.shaderProgram, 'Scale');
      this.Usampler = gl.getUniformLocation(this.shaderProgram, 'Usampler');
      this.UfogColor = gl.getUniformLocation(this.shaderProgram, 'UfogColor');
      this.UfogIntensity = gl.getUniformLocation(this.shaderProgram, 'UfogIntensity');
      this.UfogStart = gl.getUniformLocation(this.shaderProgram, 'UfogStart');
      this.UfogEnd = gl.getUniformLocation(this.shaderProgram, 'UfogEnd');
   }

   bind()
   {
      this.vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
      
      this.colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.colors), gl.STATIC_DRAW);
      
      this.indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
      
      this.texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);

      this.matrixIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixIndexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.matrixIndices), gl.STATIC_DRAW);

      this.fogIntensityBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fogIntensityBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.fogIntensity), gl.STATIC_DRAW);

      this.textureIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.textureIndexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.textureIndices), gl.STATIC_DRAW);

      this.transformIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.transformIndexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.transformationIndices), gl.STATIC_DRAW);
   }

   bindTextures()
   {
      for (var i = 0; i < this.images.length; i++)
      {
         var image = new ImageHolder(this.images[i], i);
         image.bind();
         this.compiledImages.push(image);
      }
   }

   activate()
   {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      var position = gl.getAttribLocation(this.shaderProgram, "position");
      gl.vertexAttribPointer(position, 3, gl.FLOAT, false,0,0);
      gl.enableVertexAttribArray(position);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      var color = gl.getAttribLocation(this.shaderProgram, "color");
      gl.vertexAttribPointer(color, 4, gl.FLOAT, false,0,0);
      gl.enableVertexAttribArray(color);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      var texCoordLoc = gl.getAttribLocation(this.shaderProgram, "texCoord");
      gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false,0,0);
      gl.enableVertexAttribArray(texCoordLoc);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.matrixIndexBuffer);
      var matrixIndex = gl.getAttribLocation(this.shaderProgram, "matrixIndex");
      gl.vertexAttribPointer(matrixIndex, 1, gl.FLOAT, false,0,0);
      gl.enableVertexAttribArray(matrixIndex);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.fogIntensityBuffer);
      var fogIntensityLoc = gl.getAttribLocation(this.shaderProgram, "fogIntensity");
      gl.vertexAttribPointer(fogIntensityLoc, 1, gl.FLOAT, false,0,0);
      gl.enableVertexAttribArray(fogIntensityLoc);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.textureIndexBuffer);
      var textureIndexLoc = gl.getAttribLocation(this.shaderProgram, "textureIndex");
      gl.vertexAttribPointer(textureIndexLoc, 1, gl.FLOAT, false,0,0);
      gl.enableVertexAttribArray(textureIndexLoc);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.transformIndexBuffer);
      var transformIndexLoc = gl.getAttribLocation(this.shaderProgram, "transformIndex");
      gl.vertexAttribPointer(transformIndexLoc, 1, gl.FLOAT, false,0,0);
      gl.enableVertexAttribArray(transformIndexLoc);

      var textures = [];
      for (var i = 0; i < this.compiledImages.length; i++)
      {
         gl.activeTexture(gl.TEXTURE0+i);
         gl.bindTexture(gl.TEXTURE_2D, this.compiledImages[i].texture);
         textures.push(i);
      }
      gl.uniform1iv(this.Usampler, textures);
   }

   render(time)
   {
      var matrixCopy = this.matrices.slice();
      //translateZ(matrixCopy, 1.0);
      rotateY(matrixCopy, time*0.0001+this.initialSpin);
      rotateX(matrixCopy, -0.3);
      rotateZ(matrixCopy, time*0.00005+this.initialSpin, 3);
      rotateZ(matrixCopy, (programTime) * 0.1 * (Math.PI / 180.0) + 5, 2);

      var transformCopy = this.transformations.slice();
      translate(transformCopy, Math.cos(time*0.00008+this.initialSpin) * 0.1 - 1, 0.0, 0.0, 1);
      translate(transformCopy, Math.sin(time*0.00005+this.initialSpin) * 0.1, 0.0, 0.0, 2);
      translate(transformCopy, Math.cos(time*0.0001+this.initialSpin) * 0.1, 0.0, 0.0, 3);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clearDepth(1);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      
      gl.viewport(0.0, 0.0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(this.Mmatrix, false, matrixCopy);
      gl.uniform3fv(this.TransformVec, transformCopy);
      gl.uniform1f(this.Wwidth, canvas.width);
      gl.uniform1f(this.Wheight, canvas.height);
      gl.uniform1f(this.Scale, 192.0);

      gl.uniform1f(this.UfogIntensity, 0.03);
      gl.uniform1f(this.UfogStart, -100.0);
      gl.uniform1f(this.UfogEnd, 1000.0);
      var haze = toRGB(getProperty('--haze'));
      var primary = toRGB(getProperty('--primary'));
      var gradient = 1.0;
      var r = (haze.r-primary.r)*gradient;
      var g = (haze.g-primary.g)*gradient;
      var b = (haze.b-primary.b)*gradient; 
      gl.uniform4fv(this.UfogColor, [r+primary.r, g+primary.g, b+primary.b, 255]);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
   }

   box(sides, x, y, z, dX, dY, dZ, r = 1, g = 1, b = 1, a = 1, u = 0, v = 0, shade = 0.1, gshade = shade, gr = r, gg = g, gb = b, ga = a)
   {
      //Bottom
      if (sides.includes(0))
      {
         this.vertex(x, y, z, gr-gshade, gg-gshade, gb-gshade, ga);
         this.vertex(x + dX, y, z, gr-gshade, gg-gshade, gb-gshade, ga);
         this.vertex(x + dX, y, z + dZ, gr-gshade, gg-gshade, gb-gshade, ga);
         this.vertex(x, y, z + dZ, gr-gshade, gg-gshade, gb-gshade, ga);
         this.vertex(x, y, z, gr-gshade, gg-gshade, gb-gshade, ga);
         this.vertex(x + dX, y, z + dZ, gr-gshade, gg-gshade, gb-gshade, ga);
      }

      if (sides.includes(1))
      {
         this.vertex(x + dX, y, z, gr-gshade, gg-gshade, gb-gshade, ga, u, v);
         this.vertex(x + dX, y + dY, z, r-shade, g-shade, b-shade, a, u, u);
         this.vertex(x + dX, y + dY, z + dZ, r-shade, g-shade, b-shade, a, v, u);
         this.vertex(x + dX, y, z + dZ, gr-gshade, gg-gshade, gb-gshade, ga, v, v);
         this.vertex(x + dX, y, z, gr-gshade, gg-gshade, gb-gshade, ga, u, v);
         this.vertex(x + dX, y + dY, z + dZ, r-shade, g-shade, b-shade, a, v, u);
      }

      if (sides.includes(2))
      {
         this.vertex(x, y, z, gr+gshade, gg+gshade, gb+gshade, ga, v, v);
         this.vertex(x + dX, y, z, gr+gshade, gg+gshade, gb+gshade, ga, u, v);
         this.vertex(x + dX, y + dY, z, r+shade, g+shade, b+shade, a, u, u);
         this.vertex(x, y + dY, z, r+shade, g+shade, b+shade, a, u, u);
         this.vertex(x, y, z, gr+gshade, gg+gshade, gb+gshade, ga, u, v);
         this.vertex(x + dX, y + dY, z, r+shade, g+shade, b+shade, a, v, u);
      }

      if (sides.includes(3))
      {
         this.vertex(x, y, z + dZ, gr+gshade, gg+gshade, gb+gshade, ga, v, v);
         this.vertex(x + dX, y, z + dZ, gr+gshade, gg+gshade, gb+gshade, ga, u, v);
         this.vertex(x + dX, y + dY, z + dZ, r+shade, g+shade, b+shade, ga, u, u);
         this.vertex(x, y + dY, z + dZ, r+shade, g+shade, b+shade, ga, u, u);
         this.vertex(x, y, z + dZ, gr+gshade, gg+gshade, gb+gshade, ga, u, v);
         this.vertex(x + dX, y + dY, z + dZ, r+shade, g+shade, b+shade, ga, v, u);
      }
      
      if (sides.includes(4))
      {
         this.vertex(x, y, z, gr-gshade, gg-gshade, gb-gshade, ga, u, v);
         this.vertex(x, y + dY, z, r-shade, g-shade, b-shade, a, u, u);
         this.vertex(x, y + dY, z + dZ, r-shade, g-shade, b-shade, a, v, u);
         this.vertex(x, y, z + dZ, gr-gshade, gg-gshade, gb-gshade, ga, v, v);
         this.vertex(x, y, z, gr-gshade, gg-gshade, gb-gshade, ga, u, v);
         this.vertex(x, y + dY, z + dZ, r-shade, g-shade, b-shade, a, v, u);
      }

      if (sides.includes(5))
      {
         //Top
         this.vertex(x, y + dY, z, r, g, b, a, u, u);
         this.vertex(x + dX, y + dY, z, r, g, b, a, v, u);
         this.vertex(x + dX, y + dY, z + dZ, r, g, b, a, v, v);
         this.vertex(x, y + dY, z, r, g, b, a, u, u);
         this.vertex(x, y + dY, z + dZ, r, g, b, a, u, v);
         this.vertex(x + dX, y + dY, z + dZ, r, g, b, a, v, v);
      }
   }

   vertex(x, y, z, r = 1, g = 1, b = 1, a = 1, u = 0, v = 0)
   {
      this.vertices.push(x, y, z);
      this.colors.push(r, g, b, a);
      this.uvs.push(u, v);
      this.indices.push(this.indices.length);
      this.matrixIndices.push(this.matrices.length / 16 - 1);
      this.transformationIndices.push(this.transformations.length / 3 - 1);
      this.fogIntensity.push(this.pushedFog);
      this.textureIndices.push(this.textureIndex);
   }

   quad(x, y, z, width, length, r = 1.0, g = 1.0, b = 1.0, a = 1.0)
   {
      var u = 0.0;
      var v = 1.0;
      this.vertex(x, y, z, r, g, b, a, u, u);
      this.vertex(x + width, y, z, r, g, b, a, v, u);
      this.vertex(x + width, y + length, z, r, g, b, a, v, v);
      this.vertex(x, y, z, r, g, b, a, u, u);
      this.vertex(x, y + length, z, r, g, b, a, u, v);
      this.vertex(x + width, y + length, z, r, g, b, a, v, v);
   }

   pushMatrix()
   {
      this.matrices.push(-1,0,0,0, 0,-1,0,0, 0,0,-1,0, 0,0,0,1);
   }

   pushTransform()
   {
      this.transformations.push(0.0, 0.0, 0.0);
   }

   setTexture(index)
   {
      this.textureIndex=index;
   }

   pushTexture()
   {
      this.textureIndex++;
   }

   pushFog(fogIntensity = 1.0)
   {
      this.pushedFog = fogIntensity;
   }
}
var buffer = new Buffer(['images/window.png', 'images/silhouette.png', 'images/sun.png', 'images/stars.png']);

function toRGB(hex) 
{
   var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.substring(1));
   return result ? 
   {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
   } : null;
}

function toRGBArray(hex) 
{
   var rgb = toRGB(hex);
   return [rgb.r, rgb.g, rgb.b];
}

function toHEX(rgb)
{
   return "#" + ((1 << 24) + (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).slice(1);
}

function getProperty(property)
{
   return getComputedStyle(document.querySelector(':root')).getPropertyValue(property);
}

function setProperty(property, value)
{
   document.documentElement.style.setProperty(property, value);
}

function draw()
{
   var cityColor = toRGB(getProperty('--city-color'));
   var haze = toRGB(getProperty('--city-gradient'));
   var r = cityColor.r / 255;
   var g = cityColor.g / 255;
   var b = cityColor.b / 255;
   var yOffset = 160;
   var shade = 0.05;
   var gshade = 0;
   var width = 54;
   var baseHeight = 100;
   var baseWidthExtension = 50;
   var fog = programTime/60/24;
   buffer.pushFog(fog);
   buffer.box(allSides, -(width+baseWidthExtension)/2, yOffset, -(width+baseWidthExtension)/2, width+baseWidthExtension, -baseHeight, width+baseWidthExtension, r, g, b, 1.0, 0, 0, shade, gshade, haze.r/255, haze.b/255, haze.g/255, 1.0);
   var buildingWidth = 6;
   var buildingsPerLength = width/buildingWidth;
   var windowSizeOffset = 0.001;
   for (var x = 0; x < buildingsPerLength; x++)
   {
      for (var z = 0; z < buildingsPerLength; z++)
      {
         if (Math.floor(getRandom() * 6) > 3)
         {
            var random = -Math.floor(getRandom() * 50);
            buffer.box(allSides, x * buildingWidth - width/2, yOffset-baseHeight, z * buildingWidth - width/2, buildingWidth, Math.min(random, -5), buildingWidth, r, g, b, 1, 0, 0, shade, gshade);
            buffer.pushTexture();
            var windows = Math.floor(Math.max(-random, 5) / buildingWidth);
            buffer.pushFog(0.0);
            for (var i = 0; i < windows; i++)
            {
               if (getRandom() * (Math.floor(programTime/24)/6 + 4) > 3)
                  buffer.box([1, 2, 3, 4], x * buildingWidth - width/2 - windowSizeOffset, yOffset-baseHeight - buildingWidth * i, z * buildingWidth - width/2 - windowSizeOffset, buildingWidth + windowSizeOffset*2, -buildingWidth, buildingWidth + windowSizeOffset*2, 1.0, 1.0, 1.0, 1.0, 0, 1, 0.0);
            }
            buffer.pushFog(fog);
            buffer.setTexture(0);
         }   
      }
   }
   buffer.pushTexture();
   buffer.pushTexture();
   buffer.pushFog(0.0);
   var silWidth = 1;
   var silHeight = 2;
   var silHeightOffset = 20;
   var silZOffset = -100;
   buffer.pushMatrix();
   buffer.pushTransform();
   drawRepeatingLayer(canvas.width/2, silHeightOffset, silZOffset, silWidth, silHeight, 300);
   buffer.pushTransform();
   drawRepeatingLayer(canvas.width/2, silHeightOffset - 10, silZOffset, silWidth, silHeight, 150);
   buffer.pushTransform();
   drawRepeatingLayer(canvas.width/2, silHeightOffset - 10, silZOffset, silWidth, silHeight, 60);
   buffer.pushMatrix();
   buffer.pushTexture();
   buffer.pushTransform();
   var sunSize = 40;
   var alpha = (1.0 - programTime/60/24)/2;
   if (alpha > 0.0)
      buffer.quad(sunSize/2, -80, -100, -sunSize, sunSize, 1.0, 1.0, 1.0, alpha);
   buffer.pushTexture();
   buffer.pushMatrix();
   buffer.pushTransform();
   var size = canvas.width/2;
   buffer.quad(size/2, -size/2, -101, -size, size, 1.0, 1.0, 1.0, programTime/60/24);
}

function drawRepeatingLayer(x, y, z, baseWidth, baseHeight, scale, a = 1.0)
{
   var width = baseWidth*scale;
   var height = baseHeight*scale;
   var iterations = Math.floor(canvas.width/width);
   for (var i = 0; i < iterations; i++)
      buffer.quad(x-(i*width), y, z, width, height, 1.0, 1.0, 1.0, a);
}

draw();

buffer.bind();
buffer.bindTextures();
buffer.compile();
buffer.activate();

function tick(time) 
{
   programTime = slider.value;
   // document.getElementById('debug').innerHTML = toRGBArray(getProperty('--day-sky'));
   //document.getElementById('debug').innerHTML = 'Color: ' + toHEX(lerpColor(toRGBArray(getProperty('--day-sky')), toRGBArray(getProperty('--night-sky')), programTime/60/24));
   var factor = programTime/60/24;
   setProperty('--primary', toHEX(lerpColor(toRGBArray(getProperty('--day-sky')), toRGBArray(getProperty('--night-sky')), factor)));
   setProperty('--city-color', toHEX(lerpColor(toRGBArray(getProperty('--city-day')), toRGBArray(getProperty('--city-night')), factor)));
   setProperty('--haze', toHEX(lerpColor(toRGBArray(getProperty('--afternoon-haze')), toRGBArray(getProperty('--dusk-dawn-haze')), Math.min(1.0, factor*2))));
   if (programTime != programTimeO)
      this.redraw();
   programTimeO = programTime;
   
   buffer.render(time);
   window.requestAnimationFrame(tick);
}

// https://github.com/ondras/rot.js
function lerpColor(color1, color2, factor) 
{
   if (arguments.length < 3) { factor = 0.5; }
   var result = color1.slice();
   for (var i=0;i<3;i++) 
   {
     result[i] = Math.round(result[i] + factor*(color2[i]-color1[i]));
   }
   return result;
 };

function redraw()
{
   currentRandomIndex = 0;
   buffer.redraw();
   buffer.bind();
   buffer.compile();
   buffer.activate();
}

tick(0);