/*
	Copyright (c) 2012 Alexander Overvoorde

	Permission is hereby granted, free of charge, to any person obtaining
	a copy of this software and associated documentation files (the
	"Software"), to deal in the Software without restriction, including
	without limitation the rights to use, copy, modify, merge, publish,
	distribute, sublicense, and/or sell copies of the Software, and to
	permit persons to whom the Software is furnished to do so, subject to
	the following conditions:

	The above copyright notice and this permission notice shall be
	included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
	NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
	LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
	OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
	WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*
	Constants
*/

GL = {};

// Begin modes
GL.POINTS				= 0x0000;
GL.LINES				= 0x0001;
GL.TRIANGLES			= 0x0004;
GL.QUADS				= 0x0007;

// Errors
GL.NO_ERROR				= 0x0000;
GL.INVALID_ENUM			= 0x0500;
GL.INVALID_VALUE		= 0x0501;
GL.INVALID_OPERATION	= 0x0502;

// Features
GL.DEPTH_TEST			= 0x0B71;
GL.CULL_FACE			= 0x0B44;
GL.TEXTURE_2D			= 0x0DE1;

// Types
GL.BYTE					= 0x1400;
GL.FLOAT				= 0x1406;

// Matrix modes
GL.MODELVIEW			= 0x1700;
GL.PROJECTION			= 0x1701;

// Pixel formats
GL.DEPTH_COMPONENT		= 0x1902;
GL.RGBA					= 0x1908;

// Buffers
GL.DEPTH_BUFFER_BIT		= 0x0100;
GL.COLOR_BUFFER_BIT 	= 0x4000;


/*
	Creates a new instance of a software OpenGL 1.1 context.

	w	Width of the frame buffer.
	h	Height of the frame buffer.
*/

GL.Context = function( w, h )
{
	// Initialize buffers
	this.w = w;
	this.h = h;
	this.bufColor = [];
	this.bufDepth = [];

	// Initialize matrix stack
	this.matModelView = mat4.create();
	this.matProj = mat4.create();
	this.curMatrix = this.matModelView;

	// Set error
	this.err = GL.NO_ERROR;

	// Initialize rest of the state
	this.bufColorClear = [ 0.0, 0.0, 0.0, 1.0 ];
	this.bufDepthClear = 1.0;

	this.beginMode = -1;
	this.beginColor = [ 1.0, 1.0, 1.0, 1.0 ];
	this.beginTexCoord = [ 0.0, 0.0 ];

	this.textures = [];
	this.curTexture = 0;

	this.depthEnabled = false;
	this.cullingEnabled = false;
	this.textureEnabled = false;
};

/*
	Enables or disables OpenGL capabilities.
*/

GL.Context.prototype.enable = function( capability )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}
	if ( capability != GL.DEPTH_TEST && capability != GL.CULL_FACE && capability != GL.TEXTURE_2D ) {
		this.err = GL.INVALID_ENUM;
		return null;
	}

	if ( capability == GL.DEPTH_TEST ) this.depthEnabled = true;
	else if ( capability == GL.CULL_FACE ) this.cullingEnabled = true;
	else if ( capability == GL.TEXTURE_2D ) this.textureEnabled = true;
};

GL.Context.prototype.disable = function( capability )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}
	if ( capability != GL.DEPTH_TEST && capability != GL.CULL_FACE && capability != GL.TEXTURE_2D ) {
		this.err = GL.INVALID_ENUM;
		return null;
	}

	if ( capability == GL.DEPTH_TEST ) this.depthEnabled = false;
	else if ( capability == GL.CULL_FACE ) this.cullingEnabled = false;
	else if ( capability == GL.TEXTURE_2D ) this.textureEnabled = false;
};

/*
	Returns any errors caused by the last function call.
*/

GL.Context.prototype.getError = function()
{
	if ( this.beginMode != -1 ) return 0;
	return this.err;
};

/*
	Sets the color buffer clear color.

	r, g, b 	Color components
	a 			Alpha component
*/

GL.Context.prototype.clearColor = function( r, g, b, a )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	this.bufColorClear = [ fclamp( r ), fclamp( g ), fclamp( b ), fclamp( a ) ];
};

/*
	Sets the depth buffer clear color.
*/

GL.Context.prototype.clearDepth = function( depth )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	this.bufDepthClear = depth;
};

/*
	Clears one or more buffers.
*/

