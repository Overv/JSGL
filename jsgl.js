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
GL.TRIANGLES			= 0x0004;

// Errors
GL.NO_ERROR				= 0x0000;
GL.INVALID_ENUM			= 0x0500;
GL.INVALID_VALUE		= 0x0501;
GL.INVALID_OPERATION	= 0x0502;

// Types
GL.BYTE					= 0x1400;
GL.FLOAT				= 0x1406;

// Matrix modes
GL.MODELVIEW			= 0x1700;
GL.PROJECTION			= 0x1701;

// Pixel formats
GL.RGBA					= 0x1908;

// Buffers
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

	// Initialize matrix stack
	this.matModelView = mat4.create();
	this.matProj = mat4.create();
	this.curMatrix = this.matModelView;

	// Set error
	this.err = GL.NO_ERROR;

	// Initialize rest of the state
	this.bufColorClear = [ 0.0, 0.0, 0.0, 1.0 ];
	this.beginMode = 0;
	this.beginColor = [ 1.0, 1.0, 1.0, 1.0 ];
	this.vertexBuffer = null;
};

/*
	Returns any errors caused by the last function call.
*/

GL.Context.prototype.getError = function()
{
	if ( this.beginMode != 0 ) return 0;
	return this.err;
};

/*
	Set the color buffer clear color.

	r, g, b 	Color components
	a 			Alpha component
*/

