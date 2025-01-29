function showError(errorText: string){
    const errorBoxDiv = document.getElementById('error-box');
    if (errorBoxDiv == null){
        return;
    }
    const errorElement = document.createElement('p');
    errorElement.innerText = errorText;
    errorBoxDiv.appendChild(errorElement);
}

function movementAndColor(){

    //Initializing the Web Gl canvas - catch error 
    /** @type {HTMLCanvasElement|null} */
    const canvas = document.getElementById('demo-canvas');
    if(!canvas || !(canvas instanceof HTMLCanvasElement)){
        showError('Cannot get demo-canvas reference - check for typos or loading script too early in HTMl');
        return;
    }
    const gl = canvas.getContext('webgl2');
    if(!gl){
        showError('This browser does not suppport Web Gl 2 - demo will no work!')
        return;
    }

    
    //define data the GPU will use

    //Raw triangle
    const triangleVertices = [
        // top middle
        0.0, 0.5,
        // bottom left
        -0.5, -0.5,
        // bottom right
        0.5, -0.5
    ];
    //makes the triangle usable by GPU
    const triangleVerticesCpuBuffer = new Float32Array(triangleVertices)

    //sending the buffer to gpu
    const triangleGeoBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleGeoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVerticesCpuBuffer, gl.STATIC_DRAW);

    //preparing vertex shader
    const vertexShaderSourceCode = `#version 300 es
    precision mediump float;

    in vec2 vertexPosition;

    void main(){
        gl_Position = vec4(vertexPosition, 0.0, 1.0);
    }`;
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if(vertexShader === null){
        showError('Could not allocate vertex shader');
        return;
    }
    gl.shaderSource(vertexShader, vertexShaderSourceCode);
    gl.compileShader(vertexShader);
    if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
        const compileError = gl.getShaderInfoLog(vertexShader);
        showError(`Failed to COMPILE vertex shader - ${compileError}`);
        return;
    }

    //preparing fragment shader
    const fragmentShaderSourceCode = `#version 300 es
    precision mediump float;

    out vec4 outputColor;

    void main(){
        outputColor = vec4(0.294, 0.0, 0.51, 1.0);    
    }`;
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if(fragmentShader === null){
        showError('Could not allocate fragment shader');
        return;
    }
    gl.shaderSource(fragmentShader, fragmentShaderSourceCode);
    gl.compileShader(fragmentShader);
    if(!gl.getShaderParameter(fragmentShader , gl.COMPILE_STATUS)){
        const compileError = gl.getShaderInfoLog(fragmentShader);
        showError(`Failed to COMPILE fragment shader - ${compileError}`);
        return;
    }

    //combine the vertex and fragment shaders into one programs
    const triangleShaderProgram = gl.createProgram();
    if(triangleShaderProgram === null){
        showError('Could not allocate triangle program');
        return;
    }
    gl.attachShader(triangleShaderProgram, vertexShader); 
    gl.attachShader(triangleShaderProgram, fragmentShader); 
    gl.linkProgram(triangleShaderProgram);
    if(!gl.getProgramParameter(triangleShaderProgram, gl.LINK_STATUS)){
        const linkError = gl.getProgramInfoLog(triangleShaderProgram);
        showError(`Failed to LINK shaders - ${linkError}`);
        return;
    }

    //get the vertex attrib positon to use vector
    const vertexPositionAttribLocation = gl.getAttribLocation(triangleShaderProgram, 'vertexPosition');
    if(vertexPositionAttribLocation < 0){
        showError('Failed to get attrib location for vertexPosition');
        return;
    }

    //PIPELINE

    //Output merger - how to merge the shaded pixel fragment with the existing output image
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.clearColor(0.08, 0.08, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //Rasterizer - which pixels are part of a triangle
    gl.viewport(0,0,canvas.width, canvas.height);
    
    //Set GPU program (vertex + fragment shader pair)
    gl.useProgram(triangleShaderProgram);
    gl.enableVertexAttribArray(vertexPositionAttribLocation)

    //Input Assembler - how to read vertices from our gpu to buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleGeoBuffer);
    gl.vertexAttribPointer(
        /* index: which attribute to use  */ 
        vertexPositionAttribLocation,
        /* size: how many components in that attriute */
        2,
        /* type: what is the data stored in the GPU buffer? for this atribute?*/
        gl.FLOAT, 
        /* normalized: determines how to convert ints to floats, if that's what you're doing */
        false,
        /*stride how forward to move between between bytes from one step to next*/
        2 * Float32Array.BYTES_PER_ELEMENT,
        /*offset: how many bite should buffer skip */
        0
    );

    //Draw call (configures primitive assembly)
    gl.drawArrays(gl.TRIANGLES, 0, 3,)
}
try{
    movementAndColor();
}catch(e){
    showError(`Uncaught JavaScript exception ${e}`);
}