GL.Context.prototype.clear = function( mask )
{
	if ( mask - GL.COLOR_BUFFER_BIT - GL.DEPTH_BUFFER_BIT > 0 ) {
		this.err = GL.INVALID_VALUE;
		return null;
	}

	if ( ( mask & GL.COLOR_BUFFER_BIT ) != 0 ) {
		var size = this.w*this.h*4;
		for ( var i = 0; i < size; i++ ) {
			this.bufColor[i] = this.bufColorClear[i%4];
		}
	}
	if ( ( mask & GL.DEPTH_BUFFER_BIT ) != 0 ) {
		var size = this.w*this.h;
		for ( var i = 0; i < size; i++ ) {
			this.bufDepth[i] = this.bufDepthClear;
		}
	}
};

/*
	Start specification of vertices belonging to a group of primitives.
*/

GL.Context.prototype.begin = function( mode )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}
	if ( mode != GL.POINTS && mode != GL.LINES && mode != GL.TRIANGLES && mode != GL.QUADS ) {
		this.err = GL.INVALID_ENUM;
		return null;
	}

	this.beginMode = mode;
	this.beginVertices = [];
};

/*
	Finish specification of vertices.
*/

GL.Context.prototype.end = function()
{
	if ( this.beginMode == -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	// Transform vertices and map them to window coordinates
	for ( var i = 0; i < this.beginVertices.length; i++ ) {
		var vertex = this.beginVertices[i];

		// Transform vertex into eye space
		var vec = [ vertex[0], vertex[1], vertex[2], 1 ];
		mat4.multiplyVec4( this.matModelView, vec );

		// Perform backface culling - if enabled
		if ( this.cullingEnabled && ( ( this.beginMode == GL.QUADS && i % 4 == 0 ) || ( this.beginMode == GL.TRIANGLES && i % 3 == 0 ) ) ) {
			var side1 = vec3.create();
			vec3.subtract( this.beginVertices[i], this.beginVertices[i+1], side1 );
			var side2 = vec3.create();
			vec3.subtract( this.beginVertices[i], this.beginVertices[i+2], side2 );
			var normal = vec3.create();
			vec3.cross( side1, side2, normal );
			var dot = vec3.dot( normal, this.beginVertices[i] );
			vertex[5] = dot <= 0; // If dot > 0, then face is facing away from camera
		}

		// Transform vertex into clip space
		mat4.multiplyVec4( this.matProj, vec );

		// Calculate normalized device coordinates
		var norm = [];
		norm[0] = vec[0] / vec[3];
		norm[1] = vec[1] / vec[3];
		norm[2] = vec[2] / vec[3];

		vertex[0] = (norm[0]+1)/2*w;
		vertex[1] = (1-norm[1])/2*h;
		vertex[2] = norm[2];

		this.beginVertices[i] = vertex;
	}

	// Assemble primitives
	if ( this.beginMode == GL.POINTS )
		for ( var i = 0; i < this.beginVertices.length; i += 1 ) drawPoint( this.beginVertices[i], this.bufColor, this.bufDepth, this );
	else if ( this.beginMode == GL.LINES && this.beginVertices.length >= 2 )
		for ( var i = 0; i < this.beginVertices.length; i += 2 ) drawLine( [ this.beginVertices[i], this.beginVertices[i+1] ], this.bufColor, this.bufDepth, this );
	else if ( this.beginMode == GL.TRIANGLES && this.beginVertices.length >= 3 )
		for ( var i = 0; i < this.beginVertices.length; i += 3 ) drawTriangle( [ this.beginVertices[i], this.beginVertices[i+1], this.beginVertices[i+2] ], this.bufColor, this.bufDepth, this );
	else if ( this.beginMode == GL.QUADS && this.beginVertices.length >= 4 )
		for ( var i = 0; i < this.beginVertices.length; i += 4 ) drawQuad( [ this.beginVertices[i], this.beginVertices[i+1], this.beginVertices[i+2], this.beginVertices[i+3] ], this.bufColor, this.bufDepth, this );

	this.beginMode = -1;
	this.beginVertices = null;
};

/*
	Set the current color.
*/

GL.Context.prototype.color4f = function( r, g, b, a )
{
	this.beginColor = [ fclamp( r ), fclamp( g ), fclamp( b ), fclamp( a ) ];
};

GL.Context.prototype.color3f = function( r, g, b )
{
	return this.color4f( r, g, b, 1.0 );
};

/*
	Specify a 2D texture coordinate.
*/

GL.Context.prototype.texCoord2f = function( u, v )
{
	this.beginTexCoord = [ u, v ];
};

/*
	Specify a vertex.
*/

GL.Context.prototype.vertex3f = function( x, y, z )
{
	if ( this.beginMode == -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	this.beginVertices.push( [ x, y, z, this.beginColor, this.beginTexCoord ] );
};

/*
	Specify which matrix to apply operations on.
*/

GL.Context.prototype.matrixMode = function( mode )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}
	if ( mode != GL.MODELVIEW && mode != GL.PROJECTION ) {
		this.err = GL.INVALID_ENUM;
		return null;
	}

	this.curMatrix = mode == GL.MODELVIEW ? this.matModelView : this.matProj;
};

