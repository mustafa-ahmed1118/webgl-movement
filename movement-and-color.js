"use strict";
function showError(errorText) {
    const errorBoxDiv = document.getElementById('error-box');
    if (errorBoxDiv == null) {
        return;
    }
    const errorElement = document.createElement('p');
    errorElement.innerText = errorText;
    errorBoxDiv.appendChild(errorElement);
}
const trianglePositions = new Float32Array([0, 1, -1, -1, 1, -1]);
const rgbTriangleColors = new Uint8Array([
    255, 0, 0,
    0, 255, 0,
    0, 0, 255
]);
const fieryTriangleColors = new Uint8Array([
    //Chili red = E52F0F   
    229, 47, 15,
    246, 206, 29,
    233, 154, 26
]);
function createStaticVertexBufferMethod(gl, data) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        showError("Failed to allocate buffer");
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
}
function createTwoBufferVao(gl, positionBuffer, colorBuffer, positionAttribLocation, colorAttributeLocation) {
    const vao = gl.createVertexArray();
    if (!vao) {
        showError('Failed to allocate VAO from 2 buffers');
    }
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.enableVertexAttribArray(colorAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorAttributeLocation, 3, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    return vao;
}
const vertexShaderSourceCode = `#version 300 es
    precision mediump float;

    in vec2 vertexPosition;
    in vec3 vertexColor;

    out vec3 fragmentColor;
    


    uniform vec2 canvasSize;
    uniform vec2 shapeLocation;
    uniform float shapeSize;

    void main(){
        fragmentColor = vertexColor;

        vec2 finalVertexPosition = vertexPosition * shapeSize + shapeLocation;
        vec2 clipPosition = (finalVertexPosition / canvasSize) * 2.0 - 1.0;
        gl_Position = vec4(clipPosition, 0.0, 1.0);

    }`;
const fragmentShaderSourceCode = `#version 300 es
    precision mediump float;

    in vec3 fragmentColor;
    out vec4 outputColor;

    void main(){
        outputColor = vec4(fragmentColor, 1.0);    
    }`;
function movementAndColor() {
    //Initializing the Web Gl canvas - catch error 
    /** @type {HTMLCanvasElement|null} */
    const canvas = document.getElementById('demo-canvas');
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        showError('Cannot get demo-canvas reference - check for typos or loading script too early in HTMl');
        return;
    }
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        showError('This browser does not suppport Web Gl 2 - demo will no work!');
        return;
    }
    //define data the GPU will use
    //Raw triangle
    //makes the triangle usable by GPU
    //sending the buffer to gpu
    const triangleGeoBuffer = createStaticVertexBufferMethod(gl, trianglePositions);
    const rgbTriangleColorBuffer = createStaticVertexBufferMethod(gl, rgbTriangleColors);
    const fieryTriangleColorBuffer = createStaticVertexBufferMethod(gl, fieryTriangleColors);
    if (!triangleGeoBuffer || !rgbTriangleColorBuffer || !fieryTriangleColorBuffer) {
        showError(`Failed to create vertx buffers (triangle pos=${!!triangleGeoBuffer},`
            + `rgb tri color = ${!!rgbTriangleColorBuffer},`
            + `fiery tri color=${!!fieryTriangleColorBuffer})`);
        return null;
    }
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (vertexShader === null) {
        showError('Could not allocate vertex shader');
        return;
    }
    gl.shaderSource(vertexShader, vertexShaderSourceCode);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        const compileError = gl.getShaderInfoLog(vertexShader);
        showError(`Failed to COMPILE vertex shader - ${compileError}`);
        return;
    }
    //preparing fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (fragmentShader === null) {
        showError('Could not allocate fragment shader');
        return;
    }
    gl.shaderSource(fragmentShader, fragmentShaderSourceCode);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        const compileError = gl.getShaderInfoLog(fragmentShader);
        showError(`Failed to COMPILE fragment shader - ${compileError}`);
        return;
    }
    //combine the vertex and fragment shaders into one programs
    const triangleShaderProgram = gl.createProgram();
    if (triangleShaderProgram === null) {
        showError('Could not allocate triangle program');
        return;
    }
    gl.attachShader(triangleShaderProgram, vertexShader);
    gl.attachShader(triangleShaderProgram, fragmentShader);
    gl.linkProgram(triangleShaderProgram);
    if (!gl.getProgramParameter(triangleShaderProgram, gl.LINK_STATUS)) {
        const linkError = gl.getProgramInfoLog(triangleShaderProgram);
        showError(`Failed to LINK shaders - ${linkError}`);
        return;
    }
    //get the vertex attrib positon to use vector
    const vertexPositionAttribLocation = gl.getAttribLocation(triangleShaderProgram, 'vertexPosition');
    const vertexColorAttributeLocation = gl.getAttribLocation(triangleShaderProgram, 'vertexColor');
    if (vertexPositionAttribLocation < 0 || vertexColorAttributeLocation < 0) {
        showError(`Failed to get attrib locations: (pos=${vertexPositionAttribLocation},`
            + `color=${vertexColorAttributeLocation}`);
        return;
    }
    //uniform location
    const shapeLocationUniform = gl.getUniformLocation(triangleShaderProgram, 'shapeLocation');
    const shapeSizeUniform = gl.getUniformLocation(triangleShaderProgram, 'shapeSize');
    const canvasSizeUniform = gl.getUniformLocation(triangleShaderProgram, 'canvasSize');
    if (shapeLocationUniform === null || shapeSizeUniform === null || canvasSizeUniform === null) {
        showError(`Failed to get Uniform Locations (shapeLocation=${!!shapeLocationUniform}`
            + `, shapeSize = ${!!shapeSizeUniform}`
            + `, canvasSize = ${!!canvasSizeUniform}`);
        return;
    }
    //create vaos
    const rgbTriangleVao = createTwoBufferVao(gl, triangleGeoBuffer, rgbTriangleColorBuffer, vertexPositionAttribLocation, vertexColorAttributeLocation);
    const fieryTriangleVao = createTwoBufferVao(gl, triangleGeoBuffer, fieryTriangleColorBuffer, vertexPositionAttribLocation, vertexColorAttributeLocation);
    if (!rgbTriangleVao || !fieryTriangleVao) {
        showError(`Failed to create VAOs: (`
            + `rgbTriangle=${!!rgbTriangleVao}, `);
        return;
    }
    //PIPELINE
    //Output merger - how to merge the shaded pixel fragment with the existing output image
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.clearColor(0.08, 0.08, 0.08, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //Rasterizer - which pixels are part of a triangle
    gl.viewport(0, 0, canvas.width, canvas.height);
    //Set GPU program (vertex + fragment shader pair)
    gl.useProgram(triangleShaderProgram);
    gl.uniform2f(canvasSizeUniform, canvas.width, canvas.height);
    //triangle 1
    gl.uniform1f(shapeSizeUniform, 200);
    gl.uniform2f(shapeLocationUniform, 300, 600);
    gl.bindVertexArray(rgbTriangleVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    //Triangle 2
    gl.uniform1f(shapeSizeUniform, 100);
    gl.uniform2f(shapeLocationUniform, 650, 300);
    gl.bindVertexArray(fieryTriangleVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}
try {
    movementAndColor();
}
catch (e) {
    showError(`Uncaught JavaScript exception ${e}`);
}