GL.Context.prototype.clearColor = function( r, g, b, a )
{
	if ( this.beginMode != 0 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	this.bufColorClear = [ fclamp( r ), fclamp( g ), fclamp( b ), fclamp( a ) ];
};

/*
	Clears one or more buffers.
*/

GL.Context.prototype.clear = function( mask )
{
	if ( mask - GL.COLOR_BUFFER_BIT > 0 ) {
		this.err = GL.INVALID_VALUE;
		return null;
	}

	if ( ( mask & GL.COLOR_BUFFER_BIT ) != 0 ) {
		var size = this.w*this.h*4;
		for ( var i = 0; i < size; i++ ) {
			this.bufColor[i] = this.bufColorClear[i%4];
		}
	}
};

/*
	Start specification of vertices belonging to a group of primitives.
*/

GL.Context.prototype.begin = function( mode )
{
	if ( this.beginMode != 0 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}
	if ( mode != GL.TRIANGLES ) {
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
	if ( this.beginMode == 0 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	// Transform vertices and map them to window coordinates
	for ( var i = 0; i < this.beginVertices.length; i++ ) {
		var vertex = this.beginVertices[i];

		mat4.multiplyVec3( this.matModelView, vertex );

		vertex[0] = (vertex[0]+1)/2*w;
		vertex[1] = (1-vertex[1])/2*h;

		this.beginVertices[i] = vertex;
	}

	// Assemble shapes
	// TODO: Make this depend on mode instead of assuming tris
	// TODO: Bottom side is on top if the triangle is pointing downwards, this needs to be handled!!!
	// TODO: Left or right line as vertical line not handled!!!
	for ( var i = 0; i < this.beginVertices.length; i += 3 ) {
		var p = [ this.beginVertices[i+0], this.beginVertices[i+1], this.beginVertices[i+2] ];

		// Find leftmost, middle and rightmost points
		var pL = 0; if ( p[1][0] < p[pL][0] ) pL = 1; if ( p[2][0] < p[pL][0] ) pL = 2;
		var pR = 0; if ( p[1][0] > p[pR][0] && pL ) pR = 1; if ( p[2][0] > p[pR][0] ) pR = 2;
		var pM = 0; if ( pL == 0 || pR == 0 ) pM = 1; if ( pL == 1 || pR == 1 ) pM = 2;
		pL = p[pL];
		pR = p[pR];
		pM = p[pM];

		// Find parameters of left, right and bottom sides
		dL = ( pL[1] - pM[1] ) / ( pL[0] - pM[0] ); L0 = pL[1] - pL[0] * dL;
		dR = ( pM[1] - pR[1] ) / ( pM[0] - pR[0] ); R0 = pM[1] - pM[0] * dR;
		dB = ( pL[1] - pR[1] ) / ( pL[0] - pR[0] ); B0 = pL[1] - pL[0] * dB;

		// Prepare interpolation calculations
		x1 = p[0][0];
		x2 = p[1][0];
		x3 = p[2][0];
		y1 = p[0][1];
		y2 = p[1][1];
		y3 = p[2][1];
		var factor = 1.0 / ( (y2-y3)*(x1-x3) + (x3-x2)*(y1-y3) );

		var o, minX, maxX, x1, x2, x3, y1, y2, y3, ic0, ic1, ic2;
		var minY = Math.floor( Math.min( p[0][1], p[1][1], p[2][1] ) );
		var maxY = Math.ceil( Math.max( p[0][1], p[1][1], p[2][1] ) );
		for ( var y = minY; y < maxY; y++ ) {
			minX = Math.floor( (y-L0)/dL );
			maxX = Math.ceil( (y-R0)/dR );

			for ( var x = minX; x < maxX; x++ ) {
				if ( y > x * dB + B0 ) continue;

				ic0 = ( (y2-y3)*(x-x3)+(x3-x2)*(y-y3) ) * factor;
				ic1 = ( (y3-y1)*(x-x3)+(x1-x3)*(y-y3) ) * factor;
				ic2 = 1.0 - ic0 - ic1;

				o = (x+y*this.w)*4;
				this.bufColor[o+0] = ic0*p[0][3][0] + ic1*p[1][3][0] + ic2*p[2][3][0];
				this.bufColor[o+1] = ic0*p[0][3][1] + ic1*p[1][3][1] + ic2*p[2][3][1];
				this.bufColor[o+2] = ic0*p[0][3][2] + ic1*p[1][3][2] + ic2*p[2][3][2];
				this.bufColor[o+3] = ic0*p[0][3][3] + ic1*p[1][3][3] + ic2*p[2][3][3];
			}
		}
	}

	this.beginMode = 0;
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
	Specify a vertex.
*/

GL.Context.prototype.vertex3f = function( x, y, z )
{
	if ( this.beginMode == 0 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	this.beginVertices.push( [ x, y, z, this.beginColor ] );
};

/*
	Specify which matrix to apply operations on.
*/

GL.Context.prototype.matrixMode = function( mode )
{
	if ( this.beginMode != 0 ) {
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
	if ( this.beginMode != 0 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	console.log( this.curMatrix );
	mat4.identity( this.curMatrix );
	console.log( this.curMatrix );
};

/*
	Multiplies the current matrix by a translation matrix.
*/

GL.Context.prototype.translatef = function( x, y, z )
{
	if ( this.beginMode != 0 ) {
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
	if ( this.beginMode != 0 ) {
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
	if ( this.beginMode != 0 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}

	mat4.rotate( this.curMatrix, angle, [ x, y, z ] );
};

/*
	Reads pixels from the color buffer and returns them as an array.

	x, y	Window coordinates of the area you want to capture.
	w, h	Size of the area you want to capture.
*/

GL.Context.prototype.readPixels = function( x, y, w, h, format, type, data )
{
	if ( this.beginMode != 0 ) {
		this.err = GL.INVALID_OPERATION;
		return null;
	}
	if ( format != GL.RGBA || ( type != GL.BYTE && type != GL.FLOAT ) ) {
		this.err = GL.INVALID_ENUM;
		return null;
	}
	if ( w < 0 || h < 0 ) {
		this.err = GL.INVALID_VALUE;
		return null;
	}

	var size = this.w*this.h*4;
	for ( var i = 0; i < size; i += 4 )
	{
		data[i+0] = this.bufColor[i+0] * ( type == GL.BYTE ? 255 : 1 );
		data[i+1] = this.bufColor[i+1] * ( type == GL.BYTE ? 255 : 1 );
		data[i+2] = this.bufColor[i+2] * ( type == GL.BYTE ? 255 : 1 );
		data[i+3] = this.bufColor[i+3] * ( type == GL.BYTE ? 255 : 1 );
	}
};

/*
	Clamps a value between 0.0 and 1.0.
*/

function fclamp( val )
{
	return val < 0.0 ? 0.0 : ( val > 1.0 ? 1.0 : val );
}