/*
	Replaces the current matrix with the identity matrix.
*/

GL.Context.prototype.loadIdentity = function()
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	mat4.identity( this.curMatrix );
};

/*
	Multiplies the current matrix by a translation matrix.
*/

GL.Context.prototype.translatef = function( x, y, z )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	mat4.translate( this.curMatrix, [ x, y, z ] );
};

/*
	Multiplies the current matrix by a scale matrix.
*/

GL.Context.prototype.scalef = function( x, y, z )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	mat4.scale( this.curMatrix, [ x, y, z ] );
};

/*
	Multiplies the current matrix by a rotation matrix.
*/

GL.Context.prototype.rotatef = function( angle, x, y, z )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	mat4.rotate( this.curMatrix, angle, [ x, y, z ] );
};

/*
	Sets up a perspective projection matrix.
*/

GL.Context.prototype.perspective = function( fovy, aspect, near, far )
{
	mat4.perspective( fovy, aspect, near, far, this.curMatrix );
};

/*
	Defines a viewing transformation.
*/

GL.Context.prototype.lookAt = function( eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ )
{
	mat4.lookAt( [ eyeX, eyeY, eyeZ ], [ centerX, centerY, centerZ ], [ upX, upY, upZ ], this.curMatrix );
};

/*
	Generate texture objects.
*/

GL.Context.prototype.genTextures = function( count, buf )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}
	if ( count < 0 ) {
		this.err = GL.INVALID_VALUE;
		return null;
	}

	for ( var i = 0; i < count; i++ ) {
		var j = this.textures.length + 1;
		buf[i] = j;
		this.textures[j-1] = { pixels: null, w: 0, h: 0 };
	}
};

/*
	Make a texture current.
*/

GL.Context.prototype.bindTexture = function( target, id )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}
	if ( target != GL.TEXTURE_2D ) {
		this.err = GL.INVALID_ENUM;
		return null;
	}

	if ( target == GL.TEXTURE_2D ) this.curTexture = id - 1;
};

/*
	Specify the pixels for a texture image.
*/

GL.Context.prototype.texImage2D = function( target, width, height, type, data )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}
	if ( target != GL.TEXTURE_2D ) {
		this.err = GL.INVALID_ENUM;
		return null;
	}
	if ( type != GL.BYTE && type != GL.FLOAT ) {
		this.err = GL.INVALID_ENUM;
		return null;
	}

	var texture = this.textures[this.curTexture];
	if ( texture == undefined ) return;
	texture.pixels = [];
	texture.w = width;
	texture.h = height;

	var size = width*height*4;
	for ( var i = 0; i < size; i += 4 ) {
		texture.pixels[i+0] = data[i+0] / ( type == GL.BYTE ? 255 : 1 );
		texture.pixels[i+1] = data[i+1] / ( type == GL.BYTE ? 255 : 1 );
		texture.pixels[i+2] = data[i+2] / ( type == GL.BYTE ? 255 : 1 );
		texture.pixels[i+3] = data[i+3] / ( type == GL.BYTE ? 255 : 1 );
	}
};

/*
	Reads pixels from a buffer and returns them as an array.

	x, y	Window coordinates of the area you want to capture.
	w, h	Size of the area you want to capture.
*/

GL.Context.prototype.readPixels = function( x, y, w, h, format, type, data )
{
	if ( this.beginMode != -1 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}
	if ( ( format != GL.RGBA && format != GL.DEPTH_COMPONENT ) || ( type != GL.BYTE && type != GL.FLOAT ) ) {
		this.err = GL.INVALID_ENUM;
		return null;
	}
	if ( w < 0 || h < 0 ) {
		this.err = GL.INVALID_VALUE;
		return null;
	}

	if ( format == GL.RGBA ) {
		var size = this.w*this.h*4;
		for ( var i = 0; i < size; i += 4 ) {
			data[i+0] = this.bufColor[i+0] * ( type == GL.BYTE ? 255 : 1 );
			data[i+1] = this.bufColor[i+1] * ( type == GL.BYTE ? 255 : 1 );
			data[i+2] = this.bufColor[i+2] * ( type == GL.BYTE ? 255 : 1 );
			data[i+3] = this.bufColor[i+3] * ( type == GL.BYTE ? 255 : 1 );
		}
	} else if ( format == GL.DEPTH_COMPONENT ) {
		var size = this.w*this.h;
		for ( var i = 0; i < size; i++ )
			data[i+0] = this.bufDepth[i] * ( type == GL.BYTE ? 255 : 1 );
	}
};

