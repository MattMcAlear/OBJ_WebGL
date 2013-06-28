"use strict";
var objjs = {};

objjs.loadMatl = function(data){
	var materialData = data.match(/newmtl .*|map_Kd .*/g);
	var materials = {};

	for (var i = 0; i < materialData.length; i++){
		var line = materialData[i].split(' ');
		if (line[0] == 'newmtl'){
			var lastName = line[1];
		}
		else { //assume map_Kd for our path
			materials[lastName] = line[1];
		}
	}

	return materials;
};

objjs.initTexture = function initTexture(textureData, gl) {
	var texturePaths = objjs.loadMatl(textureData);
	var textures = {};
	
	for (var textureName in texturePaths){
		var path = texturePaths[textureName];
		
		var glTexture = gl.createTexture();
		glTexture.image = new Image();
		glTexture.image.onload = function () {
			//Can't remember if image.onload is async by default or not
			//If it is async, we'll probably need some defered chain here
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.bindTexture(gl.TEXTURE_2D, glTexture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glTexture.image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
		glTexture.image.src = path;
		
		textures[textureName] = {
			path:		path,
			glTexture:	glTexture
		};
	}
	
	return textures;
}

objjs.handleLoadedObject = function handleLoadedObject(data, gl) {
    var lines = data.split("\n");
    
    var vertexCount = [];
    var vertexPositions = [];
    var vertexTextureCoords = [];
	var vX = [];
	var vY = [];
	var vZ = [];
	var vtX = [];
	var vtY = [];
	var vCount = 0;
	var vtCount = 0;
	var uniqueTextures = [];
	var allTex = [];
	var allTexCount = 0;
	var allTexLength = [];
	
	for(var i=0; i<lines.length; i++){
		var vals = lines[i].split(" ");
		
		if(vals[0] == 'usemtl' && vals[1] != 'FrontColor'){
			allTex.push(vals[1]);
			
			if(uniqueTextures.length == 0){ 
				uniqueTextures.push(vals[1]); 
			}else{
				var isUnique = true;
				for(var a=0; a<uniqueTextures.length; a++){
					//alert(vals[1]+' - '+allTex[a]);
					if(vals[1] == uniqueTextures[a]){
						isUnique = false;
					}
				}
				if(isUnique == true){
					uniqueTextures.push(vals[1]);
				}
			}
		}
		if(vals[0] == 'v'){
			vX[vCount] = vals[1];
			vY[vCount] = vals[2];
			vZ[vCount] = vals[3];
			
			vCount++;
		}
		if(vals[0] == 'vt'){
			vtX[vtCount] = vals[1];
			vtY[vtCount] = vals[2];
			
			vtCount++;
		}
	}
	
	for(var i=0; i<lines.length; i++){
		var vals = lines[i].split(" ");
		if(vals[0] == 'usemtl' && vals[1] != 'FrontColor'){
			allTexCount++;
			allTexLength.push(0);
		}
		if(vals[0] == 'f'){
			for(var ii=1; ii<vals.length; ii++){
				var val = vals[ii].split("/");
				
				for(var iii=0; iii<uniqueTextures.length; iii++){
					if(allTex[allTexCount] == uniqueTextures[iii]){
						if(typeof vertexPositions[iii] == "undefined"){
							vertexPositions[iii] = [];
							vertexTextureCoords[iii] = [];
							vertexCount[iii] = 0;
						}
						vertexPositions[iii].push(parseFloat(vX[(val[0]-1)]));
						vertexPositions[iii].push(parseFloat(vY[(val[0]-1)]));
						vertexPositions[iii].push(parseFloat(vZ[(val[0]-1)]));
					
						vertexTextureCoords[iii].push(parseFloat(vtX[(val[1]-1)]));
                		vertexTextureCoords[iii].push(parseFloat(vtY[(val[1]-1)]));
						
						vertexCount[iii] += 1;
					}
				}
				
				allTexLength[(allTexLength.length-1)]++;
			}
		}
	}
	
	//Create all buffers
	var buffers = [];
	var objVertexPositionBuffer = [];
	var objVertexTextureCoordBuffer = [];
	for(var i=0; i<uniqueTextures.length; i++){
        objVertexPositionBuffer[i] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, objVertexPositionBuffer[i]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositions[i]), gl.STATIC_DRAW);
        objVertexPositionBuffer[i].itemSize = 3;
        objVertexPositionBuffer[i].numItems = vertexCount[i];

        objVertexTextureCoordBuffer[i] = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, objVertexTextureCoordBuffer[i]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexTextureCoords[i]), gl.STATIC_DRAW);
        objVertexTextureCoordBuffer[i].itemSize = 2;
        objVertexTextureCoordBuffer[i].numItems = vertexCount[i];
		
		buffers.push({	vertexPositionBuffer: 		objVertexPositionBuffer[i],
						vertexTextureCoordBuffer:	objVertexTextureCoordBuffer[i],
						textureName:				uniqueTextures[i]});
	}
	
	return buffers;
}

objjs.loadObject = function loadObject(fileName) {
    var request = new XMLHttpRequest();
    request.open("GET", fileName+'.obj');
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            objjs.handleLoadedObject(request.responseText);
        }
    }
    request.send();
}