/*
	Draw a point to the specified pixel array.
*/

function drawPoint( p, color, depth, gl )
{
	var o = (Math.floor(p[0])+Math.floor(p[1])*gl.w)*4;

	if ( gl.depthEnabled ) {
		var d = p[2];
		if ( d > depth[o/4] ) return;
		else depth[o/4] = d;
	}

	// Vertex color
	var fragColor = [];
	fragColor[0] = p[3][0];
	fragColor[1] = p[3][1];
	fragColor[2] = p[3][2];
	fragColor[3] = p[3][3];

	// Texture sample
	var tex = gl.textures[gl.curTexture];
	if ( gl.textureEnabled && tex != undefined ) {
		var u = p[4][0];
		var v = p[4][1];
		u = Math.floor( u * tex.w ) % tex.w; // This behaviour should later depend on GL_TEXTURE_WRAP_S
		v = Math.floor( v * tex.h ) % tex.h;

		var to = (u+v*tex.w)*4;
		fragColor[0] *= tex.pixels[to+0];
		fragColor[1] *= tex.pixels[to+1];
		fragColor[2] *= tex.pixels[to+2];
		fragColor[3] *= tex.pixels[to+3];
	}

	color[o+0] = fragColor[0];
	color[o+1] = fragColor[1];
	color[o+2] = fragColor[2];
	color[o+3] = fragColor[3];
}

/*
	Draw a line to the specified pixel array.
*/

function drawLine( p, color, depth, gl )
{
	var x0 = Math.floor( p[0][0] );
	var y0 = Math.floor( p[0][1] );
	var x1 = Math.ceil( p[1][0] );
	var y1 = Math.ceil( p[1][1] );
	var dx = Math.abs( x1 - x0 );
	var dy = Math.abs( y1 - y0 );
	var sx = x0 < x1 ? 1 : -1;
	var sy = y0 < y1 ? 1 : -1;
	var err = dx - dy;

	var totDist = dx > dy ? dx : dy;

	while ( true )
	{
		var ic0 = Math.abs( dx > dy ? ( x1 - x0 ) : ( y1 - y0 ) ) / totDist;
		var ic1 = 1.0 - ic0;

		var o = (x0+y0*w)*4;

		var z =  1 / ( ic0*1/p[0][2] + ic1*1/p[1][2] );
		if ( gl.depthEnabled ) {
			if ( z > depth[o/4] ) continue;
			else depth[o/4] = z;
		}

		// Vertex color
		var fragColor = [];
		fragColor[0] = ( ic0*p[0][3][0]/p[0][2] + ic1*p[1][3][0]/p[1][2] ) * z;
		fragColor[1] = ( ic0*p[0][3][1]/p[0][2] + ic1*p[1][3][1]/p[1][2] ) * z;
		fragColor[2] = ( ic0*p[0][3][2]/p[0][2] + ic1*p[1][3][2]/p[1][2] ) * z;
		fragColor[3] = ( ic0*p[0][3][3]/p[0][2] + ic1*p[1][3][3]/p[1][2] ) * z;

		// Texture sample
		var tex = gl.textures[gl.curTexture];
		if ( gl.textureEnabled && tex != undefined ) {
			var u = ( ic0*p[0][4][0]/p[0][2] + ic1*p[1][4][0]/p[1][2] ) * z;
			var v = ( ic0*p[0][4][1]/p[0][2] + ic1*p[1][4][1]/p[1][2] ) * z;
			u = Math.floor( u * tex.w ) % tex.w; // This behaviour should later depend on GL_TEXTURE_WRAP_S
			v = Math.floor( v * tex.h ) % tex.h;

			var to = (u+v*tex.w)*4;
			fragColor[0] *= tex.pixels[to+0];
			fragColor[1] *= tex.pixels[to+1];
			fragColor[2] *= tex.pixels[to+2];
			fragColor[3] *= tex.pixels[to+3];
		}

		color[o+0] = fragColor[0];
		color[o+1] = fragColor[1];
		color[o+2] = fragColor[2];
		color[o+3] = fragColor[3];

		if ( x0 == x1 && y0 == y1 ) break;

		var e2 = 2*err;
		if ( e2 > -dy ) {
			err -= dy;
			x0 += sx;
		}
		if ( e2 < dx ) {
			err += dx;
			y0 += sy;
		}
	}
}

/*
	Draw a triangle to the specified pixel array.
*/

function drawTriangle( p, color, depth, gl )
{
	if ( gl.cullingEnabled && !p[0][5] ) return;

	var x1 = Math.floor( p[0][0] );
	var x2 = Math.floor( p[1][0] );
	var x3 = Math.floor( p[2][0] );
	var y1 = Math.floor( p[0][1] );
	var y2 = Math.floor( p[1][1] );
	var y3 = Math.floor( p[2][1] );

	var minX = Math.min( x1, x2, x3 );
	var minY = Math.min( y1, y2, y3 );
	var maxX = Math.max( x1, x2, x3 );
	var maxY = Math.max( y1, y2, y3 );

	var factor = 1.0 / ( (y2-y3)*(x1-x3) + (x3-x2)*(y1-y3) );

	var o;
	for ( var x = minX; x <= maxX; x++ ) {
		for ( var y = minY; y <= maxY; y++ ) {
			ic0 = ( (y2-y3)*(x-x3)+(x3-x2)*(y-y3) ) * factor;
			if ( ic0 < 0 || ic0 > 1 ) continue;
			ic1 = ( (y3-y1)*(x-x3)+(x1-x3)*(y-y3) ) * factor;
			if ( ic1 < 0 || ic1 > 1 ) continue;
			ic2 = 1.0 - ic0 - ic1;
			if ( ic2 < 0 || ic2 > 1 ) continue;

			o = (x+y*w)*4;

			var z = 1 / ( ic0*1/p[0][2] + ic1*1/p[1][2] + ic2*1/p[2][2] );
			if ( gl.depthEnabled ) {
				if ( z > depth[o/4] ) continue;
				else depth[o/4] = z;
			}

			// Vertex color
			var fragColor = [];
			fragColor[0] = ( ic0*p[0][3][0]/p[0][2] + ic1*p[1][3][0]/p[1][2] + ic2*p[2][3][0]/p[2][2] ) * z;
			fragColor[1] = ( ic0*p[0][3][1]/p[0][2] + ic1*p[1][3][1]/p[1][2] + ic2*p[2][3][1]/p[2][2] ) * z;
			fragColor[2] = ( ic0*p[0][3][2]/p[0][2] + ic1*p[1][3][2]/p[1][2] + ic2*p[2][3][2]/p[2][2] ) * z;
			fragColor[3] = ( ic0*p[0][3][3]/p[0][2] + ic1*p[1][3][3]/p[1][2] + ic2*p[2][3][3]/p[2][2] ) * z;

			// Texture sample
			var tex = gl.textures[gl.curTexture];
			if ( gl.textureEnabled && tex != undefined ) {
				var u = ( ic0*p[0][4][0]/p[0][2] + ic1*p[1][4][0]/p[1][2] + ic2*p[2][4][0]/p[2][2] ) * z;
				var v = ( ic0*p[0][4][1]/p[0][2] + ic1*p[1][4][1]/p[1][2] + ic2*p[2][4][1]/p[2][2] ) * z;
				u = Math.floor( u * tex.w ) % tex.w; // This behaviour should later depend on GL_TEXTURE_WRAP_S
				v = Math.floor( v * tex.h ) % tex.h;

				var to = (u+v*tex.w)*4;
				fragColor[0] *= tex.pixels[to+0];
				fragColor[1] *= tex.pixels[to+1];
				fragColor[2] *= tex.pixels[to+2];
				fragColor[3] *= tex.pixels[to+3];
			}

			color[o+0] = fragColor[0];
			color[o+1] = fragColor[1];
			color[o+2] = fragColor[2];
			color[o+3] = fragColor[3];
		}
	}
}

/*
	Draw a quad to the specified pixel array.
*/

function drawQuad( p, color, depth, gl )
{
	if ( gl.cullingEnabled ) {
		if ( !p[0][5] ) return;
		p[2][5] = true; // Or drawTriangle will think the second triangle making the quad is culled
	}

	drawTriangle( [ p[0], p[1], p[2] ], color, depth, gl );
	drawTriangle( [ p[2], p[3], p[0] ], color, depth, gl );
}

/*
	Clamps a value between 0.0 and 1.0.
*/

function fclamp( val )
{
	return val < 0.0 ? 0.0 : ( val > 1.0 ? 1.0 : val );
}